# -*- coding: utf-8 -*-
"""FX programming-port protocol over TCP (default 127.0.0.1:5551).

Frames
  ENQ 05h                        -> ACK 06h
  STX '0' AAAA NN ETX SS read    -> STX data ETX SS   (data = 2 hex chars per byte)
  STX '1' AAAA NN data ETX SS    -> ACK 06h
  SS = low byte of the sum from after STX up to and including ETX, as 2 hex chars.
Address map (FX1N/FX2N style): D n = 1000h + 2n, X = 0080h, Y = 00A0h, M = 0100h.
Unsupported addresses or a wrong checksum get NAK 15h.

Requests are put on a queue and served by the scan thread at the end of a scan.
"""
import socket
import threading
import time
from collections import deque

STX, ETX, ENQ, ACK, NAK = 0x02, 0x03, 0x05, 0x06, 0x15
D_BASE, D_COUNT = 0x1000, 8000
X_BASE, Y_BASE, M_BASE = 0x0080, 0x00A0, 0x0100
X_BYTES, Y_BYTES, M_BYTES = 16, 16, 128


def checksum(payload):
    return ("%02X" % (sum(payload) & 0xFF)).encode("ascii")


def frame(payload):
    body = payload + bytes([ETX])
    return bytes([STX]) + body + checksum(body)


def read_bytes(plc, address, count):
    """Device bytes for a read, or None when the range is not supported."""
    end = address + count
    if D_BASE <= address and end <= D_BASE + 2 * D_COUNT:
        data = bytearray()
        for a in range(address, end):
            word = plc.d[(a - D_BASE) // 2] & 0xFFFF
            data.append(word & 0xFF if (a - D_BASE) % 2 == 0 else word >> 8)
        return bytes(data)
    for base, size, table in ((X_BASE, X_BYTES, plc.x_in), (Y_BASE, Y_BYTES, plc.y_out),
                              (M_BASE, M_BYTES, plc.m)):
        if base <= address and end <= base + size:
            data = bytearray()
            for a in range(address - base, end - base):
                value = 0
                for bit in range(8):
                    if table[a * 8 + bit]:
                        value |= 1 << bit
                data.append(value)
            return bytes(data)
    return None


def write_bytes(plc, address, data):
    """Only D may be written. Returns False when the address is not supported."""
    if len(data) % 2 or (address - D_BASE) % 2 or address < D_BASE:
        return False
    if address + len(data) > D_BASE + 2 * D_COUNT:
        return False
    for i in range(0, len(data), 2):
        value = data[i] | (data[i + 1] << 8)
        plc.d[(address - D_BASE + i) // 2] = ((value + 0x8000) & 0xFFFF) - 0x8000
    return True


def serve_request(plc, raw):
    """raw = bytes between STX and the checksum, ETX included. Returns (reply, text)."""
    body = raw[:-1]
    try:
        cmd = chr(body[0])
        address = int(body[1:5], 16)
        count = int(body[5:7], 16)
    except (ValueError, IndexError):
        return bytes([NAK]), "NAK bad header"
    if cmd == "0":
        data = read_bytes(plc, address, count)
        if data is None:
            return bytes([NAK]), "NAK read %04X" % address
        hexed = "".join("%02X" % b for b in data).encode("ascii")
        return frame(hexed), "READ %04X x%d" % (address, count)
    if cmd == "1":
        text = body[7:]
        if len(text) != count * 2:
            return bytes([NAK]), "NAK length"
        try:
            data = bytes.fromhex(text.decode("ascii"))
        except ValueError:
            return bytes([NAK]), "NAK data"
        if not write_bytes(plc, address, data):
            return bytes([NAK]), "NAK write %04X" % address
        return bytes([ACK]), "WRITE %04X = %s" % (address, data.hex().upper())
    return bytes([NAK]), "NAK cmd %s" % cmd


class FxServer(object):
    def __init__(self, plc, host="127.0.0.1", port=5551, slow9600=False, on_log=None):
        self.plc = plc
        self.host = host
        self.port = port
        self.slow9600 = slow9600
        self.on_log = on_log
        self.pending = deque()
        self.requests = 0
        self.errors = 0
        self.sock = None
        self.running = False

    def start(self):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.sock.bind((self.host, self.port))
        self.sock.listen(8)
        self.running = True
        threading.Thread(target=self._accept, daemon=True).start()

    def stop(self):
        self.running = False
        if self.sock:
            self.sock.close()

    def _line_delay(self, nbytes):
        # 9600 bps, 7E1 = 10 bits per character
        if self.slow9600:
            time.sleep(nbytes * 10.0 / 9600.0)

    def _accept(self):
        while self.running:
            try:
                conn, addr = self.sock.accept()
            except OSError:
                return
            conn.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
            self._log("client %s:%d connected" % addr)
            threading.Thread(target=self._client, args=(conn, addr), daemon=True).start()

    def _client(self, conn, addr):
        buf = bytearray()
        try:
            while True:
                chunk = conn.recv(512)
                if not chunk:
                    break
                buf.extend(chunk)
                while buf:
                    if buf[0] == ENQ:
                        del buf[0]
                        self._wait_scan(conn, None)
                    elif buf[0] == STX:
                        try:
                            etx = buf.index(ETX)
                        except ValueError:
                            break
                        if len(buf) < etx + 3:
                            break
                        body = bytes(buf[1:etx + 1])
                        sum_text = bytes(buf[etx + 1:etx + 3])
                        del buf[:etx + 3]
                        if sum_text.upper() != checksum(body):
                            self.errors += 1
                            self._log("checksum error")
                            conn.sendall(bytes([NAK]))
                            continue
                        self._wait_scan(conn, body)
                    else:
                        del buf[0]
        except OSError:
            pass
        finally:
            conn.close()
            self._log("client %s:%d left" % addr)

    def _wait_scan(self, conn, body):
        """Hand the request to the scan thread and block until it is served."""
        self._line_delay(1 if body is None else len(body) + 3)
        done = threading.Event()
        slot = {"body": body, "done": done, "reply": None}
        self.pending.append(slot)
        if not done.wait(2.0):
            return
        self._line_delay(len(slot["reply"]))
        conn.sendall(slot["reply"])

    def service(self):
        """Called by the scan thread after each scan."""
        while self.pending:
            slot = self.pending.popleft()
            self.requests += 1
            if slot["body"] is None:
                slot["reply"] = bytes([ACK])
            else:
                reply, text = serve_request(self.plc, slot["body"])
                if reply == bytes([NAK]):
                    self.errors += 1
                slot["reply"] = reply
                self._log(text)
            slot["done"].set()

    def _log(self, text):
        if self.on_log:
            self.on_log(text)
