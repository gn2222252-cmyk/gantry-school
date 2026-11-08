# -*- coding: utf-8 -*-
"""Opens the learning window and the monitor for real, clicks through them, saves pictures to the given folder."""
import argparse
import os
import subprocess
import sys
import threading
import time
import tkinter as tk

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "softplc"))
import learn                                         # noqa: E402
import softplc                                       # noqa: E402
from lessons import LESSONS                          # noqa: E402

OUT = sys.argv[1]
results = []


def check(name, ok, detail=""):
    results.append(bool(ok))
    print("%-4s %-40s %s" % ("PASS" if ok else "FAIL", name, str(detail)[:120]))
    sys.stdout.flush()


def shot(win, name):
    win.lift()
    win.attributes("-topmost", True)
    end = time.time() + 0.6                   # a picture taken at once can show an unpainted window
    while time.time() < end:
        win.update()
        time.sleep(0.01)
    script = ("Add-Type -AssemblyName System.Drawing; $b = New-Object Drawing.Bitmap %d,%d; "
              "$g = [Drawing.Graphics]::FromImage($b); $g.CopyFromScreen(%d,%d,0,0,$b.Size); $b.Save('%s')"
              % (win.winfo_width(), win.winfo_height(), win.winfo_rootx(), win.winfo_rooty(), os.path.join(OUT, name)))
    subprocess.run(["powershell", "-NoProfile", "-Command", script], timeout=20)
    win.attributes("-topmost", False)


def main():
    root = tk.Tk()
    root.withdraw()

    def pump(seconds):
        end = time.time() + seconds
        while time.time() < end:
            root.update()
            time.sleep(0.01)

    w = learn.open_window(root, tk)
    check("same window on second open", w is learn.open_window(root, tk))
    pump(0.3)
    for i, lesson in enumerate(LESSONS):
        w.load(i)
        pump(0.15)
        check("lesson %d opens" % (i + 1), w.paint.bands, lesson["title"])

    w.load(6)
    w.play()
    w.hold.set(0)
    pump(5.0)
    states = w.run.plc.active_states()
    check("lesson 6 demo moves on", states and states != [0], states)
    check("step chart shows it", any(x.cget("bg") == "#e0ae25" for x in w.sfc.values()))
    shot(w.win, "learn_6.png")

    w.load(6)
    w.play()
    w.hold.set(0)
    pump(1.0)
    w.toggle_pause()
    pump(0.2)
    before = (w.run.plc.scans, len(w.script), w.say.cget("text"))
    pump(1.5)
    check("pause holds machine and captions", before == (w.run.plc.scans, len(w.script), w.say.cget("text")))
    check("button says continue", "繼續" in w.pause_text.get(), w.phase.cget("text"))
    w.toggle_pause()
    pump(0.3)
    check("continue runs again", w.run.plc.scans > before[0])
    first = w.say.cget("text")
    w.next_line()
    pump(0.3)
    w.next_line()
    pump(0.3)
    check("next line changes the caption", w.say.cget("text") != first, w.say.cget("text"))
    check("line counter shows", "句" in w.phase.cget("text"), w.phase.cget("text"))

    w.load(6)
    w.set_speed("1/4")
    w.hold.set(1)
    w.play()
    pump(2.0)
    t0 = w.run.plc.clock_ms
    pump(1.0)
    check("quarter speed runs slower", w.run.plc.clock_ms - t0 <= 300, w.run.plc.clock_ms - t0)
    w.set_speed("1 倍")
    pump(1.6)
    check("wait-for-me stops after a line", w.paused, w.phase.cget("text"))
    w.hold.set(0)
    w.set_speed("1/2")

    w.load(5)
    w.hold.set(0)
    w.set_speed("1 倍")
    w.play()
    w.hold.set(0)
    for _ in range(1200):
        pump(0.02)
        if w.warning.cget("text"):
            break
    check("lesson 5 shows the warning", "同時輸出" in w.warning.cget("text"), w.say.cget("text"))
    pump(3.0)
    shot(w.win, "learn_5_jam.png")
    w.load(6)
    w.play()
    w.hold.set(0)
    pump(9.5)
    check("lesson 6 stays clean", w.warning.cget("text") == "", w.say.cget("text"))
    w.set_speed("1/2")

    titles = [x["title"] for x in LESSONS]
    w.load(titles.index("A8 逾時與異常：機台的保命結構"))
    pump(0.6)
    shot(w.win, "learn_a8.png")
    w.load(titles.index("A8 逾時與異常：機台的保命結構"))
    w.run.finish(0.1)
    w.run.set_input("X000", 1)
    pump(0.3)
    w.run.set_input("X000", 0)
    pump(1.2)
    coil = [e for e in w.paint.live if e[0] == "out" and e[5] == ["T0", "K30"]][0]
    check("timer coil lit while counting", w.canvas.itemcget(coil[3], "fill") == "#2fbf5b", w.canvas.itemcget(coil[3], "fill"))
    check("timer value beside the coil", "現在值" in w.canvas.itemcget(coil[6], "text"), w.canvas.itemcget(coil[6], "text"))
    shot(w.win, "learn_a8_count.png")
    w.load(titles.index("A4 OUT、SET、RST、PLS、PLF"))
    w.run.set_input("X000", 1)
    pump(0.3)
    w.run.set_input("X000", 0)
    pump(0.6)
    box = [e for e in w.paint.live if e[0] == "out" and e[4] == "SET"][0]
    check("SET box stays green", w.canvas.itemcget(box[3], "fill") == "#2fbf5b", w.canvas.itemcget(box[3], "fill"))
    check("Y1 lamp stays on", w.lamps["Y001"][0].cget("bg") == "#3fe07a")
    shot(w.win, "learn_a4_set.png")
    w.load(titles.index("A6 特殊繼電器 M8000 家族"))
    pump(1.0)
    shot(w.win, "learn_a6.png")
    w.load(titles.index("A9 接線：現場常閉 ≠ 程式常閉"))
    pump(0.6)
    check("A9 starts with the NC input on", w.run.get_input("X001") == 1)
    shot(w.win, "learn_a9.png")
    w.load(titles.index("6-1 步進和一般階梯圖差在哪"))
    pump(0.6)
    check("comparison table shows", len(w.table.winfo_children()) > 10)
    shot(w.win, "learn_6_1.png")
    w.load(titles.index("6-3 通用嗎？換廠牌怎麼辦"))
    pump(0.6)
    shot(w.win, "learn_6_3.png")
    w.load(titles.index("6-4 一般階梯圖怎麼轉步進"))
    w.set_speed("1 倍")
    w.play()
    w.hold.set(0)
    pump(1.0)
    check("conversion starts with self-hold", any(hasattr(r, "outputs") and r.state is None for r in w.run.rungs) and not w.paint.state_y)
    for _ in range(600):
        pump(0.02)
        if w.paint.state_y:
            break
    check("program is swapped to STL", "S20" in w.paint.state_y)
    pump(1.5)
    shot(w.win, "learn_6_4.png")
    for _ in range(600):
        pump(0.02)
        if not w.script and not w.wait:
            break
    pump(1.0)
    check("converted program finished a cycle", w.run.plc.active_states() == [0], w.run.plc.active_states())
    w.set_speed("1/2")

    w.load(3)
    w.play()
    check("lesson turns wait-for-me on", w.hold.get() == 1)
    pump(2.0)
    check("it stops after the line", w.paused, w.say.cget("text"))
    first = w.say.cget("text")
    w.next_line()
    pump(0.5)
    check("next line moves on", w.say.cget("text") != first, w.say.cget("text"))
    check("log keeps what was said", first in w.log.get("1.0", "end"))
    w.set_speed("1 倍")
    for _ in range(800):
        pump(0.02)
        if w.paused:
            if "第 1 圈 第 1 行" in w.say.cget("text"):
                break
            w.next_line()
    check("caption says M0 ON and M0 is ON", w.run.plc.m[0] == 1 and "M0 線圈 ON" in w.say.cget("text"), w.say.cget("text"))
    check("M1 not computed yet", w.run.plc.m[1] == 0)
    y = [e for e in w.paint.live if e[0] == "out" and e[4] == "INC"][0]
    check("rungs below the frame stay grey", w.canvas.itemcget(y[3], "fill") == "#14171b", w.canvas.itemcget(y[3], "fill"))
    shot(w.win, "learn_edge_rung1.png")
    w.hold.set(0)
    w.next_line()
    check("edge lesson shows its numbers", "D0 =" in w.values["D0"].cget("text"), w.values["D1"].cget("text"))
    w.set_speed("1 倍")
    end = time.time() + 40                    # one slow scan takes about 10 s
    while time.time() < end and sum(1 for c in w.trace_cells if c[0].cget("text")) < 2:
        pump(0.2)
    filled = [c[0].cget("text") for c in w.trace_cells if c[0].cget("text")]
    row2 = [c.cget("text") for c in w.trace_cells[1]]
    print("second row", row2)
    check("second scan: M0 off, D0 stays, D1 goes on", row2[1:] == ["ON", "ON", "OFF", "ON", "1", "2"], row2)
    check("trace table fills", len(filled) >= 2, filled)
    check("caption is on screen", w.say.cget("text") != "", w.say.cget("text"))
    shot(w.win, "learn_edge.png")
    w.set_speed("1/2")

    w.load(2)
    w.play()
    w.hold.set(0)
    pump(6.0)
    check("lesson 3 slow scan shows a cursor", w.paint.c.itemcget(w.paint.cursor, "state") == "normal" or w.run.index is None, w.run.phase)
    check("phase text shows", w.phase.cget("text") != "", w.phase.cget("text"))
    shot(w.win, "learn_3.png")
    w.slow.set(0)
    w.set_slow()

    w.load(4)
    w.run.set_input("X000", 1)
    pump(0.3)
    w.run.set_input("X000", 0)
    pump(0.3)
    event = type("E", (), {"y": 60})
    w.pick_rung(event)
    pump(0.2)
    check("clicking a rung explains it", "這條的意思" in w.say.cget("text"), w.say.cget("text"))
    shot(w.win, "learn_4.png")
    w.win.destroy()

    args = argparse.Namespace(csv=softplc.DEFAULT_CSV, host="127.0.0.1", port=5761, control=5762, slow9600=False)
    rt = softplc.Runtime(args)
    rt.server.start()
    threading.Thread(target=rt.loop, daemon=True).start()
    v = softplc.open_ladder(root, rt, tk)
    rt.machine.add_part("front", 900)
    rt.plc.m[102] = 1
    pump(0.8)
    rt.plc.m[100] = 1
    pump(3.2)
    v.follow.set("不跟隨")
    v.canvas.yview_moveto(max(0, v.paint.section_y["P9 輸出：自動 OR 手動，再加互鎖（唯一驅動 Y 的地方）"]) / float(v.paint.total))
    pump(0.5)
    rung = next(r for r in v.rungs if hasattr(r, "outputs") and r.outputs[0] == ("OUT", ["Y004"]))
    v.selected = rung
    v.paint.mark(rung)
    pump(0.3)
    check("monitor explains Y4", "這條的意思" in v.why.cget("text"), v.why.cget("text"))
    shot(v.win, "monitor_p9.png")
    v.follow.set("右龍門")
    pump(1.0)
    shot(v.win, "monitor_step.png")
    v.close()
    rt.running = False
    rt.server.stop()
    print("%d/%d" % (sum(results), len(results)))
    return 0 if all(results) else 1


sys.exit(main())
