# -*- coding: utf-8 -*-
"""Drives the real monitor window the way a person does, on spare ports, and prints what it shows.
Pictures go to the folder given as the first argument."""
import argparse
import os
import subprocess
import sys
import threading
import time
import tkinter as tk

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "softplc"))
import softplc                                       # noqa: E402

OUT = sys.argv[1]
results = []


def check(name, ok, detail=""):
    results.append(bool(ok))
    print("%-4s %-34s %s" % ("PASS" if ok else "FAIL", name, detail))
    sys.stdout.flush()


def shot(win, name):
    win.lift()
    win.attributes("-topmost", True)
    win.update()
    script = ("Add-Type -AssemblyName System.Drawing; $b = New-Object Drawing.Bitmap %d,%d; "
              "$g = [Drawing.Graphics]::FromImage($b); $g.CopyFromScreen(%d,%d,0,0,$b.Size); $b.Save('%s')"
              % (win.winfo_width(), win.winfo_height(), win.winfo_rootx(), win.winfo_rooty(), os.path.join(OUT, name)))
    subprocess.run(["powershell", "-NoProfile", "-Command", script], timeout=20)


def main():
    args = argparse.Namespace(csv=softplc.DEFAULT_CSV, host="127.0.0.1", port=5751, control=5752, slow9600=False)
    rt = softplc.Runtime(args)
    rt.server.start()
    threading.Thread(target=rt.loop, daemon=True).start()
    root = tk.Tk()
    root.withdraw()
    v = softplc.open_ladder(root, rt, tk)
    second = softplc.open_ladder(root, rt, tk)
    check("second open returns the same window", v is second)

    def wait(test, seconds):
        end = time.time() + seconds
        while time.time() < end:
            root.update()
            if test():
                return True
            time.sleep(0.02)
        return False

    def hint():
        root.update()
        return v.hint.cget("text")

    wait(lambda: False, 0.5)
    check("idle says what to do", "原點" in hint(), hint())
    shot(v.win, "ladder_idle.png")

    v.one_scan()
    wait(lambda: False, 0.4)
    check("button shows 繼續 after one scan", v.pause_text.get() == "繼續", v.pause_text.get())
    check("pause is explained", "暫停" in hint(), hint())
    before = rt.plc.scans
    v.one_scan()
    wait(lambda: rt.plc.scans != before, 1)
    check("one scan runs exactly one", rt.plc.scans == before + 1, rt.plc.scans - before)
    v.toggle_pause()
    wait(lambda: False, 0.3)
    check("resume", v.pause_text.get() == "暫停" and rt.plc.scans > before + 3)

    v.sections.selection_clear(0, "end")
    v.sections.selection_set(9)
    v.jump(None)
    wait(lambda: False, 0.3)
    top = v.canvas.yview()[0]
    want = v.paint.section_y[v.sections.get(9)] / float(v.paint.total)
    check("list click jumps to P10", abs(top - want) < 0.02, "%.3f %.3f" % (top, want))
    v.follow.set("右龍門")

    rt.machine.left.axis = 400.0              # away from home, or homing is over within a few scans
    rt.plc.m[103] = 1
    wait(lambda: rt.plc.m[21], 2)
    pass
    check("X17 starts homing", rt.plc.m[21] == 1)
    wait(lambda: False, 0.25)                 # the hint line refreshes every 120 ms
    check("homing is explained", "原點復歸中" in hint(), hint())
    check("homed", wait(lambda: rt.plc.m[20], 10))
    wait(lambda: False, 0.3)
    check("next step: add a part", "放工件" in hint(), hint())
    rt.machine.add_part("front", 700)
    wait(lambda: False, 0.3)
    check("next step: start", "啟動" in hint(), hint())
    rt.plc.m[100] = 1
    wait(lambda: rt.plc.m[0], 2)
    pass
    check("running", wait(lambda: rt.plc.d[200] == 24, 12), rt.plc.d[200])
    wait(lambda: False, 0.5)
    shot(v.win, "ladder_running.png")
    v.one_scan()
    wait(lambda: False, 0.2)
    v.close()
    check("closing the window clears a pause", rt.paused is False)
    rt.running = False
    rt.server.stop()
    print("%d/%d" % (sum(results), len(results)))
    return 0 if all(results) else 1


sys.exit(main())
