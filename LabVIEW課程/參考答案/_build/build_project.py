# -*- coding: utf-8 -*-
"""Builds the course's project VIs (lessons 6, 15-20) through labview-native-mcp v2, on top of the driver VIs of build_answers.py.
Run:  powershell -File run_lv.ps1 build_project.py [names]
Script limits (so the reference differs a little from the lessons, same behaviour):
  * Bundle By Name / Unbundle By Name cannot pick element names by script -> plain Bundle / Unbundle (by position).
  * Type Def .ctl cannot be scripted -> GT_Status is the Status indicator of GT_Parse.vi (a plain cluster).
  * Case pages cannot be given values like 10, 20 by script -> GT_StepText/GT_AlarmText look the code up in two arrays.
  * PLC Port is a string control (a test can type it; a VISA control cannot be set by the test tool).
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, r"C:\Users\admin\PycharmProjects\PythonProject\labview-native-mcp-v2")
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lvkit import VI, kit  # noqa: E402
from build_answers import (OUT, OPEN, READD, WRITED, VIN, VOUT, ERRCODE, U16, out1, grow_by, temp_control,  # noqa: E402
                           u16_control, num, gate)

LV = Path(r"C:\Program Files\National Instruments\LabVIEW 2026")
CLEAR = LV / "vi.lib" / "Utility" / "error.llb" / "Clear Errors.vi"
WDS = LV / "vi.lib" / "Utility" / "file.llb" / "Write Delimited Spreadsheet.vi"
STEP, ALARM, PARSE, LOG = OUT / "GT_StepText.vi", OUT / "GT_AlarmText.vi", OUT / "GT_Parse.vi", OUT / "GT_Log.vi"
MON, MAIN = OUT / "GT_Monitor.vi", OUT / "GT_Main.vi"

STEPS_TXT = [(0, "Stopped"), (10, "Outputs off"), (11, "Cylinders up"), (12, "Axes to home"), (13, "Done"),
             (20, "Wait part"), (21, "Down to pick"), (22, "Vacuum on"), (23, "Up"), (24, "To rear"), (25, "Down to place"),
             (26, "Vacuum off"), (27, "Up"), (28, "Back home"), (40, "Wait part"), (41, "Down to pick"), (42, "Vacuum on"),
             (43, "Up"), (44, "To front"), (45, "Down to place"), (46, "Vacuum off"), (47, "Up"), (48, "Back home")]
ALARM_TXT = [(0, "OK"), (1, "E-STOP"), (10, "RIGHT AXIS TIMEOUT"), (11, "RIGHT CYLINDER TIMEOUT"), (20, "LEFT AXIS TIMEOUT"),
             (21, "LEFT CYLINDER TIMEOUT"), (30, "HOMING TIMEOUT"), (40, "HMI LINK LOST")]
U16_NAMES = ["Right Step", "Left Step", "Home Step", "Right Count", "Left Count", "Cycles", "Alarm Code"]
BIT_NAMES = ["Auto Running", "Manual Mode", "Homed", "Alarm", "E-Stop", "Cycle Stopping"]
STATUS = U16_NAMES + ["X", "Y"] + BIT_NAMES + ["PLC Beat"]          # GT_Status element order (lesson 8)
WORD_INDEX = [0, 1, 2, 10, 11, 12, 20, 30, 31, 32, 41]                # D200 + index
JOGS = ["L Forward", "L Rearward", "L Down", "L Up", "L Vacuum", None, None, None, None, None,
        "R Forward", "R Rearward", "R Down", "R Up", "R Vacuum", "Conveyors"]   # D107 bits 0-15 = M110-M125
TOGGLE = {"L Vacuum", "R Vacuum", "Conveyors"}
SWITCH_WHEN_PRESSED, SWITCH_UNTIL_RELEASED, LATCH_WHEN_RELEASED = 0, 2, 4


# ---------------------------------------------------------------- small helpers
async def u16k(k, owner, xy, value):
    """U16 constant: a numeric constant through To Unsigned Word Integer."""
    c = await num(k, owner, xy, value)
    u = await k.add(owner, "To Unsigned Word Integer", (xy[0] + 40, xy[1]))
    await k.wire(c, (await k.ins(u))[0])
    return await out1(k, u)


async def bool_ctl(k, vi, owner, name, mech):
    """Boolean control whose terminal sits in owner (a loop diagram), with its mechanical action."""
    c = await k.typed_control(vi.path, owner, "Select", "s", name)
    await k.set("Boolean", "Mechanical Action", c, mech)
    return await k.term_of(c)


async def u16_in(k, vi, owner, name, value=None):
    tmp = await k.add(owner, "To Unsigned Byte Integer", (40, 1300))
    c = await k.create(vi.path, (await k.ins(tmp))[0], "Create Control", label=name)
    await k.delete(vi.path, [tmp])
    await k.set("Numeric", "Rep", c, U16)
    if value is not None:
        await k.set("Control", "Value", c, value)
    return await k.term_of(c)


async def ind(k, vi, src, name):
    return await k.create(vi.path, src, "Create Indicator", label=name)


async def build_array(k, owner, xy, srcs, concat=False):
    n = await k.add(owner, "Build Array", xy)
    await k.grow(n, len(srcs))
    for s, t in zip(srcs, await k.ins(n)):
        await k.wire(s, t)
    if concat:
        await k.set("BuildArray", "Concatenate Inputs", n, True)
    return await out1(k, n)


async def case_on(k, owner, xy, size, selector):
    c = await k.add(owner, "Case Structure", xy, size)
    fr = await k.case_on(c, selector)
    return k.page(fr, "False"), k.page(fr, "True")


async def mux(k, path, owner, src_false, src_true):
    """One output tunnel of a Boolean Case fed by src_false (inside the False page) and src_true (inside the
    True page, or a wire from outside that just passes through). Returns the tunnel's outside terminal."""
    sink = await k.add(owner, "Build Array", (60, 1400))
    before = {o["uid"] for o in (await k.snap(path))["objects"]}
    await k.wire(src_false, (await k.ins(sink))[0])
    new = [o for o in (await k.snap(path))["objects"] if o["uid"] not in before and "Tunnel" in o["class"]]
    if len(new) != 1:
        raise SystemExit("mux: expected one new tunnel, got %s" % [o["class"] for o in new])
    terms = await k.terms(new[0]["reference"])
    inside = [x["reference"] for x in terms if x["name"] == "inside"]
    outside = [x["reference"] for x in terms if x["name"] == "outside"][0]
    await k.wire(src_true, inside[1])
    await k.delete(path, [sink])
    return outside


async def lookup_vi(k, path, in_name, out_name, table):
    """Code -> text by Search 1D Array in a code array and Index Array in a text array. Unknown codes: 'Unknown'."""
    r = await k.call("new_vi", path=str(path), overwrite=True)
    vi = VI(str(path), r["diagram"], r["panel"])
    D, p = vi.diagram, vi.path
    code = await k.term_of(await u16_control(k, vi, in_name))
    codes = await build_array(k, D, (200, 40), [await num(k, D, (120, 20 + i * 4), c) for i, (c, _) in enumerate(table)])
    texts = await build_array(k, D, (200, 260), [await k.const_str(D, t, (60, 240 + i * 4)) for i, (_, t) in enumerate(table)])
    s = await k.add(D, "Search 1D Array", (320, 80))
    await k.wire(codes, await k.t(s, "1D array"))
    await k.wire(code, await k.t(s, "element"))
    idx = await k.t(s, "index of element", source=True)
    ix = await k.add(D, "Index Array", (420, 200))
    await k.wire(texts, await k.t(ix, "array", source=False))
    await k.wire(idx, await k.t(ix, "index"))
    unknown = await gate(k, D, "Less Than 0?", (420, 100), idx)
    sel = await k.add(D, "Select", (520, 150))
    await k.wire(unknown, await k.t(sel, "s", source=False))
    await k.wire(await k.const_str(D, "Unknown", (440, 140)), await k.t(sel, "t", source=False))
    await k.wire(await k.t(ix, "element", source=True), await k.t(sel, "f", source=False))
    await ind(k, vi, await out1(k, sel), out_name)
    await k.connect_any(p, [in_name], [out_name])
    await k.finish(p, clean=True)


async def make_step(k):
    await lookup_vi(k, STEP, "Step", "Step Text", STEPS_TXT)


async def make_alarm(k):
    await lookup_vi(k, ALARM, "Alarm Code", "Alarm Text", ALARM_TXT)


# ---------------------------------------------------------------- lesson 15: GT_Parse
async def make_parse(k):
    r = await k.call("new_vi", path=str(PARSE), overwrite=True)
    vi = VI(str(PARSE), r["diagram"], r["panel"])
    D, p = vi.diagram, vi.path
    # Words: U16 array control (an indicator made from a temporary U16 array, then turned into a control)
    tmp = await k.add(D, "To Unsigned Word Integer", (40, 1300))
    tmpb = await k.add(D, "Build Array", (120, 1300))
    await k.wire(await out1(k, tmp), (await k.ins(tmpb))[0])
    words_c = await ind(k, vi, await out1(k, tmpb), "Words")
    await k.delete(p, [tmp, tmpb])
    await k.lv.set("Control", "Indicator", words_c, False)
    words = await k.term_of(words_c)
    # Status indicator with named elements: Bundle fed by temporary labelled controls
    temps, srcs = [], []
    for name in STATUS:
        if name in ("X", "Y"):
            t = await k.add(D, "Number To Boolean Array", (40, 1500))
            c = await ind(k, vi, await out1(k, t), name)
            await k.delete(p, [t])
            await k.lv.set("Control", "Indicator", c, False)
        elif name in BIT_NAMES:
            c = await k.typed_control(p, D, "Select", "s", name)
        else:
            c = await u16_control(k, vi, name)
        temps.append(c)
        srcs.append(await k.term_of(c))
    b = await k.add(D, "Bundle", (600, 100))
    await k.grow(b, len(STATUS) + 1)
    elems = [t["reference"] for t in await k.terms(b) if not t.get("source") and t["name"] != "cluster"]
    for s, t in zip(srcs, elems):
        await k.wire(s, t)
    status_c = await ind(k, vi, await out1(k, b), "Status")
    for c in temps:
        await k.delete_control(p, c)
    # the real data
    ix = await k.add(D, "Index Array", (200, 60))
    await k.grow(ix, 1 + len(WORD_INDEX))
    await k.wire(words, await k.t(ix, "array", source=False))
    it = await k.terms(ix)
    idx_in = [t["reference"] for t in it if not t.get("source") and t["name"].startswith("index")]
    el = [t["reference"] for t in it if t.get("source")]
    for t, v in zip(idx_in, WORD_INDEX):
        await k.const_on(p, t, v)
    w = dict(zip(WORD_INDEX, el))
    elems = [t["reference"] for t in await k.terms(b) if not t.get("source") and t["name"] != "cluster"]
    for i, name in enumerate(U16_NAMES):
        await k.wire(w[WORD_INDEX[i]], elems[i])
    for word, slot in ((30, 7), (31, 8)):
        nb = await k.add(D, "Number To Boolean Array", (360, 300 + slot * 20))
        await k.wire(w[word], (await k.ins(nb))[0])
        await k.wire(await out1(k, nb), elems[slot])
    nb = await k.add(D, "Number To Boolean Array", (360, 500))
    await k.wire(w[32], (await k.ins(nb))[0])
    bix = await k.add(D, "Index Array", (460, 500))
    await k.grow(bix, 1 + len(BIT_NAMES))                     # index inputs unwired: elements 0, 1, 2 ...
    await k.wire(await out1(k, nb), await k.t(bix, "array", source=False))
    bits = [t["reference"] for t in await k.terms(bix) if t.get("source")]
    for i in range(len(BIT_NAMES)):
        await k.wire(bits[i], elems[9 + i])
    await k.wire(w[41], elems[15])
    await k.wire(await out1(k, b), await k.term_of(status_c))     # this wire was cleaned when the temporary controls went
    await k.connect_any(p, ["Words"], ["Status"])
    await k.finish(p, clean=True)


# ---------------------------------------------------------------- lesson 20: GT_Log
async def make_log(k):
    r = await k.call("new_vi", path=str(LOG), overwrite=True)
    vi = VI(str(LOG), r["diagram"], r["panel"])
    D, p = vi.diagram, vi.path
    ev = await k.term_of(await temp_control(k, vi, "Concatenate Strings", "string", "Event"))
    code = await k.term_of(await u16_control(k, vi, "Code"))
    txt = await k.term_of(await temp_control(k, vi, "Concatenate Strings", "string", "Text"))
    ei = await temp_control(k, vi, "VISA Close", "error in", "error in (no error)")
    cvp = await k.add(D, "Current VI's Path", (40, 40))
    sp = await k.add(D, "Strip Path", (120, 40))
    await k.wire(await out1(k, cvp), await k.t(sp, "path"))
    bp = await k.add(D, "Build Path", (220, 40))
    await k.wire(await k.t(sp, "stripped path", source=True), await k.t(bp, "base path"))
    await k.wire(await k.const_str(D, "logs", (160, 90)), await k.t(bp, "name or relative path"))
    fd = await k.add(D, "Format Date/Time String", (220, 120))
    await k.wire(await k.const_str(D, "%Y-%m-%d.csv", (120, 120)), await k.t(fd, "time format string"))
    bp2 = await k.add(D, "Build Path", (340, 60))
    await k.wire(await k.t(bp, "appended path", source=True), await k.t(bp2, "base path"))
    await k.wire(await k.t(fd, "date/time string", source=True), await k.t(bp2, "name or relative path"))
    ft = await k.add(D, "Format Date/Time String", (220, 200))
    await k.wire(await k.const_str(D, "%H:%M:%S", (120, 200)), await k.t(ft, "time format string"))
    nd = await k.add(D, "Number To Decimal String", (220, 260))
    await k.wire(code, await k.t(nd, "number"))
    row = await build_array(k, D, (360, 200), [await k.t(ft, "date/time string", source=True), ev,
                                               await k.t(nd, "decimal integer string", source=True), txt])
    wds = await k.sub(D, WDS, (480, 120))
    await k.wire(await k.t(bp2, "appended path", source=True), await k.t(wds, "file path"))
    await k.wire(row, await k.t(wds, "1D data"))
    await k.wire(await k.const_bool(D, True, (400, 300)), await k.t(wds, "append to file?"))
    await k.wire(await k.const_str(D, ",", (400, 330)), await k.t(wds, "delimiter"))
    await k.wire(await k.term_of(ei), await k.t(wds, "error in"))
    await ind(k, vi, await k.t(wds, "error out", source=True), "error out")
    await k.connect_any(p, ["Event", "Code", "Text", "error in (no error)"], ["error out"])
    await k.finish(p, clean=True)


async def read_status(k, vi, owner, visa, err, xy=(400, 100)):
    """FX_ReadD(200, 30) + FX_ReadD(230, 12) -> Build Array (Concatenate Inputs) -> GT_Parse. Returns (visa, err, status)."""
    p = vi.path
    r1 = await k.sub(owner, READD, xy)
    r2 = await k.sub(owner, READD, (xy[0] + 140, xy[1]))
    await k.wire(visa, await k.t(r1, "VISA in"))
    await k.wire(err, await k.t(r1, "error in (no error)"))
    await k.const_on(p, await k.t(r1, "D"), 200)
    await k.const_on(p, await k.t(r1, "Count"), 30)
    await k.wire(await k.t(r1, "VISA out", source=True), await k.t(r2, "VISA in"))
    await k.wire(await k.t(r1, "error out", source=True), await k.t(r2, "error in (no error)"))
    await k.const_on(p, await k.t(r2, "D"), 230)
    await k.const_on(p, await k.t(r2, "Count"), 12)
    words = await build_array(k, owner, (xy[0] + 260, xy[1] + 80),
                              [await k.t(r1, "Words", source=True), await k.t(r2, "Words", source=True)], concat=True)
    gp = await k.sub(owner, PARSE, (xy[0] + 340, xy[1] + 80))
    await k.wire(words, await k.t(gp, "Words"))
    return await k.t(r2, "VISA out", source=True), await k.t(r2, "error out", source=True), await k.t(gp, "Status", source=True)


async def unbundle(k, owner, xy, cluster):
    u = await k.add(owner, "Unbundle", xy)
    await k.wire(cluster, (await k.ins(u))[0])
    return await k.outs(u)


async def serial_of(k, owner, port, xy):
    """True unless the port text starts with TCPIP (the soft PLC): COM ports get 9600 7E1 in FX_Open."""
    ss = await k.add(owner, "String Subset", xy)
    await k.wire(port, await k.t(ss, "string"))
    await k.const_on(vi_path_of[0], await k.t(ss, "offset"), 0)
    await k.const_on(vi_path_of[0], await k.t(ss, "length"), 5)
    tcp = await gate(k, owner, "Equal?", (xy[0] + 80, xy[1]), await k.t(ss, "substring", source=True), await k.const_str(owner, "TCPIP", (xy[0], xy[1] + 40)))
    return await gate(k, owner, "Not", (xy[0] + 140, xy[1]), tcp)


vi_path_of = [None]


async def open_plc(k, vi, port):
    vi_path_of[0] = vi.path
    o = await k.sub(vi.diagram, OPEN, (160, 400))
    await k.wire(port, await k.t(o, "Resource"))
    await k.wire(await serial_of(k, vi.diagram, port, (40, 480)), await k.t(o, "Serial (COM)?"))
    return await k.t(o, "VISA out", source=True), await k.t(o, "error out", source=True)


# ---------------------------------------------------------------- lesson 15: GT_Monitor
async def make_monitor(k):
    r = await k.call("new_vi", path=str(MON), overwrite=True)
    vi = VI(str(MON), r["diagram"], r["panel"])
    D, p = vi.diagram, vi.path
    port = await k.term_of(await temp_control(k, vi, "Concatenate Strings", "string", "PLC Port"))
    visa0, err0 = await open_plc(k, vi, port)
    loop = await k.add(D, "While Loop", (300, 40), (900, 400))
    LD = await k.loop_diagram(loop)
    sv = await k.shift_register(loop, 80)
    se = await k.shift_register(loop, 140)
    await k.wire(visa0, sv["initial"])
    await k.wire(err0, se["initial"])
    visa, err, status = await read_status(k, vi, LD, sv["previous"], se["previous"])
    await ind(k, vi, status, "Status")
    rs = (await unbundle(k, LD, (900, 260), status))[0]
    st = await k.sub(LD, STEP, (1000, 260))
    await k.wire(rs, await k.t(st, "Step"))
    await ind(k, vi, await k.t(st, "Step Text", source=True), "Right Step Text")
    await k.wire(visa, sv["next"])
    await k.wire(err, se["next"])
    stop = await bool_ctl(k, vi, LD, "stop", LATCH_WHEN_RELEASED)
    status_e = (await unbundle(k, LD, (900, 360), err))[0]
    await k.wire(await gate(k, LD, "Or", (1000, 380), status_e, stop), await k.t(loop, "condition"))
    wt = await k.add(LD, "Wait (ms)", (500, 360))
    await k.const_on(p, (await k.ins(wt))[0], 200)
    c = await k.add(D, "VISA Close", (1260, 80))
    await k.wire(sv["final"], await k.t(c, *VIN, source=False))
    await k.wire(se["final"], await k.t(c, "error in", source=False))
    await ind(k, vi, await k.t(c, "error out", source=True), "error out")
    await k.finish(p, clean=True)


async def writed(k, owner, path, xy, visa, err, d_src, value):
    w = await k.sub(owner, WRITED, xy)
    await k.wire(visa, await k.t(w, "VISA in"))
    await k.wire(err, await k.t(w, "error in (no error)"))
    await k.wire(d_src, await k.t(w, "D"))
    await k.wire(value, await k.t(w, "Value"))
    return await k.t(w, "VISA out", source=True), await k.t(w, "error out", source=True)


async def enqueue(k, owner, xy, queue, d_src, value):
    b = await k.add(owner, "Bundle", xy)
    await k.grow(b, 3)
    el = [t["reference"] for t in await k.terms(b) if not t.get("source") and t["name"] != "cluster"]
    await k.wire(d_src, el[0])
    await k.wire(value, el[1])
    e = await k.add(owner, "Enqueue Element", (xy[0] + 80, xy[1]))
    await k.wire(queue, await k.t(e, "queue", source=False))
    await k.wire(await out1(k, b), await k.t(e, "element"))


# ---------------------------------------------------------------- lessons 16-20: GT_Main
async def make_main(k):
    r = await k.call("new_vi", path=str(MAIN), overwrite=True)
    vi = VI(str(MAIN), r["diagram"], r["panel"])
    D, p = vi.diagram, vi.path
    port = await k.term_of(await temp_control(k, vi, "Concatenate Strings", "string", "PLC Port"))
    # queue of GT_Cmd {D, Value}
    cmd_type = await k.add(D, "Bundle", (60, 80))
    await k.grow(cmd_type, 3)
    el = [t["reference"] for t in await k.terms(cmd_type) if not t.get("source") and t["name"] != "cluster"]
    await k.wire(await u16k(k, D, (10, 60), 0), el[0])
    await k.wire(await u16k(k, D, (10, 100), 0), el[1])
    oq = await k.add(D, "Obtain Queue", (140, 80))
    await k.wire(await out1(k, cmd_type), await k.t(oq, "element data type"))
    queue = await k.t(oq, "queue out", source=True)
    visa0, err0 = await open_plc(k, vi, port)

    # ---------------- UI loop (Producer)
    ui = await k.add(D, "While Loop", (300, 20), (1100, 560))
    UD = await k.loop_diagram(ui)
    sq = await k.shift_register(ui, 60)
    await k.wire(queue, sq["initial"])
    q_ui = sq["previous"]
    await k.wire(q_ui, sq["next"])
    # D106 pulse commands (lesson 17-1)
    pulse = [await bool_ctl(k, vi, UD, n, LATCH_WHEN_RELEASED) for n in ("Start", "Stop", "Home", "Reset", "Clear Counts")]
    v = await build_array(k, UD, (420, 80), pulse)
    bn = await k.add(UD, "Boolean Array To Number", (480, 80))
    await k.wire(v, (await k.ins(bn))[0])
    u = await k.add(UD, "To Unsigned Word Integer", (540, 80))
    await k.wire(await out1(k, bn), (await k.ins(u))[0])
    word106 = await out1(k, u)
    F, T = await case_on(k, UD, (620, 40), (200, 120), await gate(k, UD, "Not Equal To 0?", (580, 120), word106))
    await enqueue(k, T, (680, 80), q_ui, await u16k(k, T, (640, 60), 106), word106)
    # D107 jog word, sent only when it changes (lesson 17-2)
    jog = []
    for n in JOGS:
        if n is None:
            jog.append(await k.const_bool(UD, False, (380, 300)))
        else:
            jog.append(await bool_ctl(k, vi, UD, n, SWITCH_WHEN_PRESSED if n in TOGGLE else SWITCH_UNTIL_RELEASED))
    v = await build_array(k, UD, (420, 260), jog)
    bn = await k.add(UD, "Boolean Array To Number", (480, 260))
    await k.wire(v, (await k.ins(bn))[0])
    u = await k.add(UD, "To Unsigned Word Integer", (540, 260))
    await k.wire(await out1(k, bn), (await k.ins(u))[0])
    word107 = await out1(k, u)
    sj = await k.shift_register(ui, 300)
    await k.wire(await u16k(k, D, (200, 300), 0), sj["initial"])
    F, T = await case_on(k, UD, (620, 220), (200, 120), await gate(k, UD, "Not Equal?", (580, 300), word107, sj["previous"]))
    await enqueue(k, T, (680, 260), q_ui, await u16k(k, T, (640, 240), 107), word107)
    await k.wire(word107, sj["next"])
    await ind(k, vi, word107, "D107")
    # parameters (lesson 17-3)
    limits = [("Vacuum Time (0.1 s)", 1, 100, 5), ("Release Time (0.1 s)", 1, 100, 5), ("Step Timeout (0.1 s)", 10, 600, 50),
              ("Target Cycles", 0, 32767, 0)]
    vals = [await u16_in(k, vi, UD, n, dflt) for n, lo, hi, dflt in limits]
    wbtn = await bool_ctl(k, vi, UD, "Write", LATCH_WHEN_RELEASED)
    F, T = await case_on(k, UD, (620, 380), (400, 160), wbtn)
    co = []
    for (n, lo, hi, _), val in zip(limits, vals):
        ir = await k.add(T, "In Range and Coerce", (660, 400 + len(co) * 30))
        await k.wire(val, await k.t(ir, "x"))
        await k.const_on(p, await k.t(ir, "upper limit"), hi)
        await k.const_on(p, await k.t(ir, "lower limit"), lo)
        co.append(await k.t(ir, "coerced(x)", source=True))
    arr = await build_array(k, T, (740, 420), co)
    fl = await k.add(T, "For Loop", (780, 390), (220, 130))
    FD = await k.loop_diagram(fl)
    tmp = await k.add(FD, "To Unsigned Word Integer", (900, 420))       # receives one element per loop
    await k.wire(arr, (await k.ins(tmp))[0])
    add = await k.add(FD, "Add", (820, 470))
    a, b = await k.ins(add)
    await k.wire(await k.t(fl, "i"), a)
    await k.const_on(p, b, 100)
    du = await k.add(FD, "To Unsigned Word Integer", (870, 470))
    await k.wire(await out1(k, add), (await k.ins(du))[0])
    await enqueue(k, FD, (930, 440), q_ui, await out1(k, du), await out1(k, tmp))
    # loop timing and Exit
    wt = await k.add(UD, "Wait (ms)", (1200, 400))
    await k.const_on(p, (await k.ins(wt))[0], 50)
    ex = await bool_ctl(k, vi, UD, "Exit", LATCH_WHEN_RELEASED)
    await k.wire(ex, await k.t(ui, "condition"))
    rq = await k.add(D, "Release Queue", (1450, 60))
    await k.wire(sq["final"], await k.t(rq, "queue", source=False))

    # ---------------- communication loop (Consumer)
    cl = await k.add(D, "While Loop", (300, 640), (1500, 620))
    CD = await k.loop_diagram(cl)
    sv = await k.shift_register(cl, 700)
    se = await k.shift_register(cl, 760)
    st = await k.shift_register(cl, 820)    # last heartbeat time
    sb = await k.shift_register(cl, 880)    # heartbeat value
    sc = await k.shift_register(cl, 940)    # last alarm code
    sh = await k.shift_register(cl, 1000)   # alarm history (2D string array)
    await k.wire(visa0, sv["initial"])
    await k.wire(err0, se["initial"])
    tc0 = await k.add(D, "Tick Count (ms)", (200, 820))
    await k.wire(await out1(k, tc0), st["initial"])
    await k.wire(await u16k(k, D, (200, 880), 0), sb["initial"])
    await k.wire(await u16k(k, D, (200, 940), 0), sc["initial"])
    ia = await k.add(D, "Initialize Array", (200, 1000))
    await k.grow(ia, 3)
    ia_in = await k.ins(ia)
    await k.wire(await k.const_str(D, "", (140, 1000)), ia_in[0])
    for t in ia_in[1:]:
        await k.const_on(p, t, 0)
    await k.wire(await out1(k, ia), sh["initial"])
    # reconnect (lesson 19): False page = there was an error -> close, wait, open again, flush the queue
    status_prev = (await unbundle(k, CD, (360, 760), se["previous"]))[0]
    ok_prev = await gate(k, CD, "Not", (420, 760), status_prev)
    F, T = await case_on(k, CD, (480, 680), (330, 200), ok_prev)
    ce = await k.sub(F, CLEAR, (520, 740))
    await k.wire(se["previous"], await k.t(ce, "error in"))
    vc = await k.add(F, "VISA Close", (580, 700))
    await k.wire(sv["previous"], await k.t(vc, *VIN, source=False))
    await k.wire(await k.t(ce, "error out", source=True), await k.t(vc, "error in", source=False))
    w1 = await k.add(F, "Wait (ms)", (580, 820))
    await k.const_on(p, (await k.ins(w1))[0], 1000)
    ro = await k.sub(F, OPEN, (660, 720))
    await k.wire(port, await k.t(ro, "Resource"))
    await k.wire(await serial_of(k, F, port, (560, 860)), await k.t(ro, "Serial (COM)?"))
    await k.wire(await k.t(vc, "error out", source=True), await k.t(ro, "error in (no error)"))
    fq = await k.add(F, "Flush Queue", (740, 800))
    await k.wire(queue, await k.t(fq, "queue", source=False))
    visa = await mux(k, p, CD, await k.t(ro, "VISA out", source=True), sv["previous"])
    err = await mux(k, p, CD, await k.t(ro, "error out", source=True), se["previous"])
    # take one command (lesson 16)
    dq = await k.add(CD, "Dequeue Element", (860, 680))
    await k.wire(queue, await k.t(dq, "queue", source=False))
    await k.const_on(p, await k.t(dq, "timeout in ms"), 100)
    await k.wire(await k.t(dq, "error out", source=True), await k.t(cl, "condition"))
    F, T = await case_on(k, CD, (960, 660), (300, 160), await k.t(dq, "timed out?", source=True))
    d_v = await unbundle(k, F, (1000, 700), await k.t(dq, "element", source=True))
    v2, e2 = await writed(k, F, p, (1100, 700), visa, err, d_v[0], d_v[1])
    visa = await mux(k, p, CD, v2, visa)
    err = await mux(k, p, CD, e2, err)
    # heartbeat every second (lesson 19): True page = not yet
    tc = await k.add(CD, "Tick Count (ms)", (1300, 700))
    now = await out1(k, tc)
    el_ = await gate(k, CD, "Subtract", (1360, 720), now, st["previous"])
    k1000 = await k.add(CD, "Numeric Constant", (1360, 780))
    await k.lv.set("Constant", "Value", k1000, 1000)
    early = await gate(k, CD, "Less?", (1420, 740), el_, await k.t(k1000, "value"))
    F, T = await case_on(k, CD, (1480, 660), (300, 200), early)
    inc = await k.add(F, "Increment", (1500, 760))
    await k.wire(sb["previous"], (await k.ins(inc))[0])
    over = await gate(k, F, "Greater?", (1560, 780), await out1(k, inc), await u16k(k, F, (1500, 820), 32767))
    sel = await k.add(F, "Select", (1640, 760))
    await k.wire(over, await k.t(sel, "s", source=False))
    await k.wire(await u16k(k, F, (1580, 740), 1), await k.t(sel, "t", source=False))
    await k.wire(await out1(k, inc), await k.t(sel, "f", source=False))
    beat = await out1(k, sel)
    v3, e3 = await writed(k, F, p, (1700, 700), visa, err, await u16k(k, F, (1640, 700), 240), beat)
    visa = await mux(k, p, CD, v3, visa)
    err = await mux(k, p, CD, e3, err)
    await k.wire(await mux(k, p, CD, beat, sb["previous"]), sb["next"])
    tc2 = await k.add(F, "Tick Count (ms)", (1700, 820))        # time of this heartbeat, taken inside the page
    await k.wire(await mux(k, p, CD, await out1(k, tc2), st["previous"]), st["next"])
    # read the status (lesson 15) and show it (lesson 18)
    visa, err, status = await read_status(k, vi, CD, visa, err, (1820, 700))
    await k.wire(visa, sv["next"])
    await k.wire(err, se["next"])
    await ind(k, vi, status, "Status")
    s = dict(zip(STATUS, await unbundle(k, CD, (2200, 760), status)))
    for name in ("Right Count", "Left Count", "Cycles", "Alarm Code", "Auto Running", "Manual Mode", "Homed",
                 "Alarm", "E-Stop", "Cycle Stopping"):
        await ind(k, vi, s[name], name)
    for name in ("Right Step", "Left Step", "Home Step"):
        t = await k.sub(CD, STEP, (2320, 900))
        await k.wire(s[name], await k.t(t, "Step"))
        await ind(k, vi, await k.t(t, "Step Text", source=True), name + " Text")
    at = await k.sub(CD, ALARM, (2320, 1000))
    await k.wire(s["Alarm Code"], await k.t(at, "Alarm Code"))
    alarm_text = await k.t(at, "Alarm Text", source=True)
    await ind(k, vi, alarm_text, "Alarm Text")
    conn = await gate(k, CD, "Not", (2320, 700), (await unbundle(k, CD, (2260, 700), err))[0])
    await ind(k, vi, conn, "PLC Connected")
    allowed = await gate(k, CD, "And", (2400, 1060), s["Manual Mode"], await gate(k, CD, "Not", (2340, 1080), s["Auto Running"]))
    allowed = await gate(k, CD, "And", (2460, 1080), allowed, await gate(k, CD, "Not", (2400, 1110), s["Alarm"]))
    await ind(k, vi, allowed, "Manual Allowed")
    # alarm log (lesson 20): True page = code did not change
    same = await gate(k, CD, "Equal?", (2400, 1160), s["Alarm Code"], sc["previous"])
    F, T = await case_on(k, CD, (2480, 1120), (420, 120), same)
    zero = await gate(k, F, "Equal To 0?", (2500, 1150), s["Alarm Code"])
    ev = await k.add(F, "Select", (2560, 1150))
    await k.wire(zero, await k.t(ev, "s", source=False))
    await k.wire(await k.const_str(F, "CLEAR", (2500, 1130)), await k.t(ev, "t", source=False))
    await k.wire(await k.const_str(F, "ALARM", (2500, 1190)), await k.t(ev, "f", source=False))
    lg = await k.sub(F, LOG, (2640, 1150))
    await k.wire(await out1(k, ev), await k.t(lg, "Event"))
    await k.wire(s["Alarm Code"], await k.t(lg, "Code"))
    await k.wire(alarm_text, await k.t(lg, "Text"))
    ce2 = await k.sub(F, CLEAR, (2720, 1150))              # a log error must not look like a lost PLC link
    await k.wire(await k.t(lg, "error out", source=True), await k.t(ce2, "error in"))
    ft = await k.add(F, "Format Date/Time String", (2560, 1210))
    await k.wire(await k.const_str(F, "%H:%M:%S", (2500, 1210)), await k.t(ft, "time format string"))
    nd = await k.add(F, "Number To Decimal String", (2560, 1230))
    await k.wire(s["Alarm Code"], await k.t(nd, "number"))
    row = await build_array(k, F, (2640, 1210), [await k.t(ft, "date/time string", source=True),
                                                 await k.t(nd, "decimal integer string", source=True), alarm_text])
    hist = await build_array(k, F, (2720, 1210), [sh["previous"], row], concat=True)
    hist = await mux(k, p, CD, hist, sh["previous"])
    await k.wire(hist, sh["next"])
    await ind(k, vi, hist, "Alarm History")
    await k.wire(s["Alarm Code"], sc["next"])
    # shutdown (lessons 16, 19): D240 = 0, close, report
    v4, e4 = await writed(k, D, p, (1900, 1320), sv["final"], se["final"],
                          await u16k(k, D, (1840, 1360), 240), await u16k(k, D, (1840, 1400), 0))
    c = await k.add(D, "VISA Close", (2060, 1320))
    await k.wire(v4, await k.t(c, *VIN, source=False))
    await k.wire(e4, await k.t(c, "error in", source=False))
    await ind(k, vi, await k.t(c, "error out", source=True), "error out")
    await k.finish(p, clean=True)


STEPS = (("GT_StepText", make_step), ("GT_AlarmText", make_alarm), ("GT_Parse", make_parse), ("GT_Log", make_log),
         ("GT_Monitor", make_monitor), ("GT_Main", make_main))


async def main():
    only = sys.argv[1:]
    (OUT / "logs").mkdir(exist_ok=True)
    async with kit() as k:
        for name, fn in STEPS:
            if only and name not in only:
                continue
            print("build", name)
            sys.stdout.flush()
            await fn(k)


if __name__ == "__main__":
    asyncio.run(main())
