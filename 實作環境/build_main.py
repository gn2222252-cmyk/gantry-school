# -*- coding: utf-8 -*-
"""Builds Main.vi: four loops, five tab pages. Run:  powershell -File run_lv.ps1 build_main.py
Shutdown order: display loop ends (Exit) -> Release Queue -> UI and communication loops end ->
D240 = 0, close the port -> Release Notifier -> record loop ends."""
import asyncio
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE / "ladder"))
from build_host import (ALARM, BEAT, COMM, DRAW, EDGES, ERRONLY, JOGWORD, LOG, LOOKUP, PARAMS, PARSE_TAGS, WORDS, enqueue,  # noqa: E402
                        equal_str, gate, idx, num_const, out1, select)
from build_driver import CLOSE, WWORD  # noqa: E402
from devices import X_WORD as X_NAMES, Y_WORD as Y_NAMES  # noqa: E402
import panel_notes as notes  # noqa: E402
from lvkit import VI, kit  # noqa: E402

MAIN = HERE / "Main.vi"
RIGHT_TABLE = ("\n0=Stopped\n20=Wait part\n21=Down to pick\n22=Vacuum on\n23=Up\n24=To rear\n25=Down to place\n"
               "26=Vacuum off\n27=Up\n28=Back home\n")
LEFT_TABLE = ("\n0=Stopped\n40=Wait part\n41=Down to pick\n42=Vacuum on\n43=Up\n44=To front\n45=Down to place\n"
              "46=Vacuum off\n47=Up\n48=Back home\n")
HOME_TABLE = "\n0=Idle\n10=Outputs off\n11=Cylinders up\n12=Axes to home\n13=Done\n"
# One write to D106. Bits 0-4 are M100-M104 in the PLC.
OPS = (("Start", "D01060001"), ("Stop", "D01060002"), ("Home", "D01060004"), ("Reset", "D01060008"), ("Clear Counts", "D01060010"))
# Each button's bit in D107. Bits 0-15 are M110-M125 in the PLC.
JOGS = (("L Forward", "0001", 2), ("L Rearward", "0002", 2), ("L Down", "0004", 2), ("L Up", "0008", 2),
        ("L Vacuum", "0010", 0), ("R Forward", "0400", 2), ("R Rearward", "0800", 2), ("R Down", "1000", 2),
        ("R Up", "2000", 2), ("R Vacuum", "4000", 0), ("Conveyors", "8000", 0))
PAGE_MAIN, PAGE_MANUAL, PAGE_PARAM, PAGE_IO, PAGE_LOG = range(5)


class Ui(object):
    def __init__(self, k, vi, pages):
        self.k, self.vi, self.pages = k, vi, pages

    async def hide_label(self, ctrl):
        await self.k.set("Text", "Visible", await self.k.get("Control", "Label", ctrl), False)

    async def white(self, ctrl, cls):
        """White box: reads as an input. Numbers keep their text in 'Numeric Text', strings in 'Text'."""
        owner, member, text_cls = ("Digital", "Numeric Text", "NumericText") if cls == "num" else ("String", "Text", "Text")
        await self.k.set(text_cls, "Text Colors:BG Color", await self.k.get(owner, member, ctrl), 0xFFFFFF)

    async def note(self, page, x, y, text):
        """Free Chinese label on a tab page, or on the panel when page is None."""
        owner = self.vi.panel if page is None else self.pages[page]
        t = await self.k.call("add_object", owner=owner, style="Label (modern)", location=[x, y])
        await self.k.set("Text", "Text", t, text)
        await self.k.set("GObject", "Position", t, [x, y])
        await self.k.set("Text", "Text Colors:BG Color", t, 0x01000000)     # transparent, no grey box
        return t

    async def tip(self, ctrl, name):
        if name in notes.TIPS:
            await self.k.set("Control", "Tip Strip", ctrl, notes.TIPS[name])

    async def put(self, ctrl, page, x, y):
        if page is not None:
            await self.k.call("invoke", object_class="GObject", member="Move", reference=ctrl,
                              inputs={"owner": self.pages[page], "position": [x, y]})
        await self.k.set("GObject", "Position", ctrl, [x, y])       # Move alone lands elsewhere; coordinates are the panel's
        return ctrl

    async def ind(self, term, name, page, x, y):
        return await self.put(await self.k.create(self.vi.path, term, "Create Indicator", label=name), page, x, y)

    async def ctl(self, term, name, page, x, y, default=None, style=None):
        c = await self.k.create(self.vi.path, term, "Create Control", label=name)
        if style:
            await self.white(c, style)
        if default is not None:
            await self.k.set("Control", "DefVal", c, default)
            await self.k.set("Control", "Value", c, default)        # the value the user sees before pressing Run
        return await self.put(c, page, x, y)

    async def btn(self, term, name, page, x, y, action=4):
        c = await self.k.button(self.vi.path, term, name)
        await self.k.set("Boolean", "Mechanical Action", c, action)
        await self.hide_label(c)                                    # the button already shows its name
        await self.tip(c, name)
        return await self.put(c, page, x, y)


async def bool_array(k, p, D, xy, size):
    ini = await k.add(D, "Initialize Array", xy)
    await k.const_on(p, await k.t(ini, "dimension size"), size)
    await k.wire(await k.const_bool(D, False, (xy[0] - 60, xy[1] + 20)), await k.t(ini, "element"))
    return await k.t(ini, "initialized array", source=True)


async def u16_array(k, p, D, xy, size):
    ini = await k.add(D, "Initialize Array", xy)
    await k.const_on(p, await k.t(ini, "dimension size"), size)
    u = await k.add(D, "To Unsigned Word Integer", (xy[0] - 60, xy[1] + 20))
    await k.wire(await num_const(k, D, (xy[0] - 120, xy[1] + 20), 0), (await k.ins(u))[0])
    await k.wire(await out1(k, u), await k.t(ini, "element"))
    return await k.t(ini, "initialized array", source=True)


async def build_array(k, D, xy, sources):
    n = await k.add(D, "Build Array", xy)
    await k.grow(n, len(sources))
    for s, t in zip(sources, await k.ins(n)):
        await k.wire(s, t)
    return await out1(k, n)


async def const_num_sr(k, p, sr, value=0):
    await k.create(p, sr["initial"], "Create Constant", value)


async def not_equal(k, D, xy, a, b):
    return await gate(k, D, "Not Equal?", xy, a, b)


async def build(k):
    r = await k.call("new_vi", path=str(MAIN), overwrite=True)
    vi = VI(str(MAIN), r["diagram"], r["panel"])
    D, P, p = vi.diagram, vi.panel, vi.path

    tab = await k.add(P, "Tab Control (modern)", (4, 4), (1000, 590))
    for _ in range(3):
        pages = await k.get("TabControl", "Pages", tab)
        await k.call("invoke", object_class="TabControl", member="Add Page", reference=tab,
                     inputs={"Page": pages[-1], "After": True})
    pages = await k.get("TabControl", "Pages", tab)
    for pg, name in zip(pages, ("Main", "Manual", "Parameters", "IO Monitor", "Alarm Log")):
        await k.set("Page", "Page Label", pg, name)
    ui = Ui(k, vi, pages)
    await ui.hide_label(tab)

    # queue, notifier, log folder beside this VI
    q = await k.add(D, "Obtain Queue", (40, 60))
    await k.wire(await k.const_str(D, "", (-20, 60)), await k.t(q, "element data type"))
    cmd_q = await k.t(q, "queue out", source=True)
    nt = await k.add(D, "Obtain Notifier", (40, 200))
    await k.wire(await u16_array(k, p, D, (-20, 200), 1), await k.t(nt, "notification data type"))
    notifier = await k.t(nt, "notifier out", source=True)
    cur = await k.add(D, "Current VI's Path", (-200, 320))
    strip = await k.add(D, "Strip Path", (-120, 320))
    await k.wire(await out1(k, cur), (await k.ins(strip))[0])
    bp = await k.add(D, "Build Path", (-40, 320))
    await k.wire(await k.t(strip, "stripped path", source=True), await k.t(bp, "base path"))
    await k.wire(await k.const_str(D, "logs", (-100, 360)), await k.t(bp, "name or relative path"))
    log_dir = await k.t(bp, "appended path", source=True)

    # ---- communication loop, the only loop that touches the port
    lc = await k.add(D, "While Loop", (240, 20), (900, 300))
    LC = await k.loop_diagram(lc)
    conn = await k.shift_register(lc, 50)
    link = await k.shift_register(lc, 90)
    beat = await k.shift_register(lc, 130)
    last = await k.shift_register(lc, 170)
    await k.wire(await k.const_bool(D, False, (200, 110)), link["initial"])
    bt = await k.sub(LC, BEAT, (340, 140))
    await k.wire(cmd_q, await k.t(bt, "Queue"))
    await k.wire(beat["previous"], await k.t(bt, "Beat"))
    await k.wire(last["previous"], await k.t(bt, "Last ms"))
    await k.wire(await k.t(bt, "Beat out", source=True), beat["next"])
    await k.wire(await k.t(bt, "Last ms out", source=True), last["next"])
    await const_num_sr(k, p, beat, 1)
    await const_num_sr(k, p, last, 0)
    st = await k.sub(LC, COMM, (620, 90))
    await k.wire(cmd_q, await k.t(st, "Queue"))
    await k.wire(conn["previous"], await k.t(st, "PLC Conn"))
    await k.wire(link["previous"], await k.t(st, "Connected"))
    await k.wire(await k.t(st, "PLC Conn out", source=True), conn["next"])
    await k.wire(await k.t(st, "Connected out", source=True), link["next"])
    await ui.ctl(await k.t(st, "Transport"), "PLC Transport", None, 8, 620)
    await ui.ctl(await k.t(st, "Host"), "PLC Host", None, 108, 620, "127.0.0.1", "str")
    await ui.ctl(await k.t(st, "Port"), "PLC Port", None, 234, 620, 5551, "num")
    await ui.ctl(await k.t(st, "COM Port"), "COM Port", None, 320, 620)
    send = await k.add(LC, "Send Notification", (820, 100))
    await k.wire(notifier, await k.t(send, "notifier", source=False))
    await k.wire(await k.t(st, "Words", source=True), await k.t(send, "notification"))
    w = await k.add(LC, "Wait (ms)", (820, 220))
    await k.const_on(p, await k.t(w, "milliseconds to wait"), 200)
    await k.wire(await k.t(st, "Stop", source=True), await k.t(lc, "condition"))

    # ---- display loop
    ld = await k.add(D, "While Loop", (240, 360), (2300, 620))
    LD = await k.loop_diagram(ld)
    last_w = await k.shift_register(ld, 50)
    leaving = await k.shift_register(ld, 90)
    since = await k.shift_register(ld, 130)
    prev_b = await k.shift_register(ld, 170)
    alive = await k.shift_register(ld, 210)
    wn = await k.add(LD, "Wait on Notification", (300, 420))
    await k.wire(notifier, await k.t(wn, "notifier", source=False))
    await k.wire(await k.const_bool(LD, True, (260, 390)), await k.t(wn, "ignore previous (F)"))
    await k.const_on(p, await k.t(wn, "timeout in ms (-1)"), 500)
    keep = await select(k, LD, (440, 410), await k.t(wn, "timed out?", source=True), last_w["previous"],
                        await k.t(wn, "notification", source=True))
    await k.wire(keep, last_w["next"])
    await k.wire(await u16_array(k, p, D, (120, 410), WORDS), last_w["initial"])
    tg = await k.sub(LD, PARSE_TAGS, (540, 400))
    await k.wire(keep, await k.t(tg, "Words"))

    def tag(name):
        return k.t(tg, name, source=True)

    online, auto = await tag("Connected"), await tag("Auto")
    draw = await k.sub(LD, DRAW, (720, 420))
    await k.wire(await tag("X"), await k.t(draw, "X"))
    await k.wire(await tag("Y"), await k.t(draw, "Y"))
    await k.wire(online, await k.t(draw, "Connected"))
    pic = await k.create(p, await k.t(draw, "Machine", source=True), "Create Indicator", label="Machine")
    await ui.put(pic, PAGE_MAIN, 14, 52)
    await k.set("Picture", "Draw Area Size", pic, [640, 290])
    y = 52
    for name, label in (("Connected", "PLC Connected"), ("Auto", "Auto Running"), ("Manual", "Manual Mode"), ("Homed", "Homed"),
                        ("Cycle Stop", "Cycle Stopping"), ("Alarm", "Alarm"), ("E-Stop", "E-Stop")):
        await ui.ind(await tag(name), label, PAGE_MAIN, 670, y)
        y += 44
    x = 810
    y = 52
    for name, label in (("Right Count", "Right Count"), ("Left Count", "Left Count"), ("Cycles", "Cycles"), ("Alarm Code", "Alarm Code")):
        await ui.ind(await tag(name), label, PAGE_MAIN, x, y)
        y += 52
    px = 860
    for table, key, label, sx, zh_table in ((LEFT_TABLE, "Left Step", "Left Step", 14, notes.LEFT_ZH), (HOME_TABLE, "Home Step", "Home Step", 174, notes.HOME_ZH),
                                  (RIGHT_TABLE, "Right Step", "Right Step", 334, notes.RIGHT_ZH)):
        look = await k.sub(LD, LOOKUP, (px, 420))
        await k.wire(await k.const_str(LD, table, (px - 60, 380)), await k.t(look, "Table"))
        await k.wire(await tag(key), await k.t(look, "Key"))
        await ui.ind(await k.t(look, "Text", source=True), label, PAGE_MAIN, sx, 372)
        look_zh = await k.sub(LD, LOOKUP, (px, 500))
        await k.wire(await k.const_str(LD, zh_table, (px - 60, 540)), await k.t(look_zh, "Table"))
        await k.wire(await tag(key), await k.t(look_zh, "Key"))
        zh = await ui.ind(await k.t(look_zh, "Text", source=True), label + " ZH", PAGE_MAIN, sx, 394)
        await ui.hide_label(zh)
        px += 120
    at = await k.sub(LD, ALARM, (1240, 420))
    await k.wire(await tag("Alarm Code"), await k.t(at, "Code"))
    alarm_text = await k.t(at, "Text", source=True)
    await ui.ind(alarm_text, "Alarm Text", PAGE_MAIN, 494, 372)
    look_a = await k.sub(LD, LOOKUP, (1240, 540))
    await k.wire(await k.const_str(LD, notes.ALARM_ZH, (1180, 580)), await k.t(look_a, "Table"))
    await k.wire(await tag("Alarm Code"), await k.t(look_a, "Key"))
    banner = await select(k, LD, (1320, 400), await tag("Alarm"), await k.t(look_a, "Text", source=True),
                          await k.const_str(LD, "", (1260, 420)))
    await k.wire(banner, await k.t(draw, "Banner"))

    # manual page lamp: the PLC refuses jogs unless this is on
    allow = await gate(k, LD, "And", (1340, 460), await tag("Manual"), online)
    allow = await gate(k, LD, "And", (1400, 480), allow, await gate(k, LD, "Not", (1340, 520), auto))
    allow = await gate(k, LD, "And", (1460, 500), allow, await gate(k, LD, "Not", (1400, 540), await tag("Alarm")))
    await ui.ind(allow, "Manual Allowed", PAGE_MANUAL, 24, 56)

    # IO monitor page
    bx = await tag("X")
    by = await tag("Y")
    for column, (names, array) in enumerate(((X_NAMES, bx), (Y_NAMES, by))):
        for n, (dev, _, text) in enumerate(names):
            e = await idx(k, p, LD, (1500 + column * 120, 420 + n * 12), array, n)
            short = "%s%s %s" % (dev[0], dev[1:].lstrip("0") or "0", text)
            await ui.ind(e, short, PAGE_IO, 40 + column * 460, 44 + n * 33)
            await ui.note(PAGE_IO, 68 + column * 460, 60 + n * 33, notes.zh(names[n][1]))

    # status bar: PLC heartbeat moving, last update
    tick = await out1(k, await k.add(LD, "Tick Count (ms)", (1740, 420)))
    plc_beat = await tag("PLC Beat")
    moved = await not_equal(k, LD, (1800, 460), plc_beat, prev_b["previous"])
    await k.wire(plc_beat, prev_b["next"])
    stamp = await select(k, LD, (1860, 440), moved, tick, alive["previous"])
    await k.wire(stamp, alive["next"])
    since_b = await gate(k, LD, "Subtract", (1920, 460), tick, stamp)
    fresh = await k.add(LD, "Less?", (1980, 460))
    a, b = await k.ins(fresh)
    await k.wire(since_b, a)
    await k.const_on(p, b, 3000)
    await ui.ind(await gate(k, LD, "And", (2040, 460), await out1(k, fresh), online), "PLC Alive", None, 470, 622)
    await k.create(p, prev_b["initial"], "Create Constant", 0)
    await const_num_sr(k, p, alive, 0)
    tm = await k.add(LD, "Format Date/Time String", (1860, 520))
    await k.wire(await k.const_str(LD, "%H:%M:%S", (1800, 540)), await k.t(tm, "time format string (%c)"))
    await ui.ind(await k.t(tm, "date/time string", source=True), "Last Update", None, 560, 620)

    # Exit: finish the trip if running, up to 20 s, then stop
    press = await k.add(LD, "Or", (1740, 640))
    a, b = await k.ins(press)
    await ui.btn(a, "Exit", PAGE_MAIN, 670, 520)
    await k.wire(await k.const_bool(LD, False, (1700, 660)), b)
    now_leaving = await gate(k, LD, "Or", (1820, 640), await out1(k, press), leaving["previous"])
    await k.wire(now_leaving, leaving["next"])
    await k.wire(await k.const_bool(D, False, (120, 480)), leaving["initial"])
    first = await gate(k, LD, "And", (1900, 660), now_leaving, await gate(k, LD, "Not", (1820, 700), leaving["previous"]))
    case = await k.add(LD, "Case Structure", (1980, 620), (240, 130))
    T = k.page(await k.case_on(case, first), "True")
    await enqueue(k, T, (2080, 680), cmd_q, await k.const_str(T, "D01060002", (2000, 680)))
    held = await select(k, LD, (1980, 780), first, tick, since["previous"])
    await k.wire(held, since["next"])
    await const_num_sr(k, p, since, 0)
    gone = await gate(k, LD, "Subtract", (2040, 800), tick, held)
    late = await k.add(LD, "Greater?", (2100, 800))
    a, b = await k.ins(late)
    await k.wire(gone, a)
    await k.const_on(p, b, 20000)
    late_t = await out1(k, late)
    idle = await gate(k, LD, "Not", (2040, 860), auto)
    off = await gate(k, LD, "Not", (2040, 900), online)
    done = await gate(k, LD, "Or", (2160, 860), await gate(k, LD, "Or", (2100, 880), idle, off), late_t)
    await k.wire(await gate(k, LD, "And", (2220, 840), now_leaving, done), await k.t(ld, "condition"))
    msg = await select(k, LD, (2220, 900), now_leaving, await k.const_str(LD, "Stopping...", (2160, 880)),
                       await k.const_str(LD, "", (2160, 920)))
    await ui.ind(msg, "Exit Status", PAGE_MAIN, 770, 522)

    # ---- UI loop: polls the buttons every 50 ms, queues only changes
    lu = await k.add(D, "While Loop", (240, 1020), (1300, 420))
    LU = await k.loop_diagram(lu)
    p_ops = await k.shift_register(lu, 50)
    p_jog = await k.shift_register(lu, 90)
    await k.wire(await bool_array(k, p, D, (120, 1060), len(OPS)), p_ops["initial"])
    await k.wire(await bool_array(k, p, D, (120, 1120), len(JOGS)), p_jog["initial"])
    w2 = await k.add(LU, "Wait (ms)", (300, 1380))
    await k.const_on(p, await k.t(w2, "milliseconds to wait"), 50)

    async def button_bits(items, column, make):
        srcs = []
        for i, item in enumerate(items):
            n = await k.add(LU, "Or", (column, 1060 + i * 26))
            a, b2 = await k.ins(n)
            await make(a, i, item)
            await k.wire(await k.const_bool(LU, False, (column - 40, 1076 + i * 26)), b2)
            srcs.append(await out1(k, n))
        return await build_array(k, LU, (column + 80, 1100), srcs)

    op_xy = ((670, 400), (750, 400), (830, 400), (670, 460), (750, 460))

    async def op_button(term, i, item):
        await ui.btn(term, item[0], PAGE_MAIN, *op_xy[i])

    jog_xy = {"L Up": (130, 120), "L Rearward": (30, 180), "L Forward": (230, 180), "L Down": (130, 240), "L Vacuum": (130, 310),
              "R Up": (630, 120), "R Rearward": (530, 180), "R Forward": (730, 180), "R Down": (630, 240), "R Vacuum": (630, 310),
              "Conveyors": (380, 400)}

    async def jog_button(term, i, item):
        await ui.btn(term, item[0], PAGE_MANUAL, *jog_xy[item[0]], action=item[2])

    ops_now = await button_bits(OPS, 300, op_button)
    jogs_now = await button_bits(JOGS, 500, jog_button)

    async def edges(xy, now, sr, names, rising):
        n = await k.sub(LU, EDGES, xy)
        await k.wire(cmd_q, await k.t(n, "Queue"))
        await k.wire(now, await k.t(n, "Bits"))
        await k.wire(sr["previous"], await k.t(n, "Prev"))
        await k.wire(await build_array(k, LU, (xy[0] - 80, xy[1] + 60),
                                       [await k.const_str(LU, d, (xy[0] - 160, xy[1] + 40 + i * 14)) for i, d in enumerate(names)]),
                     await k.t(n, "Devices"))
        await k.wire(await k.const_bool(LU, rising, (xy[0] - 60, xy[1] + 40)), await k.t(n, "Rising Only"))
        await k.wire(now, sr["next"])

    await edges((800, 1060), ops_now, p_ops, [d for _, d in OPS], True)
    jw = await k.sub(LU, JOGWORD, (800, 1200))
    await k.wire(cmd_q, await k.t(jw, "Queue"))
    await k.wire(jogs_now, await k.t(jw, "Bits"))
    await k.wire(p_jog["previous"], await k.t(jw, "Prev"))
    await k.wire(await build_array(k, LU, (720, 1260), [await k.const_str(LU, j[1], (640, 1240 + i * 14)) for i, j in enumerate(JOGS)]),
                 await k.t(jw, "Masks"))
    await k.wire(jogs_now, p_jog["next"])
    pr = await k.sub(LU, PARAMS, (1000, 1120))
    await k.wire(cmd_q, await k.t(pr, "Queue"))
    await ui.btn(await k.t(pr, "Write"), "Write", PAGE_PARAM, 40, 318)
    for name, label, default, yy in (("Vacuum", "Vacuum Time (0.1 s)", 5, 70), ("Release", "Release Time (0.1 s)", 5, 130),
                                     ("Timeout", "Step Timeout (0.1 s)", 50, 190), ("Target", "Target Cycles (0 = no limit)", 0, 250)):
        await ui.ctl(await k.t(pr, name), label, PAGE_PARAM, 40, yy, default, "num")
    gq = await k.add(LU, "Get Queue Status", (1120, 1300))
    await k.wire(cmd_q, await k.t(gq, "queue", source=False))
    un = await k.add(LU, "Unbundle", (1240, 1300))
    await k.wire(await k.t(gq, "error out", source=True), (await k.ins(un))[0])
    await k.wire(await k.t(un, "status", source=True), await k.t(lu, "condition"))

    # ---- record loop: one CSV line per alarm change or finished transfer
    ll = await k.add(D, "While Loop", (240, 1480), (1700, 460))
    LL = await k.loop_diagram(ll)
    p_al = await k.shift_register(ll, 50)
    p_r = await k.shift_register(ll, 90)
    p_l = await k.shift_register(ll, 130)
    rows = await k.shift_register(ll, 170)
    w3 = await k.add(LL, "Wait on Notification", (300, 1540))
    await k.wire(notifier, await k.t(w3, "notifier", source=False))
    await k.wire(await k.const_bool(LL, True, (260, 1510)), await k.t(w3, "ignore previous (F)"))
    await k.const_on(p, await k.t(w3, "timeout in ms (-1)"), 500)
    tg2 = await k.sub(LL, PARSE_TAGS, (440, 1530))
    await k.wire(await k.t(w3, "notification", source=True), await k.t(tg2, "Words"))
    valid = await gate(k, LL, "And", (600, 1520), await k.t(tg2, "Connected", source=True),
                       await gate(k, LL, "Not", (540, 1560), await k.t(w3, "timed out?", source=True)))
    code = await k.t(tg2, "Alarm Code", source=True)
    right = await k.t(tg2, "Right Count", source=True)
    left = await k.t(tg2, "Left Count", source=True)
    ch_a = await not_equal(k, LL, (640, 1600), code, p_al["previous"])
    ch_r = await not_equal(k, LL, (640, 1660), right, p_r["previous"])
    ch_l = await not_equal(k, LL, (640, 1720), left, p_l["previous"])
    any_c = await gate(k, LL, "Or", (760, 1680), await gate(k, LL, "Or", (700, 1700), ch_a, ch_r), ch_l)
    fire = await gate(k, LL, "And", (820, 1600), valid, any_c)
    for sr, value, xy in ((p_al, code, (900, 1700)), (p_r, right, (900, 1750)), (p_l, left, (900, 1800))):
        await k.wire(await select(k, LL, xy, valid, value, sr["previous"]), sr["next"])
        await const_num_sr(k, p, sr, 0)
    cs = await k.add(LL, "Case Structure", (960, 1500), (800, 360))
    Tc = k.page(await k.case_on(cs, fire), "True")
    tx = await k.sub(Tc, ALARM, (1000, 1640))
    await k.wire(code, await k.t(tx, "Code"))
    text = await k.t(tx, "Text", source=True)
    raised = await k.add(Tc, "Greater Than 0?", (1020, 1720))
    await k.wire(code, await k.t(raised, "x"))
    is_alarm = await out1(k, raised)
    ev = await select(k, Tc, (1120, 1700), is_alarm, await k.const_str(Tc, "ALARM", (1060, 1680)),
                      await k.const_str(Tc, "CLEAR", (1060, 1720)))
    ev = await select(k, Tc, (1200, 1720), ch_a, ev, await k.const_str(Tc, "TRANSFER", (1140, 1760)))
    lg = await k.sub(Tc, LOG, (1300, 1560))
    await k.wire(log_dir, await k.t(lg, "Log Dir"))
    await k.wire(ev, await k.t(lg, "Event"))
    await k.wire(code, await k.t(lg, "Code"))
    await k.wire(text, await k.t(lg, "Text"))
    await k.wire(right, await k.t(lg, "Right Count"))
    await k.wire(left, await k.t(lg, "Left Count"))
    # alarm table: one row per alarm raised
    above = await k.add(LL, "Greater Than 0?", (820, 1840))
    await k.wire(code, await k.t(above, "x"))
    new_alarm = await gate(k, LL, "And", (900, 1840), await gate(k, LL, "And", (860, 1820), fire, ch_a), await out1(k, above))
    stamp2 = await k.add(LL, "Format Date/Time String", (820, 1880))
    await k.wire(await k.const_str(LL, "%Y-%m-%d %H:%M:%S", (760, 1900)), await k.t(stamp2, "time format string (%c)"))
    dec = await k.add(LL, "Number To Decimal String", (820, 1940))
    await k.wire(code, await k.t(dec, "number"))
    tx2 = await k.sub(LL, ALARM, (820, 1880 + 120))
    await k.wire(code, await k.t(tx2, "Code"))
    row = await build_array(k, LL, (960, 1920), [await k.t(stamp2, "date/time string", source=True),
                                                 await k.t(dec, "decimal integer string", source=True),
                                                 await k.t(tx2, "Text", source=True)])
    add = await k.add(LL, "Build Array", (1040, 1900))
    await k.grow(add, 2)
    await k.set("BuildArray", "Concatenate Inputs", add, True)
    a, b = await k.ins(add)
    await k.wire(rows["previous"], a)
    await k.wire(row, b)
    now_rows = await select(k, LL, (1120, 1880), new_alarm, await out1(k, add), rows["previous"])
    await k.wire(now_rows, rows["next"])
    ini2 = await k.add(D, "Initialize Array", (100, 1720))
    await k.grow(ini2, 3)
    ins2 = await k.ins(ini2)
    await k.wire(await k.const_str(D, "", (40, 1700)), await k.t(ini2, "element"))
    for t in ins2[1:]:
        await k.const_on(p, t, 0)
    await k.wire(await k.t(ini2, "initialized array", source=True), rows["initial"])
    table = await k.create(p, now_rows, "Create Indicator", label="Alarm History")
    try:
        table = await k.replace(table, "Table (modern)")
    except Exception as exc:  # noqa: BLE001
        print("table style kept:", str(exc)[:120])
    await ui.put(table, PAGE_LOG, 24, 110)
    await ui.tip(table, "Alarm History")
    await k.set("Table", "NumCols", table, 3)
    await k.set("Table", "NumRows", table, 16)
    await k.set("Table", "Col Headers Vis", table, True)
    await k.set("Table", "ColHdrs[]", table, ["Time", "Code", "Message"])
    for column, width in enumerate((170, 60, 260)):
        await k.set("Table", "ActiveCell", table, [0, column])
        await k.set("Table", "CellSize", table, [width, 20])
    await k.set("Table", "NumCols", table, 1)               # the table takes its width from the columns on this change
    await k.set("Table", "NumCols", table, 3)
    # export the table as CSV beside the daily files
    ex = await k.add(LL, "Case Structure", (1300, 1820), (420, 170))
    press_ex = await k.add(LL, "Or", (1240, 1860))
    a, b = await k.ins(press_ex)
    await ui.btn(a, "Export CSV", PAGE_LOG, 24, 56)
    await k.wire(await k.const_bool(LL, False, (1200, 1880)), b)
    Te = k.page(await k.case_on(ex, await out1(k, press_ex)), "True")
    sheet = await k.add(Te, "Array To Spreadsheet String", (1340, 1880))
    await k.wire(now_rows, await k.t(sheet, "array"))
    await k.wire(await k.const_str(Te, "%s", (1300, 1860)), await k.t(sheet, "format string"))
    await k.wire(await k.const_str(Te, ",", (1300, 1900)), await k.t(sheet, "delimiter (Tab)"))
    bp2 = await k.add(Te, "Build Path", (1440, 1860))
    await k.wire(log_dir, await k.t(bp2, "base path"))
    await k.wire(await k.const_str(Te, "alarm_export.csv", (1380, 1840)), await k.t(bp2, "name or relative path"))
    wt = await k.add(Te, "Write to Text File", (1560, 1880))
    await k.wire(await k.t(bp2, "appended path", source=True), await k.t(wt, "file (use dialog)"))
    await k.wire(await k.t(sheet, "spreadsheet string", source=True), await k.t(wt, "text"))
    await k.wire(await k.t(w3, "error out", source=True), await k.t(ll, "condition"))

    # ---- Chinese notes on every page and on the diagram
    for page, items in ((PAGE_MAIN, notes.PAGE_MAIN), (PAGE_MANUAL, notes.PAGE_MANUAL), (PAGE_PARAM, notes.PAGE_PARAM),
                        (PAGE_LOG, notes.PAGE_LOG), (None, notes.STATUS_BAR)):
        for x, y, text in items:
            await ui.note(page, x, y, text)
    for xy, text in notes.DIAGRAM:
        await k.free_label(D, text, xy)

    # ---- shutdown
    rq = await k.add(D, "Release Queue", (2620, 700))
    await k.wire(cmd_q, await k.t(rq, "queue", source=False))
    await k.wire(await k.t(wn, "error out", source=True), await k.t(rq, "error in (no error)", "error in", source=False))
    # comm loop ended: tell the PLC the HMI left on purpose (D240 = 0 means no HMI), then close
    ww = await k.sub(D, WWORD, (1240, 120))
    await k.wire(conn["final"], await k.t(ww, "PLC Conn"))
    await k.wire(await k.const_str(D, "D0240", (1180, 100)), await k.t(ww, "Device"))
    await k.const_on(p, await k.t(ww, "Value"), 0)
    cl = await k.sub(D, CLOSE, (1380, 120))
    await k.wire(await k.t(ww, "PLC Conn out", source=True), await k.t(cl, "PLC Conn"))
    await k.wire(await k.t(ww, "error out", source=True), await k.t(cl, "error in (no error)"))
    rn = await k.add(D, "Release Notifier", (1520, 120))
    await k.wire(notifier, await k.t(rn, "notifier", source=False))
    await k.wire(await k.t(cl, "error out", source=True), await k.t(rn, "error in (no error)", "error in", source=False))
    await k.finish(p)


async def main():
    async with kit() as k:
        await build(k)
        try:
            Path(MAIN).with_name("Main_panel.png").write_bytes(await k.lv.png(str(MAIN), "panel"))
        except Exception as exc:  # noqa: BLE001
            print("no panel picture", exc)


if __name__ == "__main__":
    asyncio.run(main())
