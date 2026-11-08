# -*- coding: utf-8 -*-
"""Opens the wiring window for real, presses its jog buttons, saves one picture per tab to the given folder."""
import argparse
import os
import subprocess
import sys
import threading
import time
import tkinter as tk

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "softplc"))
import hardware_guide                                # noqa: E402
import softplc                                       # noqa: E402

OUT = sys.argv[1]
results = []


def check(name, ok, detail=""):
    results.append(bool(ok))
    print("%-4s %-40s %s" % ("PASS" if ok else "FAIL", name, str(detail)[:100]))


def main():
    root = tk.Tk()
    root.withdraw()

    def pump(seconds):
        end = time.time() + seconds
        while time.time() < end:
            root.update()
            time.sleep(0.01)

    def shot(win, name):
        win.lift()
        win.attributes("-topmost", True)
        pump(0.6)
        script = ("Add-Type -AssemblyName System.Drawing; $b = New-Object Drawing.Bitmap %d,%d; "
                  "$g = [Drawing.Graphics]::FromImage($b); $g.CopyFromScreen(%d,%d,0,0,$b.Size); $b.Save('%s')"
                  % (win.winfo_width(), win.winfo_height(), win.winfo_rootx(), win.winfo_rooty(), os.path.join(OUT, name)))
        subprocess.run(["powershell", "-NoProfile", "-Command", script], timeout=20)
        win.attributes("-topmost", False)

    args = argparse.Namespace(csv=softplc.DEFAULT_CSV, host="127.0.0.1", port=5771, control=5772, slow9600=False)
    rt = softplc.Runtime(args)
    rt.server.start()
    threading.Thread(target=rt.loop, daemon=True).start()
    g = softplc.open_guide(root, rt, tk)
    check("same window on second open", g is softplc.open_guide(root, rt, tk))
    pump(0.5)
    check("auto mode says manual is off", "M5 OFF" in g.state.cget("text"), g.state.cget("text"))
    rt.machine.press("X010", 0)
    pump(0.6)
    check("manual mode allowed", "M5 ON" in g.state.cget("text"), g.state.cget("text"))
    b = g.jog[124]
    b.invoke()
    pump(0.5)
    check("vacuum toggle reaches Y5", rt.plc.y_out[5] == 1)
    check("Y table shows it", g.y_tree.set("Y005", "now") == "ON", g.y_tree.set("Y005", "now"))
    b.invoke()
    pump(0.4)
    check("vacuum toggles off", rt.plc.y_out[5] == 0)
    b = g.jog[122]
    b.event_generate("<ButtonPress-1>")
    pump(0.4)
    check("hold button goes on", rt.plc.m[122] == 1)
    b.event_generate("<ButtonRelease-1>")
    pump(0.3)
    check("release goes off", rt.plc.m[122] == 0)
    check("X13 shown on", g.x_tree.set("X013", "now") == "ON")
    check("all parts listed", len(g.parts.get_children()) == len(hardware_guide.PARTS))
    for i in range(g.book.index("end")):
        g.book.select(i)
        pump(0.3)
        shot(g.win, "guide_%d.png" % i)
    g.win.destroy()
    pump(0.2)
    rt.running = False
    rt.server.stop()
    print("%d/%d" % (sum(results), len(results)))
    return 0 if all(results) else 1


sys.exit(main())
