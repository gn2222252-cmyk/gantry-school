# -*- coding: utf-8 -*-
"""FX programming protocol, the one the built-in RS-422 port speaks. Served over TCP (default 127.0.0.1:5551).
Copied from 13_PLC\\softplc\\fx_server.py and fitted to this project.

ENQ 05h                         -> ACK 06h
STX '0' AAAA NN ETX SS          -> STX data ETX SS      read NN bytes, 2 hex chars per byte
STX '1' AAAA NN data ETX SS     -> ACK 06h              write NN bytes
SS = low byte of the sum from after STX up to and including ETX, as 2 hex chars.
D0 is at 1000h, each D is two bytes, low byte first. A wrong sum or address gets NAK 15h.
One request carries at most 64 bytes. Requests wait for the end of a scan, like on the PLC.
"""
import socket
import threading
import time
from collections import deque

STX, ETX, ENQ, ACK, NAK = 0x02, 0x03, 0x05, 0x06, 0x15
D_BASE, D_COUNT = 0x1000, 8000
MAX_BYTES = 64


def sum_text(body):
    return ("%02X" % (sum(body) & 0xFF)).encode("ascii")


def build(cmd, address, data=b"", count=None):
    """What LabVIEW sends. Used by the tests."""
    n = len(data) if count is None else count
    text = cmd + ("%04X%02X" % (address, n)).encode("ascii") + data.hex().upper().encode("ascii")
    body = text + bytes([ETX])
    return bytes([STX]) + body + sum_text(body)


def reply_frame(data):
    body = data.hex().upper().encode("ascii") + bytes([ETX])
    return bytes([STX]) + body + sum_text(body)


def in_d(address, count):
    return D_BASE <= address and address + count <= D_BASE + 2 * D_COUNT and (address - D_BASE) % 2 == 0 and count % 2 == 0


def serve(plc, body):
    """body = bytes between STX and the sum, ETX included. Returns (reply, text)."""
    try:
        text = body[:-1].decode("ascii")
        cmd, address, count = text[0], int(text[1:5], 16), int(text[5:7], 16)
    except (ValueError, IndexError):
        return bytes([NAK]), "NAK bad header"
    if count == 0 or count > MAX_BYTES or not in_d(address, count):
        return bytes([NAK]), "NAK address %04X x%d" % (address, count)
    start = (address - D_BASE) // 2
    if cmd == "0" and len(text) == 7:
        data = bytearray()
        for i in range(count // 2):
            word = plc.d[start + i] & 0xFFFF
            data += bytes([word & 0xFF, word >> 8])
        return reply_frame(bytes(data)), "READ D%d x%d" % (start, count // 2)
    if cmd == "1" and len(text) == 7 + 2 * count:
        try:
            data = bytes.fromhex(text[7:])
        except ValueError:
            return bytes([NAK]), "NAK data"
        for i in range(count // 2):
            value = data[2 * i] | data[2 * i + 1] << 8
            plc.d[start + i] = ((value + 0x8000) & 0xFFFF) - 0x8000
        return bytes([ACK]), "WRITE D%d = %s" % (start, data.hex().upper())
    return bytes([NAK]), "NAK command"


class LinkServer(object):
    def __init__(self, plc, host="127.0.0.1", port=5551, slow9600=False, on_log=None):
        self.plc = plc
        self.host = host
        self.port = port
        self.slow9600 = slow9600
        self.on_log = on_log
        self.pending = deque()
        self.requests = 0
        self.errors = 0
        self.mute = False           # test: the cable is pulled, nothing is answered
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
            threading.Thread(target=self._client, args=(conn, addr), daemon=True).start()

    def _client(self, conn, addr):
        self._log("client %s:%d" % addr)
        buf = bytearray()
        try:
            while self.running:
                data = conn.recv(4096)
                if not data:
                    break
                buf += data
                while self._one_frame(conn, buf):
                    pass
        except OSError:
            pass
        finally:
            conn.close()
            self._log("client %s:%d left" % addr)

    def _one_frame(self, conn, buf):
        """Takes one complete frame from buf. False when more bytes are needed."""
        while buf and buf[0] not in (ENQ, STX):
            del buf[0]
        if not buf:
            return False
        if buf[0] == ENQ:
            del buf[0]
            if not self.mute:
                self._line_delay(2)
                conn.sendall(bytes([ACK]))
            return True
        try:
            end = buf.index(ETX)
        except ValueError:
            return False
        if len(buf) < end + 3:
            return False
        body = bytes(buf[1:end + 1])
        sent = bytes(buf[end + 1:end + 3])
        del buf[:end + 3]
        if sent.upper() != sum_text(body):
            self.errors += 1
            self._log("NAK sum")
            self._reply(conn, bytes([NAK]), len(body) + 3)
            return True
        self._line_delay(len(body) + 3)
        done = threading.Event()
        slot = {"body": body, "done": done, "reply": None}
        self.pending.append(slot)
        if done.wait(2.0):
            self._reply(conn, slot["reply"], 0)
        return True

    def _reply(self, conn, reply, received):
        self._line_delay(received + len(reply))
        if not self.mute:
            conn.sendall(reply)

    def service(self):
        """Called by the scan thread after each scan."""
        while self.pending:
            slot = self.pending.popleft()
            self.requests += 1
            if self.mute:
                slot["reply"] = b""
            else:
                slot["reply"], text = serve(self.plc, slot["body"])
                if slot["reply"][0] == NAK:
                    self.errors += 1
                self._log(text)
            slot["done"].set()

    def _log(self, text):
        if self.on_log:
            self.on_log(text)
