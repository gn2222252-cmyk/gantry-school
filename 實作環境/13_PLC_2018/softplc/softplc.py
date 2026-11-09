# -*- coding: utf-8 -*-
"""Soft PLC: runs ladder\\AOI_PLC.csv and serves the FX programming-port protocol.

  python softplc.py                 window
  python softplc.py --headless      no window (automatic tests)
  python softplc.py --slow9600      add the delay of a 9600 bps line
"""
import argparse
import os
import sys
import threading
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from fx_server import FxServer            # noqa: E402
from plc_csv import load_csv              # noqa: E402
from plc_engine import PLC                # noqa: E402

DEFAULT_CSV = os.path.join(HERE, "..", "ladder", "AOI_PLC.csv")

STEP_NAMES = {10: "Init", 20: "Purge", 30: "Idle", 40: "RequestPart", 50: "ToStopper", 60: "Clamp",
              70: "Inspect", 80: "Release", 90: "ToSort", 100: "PushNG", 110: "ToExit", 120: "Done",
              900: "Error", 910: "AlarmWait"}
WATCH = [("D300 step", 300), ("D301 alarm", 301), ("D302 status", 302), ("D303 sensors1", 303),
         ("D304 sensors2", 304), ("D305 outputs", 305), ("D306 part id", 306), ("D310 total", 310),
         ("D311 OK", 311), ("D312 NG", 312), ("D313 NG bin", 313), ("D314 air kPa", 314),
         ("D315 speed %", 315), ("D400 part", 400), ("D401 id", 401), ("D402 pos", 402),
         ("D403 result", 403), ("D520 heartbeat", 520), ("D550 faults", 550)]
INPUTS = [("0", "X0 START", False), ("1", "X1 STOP", False), ("2", "X2 RESET", False),
          ("3", "X3 ESTOP (NC)", True)]
OUTPUTS = [("0", "Y0 CONVEYOR"), ("1", "Y1 STOPPER"), ("2", "Y2 CLAMP"), ("3", "Y3 PUSHER"),
           ("4", "Y4 GREEN"), ("5", "Y5 YELLOW"), ("6", "Y6 RED"), ("7", "Y7 BUZZER")]


class Runtime(object):
    def __init__(self, args):
        self.program = load_csv(args.csv)
        self.plc = PLC(self.program)
        self.plc.set_x(3, 1)                 # ESTOP is normally closed
        self.log_lines = []
        self.server = FxServer(self.plc, args.host, args.port, args.slow9600, self.log)
        self.running = True
        self.scan_max_ms = 0.0

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
            self.plc.scan(dt)
            self.server.service()
            self.scan_max_ms = max(self.scan_max_ms, (time.perf_counter() - begin) * 1000)
            next_tick += 0.010
            wait = next_tick - time.perf_counter()
            if wait > 0:
                time.sleep(wait)
            else:
                next_tick = time.perf_counter()


def run_window(rt, args):
    import tkinter as tk
    root = tk.Tk()
    root.title("Soft PLC - FX3S  %s:%d" % (args.host, args.port))
    left = tk.LabelFrame(root, text="Inputs")
    left.grid(row=0, column=0, sticky="nsew", padx=6, pady=6)
    momentary = {}

    def press(n, value):
        rt.plc.set_x(n, value)

    for n, label, toggle in INPUTS:
        if toggle:
            var = tk.IntVar(value=1)
            box = tk.Checkbutton(left, text=label + " : checked = released", variable=var, anchor="w",
                                 command=lambda n=n, v=var: rt.plc.set_x(n, v.get()))
            box.pack(fill="x", padx=4, pady=3)
        else:
            b = tk.Button(left, text=label, width=20)
            b.bind("<ButtonPress-1>", lambda e, n=n: press(n, 1))
            b.bind("<ButtonRelease-1>", lambda e, n=n: press(n, 0))
            b.pack(padx=4, pady=3)
            momentary[n] = b

    middle = tk.LabelFrame(root, text="Outputs")
    middle.grid(row=0, column=1, sticky="nsew", padx=6, pady=6)
    lamps = {}
    for n, label in OUTPUTS:
        lamps[n] = tk.Label(middle, text=label, width=16, relief="groove", bg="#444444", fg="white")
        lamps[n].pack(padx=4, pady=2)

    right = tk.LabelFrame(root, text="Registers")
    right.grid(row=0, column=2, rowspan=2, sticky="nsew", padx=6, pady=6)
    values = {}
    for i, (label, address) in enumerate(WATCH):
        tk.Label(right, text=label, anchor="w", width=15).grid(row=i, column=0, sticky="w")
        values[address] = tk.Label(right, text="0", anchor="e", width=9, font=("Consolas", 10))
        values[address].grid(row=i, column=1, sticky="e")
    step_text = tk.Label(root, text="", font=("Segoe UI", 12, "bold"))
    step_text.grid(row=1, column=0, columnspan=2, sticky="w", padx=8)

    bottom = tk.LabelFrame(root, text="Communication log")
    bottom.grid(row=2, column=0, columnspan=3, sticky="nsew", padx=6, pady=6)
    log_box = tk.Text(bottom, width=86, height=10, font=("Consolas", 9), state="disabled")
    log_box.pack(fill="both", expand=True)
    colors = {"Y4 GREEN": "#22aa22", "Y5 YELLOW": "#d4b000", "Y6 RED": "#cc2222", "Y7 BUZZER": "#cc2222"}

    def refresh():
        plc = rt.plc
        for n, label in OUTPUTS:
            on = plc.get_y(n)
            lamps[n].configure(bg=colors.get(label, "#2277cc") if on else "#444444")
        for _, address in WATCH:
            word = plc.d[address] & 0xFFFF
            values[address].configure(text="%04X h" % word if address in (302, 303, 304, 305, 550) else str(plc.d[address]))
        step = plc.d[300]
        step_text.configure(text="Step %d %s   requests %d  errors %d  scan max %.1f ms%s"
                            % (step, STEP_NAMES.get(step, "?"), rt.server.requests, rt.server.errors,
                               rt.scan_max_ms, "   [9600 bps]" if args.slow9600 else ""))
        log_box.configure(state="normal")
        log_box.delete("1.0", "end")
        log_box.insert("end", "\n".join(rt.log_lines[-12:]))
        log_box.configure(state="disabled")
        root.after(100, refresh)

    def on_close():
        rt.running = False
        root.destroy()

    root.protocol("WM_DELETE_WINDOW", on_close)
    refresh()
    root.mainloop()


def main():
    ap = argparse.ArgumentParser(description="Soft PLC for AOI_PLC.csv")
    ap.add_argument("--csv", default=DEFAULT_CSV)
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=5551)
    ap.add_argument("--slow9600", action="store_true")
    ap.add_argument("--headless", action="store_true")
    args = ap.parse_args()
    rt = Runtime(args)
    rt.server.start()
    worker = threading.Thread(target=rt.loop, daemon=True)
    worker.start()
    print("Soft PLC running: %s, %d steps, %s:%d" % (os.path.basename(args.csv), rt.plc.total_steps,
                                                     args.host, args.port))
    sys.stdout.flush()
    if args.headless:
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass
    else:
        run_window(rt, args)
    rt.running = False
    rt.server.stop()


if __name__ == "__main__":
    main()
