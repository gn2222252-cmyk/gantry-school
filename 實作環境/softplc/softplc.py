# -*- coding: utf-8 -*-
"""Soft PLC plus machine simulation, for testing the LabVIEW host without a real PLC.

    python softplc.py                 window with the machine picture and the operator box
    python softplc.py --ladder        also open the live ladder monitor
    python softplc.py --no-board      8-output synchronous version, no expansion board
    python softplc.py --headless      no window, used by the automatic tests

Port 5551: FX programming protocol (LabVIEW connects here).
Port 5552: one text command per line, for tests. See handle() below.
"""
import argparse
import json
import os
import socket
import sys
import threading
import time

# A windowed exe started by double-click has no console: print() would fail, so send output to a log file.
if getattr(sys, "frozen", False) and (sys.stdout is None or sys.stderr is None):
    _log = open(os.path.join(os.path.dirname(sys.executable), "softplc_log.txt"), "a", encoding="utf-8", buffering=1)
    sys.stdout = sys.stdout or _log
    sys.stderr = sys.stderr or _log
# Frozen build (softplc_exe\softplc.exe): data files are found next to the exe folder, like the .py files here.
HERE = os.path.dirname(sys.executable) if getattr(sys, "frozen", False) else os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from fx_server import LinkServer           # noqa: E402
from gantry_sim import Machine             # noqa: E402
from plc_csv import load_csv               # noqa: E402
from plc_engine import PLC                 # noqa: E402

DEFAULT_CSV = os.path.join(HERE, "..", "ladder", "GANTRY_PLC.csv")
CSV_8Y = os.path.join(HERE, "..", "ladder", "GANTRY_8Y.csv")
SOURCE_8Y = os.path.join(HERE, "..", "ladder", "GANTRY_8Y_source.il")
WATCH = [("D200 右龍門步序", 200), ("D201 左龍門步序", 201), ("D202 原點步序", 202), ("D210 右搬運次數", 210),
         ("D211 左搬運次數", 211), ("D212 總循環數", 212), ("D220 異常碼", 220), ("D240 HMI 心跳", 240),
         ("D241 PLC 心跳", 241), ("D100 吸附時間", 100), ("D101 釋放時間", 101), ("D102 動作逾時", 102),
         ("D103 目標次數", 103)]
LAMPS = [("2", "Y2 輸送帶", "#2277cc"), ("5", "Y5 吸盤（左右共用）", "#2277cc")]


class Runtime(object):
    def __init__(self, args):
        self.board = not getattr(args, "no_board", False)
        self.csv_path = args.csv if self.board else CSV_8Y
        self.plc = PLC(load_csv(self.csv_path))
        self.machine = Machine(self.plc, self.board)
        self.source = None if self.board else SOURCE_8Y
        self.log_lines = []
        self.server = LinkServer(self.plc, args.host, args.port, args.slow9600, self.log)
        self.control_port = args.control
        self.host = args.host
        self.running = True
        self.scan_max_ms = 0.0
        self.paused = False         # ladder monitor: hold the program and the machine
        self.step_once = False      # ladder monitor: run one scan, then hold
        self.speed = 1.0            # ladder monitor: slow motion

    def log(self, text):
        self.log_lines.append("%s %s" % (time.strftime("%H:%M:%S"), text))
        del self.log_lines[:-200]

    def loop(self):
        last = time.perf_counter()
        next_tick = last
        while self.running:
            now = time.perf_counter()
            dt = min(50, max(1, int(round((now - last) * 1000))))
            last = now
            begin = time.perf_counter()
            if self.paused and not self.step_once:
                self.server.service()           # the line stays alive, so LabVIEW keeps its connection
                time.sleep(0.01)
                next_tick = time.perf_counter()
                continue
            if self.step_once:
                self.step_once = False
                dt = 10
            else:
                dt = max(1, int(round(dt * self.speed)))
            self.machine.apply_inputs()
            self.plc.scan(dt)
            self.server.service()
            self.machine.step(dt)
            self.scan_max_ms = max(self.scan_max_ms, (time.perf_counter() - begin) * 1000)
            next_tick += 0.010
            wait = next_tick - time.perf_counter()
            if wait > 0:
                time.sleep(wait)
            else:
                next_tick = time.perf_counter()

    def status(self):
        p, m = self.plc, self.machine
        return {"d": {str(a): p.d[a] for _, a in WATCH}, "m": {str(i): p.m[i] for i in (0, 1, 2, 3, 4, 20, 21, 110, 125)},
                "y": [p.y_out[i] for i in range(16)], "x": [p.x[i] for i in range(16)], "states": p.active_states(),
                "left": [m.left.axis, m.left.z, m.left.vacuum], "right": [m.right.axis, m.right.z, m.right.vacuum],
                "parts": m.parts, "placed": m.placed, "requests": self.server.requests, "errors": self.server.errors,
                "scan_max_ms": self.scan_max_ms}

    def handle(self, line):
        """part [front|rear] [pos] | press X010 1 | hmi 100 | force X003 0 | unforce X003 | stuck L|R axis|cyl 0|1
        mute 0|1 (pull the cable) | status | quit"""
        w = line.split()
        if not w:
            return "ok"
        cmd = w[0]
        m = self.machine
        if cmd == "part":
            part = m.add_part(w[1] if len(w) > 1 else "front", float(w[2]) if len(w) > 2 else 0.0)
            return "ok %d" % part["id"]
        if cmd == "press":
            m.press(w[1], int(w[2]))
        elif cmd == "hmi":
            self.plc.m[int(w[1])] = 1
        elif cmd == "force":
            m.force[w[1]] = int(w[2])
        elif cmd == "unforce":
            m.force.pop(w[1], None)
        elif cmd == "stuck":
            setattr(m.left if w[1] == "L" else m.right, w[2] + "_stuck", bool(int(w[3])))
        elif cmd == "mute":
            self.server.mute = bool(int(w[1]))
        elif cmd == "status":
            return json.dumps(self.status())
        elif cmd == "quit":
            self.running = False
        else:
            return "error unknown command"
        return "ok"

    def control(self):
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind((self.host, self.control_port))
        s.listen(4)
        while self.running:
            conn, _ = s.accept()
            threading.Thread(target=self._control_client, args=(conn,), daemon=True).start()

    def _control_client(self, conn):
        with conn, conn.makefile("rw", encoding="utf-8", newline="\n") as f:
            for line in f:
                try:
                    reply = self.handle(line)
                except (ValueError, IndexError, KeyError, AttributeError) as exc:
                    reply = "error %r" % exc
                f.write(reply + "\n")
                f.flush()


def open_ladder(root, rt, tk):
    """Only one monitor: two windows share one pause and would disagree on screen."""
    from ladder_paint import LadderWindow
    old = getattr(rt, "ladder", None)
    if old is not None and old.win.winfo_exists():
        old.win.lift()
        return old
    rt.ladder = LadderWindow(root, rt, tk)
    return rt.ladder


def open_guide(root, rt, tk):
    import hardware_guide
    return hardware_guide.open_window(root, rt, tk)


def run_window(rt, args):
    import tkinter as tk
    root = tk.Tk()
    root.title("雙龍門機台模擬器（軟體 PLC＋機構模擬）%s  %s:%d" % ("FX3S-20MT＋2EYT-BD" if rt.board else "FX3S-20MT 8 輸出同步版", args.host, args.port))
    m = rt.machine
    canvas = tk.Canvas(root, width=760, height=260, bg="#1e1e1e")
    canvas.grid(row=0, column=0, columnspan=3, padx=6, pady=6)

    box = tk.LabelFrame(root, text="現場操作盒")
    box.grid(row=1, column=0, sticky="nsew", padx=6, pady=6)
    estop = tk.IntVar(value=0)
    tk.Checkbutton(box, text="X13 急停按下（勾選＝按下）", variable=estop,
                   command=lambda: m.press("X013", not estop.get())).pack(anchor="w", padx=4)
    mode = tk.IntVar(value=1)
    tk.Checkbutton(box, text="X10 自動模式（不勾＝手動）", variable=mode,
                   command=lambda: m.press("X010", mode.get())).pack(anchor="w", padx=4)
    for bit, label in ((100, "啟動（M100）"), (101, "停止（M101）"), (102, "原點（M102）"), (103, "復歸（M103）")):
        tk.Button(box, text=label, width=20,
                  command=lambda n=bit: rt.plc.m.__setitem__(n, 1)).pack(padx=4, pady=2)
    tk.Button(box, text="開梯形圖監看 Ladder monitor", width=34, bg="#cfe6ff",
              command=lambda: open_ladder(root, rt, tk)).pack(padx=4, pady=(2, 8))
    tk.Button(box, text="手動操作、器材與接線", width=34, bg="#d6f0d0",
              command=lambda: open_guide(root, rt, tk)).pack(padx=4, pady=(0, 8))
    tk.Button(box, text="前輸送帶放工件 Add part on front belt", width=34, command=lambda: m.add_part("front")).pack(padx=4, pady=2)
    tk.Button(box, text="後輸送帶放工件 Add part on rear belt", width=34, command=lambda: m.add_part("rear")).pack(padx=4, pady=2)

    middle = tk.LabelFrame(root, text="輸出")
    middle.grid(row=1, column=1, sticky="nsew", padx=6, pady=6)
    lamps = {}
    for n, label, _ in LAMPS:
        lamps[n] = tk.Label(middle, text=label, width=18, relief="groove", bg="#444444", fg="white")
        lamps[n].pack(padx=4, pady=2)

    right = tk.LabelFrame(root, text="暫存器")
    right.grid(row=1, column=2, sticky="nsew", padx=6, pady=6)
    values = {}
    for i, (label, address) in enumerate(WATCH):
        tk.Label(right, text=label, anchor="w", width=17).grid(row=i, column=0, sticky="w")
        values[address] = tk.Label(right, text="0", anchor="e", width=7, font=("Consolas", 10))
        values[address].grid(row=i, column=1, sticky="e")
    status = tk.Label(root, text="", anchor="w")
    status.grid(row=2, column=0, columnspan=3, sticky="we", padx=8)

    def x_of(pos):            # belt position 0-1000 -> screen, left to right
        return 90 + pos * 0.58

    def draw_gantry(g, x, held):
        y = 70 + (1000.0 - g.axis) * 0.09
        canvas.create_line(x, 30, x, 230, fill="#777777", width=8)
        drop = 12 + g.z * 22
        canvas.create_rectangle(x - 16, y - 12, x + 16, y + 12, fill="#c9a227", outline="")
        canvas.create_line(x, y + 12, x, y + 12 + drop, fill="#dddddd", width=3)
        canvas.create_oval(x - 7, y + 12 + drop - 4, x + 7, y + 12 + drop + 6,
                           fill="#33cc55" if g.vacuum else "#555555", outline="")
        if held:
            canvas.create_rectangle(x - 12, y + 18 + drop, x + 12, y + 30 + drop, fill="#e07b39", outline="")

    def refresh():
        p = rt.plc
        canvas.delete("all")
        rear_y, front_y = 95, 185
        for y, name in ((rear_y, "後輸送帶  ← 右往左"), (front_y, "前輸送帶  → 左往右")):
            canvas.create_rectangle(70, y, 690, y + 26, fill="#3a3a3a", outline="#666666")
            canvas.create_text(380, y + 13, text=name, fill="#aaaaaa")
        for part in m.parts:
            if part["on"] == "front":
                x, y = x_of(part["pos"]), front_y
            elif part["on"] == "rear":
                x, y = x_of(1000 - part["pos"]), rear_y
            else:
                continue
            canvas.create_rectangle(x - 12, y + 6, x + 12, y + 20, fill="#e07b39", outline="")
        canvas.create_text(x_of(0) - 2, 16, text="左龍門", fill="#dddddd")
        canvas.create_text(x_of(1000) + 2, 16, text="右龍門", fill="#dddddd")
        draw_gantry(m.left, x_of(0) - 2, any(q["on"] == "L" for q in m.parts))
        draw_gantry(m.right, x_of(1000) + 2, any(q["on"] == "R" for q in m.parts))
        for n, label, color in LAMPS:
            lamps[n].configure(bg=color if p.get_y(n) else "#444444")
        for _, address in WATCH:
            values[address].configure(text=str(p.d[address]))
        status.configure(text="作用中步序 %s   通訊 %d 次  錯誤 %d  最長掃描 %.1f ms%s"
                         % (p.active_states(), rt.server.requests, rt.server.errors, rt.scan_max_ms,
                            "   [9600 bps]" if args.slow9600 else ""))
        root.after(100, refresh)

    def on_close():
        rt.running = False
        root.destroy()

    root.protocol("WM_DELETE_WINDOW", on_close)
    refresh()
    if args.learn:
        import learn
        learn.open_window(root, tk)
    if args.ladder or args.shot:
        ladder = open_ladder(root, rt, tk)
        if args.shot:
            def grab():
                import subprocess
                w = ladder.win
                w.lift()
                w.attributes("-topmost", True)
                w.update()
                script = ("Add-Type -AssemblyName System.Drawing; $b = New-Object Drawing.Bitmap %d,%d; "
                          "$g = [Drawing.Graphics]::FromImage($b); $g.CopyFromScreen(%d,%d,0,0,$b.Size); $b.Save('%s')"
                          % (w.winfo_width(), w.winfo_height(), w.winfo_rootx(), w.winfo_rooty(), args.shot))
                subprocess.run(["powershell", "-NoProfile", "-Command", script], timeout=20)
                on_close()
            m.add_part("front", 900)
            rt.plc.m[102] = 1
            root.after(1500, lambda: rt.plc.m.__setitem__(100, 1))
            root.after(args.shot_ms, grab)
    root.mainloop()


def main():
    ap = argparse.ArgumentParser(description="Soft PLC and machine simulation for GANTRY_PLC.csv")
    ap.add_argument("--csv", default=DEFAULT_CSV)
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=5551)
    ap.add_argument("--control", type=int, default=5552)
    ap.add_argument("--slow9600", action="store_true")
    ap.add_argument("--headless", action="store_true")
    ap.add_argument("--no-board", action="store_true", help="8-output synchronous version")
    ap.add_argument("--ladder", action="store_true", help="open the ladder monitor at start")
    ap.add_argument("--learn", action="store_true", help="open the learning window at start")
    ap.add_argument("--shot", default="", help="test: save a picture of the ladder monitor, then quit")
    ap.add_argument("--shot-ms", type=int, default=4000)
    args = ap.parse_args()
    rt = Runtime(args)
    rt.server.start()
    threading.Thread(target=rt.loop, daemon=True).start()
    threading.Thread(target=rt.control, daemon=True).start()
    print("Soft PLC running: %s, %d steps, %s:%d" % (os.path.basename(rt.csv_path), rt.plc.total_steps,
                                                     args.host, args.port))
    sys.stdout.flush()
    if args.headless:
        try:
            while rt.running:
                time.sleep(0.2)
        except KeyboardInterrupt:
            pass
    else:
        run_window(rt, args)
    rt.running = False
    rt.server.stop()


if __name__ == "__main__":
    main()
