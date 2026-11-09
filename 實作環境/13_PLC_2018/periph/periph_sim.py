# -*- coding: utf-8 -*-
"""
AOI peripheral simulator (periph_sim.py)
Cut down from aoi_machine_sim.py: camera, servo and MES only.
The PLC (or soft PLC) now owns the machine: conveyor, sensors, cylinders, I/O.

  6040  camera (binary)   TRIG, TRIG <id>, SETID <id> (no reply), PING
  5030  servo  (ASCII)    lines end with \n
  18080 MES    (HTTP/JSON)

The part in front of the camera is chosen by ID. The first time an ID is seen,
its defect is decided (queue from the n command, otherwise the rate).
"""

import argparse
import json
import math
import random
import socket
import socketserver
import struct
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

HOST = "127.0.0.1"
PORT_MOTION = 5030
PORT_CAMERA = 6040
PORT_MES = 18080

TICK = 0.01                 # 物理模擬週期 10 ms

# 輸送帶座標（mm），以零件「前緣」位置表示
ENTRY_ZONE = (0.0, 40.0)    # 入料感測器範圍
STOP_POS = 400.0            # 擋料位置（零件前緣停在這裡）
INPOS_ZONE = (395.0, 405.0) # 到位感測器範圍
SORT_ZONE = (685.0, 715.0)  # 分選感測器範圍
PUSH_ZONE = (675.0, 725.0)  # 推料氣缸推得到的範圍
EXIT_POS = 900.0            # 出料端
EXIT_SNS = 890.0
PART_LEN = 120.0
PART_GAP = 5.0
CONV_BASE_SPEED = 250.0     # 100% 時的輸送帶速度 mm/s
NG_BIN_CAP = 20

# 氣缸動作時間（秒，正常氣壓）
CYL_TIME = {"stopper": 0.15, "clamp": 0.25, "pusher": 0.30}

# 伺服軸
AX_MIN, AX_MAX = 0.0, 300.0       # 軟體極限
AX_HARD_MIN, AX_HARD_MAX = -5.0, 305.0
AX_VMAX = 500.0
AX_ACC = 2000.0
AX_HOME_SPEED = 50.0
AX_SETTLE = 0.05

# 相機
IMG_W, IMG_H = 320, 240
MM_PER_PX = 0.05
EXPOSURE = 0.004

# 零件型號（真值，學員要寫進機種檔）
PART_TYPES = {
    "CN-08": {"pins": 8, "pitch": 1.00, "pin_w": 0.30, "width": 10.00,
              "x_pins": 110.0, "x_width": 150.0, "x_surface": 190.0},
    "CN-12": {"pins": 12, "pitch": 0.80, "pin_w": 0.25, "width": 11.20,
              "x_pins": 115.0, "x_width": 160.0, "x_surface": 200.0},
}
DEFECTS = ["good", "missing_pin", "bent_pin", "width_ng", "stain", "wrong_type"]

# MES 預設批號
LOTS = {
    "L2610-001": {"recipe": "CN-08", "qty": 50},
    "L2610-002": {"recipe": "CN-12", "qty": 30},
    "L2610-003": {"recipe": "CN-08", "qty": 20},
}

LOCK = threading.RLock()
QUIET = False


def ts():
    t = time.time()
    return time.strftime("%H:%M:%S", time.localtime(t)) + ".%03d" % int((t % 1) * 1000)


PRINT_LOCK = threading.Lock()


def log(tag, msg, force=False):
    if QUIET and not force:
        return
    with PRINT_LOCK:
        print("%s [%s] %s" % (ts(), tag, msg))
        sys.stdout.flush()


def warn(msg):
    with PRINT_LOCK:
        print("%s [!!] %s" % (ts(), msg))
        sys.stdout.flush()


# ----------------------------------------------------------------------------
# 零件
# ----------------------------------------------------------------------------
class Part(object):
    def __init__(self, ptype, defect, pid):
        self.id = pid
        self.defect = defect
        self.recipe_type = ptype
        real_type = ptype
        if defect == "wrong_type":
            real_type = "CN-12" if ptype == "CN-08" else "CN-08"
        self.type = real_type
        spec = PART_TYPES[real_type]
        n = spec["pins"]
        self.pin_centers = [(i - (n - 1) / 2.0) * spec["pitch"] + random.gauss(0, 0.01)
                            for i in range(n)]
        self.pin_w = spec["pin_w"]
        self.missing = -1
        self.bent = -1
        if defect == "missing_pin":
            self.missing = random.randint(1, n - 2)
        if defect == "bent_pin":
            self.bent = random.randint(1, n - 2)
            self.pin_centers[self.bent] += random.choice([-1, 1]) * random.uniform(0.22, 0.30)
        self.width = spec["width"] + random.gauss(0, 0.015)
        if defect == "width_ng":
            self.width = spec["width"] + random.choice([-1, 1]) * random.uniform(0.20, 0.30)
        self.stain = None
        if defect == "stain":
            self.stain = (random.uniform(-90, 90), random.uniform(-40, 40),
                          random.uniform(6, 10), random.uniform(5, 8))
        self.front = 0.0
        self.locked = False
        self.inspected = 0
        self.fate = None
        self.v01_flag = False

    @property
    def truth(self):
        return "OK" if self.defect == "good" else "NG"

    def describe(self):
        spec = PART_TYPES[self.type]
        if len(self.pin_centers) > 1:
            pitches = [self.pin_centers[i + 1] - self.pin_centers[i]
                       for i in range(len(self.pin_centers) - 1)]
        else:
            pitches = [0]
        pins = spec["pins"] - (1 if self.missing >= 0 else 0)
        return ("id=%d 真值=%s 瑕疵=%s 實際型號=%s pin數=%d 最大pitch偏差=%.3fmm 寬度=%.3fmm 污點=%s 位置=%.0fmm"
                % (self.id, self.truth, self.defect, self.type, pins,
                   max(abs(p - spec["pitch"]) for p in pitches), self.width,
                   "有" if self.stain else "無", self.front))


# ----------------------------------------------------------------------------
# Peripheral state: one part in front of the camera, chosen by ID
# ----------------------------------------------------------------------------
class Machine(object):
    def __init__(self, ptype, rate):
        self.do = [0] * 8
        self.do[6] = 1              # light: the PLC owns it, the camera always sees it lit
        self.part_type = ptype
        self.defect_rate = rate
        self.forced = []
        self.parts = []
        self.all_parts = {}
        self.cyl = {"clamp": 1.0}   # handshake guarantees the part is clamped
        self.curtain_blocked = False
        self.door_open = False
        self.estop_pressed = False
        self.faults = set()
        self.violations = {}
        self.axis = Axis(self)

    def violate(self, code, msg, cooldown=2.0):
        self.violations[code] = self.violations.get(code, 0) + 1
        warn("%s: %s" % (code, msg))

    def select_part(self, pid):
        p = self.all_parts.get(pid)
        if p is None:
            if self.forced:
                d = self.forced.pop(0)
            elif random.random() < self.defect_rate:
                d = random.choice(DEFECTS[1:])
            else:
                d = "good"
            p = Part(self.part_type, d, pid)
            p.front = STOP_POS
            self.all_parts[pid] = p
            log("PART", "%d = %s" % (pid, d))
        self.parts = [p]
        return p

    def station_part(self, lo=INPOS_ZONE[0], hi=INPOS_ZONE[1]):
        for p in self.parts:
            if lo <= p.front <= hi:
                return p
        return None


def physics_loop():
    last = time.time()
    while True:
        time.sleep(TICK)
        now = time.time()
        dt = min(0.05, now - last)
        last = now
        with LOCK:
            MACHINE.axis.step(dt, False)


# ----------------------------------------------------------------------------
# 伺服軸
# ----------------------------------------------------------------------------
class Axis(object):
    def __init__(self, m):
        self.m = m
        self.pos = round(random.uniform(20, 80), 3)
        self.vel = 0.0
        self.servo = False
        self.homed = False
        self.mode = "idle"          # idle / move / jog / home
        self.target = self.pos
        self.vcmd = 0.0
        self.jog_dir = 0
        self.alarm = 0
        self.settle = 0.0
        self.fault_half = None

    def alarm_text(self):
        return {0: "NONE", 201: "ESTOP", 202: "HARD_LIMIT", 203: "FOLLOWING_ERROR"}.get(self.alarm, "UNKNOWN")

    def set_alarm(self, code):
        self.alarm = code
        self.servo = False
        self.mode = "idle"
        self.vel = 0.0
        self.target = self.pos
        warn("伺服警報 %d %s，伺服已關閉" % (code, self.alarm_text()))

    def moving(self):
        return self.mode != "idle"

    def inpos(self):
        return (self.mode == "idle" and self.settle <= 0 and abs(self.pos - self.target) < 0.01)

    def step(self, dt, estop):
        if estop and self.alarm != 201 and (self.servo or self.moving()):
            self.set_alarm(201)
        if self.settle > 0:
            self.settle -= dt
        if self.mode == "idle":
            return
        if self.m.curtain_blocked or self.m.door_open:
            self.m.violate("V02", "光柵遮斷或安全門開啟時伺服軸仍在移動")
        if self.mode == "jog":
            goal_v = self.jog_dir * self.vcmd
            if self.vel < goal_v:
                self.vel = min(goal_v, self.vel + AX_ACC * dt)
            else:
                self.vel = max(goal_v, self.vel - AX_ACC * dt)
            self.pos += self.vel * dt
            if self.jog_dir == 0 and abs(self.vel) < 1e-6:
                self.mode = "idle"
                self.target = self.pos
                self.settle = AX_SETTLE
        else:
            rem = self.target - self.pos
            direction = 1.0 if rem > 0 else -1.0
            v = abs(self.vel)
            brake = v * v / (2 * AX_ACC)
            if abs(rem) <= brake + 1e-9:
                v = max(0.0, v - AX_ACC * dt)
            else:
                v = min(self.vcmd, v + AX_ACC * dt)
            v = max(v, 2.0)
            step = v * dt
            if step >= abs(rem):
                self.pos = self.target
                self.vel = 0.0
                if self.mode == "home":
                    self.homed = True
                    log("MOT", "原點復歸完成")
                self.mode = "idle"
                self.settle = AX_SETTLE
            else:
                self.pos += direction * step
                self.vel = direction * v
            if self.fault_half is not None and abs(self.target - self.pos) < self.fault_half:
                self.fault_half = None
                self.m.faults.discard("motion_alarm")
                self.set_alarm(203)
                return
        if self.pos < AX_HARD_MIN or self.pos > AX_HARD_MAX:
            self.set_alarm(202)

    # 指令處理，回傳回覆字串
    def command(self, line):
        parts = line.strip().split()
        if not parts:
            return None
        cmd = parts[0].upper()
        args = parts[1:]

        def err(code, text):
            return "ERR,%d,%s" % (code, text)

        if cmd == "*IDN?":
            return "SIMMOTION,AX-1,SN0001,1.0"
        if cmd == "POS?":
            return "%+.3f" % self.pos
        if cmd == "STAT?":
            return "%d,%d,%d,%d,%d" % (1 if self.servo else 0, 1 if self.homed else 0,
                                       1 if self.moving() else 0, 1 if self.inpos() else 0, self.alarm)
        if cmd == "ALM?":
            return "%d,%s" % (self.alarm, self.alarm_text())
        if cmd == "ALMCLR":
            if self.alarm == 201 and self.m.estop_pressed:
                return err(106, "ESTOP_ACTIVE")
            if self.alarm != 0:
                log("MOT", "警報清除")
            if self.alarm in (201, 202, 203):
                self.homed = False if self.alarm in (202, 203) else self.homed
            self.alarm = 0
            return "OK"
        if cmd == "SVON":
            if not args or args[0] not in ("0", "1"):
                return err(100, "BAD_ARG")
            if args[0] == "1":
                if self.alarm:
                    return err(103, "ALARM")
                self.servo = True
            else:
                self.servo = False
                self.mode = "idle"
                self.vel = 0.0
                self.target = self.pos
            return "OK"
        if cmd == "STOP":
            if self.mode in ("move", "home"):
                self.target = self.pos + (1 if self.vel > 0 else -1) * self.vel * self.vel / (2 * AX_ACC)
                self.mode = "move"
                self.vcmd = abs(self.vel)
            elif self.mode == "jog":
                self.jog_dir = 0
            return "OK"
        if cmd in ("HOME", "MOVA", "MOVR", "JOG"):
            if self.alarm:
                return err(103, "ALARM")
            if not self.servo:
                return err(102, "SERVO_OFF")
            if cmd == "JOG":
                if not args or args[0] not in ("+", "-", "0"):
                    return err(100, "BAD_ARG")
                if args[0] == "0":
                    if self.mode == "jog":
                        self.jog_dir = 0
                    return "OK"
                if self.moving() and self.mode != "jog":
                    return err(105, "BUSY")
                try:
                    sp = float(args[1]) if len(args) > 1 else 20.0
                except ValueError:
                    return err(100, "BAD_ARG")
                self.vcmd = max(1.0, min(100.0, sp))
                self.jog_dir = 1 if args[0] == "+" else -1
                self.mode = "jog"
                return "OK"
            if self.moving():
                return err(105, "BUSY")
            if cmd == "HOME":
                self.target = 0.0
                self.vcmd = AX_HOME_SPEED
                self.mode = "home"
                self.homed = False
                log("MOT", "開始原點復歸")
                return "OK"
            if not self.homed:
                return err(101, "NOT_HOMED")
            if not args:
                return err(100, "BAD_ARG")
            try:
                val = float(args[0])
                sp = float(args[1]) if len(args) > 1 else 200.0
            except ValueError:
                return err(100, "BAD_ARG")
            tgt = val if cmd == "MOVA" else self.pos + val
            if tgt < AX_MIN - 1e-9 or tgt > AX_MAX + 1e-9:
                return err(104, "OUT_OF_RANGE")
            if sp <= 0 or sp > AX_VMAX:
                return err(107, "BAD_SPEED")
            self.target = tgt
            self.vcmd = sp
            self.mode = "move"
            if "motion_alarm" in self.m.faults:
                self.fault_half = abs(tgt - self.pos) / 2.0
            return "OK"
        return err(199, "UNKNOWN_CMD")


# ----------------------------------------------------------------------------
# 相機影像產生
# ----------------------------------------------------------------------------
NOISE = [max(-20, min(20, int(round(random.gauss(0, 3))))) for _ in range(65536)]


def coverage(px, lo, hi):
    """像素 [px, px+1) 被區間 [lo, hi) 覆蓋的比例"""
    a = max(px, lo)
    b = min(px + 1, hi)
    return max(0.0, b - a)


def box_blur(prof, length):
    n = int(round(length))
    if n <= 1:
        return prof
    out = []
    half = n // 2
    w = len(prof)
    acc = 0.0
    pre = [0.0]
    for v in prof:
        acc += v
        pre.append(acc)
    for i in range(w):
        a = max(0, i - half)
        b = min(w, i - half + n)
        out.append((pre[b] - pre[a]) / (b - a))
    return out


def render_image(m):
    """依目前軸位置、零件狀態、燈光、故障產生一張 320x240 灰階影像"""
    bg = 30.0
    band = None
    stain = None
    prof = [bg] * IMG_W
    part = m.station_part(300.0, 500.0)
    shake_dx = shake_dy = 0.0
    extra_blur = 0.0
    if part is not None:
        if m.cyl["clamp"] < 0.98:
            shake_dx = random.uniform(-6, 6)
            shake_dy = random.uniform(-4, 4)
            extra_blur = 3.0
        spec = PART_TYPES[part.type]
        offset = part.front - STOP_POS
        best = None
        for kind in ("pins", "width", "surface"):
            fx = spec["x_" + kind] + offset
            dpx = (fx - m.axis.pos) / MM_PER_PX
            if abs(dpx) < 200 and (best is None or abs(dpx) < abs(best[1])):
                best = (kind, dpx)
        if best:
            kind, dpx = best
            c = IMG_W / 2.0 + dpx + shake_dx
            if kind == "pins":
                band = (60, 180)
                pw = part.pin_w / MM_PER_PX
                for i, pc in enumerate(part.pin_centers):
                    if i == part.missing:
                        continue
                    lo = c + pc / MM_PER_PX - pw / 2
                    hi = lo + pw
                    for x in range(max(0, int(lo) - 1), min(IMG_W, int(hi) + 2)):
                        prof[x] += (220 - bg) * coverage(x, lo, hi)
            elif kind == "width":
                band = (40, 200)
                lo = c - part.width / MM_PER_PX / 2
                hi = c + part.width / MM_PER_PX / 2
                for x in range(IMG_W):
                    prof[x] += (180 - bg) * coverage(x, lo, hi)
            else:
                band = (40, 200)
                lo, hi = c - 150, c + 150
                for x in range(IMG_W):
                    prof[x] += (180 - bg) * coverage(x, lo, hi)
                if part.stain:
                    sx, sy, rx, ry = part.stain
                    stain = (c + sx, 120 + sy + shake_dy, rx, ry)
    blur = abs(m.axis.vel) * EXPOSURE / MM_PER_PX + extra_blur
    prof = box_blur(prof, blur)
    bgprof = box_blur([bg] * IMG_W, 0)
    gain = random.uniform(0.96, 1.04)
    if not m.do[6] or "light" in m.faults:
        gain *= 0.12
    if "cam_black" in m.faults:
        gain = 0.02
    if band:
        b0 = int(round(band[0] + shake_dy))
        b1 = int(round(band[1] + shake_dy))
    else:
        b0 = b1 = -1
    rowb = bytes(max(0, min(255, int(v * gain))) for v in prof)
    rowg = bytes(max(0, min(255, int(v * gain))) for v in bgprof)
    out = bytearray(IMG_W * IMG_H)
    k = random.randrange(65536)
    for y in range(IMG_H):
        src = rowb if b0 <= y < b1 else rowg
        base = y * IMG_W
        for x in range(IMG_W):
            v = src[x] + NOISE[k]
            k = (k + 1) & 0xFFFF
            out[base + x] = 0 if v < 0 else (255 if v > 255 else v)
    if stain:
        cx, cy, rx, ry = stain
        for y in range(max(b0, int(cy - ry - 2)), min(b1, int(cy + ry + 3))):
            for x in range(max(0, int(cx - rx - 2)), min(IMG_W, int(cx + rx + 3))):
                d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
                if d <= 1.0:
                    out[y * IMG_W + x] = max(0, min(255, int((70 + NOISE[(x * 7 + y) & 0xFFFF]) * gain)))
    if part is not None and INPOS_ZONE[0] <= part.front <= INPOS_ZONE[1]:
        part.inspected += 1
        if m.cyl["clamp"] < 0.98:
            m.violate("V06", "零件 %d 未夾緊就取像（影像會晃動）" % part.id)
    return bytes(out), (part.id if part else 0)


# ----------------------------------------------------------------------------
# TCP 伺服器共用
# ----------------------------------------------------------------------------
class ThreadedTCP(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True


def recv_exact(sock, n):
    buf = b""
    while len(buf) < n:
        chunk = sock.recv(n - len(buf))
        if not chunk:
            return None
        buf += chunk
    return buf


# ---------------- 運動控制器 ----------------
class MotionHandler(socketserver.StreamRequestHandler):
    def handle(self):
        log("MOT", "客戶端連線 %s:%d" % self.client_address, True)
        try:
            while True:
                raw = self.rfile.readline()
                if not raw:
                    break
                line = raw.decode("ascii", "replace").strip("\r\n")
                with LOCK:
                    resp = MACHINE.axis.command(line)
                if resp is None:
                    continue
                up = line.strip().upper()
                if not up.endswith("?"):
                    log("MOT", "RX %-16s → %s" % (line.strip(), resp))
                self.wfile.write((resp + "\n").encode("ascii"))
        except (OSError, ConnectionError):
            pass
        log("MOT", "客戶端離線 %s:%d" % self.client_address, True)


# ---------------- 相機 ----------------
class CameraHandler(socketserver.StreamRequestHandler):
    frame_id = [0]

    def handle(self):
        log("CAM", "客戶端連線 %s:%d" % self.client_address, True)
        try:
            while True:
                raw = self.rfile.readline()
                if not raw:
                    break
                words = raw.decode("ascii", "replace").strip().upper().split()
                if not words:
                    continue
                cmd = words[0]
                if cmd == "PING":
                    self.send_frame(0, 0, 0, 0, 0, b"")
                    continue
                if cmd in ("SETID", "TRIG") and len(words) > 1:
                    if not words[1].isdigit():
                        self.send_frame(1, 0, 0, 0, 0, b"BAD_ID")
                        continue
                    with LOCK:
                        MACHINE.select_part(int(words[1]))
                    if cmd == "SETID":
                        continue                # no reply: LabVIEW only writes it
                if cmd != "TRIG":
                    self.send_frame(1, 0, 0, 0, 0, b"UNKNOWN_CMD")
                    continue
                if "cam_timeout" in MACHINE.faults:
                    log("CAM", "收到 TRIG，但相機故障沒有回應")
                    continue
                time.sleep(0.03)
                with LOCK:
                    img, pid = render_image(MACHINE)
                    ax = MACHINE.axis.pos
                self.frame_id[0] += 1
                log("CAM", "取像 #%d 軸位置 %.3f mm 零件 %s" % (self.frame_id[0], ax, pid or "無"))
                self.send_frame(0, IMG_W, IMG_H, self.frame_id[0], pid, img)
        except (OSError, ConnectionError):
            pass
        log("CAM", "客戶端離線 %s:%d" % self.client_address, True)

    def send_frame(self, status, w, h, fid, pid, data):
        payload = struct.pack(">BHHII", status, w, h, fid, pid) + data
        self.wfile.write(struct.pack(">I", len(payload)) + payload)


# ---------------- MES ----------------
class MES(object):
    def __init__(self):
        self.state = "on"        # on / off(503) / down(不監聽)
        self.slow = 0.0
        self.lots = {}
        self.results = {}
        self.server = None
        self.thread = None

    def start(self):
        self.server = ThreadedHTTP((HOST, PORT_MES), MESHandler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def stop(self):
        if self.server:
            self.server.shutdown()
            self.server.server_close()
            self.server = None


class ThreadedHTTP(socketserver.ThreadingMixIn, HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


class MESHandler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def reply(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def gate(self):
        if MES_SRV.slow > 0:
            time.sleep(MES_SRV.slow)
        if MES_SRV.state == "off":
            self.reply(503, {"ok": False, "code": "SERVICE_UNAVAILABLE"})
            return False
        return True

    def do_GET(self):
        if not self.gate():
            return
        if self.path == "/api/ping":
            self.reply(200, {"ok": True, "server": "SIM-MES", "time": time.strftime("%Y-%m-%dT%H:%M:%S")})
        elif self.path == "/api/stats":
            self.reply(200, stats())
        elif self.path == "/api/lots":
            self.reply(200, {"ok": True, "lots": LOTS})
        else:
            self.reply(404, {"ok": False, "code": "NOT_FOUND"})

    def do_POST(self):
        if not self.gate():
            return
        n = int(self.headers.get("Content-Length", "0") or 0)
        raw = self.rfile.read(n) if n > 0 else b""
        try:
            body = json.loads(raw.decode("utf-8"))
            if not isinstance(body, dict):
                raise ValueError
        except ValueError:
            log("MES", "%s 格式錯誤：%r" % (self.path, raw[:80]), True)
            self.reply(400, {"ok": False, "code": "BAD_FORMAT"})
            return
        with LOCK:
            code, obj = self.route(body)
        log("MES", "%s %s → %s" % (self.path, json.dumps(body, ensure_ascii=False)[:120],
                                   json.dumps(obj, ensure_ascii=False)[:100]), True)
        self.reply(code, obj)

    def route(self, b):
        lots = MES_SRV.lots
        if self.path == "/api/lot/start":
            lot = b.get("lot")
            if lot not in LOTS:
                return 200, {"ok": False, "code": "LOT_NOT_FOUND"}
            if lots.get(lot, {}).get("closed"):
                return 200, {"ok": False, "code": "LOT_CLOSED"}
            if b.get("recipe") != LOTS[lot]["recipe"]:
                return 200, {"ok": False, "code": "RECIPE_MISMATCH", "expected": LOTS[lot]["recipe"]}
            lots.setdefault(lot, {"closed": False, "count": 0, "ok": 0, "ng": 0})
            return 200, {"ok": True, "lot": lot, "recipe": LOTS[lot]["recipe"], "qty": LOTS[lot]["qty"],
                         "done": lots[lot]["count"]}
        if self.path == "/api/result":
            lot = b.get("lot")
            if lot not in lots or lots[lot]["closed"]:
                return 200, {"ok": False, "code": "LOT_NOT_STARTED"}
            pid = b.get("part_id")
            res = b.get("result")
            if not isinstance(pid, int) or res not in ("OK", "NG"):
                return 200, {"ok": False, "code": "BAD_FORMAT"}
            if pid in MES_SRV.results:
                return 200, {"ok": False, "code": "DUPLICATE"}
            MES_SRV.results[pid] = b
            lots[lot]["count"] += 1
            lots[lot]["ok" if res == "OK" else "ng"] += 1
            part = MACHINE.all_parts.get(pid)
            if part is not None and part.truth != res:
                log("GRADE", "MES：零件 %d 回報 %s，真值 %s（%s）" % (pid, res, part.truth, part.defect), True)
            return 200, {"ok": True, "seq": lots[lot]["count"]}
        if self.path == "/api/lot/end":
            lot = b.get("lot")
            if lot not in lots:
                return 200, {"ok": False, "code": "LOT_NOT_STARTED"}
            lots[lot]["closed"] = True
            d = lots[lot]
            return 200, {"ok": True, "summary": {"total": d["count"], "ok": d["ok"], "ng": d["ng"]}}
        return 404, {"ok": False, "code": "NOT_FOUND"}


def stats():
    with LOCK:
        rep = {"reported": 0, "ok": 0, "ng": 0, "correct": 0, "escape": 0, "overkill": 0,
               "defect_match": 0, "unknown_id": 0}
        for pid, r in MES_SRV.results.items():
            p = MACHINE.all_parts.get(pid)
            rep["reported"] += 1
            rep["ok" if r.get("result") == "OK" else "ng"] += 1
            if p is None:
                rep["unknown_id"] += 1
                continue
            if r.get("result") == p.truth:
                rep["correct"] += 1
                if p.truth == "NG" and r.get("defect") == p.defect:
                    rep["defect_match"] += 1
            elif p.truth == "NG":
                rep["escape"] += 1
            else:
                rep["overkill"] += 1
        return {"ok": True, "mes_report": rep, "parts_seen": len(MACHINE.all_parts),
                "violations": dict(MACHINE.violations)}


HELP = """
Commands
  type CN-08|CN-12     part type
  n <defect>           next new ID gets this defect:
                       good missing_pin bent_pin width_ng stain wrong_type
  rate 0.1             random defect rate
  a                    answers for every part seen
  f motion             servo alarm 203 on the next move
  f cam_black          black image
  f cam_timeout        camera does not answer TRIG
  f light              light failure
  f none               clear faults
  f                    list faults
  mes on|off|down      MES normal / 503 / not listening
  mes slow 3           MES delay in seconds, 0 = none
  s                    score: MES results against the truth
  log on|off           show or hide the log
  q                    quit
"""


def console():
    global QUIET
    print(HELP)
    while True:
        try:
            line = input()
        except (EOFError, KeyboardInterrupt):
            break
        a = line.strip().split()
        if not a:
            continue
        c = a[0].lower()
        m = MACHINE
        with LOCK:
            if c in ("q", "quit", "exit"):
                break
            elif c in ("help", "h", "?"):
                print(HELP)
            elif c == "type" and len(a) > 1 and a[1].upper() in PART_TYPES:
                m.part_type = a[1].upper()
                print("type = %s" % m.part_type)
            elif c == "n" and len(a) > 1 and a[1] in DEFECTS:
                m.forced.append(a[1])
                print("forced queue: %s" % m.forced)
            elif c == "rate" and len(a) > 1:
                try:
                    m.defect_rate = max(0.0, min(1.0, float(a[1])))
                    print("rate = %.2f" % m.defect_rate)
                except ValueError:
                    print("usage: rate 0.1")
            elif c == "a":
                for pid in sorted(m.all_parts):
                    print("  " + m.all_parts[pid].describe())
            elif c == "f":
                names = {"motion": "motion_alarm", "cam_black": "cam_black",
                         "cam_timeout": "cam_timeout", "light": "light"}
                if len(a) == 1:
                    print("faults: %s" % (sorted(m.faults) or "none"))
                elif a[1] == "none":
                    m.faults.clear()
                    print("faults cleared")
                elif a[1] in names:
                    m.faults.add(names[a[1]])
                    print("fault: %s" % names[a[1]])
                else:
                    print("unknown fault")
            elif c == "mes" and len(a) > 1:
                if a[1] == "slow" and len(a) > 2:
                    MES_SRV.slow = max(0.0, float(a[2]))
                    print("MES delay %.1f s" % MES_SRV.slow)
                elif a[1] in ("on", "off"):
                    if MES_SRV.server is None:
                        MES_SRV.start()
                    MES_SRV.state = a[1]
                    print("MES %s" % a[1])
                elif a[1] == "down":
                    MES_SRV.stop()
                    MES_SRV.state = "down"
                    print("MES not listening, mes on to restore")
            elif c == "s":
                print(json.dumps(stats(), ensure_ascii=False, indent=2))
            elif c == "log" and len(a) > 1:
                QUIET = a[1] == "off"
            else:
                print("unknown command, type help")
            sys.stdout.flush()


def serve(server_cls, handler, port, name):
    try:
        srv = server_cls((HOST, port), handler)
    except OSError as e:
        print("cannot open %s port %d: %s" % (name, port, e))
        sys.exit(1)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


MACHINE = None
MES_SRV = None


def main():
    global MACHINE, MES_SRV, QUIET, HOST
    ap = argparse.ArgumentParser(description="AOI camera, servo and MES simulator")
    ap.add_argument("--type", default="CN-08", choices=sorted(PART_TYPES))
    ap.add_argument("--rate", type=float, default=0.10)
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--quiet", action="store_true")
    ap.add_argument("--host", default=HOST)
    ap.add_argument("--no-console", action="store_true", help=argparse.SUPPRESS)
    args = ap.parse_args()
    try:
        sys.stdout.reconfigure(errors="replace", encoding="utf-8")
    except AttributeError:
        pass
    HOST = args.host
    if args.seed is not None:
        random.seed(args.seed)
    QUIET = args.quiet
    MACHINE = Machine(args.type, args.rate)
    MES_SRV = MES()
    serve(ThreadedTCP, MotionHandler, PORT_MOTION, "servo")
    serve(ThreadedTCP, CameraHandler, PORT_CAMERA, "camera")
    try:
        MES_SRV.start()
    except OSError as e:
        print("cannot open MES port %d: %s" % (PORT_MES, e))
        sys.exit(1)
    threading.Thread(target=physics_loop, daemon=True).start()
    print("Peripherals ready: servo %d, camera %d, MES %d, type %s, rate %.2f"
          % (PORT_MOTION, PORT_CAMERA, PORT_MES, args.type, args.rate))
    sys.stdout.flush()
    if args.no_console:
        while True:
            time.sleep(1)
    console()
    print("Peripherals stopped")


if __name__ == "__main__":
    main()
