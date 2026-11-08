# -*- coding: utf-8 -*-
"""Builds the host subVIs in host\\ through labview-native-mcp v2.
Run:  powershell -File run_lv.ps1 build_host.py [names]      no names = every VI, rebuilt.
Commands travel in the queue as text: device + value, 'M01001' (bit) or 'D01000005' (word, 4 hex digits).
"""
import asyncio
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, r"C:\Users\admin\PycharmProjects\PythonProject\labview-native-mcp-v2")
sys.path.insert(0, str(HERE / "driver"))
from build_driver import (CLOSE, ERR, OPEN, RWORDS, VIN, VOUT, WWORD, XFER, equal_str, hex_text, out1, select)
from lvkit import VI, kit  # noqa: E402
from panel_notes import zh  # noqa: E402

HOST = HERE / "host"
LV = Path(r"C:\Program Files\National Instruments\LabVIEW 2026")
CLEAR = LV / "vi.lib" / "Utility" / "error.llb" / "Clear Errors.vi"
PIC = LV / "vi.lib" / "picture" / "picture.llb"
PIC_UTIL = LV / "vi.lib" / "picture" / "pictutil.llb"
LOOKUP = HOST / "Host_Lookup.vi"
ERRONLY = HOST / "Host_ErrOnly.vi"
RAW = HOST / "FX_WriteRaw.vi"
PARSE_TAGS = HOST / "Tags_Parse.vi"
BEAT = HOST / "Beat_Tick.vi"
EDGES = HOST / "Cmd_Edges.vi"
JOGWORD = HOST / "Cmd_JogWord.vi"
PARAMS = HOST / "Param_Cmds.vi"
ALARM = HOST / "AlarmText.vi"
COMM = HOST / "Comm_Step.vi"
LOG = HOST / "Log_Write.vi"
DRAW = HOST / "Draw_Machine.vi"

ALARM_TABLE = ("\n0=OK\n1=E-STOP\n10=RIGHT AXIS TIMEOUT\n11=RIGHT CYLINDER TIMEOUT\n20=LEFT AXIS TIMEOUT\n"
               "21=LEFT CYLINDER TIMEOUT\n30=HOMING TIMEOUT\n40=HMI LINK LOST\n")
WORDS = 44                 # D200-D241, status bits, link flag
I_BITS, I_LINK = 42, 43


async def queue_control(k, vi, name="Queue"):
    """String queue refnum control. Only the temporary nodes are deleted."""
    D, p = vi.diagram, vi.path
    q = await k.add(D, "Obtain Queue", (40, 800))
    c = await k.add(D, "String Constant", (0, 860))
    await k.wire(await k.t(c, "value"), await k.t(q, "element data type"))
    ctrl = await k.create(p, await k.t(q, "queue out", source=True), "Create Indicator", label=name)
    await k.delete(p, [q, c])
    await k.lv.set("Control", "Indicator", ctrl, False)
    return ctrl


async def array_control(k, vi, kind, name):
    """Boolean, string or U16 array control at the top level."""
    D, p = vi.diagram, vi.path
    if kind == "bool":
        n = await k.add(D, "Number To Boolean Array", (40, 1000))
        src = await out1(k, n)
        extra = [n]
    else:
        n = await k.add(D, "Build Array", (40, 1000))
        c = await k.add(D, "String Constant" if kind == "string" else "Numeric Constant", (0, 1000))
        await k.wire(await k.t(c, "value"), (await k.ins(n))[0])
        src = await out1(k, n)
        extra = [n, c]
    ctrl = await k.create(p, src, "Create Indicator", label=name)
    await k.delete(p, extra)
    await k.lv.set("Control", "Indicator", ctrl, False)
    return ctrl


async def num_control(k, vi, name, rep=7):
    n = await k.add(vi.diagram, "To Unsigned Byte Integer", (40, 1060))
    c = await k.create(vi.path, (await k.ins(n))[0], "Create Control", label=name)
    await k.delete(vi.path, [n])
    await k.set("Numeric", "Rep", c, rep)
    return c


async def num_const(k, D, xy, value):
    c = await k.add(D, "Numeric Constant", xy)
    await k.lv.set("Constant", "Value", c, value)
    return await k.t(c, "value")


async def idx(k, p, D, xy, array, index):
    n = await k.add(D, "Index Array", xy)
    await k.wire(array, await k.t(n, "array", source=False))
    await k.const_on(p, await k.t(n, "index"), index)
    return await k.t(n, "element", source=True)


async def enqueue(k, D, xy, queue, text):
    e = await k.add(D, "Enqueue Element", xy)
    await k.wire(queue, await k.t(e, "queue", source=False))
    await k.wire(text, await k.t(e, "element"))
    return e


async def gate(k, D, style, xy, *srcs):
    n = await k.add(D, style, xy)
    for s, t in zip(srcs, await k.ins(n)):
        await k.wire(s, t)
    return await out1(k, n)


async def make_tags(k):
    vi = await k.call_new(PARSE_TAGS)
    D, p = vi.diagram, vi.path
    words = await k.term_of(await array_control(k, vi, "u16", "Words"))
    y = 40
    for name, index in (("Right Step", 0), ("Left Step", 1), ("Home Step", 2), ("Right Count", 10), ("Left Count", 11),
                        ("Cycles", 12), ("Alarm Code", 20), ("PLC Beat", 41)):
        await k.create(p, await idx(k, p, D, (200, y), words, index), "Create Indicator", label=name)
        y += 60
    outs = ["Right Step", "Left Step", "Home Step", "Right Count", "Left Count", "Cycles", "Alarm Code", "PLC Beat"]
    for name, index in (("X", 30), ("Y", 31)):
        b = await k.add(D, "Number To Boolean Array", (400, y))
        await k.wire(await idx(k, p, D, (300, y), words, index), (await k.ins(b))[0])
        await k.create(p, await out1(k, b), "Create Indicator", label=name)
        outs.append(name)
        y += 60
    b = await k.add(D, "Number To Boolean Array", (400, y))
    await k.wire(await idx(k, p, D, (300, y), words, I_BITS), (await k.ins(b))[0])
    bits = await out1(k, b)
    for name, index in (("Auto", 0), ("Manual", 1), ("Homed", 2), ("Alarm", 3), ("E-Stop", 4), ("Cycle Stop", 5)):
        await k.create(p, await idx(k, p, D, (500, y), bits, index), "Create Indicator", label=name)
        outs.append(name)
        y += 50
    gt = await k.add(D, "Greater Than 0?", (500, y))
    await k.wire(await idx(k, p, D, (400, y), words, I_LINK), await k.t(gt, "x"))
    await k.create(p, await out1(k, gt), "Create Indicator", label="Connected")
    outs.append("Connected")
    # 18 terminals do not fit the usual pattern. Callers wire by name, so any free slot will do
    cal = await k.pattern_map(4835)
    sides = await k.sides(4835)
    snap = await k.snap(p)
    by = {c.get("label"): c["reference"] for c in snap["controls"]}
    slots = [i for i in sorted(cal.values()) if i != sides["left"][0]]
    await k.connector(p, {sides["left"][0]: by["Words"], **dict(zip(slots, (by[n] for n in outs)))}, 4835)
    await k.finish(p, clean=True)


async def make_raw(k):
    """One queued write: D0100 + 4 hex digits."""
    vi = await k.call_new(RAW)
    D, p = vi.diagram, vi.path
    made = await k.controls_like(vi, XFER, {"PLC Conn": "control", "error in (no error)": "control"})
    n = await k.add(D, "String Length", (120, 220))
    cmd = await k.term_of(await k.create(p, await k.t(n, "string"), "Create Control", label="Cmd"))

    async def part(xy, offset, length):
        s = await k.add(D, "String Subset", xy)
        await k.wire(cmd, await k.t(s, "string"))
        await k.const_on(p, await k.t(s, "offset"), offset)
        if length is not None:
            await k.const_on(p, await k.t(s, "length"), length)
        return await k.t(s, "substring", source=True)

    device, value = await part((240, 60), 0, 5), await part((240, 160), 5, None)
    h = await k.add(D, "Hexadecimal String To Number", (380, 160))
    await k.wire(value, await k.t(h, "string"))
    u = await k.add(D, "To Unsigned Word Integer", (480, 160))
    await k.wire(await k.t(h, "number", source=True), (await k.ins(u))[0])
    x = await k.sub(D, WWORD, (640, 140))
    await k.wire(device, await k.t(x, "Device"))
    await k.wire(await out1(k, u), await k.t(x, "Value"))
    await k.wire(await k.term_of(made["PLC Conn"]), await k.t(x, "PLC Conn"))
    await k.wire(await k.term_of(made["error in (no error)"]), await k.t(x, "error in (no error)"))
    pr = x
    await k.create(p, await k.t(x, "PLC Conn out", source=True), "Create Indicator", label="PLC Conn out")
    await k.create(p, await k.t(pr, "error out", source=True), "Create Indicator")
    await k.connect_any(p, ["PLC Conn", "Cmd", "error in (no error)"], ["PLC Conn out", "error out"])
    await k.finish(p, clean=True)


async def make_beat(k):
    """Once a second: queue D240 = beat, next beat 1..32767 (0 means no HMI)."""
    vi = await k.call_new(BEAT)
    D, p = vi.diagram, vi.path
    q = await k.term_of(await queue_control(k, vi))
    beat = await k.term_of(await num_control(k, vi, "Beat", 3))
    last = await k.term_of(await num_control(k, vi, "Last ms", 6))
    tick = await out1(k, await k.add(D, "Tick Count (ms)", (120, 200)))
    diff = await gate(k, D, "Subtract", (240, 220), tick, last)
    late = await k.add(D, "Greater Or Equal?", (340, 220))
    a, b = await k.ins(late)
    await k.wire(diff, a)
    await k.const_on(p, b, 1000)
    due = await out1(k, late)
    rem = await k.add(D, "Quotient & Remainder", (240, 340))
    await k.wire(beat, await k.t(rem, "x"))
    await k.const_on(p, await k.t(rem, "y"), 32767)
    nxt = await k.add(D, "Increment", (360, 340))
    await k.wire(await k.t(rem, "x-y*floor(x/y)", source=True), (await k.ins(nxt))[0])
    n_beat = await out1(k, nxt)
    await k.create(p, await select(k, D, (480, 320), due, n_beat, beat), "Create Indicator", label="Beat out")
    await k.create(p, await select(k, D, (480, 220), due, tick, last), "Create Indicator", label="Last ms out")
    case = await k.add(D, "Case Structure", (560, 60), (340, 140))
    T = k.page(await k.case_on(case, due), "True")
    text = await hex_text(k, p, T, (600, 120), n_beat, 4)
    await enqueue(k, T, (760, 110), q, await k.concat(T, (680, 90), await k.const_str(T, "D0240", (620, 80)), text))
    await k.connect_any(p, ["Queue", "Beat", "Last ms"], ["Beat out", "Last ms out"])
    await k.finish(p, clean=True)


async def make_edges(k):
    """Each pressed button queues its command once. Rising Only keeps only the press."""
    vi = await k.call_new(EDGES)
    D, p = vi.diagram, vi.path
    q = await k.term_of(await queue_control(k, vi))
    bits = await k.term_of(await array_control(k, vi, "bool", "Bits"))
    prev = await k.term_of(await array_control(k, vi, "bool", "Prev"))
    devs = await k.term_of(await array_control(k, vi, "string", "Devices"))
    tmp = await k.add(D, "Select", (40, 900))
    rising = await k.term_of(await k.create(p, await k.t(tmp, "s", source=False), "Create Control", label="Rising Only"))
    await k.delete(p, [tmp])
    loop = await k.add(D, "For Loop", (240, 60), (640, 320))
    LD = await k.loop_diagram(loop)
    # a script wire into a For Loop is auto-indexed: the arrays arrive as one element per turn
    b = await gate(k, LD, "Not", (360, 100), await gate(k, LD, "Not", (300, 100), bits))
    a = await gate(k, LD, "Not", (360, 200), await gate(k, LD, "Not", (300, 200), prev))
    d = await k.concat(LD, (340, 280), devs, await k.const_str(LD, "", (280, 320)))
    diff = await gate(k, LD, "Not Equal?", (420, 140), b, a)
    allow = await gate(k, LD, "Or", (420, 240), b, await gate(k, LD, "Not", (360, 340), rising))
    send = await gate(k, LD, "And", (520, 180), diff, allow)
    case = await k.add(LD, "Case Structure", (580, 100), (260, 200))
    T = k.page(await k.case_on(case, send), "True")
    await enqueue(k, T, (760, 180), q, d)
    await k.connect_any(p, ["Queue", "Bits", "Prev", "Devices", "Rising Only"], [])
    await k.finish(p, clean=False)


async def make_jogword(k):
    """Any jog button changed: queue D107 with every button in it. Masks hold each button's bit as 4 hex digits."""
    vi = await k.call_new(JOGWORD)
    D, p = vi.diagram, vi.path
    q = await k.term_of(await queue_control(k, vi))
    bits = await k.term_of(await array_control(k, vi, "bool", "Bits"))
    prev = await k.term_of(await array_control(k, vi, "bool", "Prev"))
    masks = await k.term_of(await array_control(k, vi, "string", "Masks"))
    loop = await k.add(D, "For Loop", (240, 60), (640, 320))
    LD = await k.loop_diagram(loop)
    b = await gate(k, LD, "Not", (360, 100), await gate(k, LD, "Not", (300, 100), bits))
    a = await gate(k, LD, "Not", (360, 200), await gate(k, LD, "Not", (300, 200), prev))
    text = await k.concat(LD, (340, 280), masks, await k.const_str(LD, "", (280, 320)))
    h = await k.add(LD, "Hexadecimal String To Number", (420, 280))
    await k.wire(text, await k.t(h, "string"))
    zero = await k.add(LD, "Numeric Constant", (420, 340))
    value = await select(k, LD, (540, 280), b, await k.t(h, "number", source=True), await k.t(zero, "value"))
    diff = await gate(k, LD, "Not Equal?", (540, 160), b, a)
    total = await k.add(D, "Add Array Elements", (960, 260))
    await k.wire(value, (await k.ins(total))[0])
    anyone = await k.add(D, "Or Array Elements", (960, 120))
    await k.wire(diff, (await k.ins(anyone))[0])
    case = await k.add(D, "Case Structure", (1060, 60), (420, 240))
    T = k.page(await k.case_on(case, await out1(k, anyone)), "True")
    word = await hex_text(k, p, T, (1120, 180), await out1(k, total), 4)
    await enqueue(k, T, (1320, 160), q, await k.concat(T, (1240, 140), await k.const_str(T, "D0107", (1180, 120)), word))
    await k.connect_any(p, ["Queue", "Bits", "Prev", "Masks"], [])
    await k.finish(p, clean=False)


async def make_params(k):
    vi = await k.call_new(PARAMS)
    D, p = vi.diagram, vi.path
    q = await k.term_of(await queue_control(k, vi))
    tmp = await k.add(D, "Select", (40, 900))
    write = await k.term_of(await k.create(p, await k.t(tmp, "s", source=False), "Create Control", label="Write"))
    await k.delete(p, [tmp])
    case = await k.add(D, "Case Structure", (240, 40), (900, 460))
    T = k.page(await k.case_on(case, write), "True")
    y, prev = 100, None
    for name, device, low, high in (("Vacuum", "D0100", 1, 100), ("Release", "D0101", 1, 100),
                                    ("Timeout", "D0102", 10, 600), ("Target", "D0103", 0, 32767)):
        c = await num_control(k, vi, name)
        rg = await k.add(T, "In Range and Coerce", (300, y))
        await k.wire(await k.term_of(c), await k.t(rg, "x", source=False))
        await k.const_on(p, await k.t(rg, "upper limit"), high)
        await k.const_on(p, await k.t(rg, "lower limit"), low)
        text = await hex_text(k, p, T, (420, y), await k.t(rg, "coerced", source=True), 4)
        e = await enqueue(k, T, (640, y), q, await k.concat(T, (540, y), await k.const_str(T, device, (480, y - 20)), text))
        if prev is not None:
            await k.wire(prev, await k.t(e, "error in", source=False))
        prev = await k.t(e, "error out", source=True)
        y += 80
    await k.connect_any(p, ["Queue", "Write", "Vacuum", "Release", "Timeout", "Target"], [])
    await k.finish(p)


async def make_alarm(k):
    vi = await k.call_new(ALARM)
    D, p = vi.diagram, vi.path
    n = await k.sub(D, LOOKUP, (300, 120))
    await k.wire(await k.const_str(D, ALARM_TABLE, (160, 60)), await k.t(n, "Table"))
    await k.create(p, await k.t(n, "Key"), "Create Control", label="Code")
    await k.create(p, await k.t(n, "Text", source=True), "Create Indicator", label="Text")
    await k.connect_any(p, ["Code"], ["Text"])
    await k.finish(p, clean=True)


async def make_comm(k):
    vi = await k.call_new(COMM)
    D, p = vi.diagram, vi.path
    made = await k.controls_like(vi, XFER, {"PLC Conn": "control", "PLC Conn out": "indicator", "error in (no error)": "control"})
    opened = await k.controls_like(vi, OPEN, {"Transport": "control", "Host": "control", "Port": "control", "COM Port": "control"})
    q = await k.term_of(await queue_control(k, vi))
    tmp = await k.add(D, "Select", (40, 900))
    link = await k.term_of(await k.create(p, await k.t(tmp, "s", source=False), "Create Control", label="Connected"))
    await k.delete(p, [tmp])
    conn = await k.term_of(made["PLC Conn"])
    err = await k.term_of(made["error in (no error)"])

    gq = await k.add(D, "Get Queue Status", (120, 60))
    await k.wire(q, await k.t(gq, "queue", source=False))
    un = await k.add(D, "Unbundle", (260, 40))
    await k.wire(await k.t(gq, "error out", source=True), (await k.ins(un))[0])
    await k.create(p, await k.t(un, "status", source=True), "Create Indicator", label="Stop")
    count = await k.t(gq, "# elements in queue", source=True)

    case = await k.add(D, "Case Structure", (320, 100), (1300, 560))
    frames = await k.case_on(case, link)
    F, T = k.page(frames, "False"), k.page(frames, "True")

    # False page: reconnect. Commands waiting for a dead link are thrown away, a stale jog must never run later
    c = await k.sub(F, CLOSE, (400, 200))
    await k.wire(conn, await k.t(c, "PLC Conn"))
    ce = await k.sub(F, CLEAR, (520, 200))
    await k.wire(await k.t(c, "error out", source=True), await k.t(ce, "error in"))
    fl = await k.add(F, "Flush Queue", (400, 340))
    await k.wire(q, await k.t(fl, "queue", source=False))
    o = await k.sub(F, OPEN, (680, 200))
    await k.wire(await k.t(ce, "error out", source=True), await k.t(o, "error in (no error)"))
    for name in ("Transport", "Host", "Port", "COM Port"):
        await k.wire(await k.term_of(opened[name]), await k.t(o, name))
    un_f = await k.add(F, "Unbundle", (860, 300))
    await k.wire(await k.t(o, "error out", source=True), (await k.ins(un_f))[0])
    ok_f = await gate(k, F, "Not", (960, 300), await k.t(un_f, "status", source=True))
    wait = await k.add(F, "Wait (ms)", (860, 400))
    await k.const_on(p, await k.t(wait, "milliseconds to wait"), 500)
    ini = await k.add(F, "Initialize Array", (960, 420))
    await k.const_on(p, await k.t(ini, "dimension size"), WORDS)
    u = await k.add(F, "To Unsigned Word Integer", (880, 460))
    await k.wire(await num_const(k, F, (820, 460), 0), (await k.ins(u))[0])
    await k.wire(await out1(k, u), await k.t(ini, "element"))
    zeros = await k.t(ini, "initialized array", source=True)

    # True page: queued writes, then read the monitor block and the status bits
    loop = await k.add(T, "For Loop", (360, 160), (420, 220))
    LD = await k.loop_diagram(loop)
    await k.wire(count, await k.t(loop, "N", "count"))
    sr_c = await k.shift_register(loop, 40)
    sr_e = await k.shift_register(loop, 90)
    await k.wire(conn, sr_c["initial"])
    await k.wire(err, sr_e["initial"])
    dq = await k.add(LD, "Dequeue Element", (420, 240))
    await k.wire(q, await k.t(dq, "queue", source=False))
    await k.const_on(p, await k.t(dq, "timeout in ms (-1)"), 0)
    raw = await k.sub(LD, RAW, (580, 220))
    await k.wire(await k.t(dq, "element", source=True), await k.t(raw, "Cmd"))
    await k.wire(sr_c["previous"], await k.t(raw, "PLC Conn"))
    await k.wire(sr_e["previous"], await k.t(raw, "error in (no error)"))
    await k.wire(await k.t(raw, "PLC Conn out", source=True), sr_c["next"])
    await k.wire(await k.t(raw, "error out", source=True), sr_e["next"])
    rw = await k.sub(T, RWORDS, (840, 200))
    await k.wire(sr_c["final"], await k.t(rw, "PLC Conn"))
    await k.wire(sr_e["final"], await k.t(rw, "error in (no error)"))
    await k.wire(await k.const_str(T, "D0200", (780, 160)), await k.t(rw, "Device"))
    await k.const_on(p, await k.t(rw, "Count"), 30)
    rb = await k.sub(T, RWORDS, (980, 200))                    # the protocol carries 64 bytes at most
    await k.wire(await k.t(rw, "PLC Conn out", source=True), await k.t(rb, "PLC Conn"))
    await k.wire(await k.t(rw, "error out", source=True), await k.t(rb, "error in (no error)"))
    await k.wire(await k.const_str(T, "D0230", (920, 160)), await k.t(rb, "Device"))
    await k.const_on(p, await k.t(rb, "Count"), 12)
    un_t = await k.add(T, "Unbundle", (1120, 300))
    await k.wire(await k.t(rb, "error out", source=True), (await k.ins(un_t))[0])
    failed = await k.t(un_t, "status", source=True)
    ok_t = await gate(k, T, "Not", (1200, 300), failed)
    status = await idx(k, p, T, (1160, 400), await k.t(rb, "Words", source=True), 2)     # D232
    flag = await k.add(T, "Boolean To (0,1)", (1200, 460))
    await k.wire(ok_t, (await k.ins(flag))[0])
    u2 = await k.add(T, "To Unsigned Word Integer", (1260, 460))
    await k.wire(await out1(k, flag), (await k.ins(u2))[0])
    ba = await k.add(T, "Build Array", (1320, 360))
    await k.grow(ba, 4)
    await k.set("BuildArray", "Concatenate Inputs", ba, True)
    a, b, c3, c4 = await k.ins(ba)
    await k.wire(await k.t(rw, "Words", source=True), a)
    await k.wire(await k.t(rb, "Words", source=True), b)
    await k.wire(status, c3)
    await k.wire(await out1(k, u2), c4)

    tmp = await k.add(D, "Not", (40, 960))
    lo = await k.create(p, await out1(k, tmp), "Create Indicator", label="Connected out")
    await k.delete(p, [tmp])
    u_tmp = await k.add(D, "To Unsigned Word Integer", (1500, 760))
    ba_tmp = await k.add(D, "Build Array", (1560, 760))
    await k.wire(await out1(k, u_tmp), (await k.ins(ba_tmp))[0])
    wi = await k.create(p, await out1(k, ba_tmp), "Create Indicator", label="Words")
    await k.delete(p, [u_tmp, ba_tmp])

    await k.merge(p, await k.t(o, "PLC Conn", source=True), await k.t(rb, "PLC Conn out", source=True),
                  await k.term_of(made["PLC Conn out"]))
    await k.merge(p, ok_f, ok_t, await k.term_of(lo))
    await k.merge(p, zeros, await out1(k, ba), await k.term_of(wi))
    await k.connect_any(p, ["Queue", "PLC Conn", "Connected", "Transport", "Host", "Port", "COM Port", "error in (no error)"],
                        ["PLC Conn out", "Connected out", "Words", "Stop"])
    await k.finish(p)


async def make_log(k):
    vi = await k.call_new(LOG)
    D, p = vi.diagram, vi.path
    n = await k.add(D, "Build Path", (300, 80))
    await k.create(p, await k.t(n, "base path"), "Create Control", label="Log Dir")
    day = await k.add(D, "Format Date/Time String", (120, 120))
    await k.wire(await k.const_str(D, "%Y-%m-%d", (40, 100)), await k.t(day, "time format string (%c)"))
    name = await k.concat(D, (220, 140), await k.t(day, "date/time string", source=True), await k.const_str(D, ".csv", (160, 180)))
    await k.wire(name, await k.t(n, "name or relative path"))
    op = await k.add(D, "Open/Create/Replace File", (420, 80))
    await k.wire(await k.t(n, "appended path", source=True), await k.t(op, "file path (use dialog)"))
    await k.const_on(p, await k.t(op, "operation (0:open)"), 3)      # open or create, never replace
    await k.const_on(p, await k.t(op, "access (0:read/write)"), 0)
    er = await k.create(p, await k.t(op, "error in"), "Create Control")
    size = await k.add(D, "Get File Size", (560, 80))
    await k.wire(await k.t(op, "refnum out", source=True), await k.t(size, "file"))
    await k.wire(await k.t(op, "error out", source=True), await k.t(size, "error in"))
    pos = await k.add(D, "Set File Position", (700, 80))
    await k.wire(await k.t(size, "refnum out", source=True), await k.t(pos, "refnum"))
    await k.wire(await k.t(size, "error out", source=True), await k.t(pos, "error in"))
    await k.const_on(p, await k.t(pos, "from (0:start)"), 1)     # end
    stamp = await k.add(D, "Format Date/Time String", (120, 300))
    await k.wire(await k.const_str(D, "%Y-%m-%d %H:%M:%S", (40, 280)), await k.t(stamp, "time format string (%c)"))
    parts = [await k.t(stamp, "date/time string", source=True)]
    t1 = await k.add(D, "Concatenate Strings", (40, 1100))
    ev = await k.create(p, (await k.ins(t1))[0], "Create Control", label="Event")
    tx = await k.create(p, (await k.ins(t1))[1], "Create Control", label="Text")
    await k.delete(p, [t1])

    async def decimal(xy, name):
        d = await k.add(D, "Number To Decimal String", xy)
        c = await k.create(p, await k.t(d, "number"), "Create Control", label=name)
        await k.set("Numeric", "Rep", c, 7)
        return await k.t(d, "decimal integer string", source=True)

    code = await decimal((260, 380), "Code")
    right = await decimal((260, 440), "Right Count")
    left = await decimal((260, 500), "Left Count")
    comma = await k.const_str(D, ",", (260, 300))
    crlf = await k.const_str(D, "\r\n", (260, 340))
    line = await k.concat(D, (440, 320), parts[0], comma, await k.term_of(ev), comma, code, comma, await k.term_of(tx),
                          comma, right, comma, left, crlf)
    header = await k.const_str(D, "Time,Event,Code,Text,RightCount,LeftCount\r\n", (420, 240))
    empty = await k.add(D, "Equal To 0?", (640, 200))
    await k.wire(await k.t(size, "size (in bytes)", source=True), await k.t(empty, "x"))
    full = await k.concat(D, (600, 280), header, line)
    text = await select(k, D, (720, 260), await out1(k, empty), full, line)
    wr = await k.add(D, "Write to Text File", (840, 80))
    await k.wire(await k.t(pos, "refnum out", source=True), await k.t(wr, "file (use dialog)"))
    await k.wire(await k.t(pos, "error out", source=True), await k.t(wr, "error in"))
    await k.wire(text, await k.t(wr, "text"))
    cl = await k.add(D, "Close File", (980, 80))
    await k.wire(await k.t(wr, "refnum out", source=True), await k.t(cl, "refnum"))
    await k.wire(await k.t(wr, "error out", source=True), await k.t(cl, "error in"))
    await k.create(p, await k.t(cl, "error out", source=True), "Create Indicator")
    await k.connect_any(p, ["Log Dir", "Event", "Code", "Text", "Right Count", "Left Count", "error in"], ["error out"])
    await k.finish(p)


async def make_draw(k):
    """Machine picture from the sensor and output words. Position comes only from sensors: at a stop point or between."""
    vi = await k.call_new(DRAW)
    D, p = vi.diagram, vi.path
    xs = await k.term_of(await array_control(k, vi, "bool", "X"))
    ys = await k.term_of(await array_control(k, vi, "bool", "Y"))
    tmp = await k.add(D, "Select", (40, 900))
    online = await k.term_of(await k.create(p, await k.t(tmp, "s", source=False), "Create Control", label="Connected"))
    await k.delete(p, [tmp])
    t1 = await k.add(D, "Concatenate Strings", (40, 1100))
    banner = await k.term_of(await k.create(p, (await k.ins(t1))[0], "Create Control", label="Banner"))
    await k.delete(p, [t1])

    class Dyn(int):
        """A wire, not a number: terminal references are integers too."""

    state = {"pic": None, "x": 300, "y": 60}

    def place():
        state["x"] += 180
        if state["x"] > 3200:
            state["x"], state["y"] = 300, state["y"] + 240
        return state["x"], state["y"]

    async def rect_cluster(xy, left, top, right, bottom):
        b = await k.add(D, "Bundle", xy)
        ins = [t for t in await k.terms(b) if not t["source"] and t["name"] != "cluster"]
        if len(ins) < 4:
            await k.call("invoke", object_class="GrowableFunction", member="Resize.AddChunk", reference=b,
                         inputs={"Chunks To Add": 4 - len(ins)})
            ins = [t for t in await k.terms(b) if not t["source"] and t["name"] != "cluster"]
        vals = [left, top, right, bottom]
        for v, t in zip(vals, ins):
            if not isinstance(v, Dyn):
                c = await k.add(D, "Numeric Constant", (xy[0] - 60, xy[1] + 20))
                await k.lv.set("Constant", "Value", c, v)
                u = await k.add(D, "To Word Integer", (xy[0] - 30, xy[1] + 20))
                await k.wire(await k.t(c, "value"), (await k.ins(u))[0])
                await k.wire(await out1(k, u), t["reference"])
            else:
                u = await k.add(D, "To Word Integer", (xy[0] - 30, xy[1] + 20))
                await k.wire(v, (await k.ins(u))[0])
                await k.wire(await out1(k, u), t["reference"])
        return await out1(k, b)

    async def rect(box, color):
        xy = place()
        n = await k.sub(D, PIC / "Draw Rect.vi", xy)
        await k.wire(await rect_cluster((xy[0] - 90, xy[1] + 60), *box), await k.t(n, "rect"))
        if not isinstance(color, Dyn):
            await k.wire(await num_const(k, D, (xy[0] - 40, xy[1] - 30), color), await k.t(n, "color(black)"))
        else:
            await k.wire(color, await k.t(n, "color(black)"))
        await k.wire(await k.const_bool(D, True, (xy[0] - 40, xy[1] + 110)), await k.t(n, "fill?(F)"))
        if state["pic"] is not None:
            await k.wire(state["pic"], await k.t(n, "picture"))
        state["pic"] = await k.t(n, "new picture", source=True)

    async def text(at, msg):
        xy = place()
        n = await k.sub(D, PIC / "Draw Text at Point.vi", xy)
        b = await k.add(D, "Bundle", (xy[0] - 90, xy[1] + 60))
        await k.grow(b, 2)
        ins = [t for t in await k.terms(b) if not t["source"] and t["name"] != "cluster"]
        for v, t in zip(at, ins):
            c = await k.add(D, "Numeric Constant", (xy[0] - 150, xy[1] + 60))
            await k.lv.set("Constant", "Value", c, v)
            u = await k.add(D, "To Word Integer", (xy[0] - 120, xy[1] + 60))
            await k.wire(await k.t(c, "value"), (await k.ins(u))[0])
            await k.wire(await out1(k, u), t["reference"])
        await k.wire(await out1(k, b), await k.t(n, "origin"))
        await k.wire(msg if isinstance(msg, int) else await k.const_str(D, zh(msg), (xy[0] - 40, xy[1] - 30)), await k.t(n, "text"))
        await num_color(n, xy)
        if state["pic"] is not None:
            await k.wire(state["pic"], await k.t(n, "picture"))
        state["pic"] = await k.t(n, "new picture", source=True)

    async def num_color(n, xy):
        await k.wire(await num_const(k, D, (xy[0] - 40, xy[1] + 110), 0xE0E0E0), await k.t(n, "text color(black)"))

    async def color_of(flag, on, off):
        xy = (state["x"] + 90, state["y"] - 40)
        return Dyn(await select(k, D, xy, flag, await num_const(k, D, (xy[0] - 40, xy[1] - 20), on),
                                await num_const(k, D, (xy[0] - 40, xy[1] + 30), off)))

    async def choose(flag_a, a, flag_b, b, other):
        """a when flag_a, b when flag_b, otherwise other: a number for a picture coordinate."""
        xy = (state["x"] + 60, state["y"] + 140)
        inner = await select(k, D, xy, flag_b, await num_const(k, D, (xy[0] - 40, xy[1] - 20), b),
                             await num_const(k, D, (xy[0] - 40, xy[1] + 30), other))
        return Dyn(await select(k, D, (xy[0] + 60, xy[1]), flag_a, await num_const(k, D, (xy[0] + 20, xy[1] - 20), a), inner))

    async def bit(array, n):
        xy = (120, 60 + 50 * n + (0 if array == xs else 900))
        return await idx(k, p, D, xy, array, n)

    x_bits = {n: await bit(xs, n) for n in (0, 1, 2, 3, 4, 5, 6, 7, 9, 10)}
    y_bits = {n: await bit(ys, n) for n in (2, 5, 10)}

    # background, rear belt, front belt
    await rect((0, 0, 640, 290), await color_of(online, 0x202020, 0x402020))
    await text((236, 8), "雙龍門取放機構 DUAL GANTRY")
    belt = await color_of(y_bits[2], 0x2F6FB0, 0x505050)
    await rect((70, 90, 570, 122), belt)
    await rect((70, 190, 570, 222), belt)
    await text((210, 98), "後輸送帶 REAR  <---  右→左")
    await text((210, 198), "前輸送帶 FRONT --->  左→右")
    # sensors at the belt ends
    await rect((130, 74, 146, 86), await color_of(x_bits[5], 0x20D040, 0x404040))
    await text((152, 72), "X5 左端到位")
    await rect((494, 228, 510, 240), await color_of(x_bits[4], 0x20D040, 0x404040))
    await text((410, 244), "X4 右端到位")
    # gantries: beam, then carriage at front, rear or between, then cylinder and vacuum cup
    for cx, front, rear, up, down, vac, tag in ((100, 0, 1, 6, 7, 10, "左龍門 LEFT"), (540, 2, 3, 9, 10, 5, "右龍門 RIGHT")):
        await rect((cx - 5, 40, cx + 5, 260), 0x707070)
        cy = await choose(x_bits[front], 206, x_bits[rear], 106, 156)
        add_c = Dyn(await gate(k, D, "Add", (state["x"] + 100, state["y"] + 200), cy, await num_const(k, D, (state["x"] + 60, state["y"] + 220), -14)))
        add_d = Dyn(await gate(k, D, "Add", (state["x"] + 100, state["y"] + 260), cy, await num_const(k, D, (state["x"] + 60, state["y"] + 280), 14)))
        await rect((cx - 24, add_c, cx + 24, add_d), 0xD0A020)
        drop = await choose(x_bits[up], 0, x_bits[down], 16, 8)
        v_top = await gate(k, D, "Add", (state["x"] + 100, state["y"] + 300), add_d, drop)
        v_bot = Dyn(await gate(k, D, "Add", (state["x"] + 100, state["y"] + 320), v_top, await num_const(k, D, (state["x"] + 60, state["y"] + 340), 8)))
        await rect((cx - 10, add_d, cx + 10, v_bot), await color_of(y_bits[vac], 0x20D040, 0x909090))
        await text((cx - 36, 26), tag)
    await text((12, 268), "黃：滑座　綠：真空　藍：輸送帶運轉")
    await text((290, 268), banner)
    await k.create(p, state["pic"], "Create Indicator", label="Machine")
    await k.connect_any(p, ["X", "Y", "Connected", "Banner"], ["Machine"])
    await k.finish(p)


STEPS = (("FX_WriteRaw", make_raw), ("Tags_Parse", make_tags), ("Beat_Tick", make_beat), ("Cmd_Edges", make_edges), ("Cmd_JogWord", make_jogword),
         ("Param_Cmds", make_params), ("AlarmText", make_alarm), ("Comm_Step", make_comm), ("Log_Write", make_log),
         ("Draw_Machine", make_draw))


async def main():
    only = sys.argv[1:]
    async with kit() as k:
        try:
            await k.call("close_vi", path=str(HERE / "Main.vi"))      # a caller must be closed before its subVIs change
        except Exception:  # noqa: BLE001
            pass

        async def call_new(path):
            r = await k.call("new_vi", path=str(path), overwrite=True)
            return VI(str(path), r["diagram"], r["panel"])
        k.call_new = call_new
        for name, fn in STEPS:
            if only and name not in only:
                continue
            print("build", name)
            sys.stdout.flush()
            await fn(k)


if __name__ == "__main__":
    asyncio.run(main())
