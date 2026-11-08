# -*- coding: utf-8 -*-
"""Builds the course's reference driver VIs (the same design the lessons teach) through labview-native-mcp v2.
Run:  powershell -File run_lv.ps1 build_answers.py [names]      no names = every VI, rebuilt.
Output: ..\\FX_*.vi and ..\\Test_Driver.vi   (LabVIEW 2026). save18.py makes the 18.0 copies.
Lessons: 9 FX_ReadFrame, 10 FX_Sum / FX_WriteFrame, 11 FX_Check, 12 FX_Open, 13 FX_ReadD, 14 FX_WriteD.
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, r"C:\Users\admin\PycharmProjects\PythonProject\labview-native-mcp-v2")
from lvkit import VI, kit  # noqa: E402

OUT = Path(__file__).resolve().parents[1]
LV = Path(r"C:\Program Files\National Instruments\LabVIEW 2026")
SERIAL = LV / "vi.lib" / "Instr" / "_visa.llb" / "VISA Configure Serial Port (Instr).vi"
ERRCODE = LV / "vi.lib" / "Utility" / "error.llb" / "Error Cluster From Error Code.vi"

SUM, RFRAME, WFRAME, CHECK = OUT / "FX_Sum.vi", OUT / "FX_ReadFrame.vi", OUT / "FX_WriteFrame.vi", OUT / "FX_Check.vi"
OPEN, READD, WRITED, TEST = OUT / "FX_Open.vi", OUT / "FX_ReadD.vi", OUT / "FX_WriteD.vi", OUT / "Test_Driver.vi"
VOUT = ("VISA resource name out", "dup VISA name", "VISA resource name")
VIN = ("VISA resource name", "VISA name")
U16 = 7


async def out1(k, n):
    return (await k.outs(n))[0]


async def grow_by(k, n, count):
    await k.call("invoke", object_class="GrowableFunction", member="Resize.AddChunk", reference=n, inputs={"Chunks To Add": count})


async def temp_control(k, vi, style, term, label, indicator=False, source=False):
    """Typed control/indicator on the top diagram, made from a temporary node that is deleted again."""
    tmp = await k.add(vi.diagram, style, (40, 1200))
    c = await k.create(vi.path, await k.t(tmp, term, source=source), "Create Indicator" if indicator else "Create Control", label=label)
    await k.delete(vi.path, [tmp])
    return c


async def u16_control(k, vi, label):
    c = await temp_control(k, vi, "To Unsigned Byte Integer", "x", label)
    await k.set("Numeric", "Rep", c, U16)
    return c


async def num(k, owner, xy, value, rep=None):
    c = await k.add(owner, "Numeric Constant", xy)
    await k.lv.set("Constant", "Value", c, value)
    return await k.t(c, "value")


async def gate(k, owner, style, xy, *srcs):
    n = await k.add(owner, style, xy)
    for s, t in zip(srcs, await k.ins(n)):
        await k.wire(s, t)
    return await out1(k, n)


async def hex_text(k, path, owner, xy, source, width):
    n = await k.add(owner, "Number To Hexadecimal String", xy)
    await k.wire(source, await k.t(n, "number"))
    await k.const_on(path, await k.t(n, "width"), width)
    return await k.t(n, "hex integer string", source=True)


async def times_plus(k, path, owner, xy, src, mul, add=None):
    m = await k.add(owner, "Multiply", xy)
    a, b = await k.ins(m)
    await k.wire(src, a)
    await k.const_on(path, b, mul)
    r = await out1(k, m)
    if add is None:
        return r
    s = await k.add(owner, "Add", (xy[0] + 70, xy[1] + 10))
    a, b = await k.ins(s)
    await k.wire(r, a)
    await k.const_on(path, b, add)
    return await out1(k, s)


# ---------------------------------------------------------------- lesson 10: FX_Sum
async def make_sum(k):
    vi = await k.call_new(SUM)
    D, p = vi.diagram, vi.path
    sba = await k.add(D, "String To Byte Array", (200, 100))
    await k.create(p, await k.t(sba, "string"), "Create Control", label="Body")
    total = await k.add(D, "Add Array Elements", (320, 100))
    await k.wire(await out1(k, sba), (await k.ins(total))[0])
    ss = await hex_text(k, p, D, (440, 100), await out1(k, total), 2)
    await k.create(p, ss, "Create Indicator", label="SS")
    await k.connect_any(p, ["Body"], ["SS"])
    await k.finish(p, clean=True)


async def frame_tail(k, vi, body_src):
    """body + ETX -> FX_Sum -> STX + body + ETX + SS -> 'Frame' indicator."""
    D, p = vi.diagram, vi.path
    be = await k.concat(D, (520, 120), body_src, await k.const_str(D, "\x03", (440, 170)))
    s = await k.sub(D, SUM, (640, 200))
    await k.wire(be, await k.t(s, "Body"))
    fr = await k.concat(D, (780, 120), await k.const_str(D, "\x02", (700, 60)), be, await k.t(s, "SS", source=True))
    await k.create(p, fr, "Create Indicator", label="Frame")


async def fis(k, vi, xy, fmt, a, b):
    D, p = vi.diagram, vi.path
    n = await k.add(D, "Format Into String", xy)
    await grow_by(k, n, 1)
    await k.wire(await k.const_str(D, fmt, (xy[0] - 120, xy[1] - 40)), await k.t(n, "format string"))
    await k.wire(a, await k.t(n, "input 1"))
    await k.wire(b, await k.t(n, "input 2"))
    return await k.t(n, "resulting string", source=True)


# ---------------------------------------------------------------- lessons 9-10: FX_ReadFrame, FX_WriteFrame
async def make_rframe(k):
    vi = await k.call_new(RFRAME)
    D, p = vi.diagram, vi.path
    d = await k.term_of(await u16_control(k, vi, "D"))
    w = await k.term_of(await u16_control(k, vi, "Words"))
    addr = await times_plus(k, p, D, (120, 60), d, 2, 4096)
    nbytes = await times_plus(k, p, D, (120, 200), w, 2)
    body = await fis(k, vi, (320, 100), "0%04X%02X", addr, nbytes)
    await frame_tail(k, vi, body)
    await k.connect_any(p, ["D", "Words"], ["Frame"])
    await k.finish(p, clean=True)


async def make_wframe(k):
    vi = await k.call_new(WFRAME)
    D, p = vi.diagram, vi.path
    d = await k.term_of(await u16_control(k, vi, "D"))
    v = await k.term_of(await u16_control(k, vi, "Value"))
    addr = await times_plus(k, p, D, (120, 60), d, 2, 4096)
    sw = await k.add(D, "Swap Bytes", (160, 200))
    await k.wire(v, await k.t(sw, "anything"))
    body = await fis(k, vi, (320, 100), "1%04X02%04X", addr, await k.t(sw, "byte swapped", source=True))
    await frame_tail(k, vi, body)
    await k.connect_any(p, ["D", "Value"], ["Frame"])
    await k.finish(p, clean=True)


async def err_controls(k, vi):
    ei = await temp_control(k, vi, "VISA Close", "error in", "error in (no error)")
    eo = await temp_control(k, vi, "VISA Close", "error out", "error out", indicator=True, source=True)
    return ei, eo


# ---------------------------------------------------------------- lesson 11: FX_Check
async def make_check(k):
    vi = await k.call_new(CHECK)
    D, p = vi.diagram, vi.path
    rx = await k.term_of(await temp_control(k, vi, "String Length", "string", "RX"))
    data_ind = await temp_control(k, vi, "Concatenate Strings", "concatenated string", "Data", indicator=True, source=True)
    ei, eo = await err_controls(k, vi)
    NE = D        # script version: no Error case; the check always runs and Merge Errors keeps an incoming error first
    length = await k.add(NE, "String Length", (240, 260))
    await k.wire(rx, await k.t(length, "string"))
    n = await out1(k, length)

    async def subset(xy, off_src, off_val, len_src, len_val):
        s = await k.add(NE, "String Subset", xy)
        await k.wire(rx, await k.t(s, "string"))
        if off_src is not None:
            await k.wire(off_src, await k.t(s, "offset"))
        else:
            await k.const_on(p, await k.t(s, "offset"), off_val)
        if len_src is not None:
            await k.wire(len_src, await k.t(s, "length"))
        else:
            await k.const_on(p, await k.t(s, "length"), len_val)
        return await k.t(s, "substring", source=True)

    async def minus(xy, value):
        s = await k.add(NE, "Subtract", xy)
        a, b = await k.ins(s)
        await k.wire(n, a)
        await k.const_on(p, b, value)
        return await out1(k, s)

    first = await subset((420, 80), None, 0, None, 1)
    covered = await subset((420, 170), None, 1, await minus((330, 190), 3), None)
    tail = await subset((420, 260), await minus((330, 280), 2), None, None, 2)
    data = await subset((420, 350), None, 1, await minus((330, 370), 4), None)
    fs = await k.sub(NE, SUM, (540, 170))
    await k.wire(covered, await k.t(fs, "Body"))
    same = await gate(k, NE, "Equal?", (640, 200), await k.t(fs, "SS", source=True), tail)
    is_stx = await gate(k, NE, "Equal?", (560, 80), first, await k.const_str(NE, "\x02", (480, 120)))
    ok = await gate(k, NE, "And", (740, 120), is_stx, same)
    code = await k.add(NE, "Select", (820, 150))
    await k.wire(ok, await k.t(code, "s", source=False))
    await k.wire(await num(k, NE, (760, 130), 0), await k.t(code, "t", source=False))
    await k.wire(await num(k, NE, (760, 180), 5001), await k.t(code, "f", source=False))
    e = await k.sub(NE, ERRCODE, (900, 200))
    await k.wire(await out1(k, code), await k.t(e, "error code"))
    await k.wire(await k.const_str(NE, "FX_Check: bad reply (STX or checksum)", (760, 260)), await k.t(e, "error message"))
    me = await k.add(D, "Merge Errors", (1000, 200))
    m1, m2 = (await k.ins(me))[:2]
    await k.wire(await k.term_of(ei), m1)
    await k.wire(await k.t(e, "error out", source=True), m2)
    await k.wire(await out1(k, me), await k.term_of(eo))
    await k.wire(data, await k.term_of(data_ind))
    await k.connect_any(p, ["RX", "error in (no error)"], ["Data", "error out"])
    await k.finish(p, clean=True)


# ---------------------------------------------------------------- lesson 12: FX_Open
async def make_open(k):
    vi = await k.call_new(OPEN)
    D, p = vi.diagram, vi.path
    res = await temp_control(k, vi, "VISA Close", VIN[0], "Resource")
    ser = await k.typed_control(p, D, "Select", "s", "Serial (COM)?")
    ei = await temp_control(k, vi, "VISA Close", "error in", "error in (no error)")
    case = await k.add(D, "Case Structure", (200, 40), (520, 320))
    frames = await k.case_on(case, await k.term_of(ser))
    F, T = k.page(frames, "False"), k.page(frames, "True")
    o = await k.add(F, "VISA Open", (360, 140))
    await k.wire(await k.term_of(res), await k.t(o, *VIN, source=False))
    await k.wire(await k.term_of(ei), await k.t(o, "error in", source=False))
    s = await k.sub(T, SERIAL, (380, 140))
    await k.wire(await k.term_of(res), await k.t(s, *VIN, source=False))
    await k.wire(await k.term_of(ei), await k.t(s, "error in", source=False))
    await k.const_on(p, await k.t(s, "baud rate"), 9600)
    await k.const_on(p, await k.t(s, "data bits"), 7)
    await k.const_on(p, await k.t(s, "parity"), 2)         # Even
    await k.const_on(p, await k.t(s, "stop bits"), 10)     # 1.0
    await k.wire(await k.const_bool(T, False, (300, 260)), await k.t(s, "Enable Termination Char"))
    vo = await temp_control(k, vi, "VISA Open", "VISA resource name", "VISA out", indicator=True, source=True)
    eo = await temp_control(k, vi, "VISA Close", "error out", "error out", indicator=True, source=True)
    await k.merge(p, await k.t(o, *VOUT, source=True), await k.t(s, *VOUT, source=True), await k.term_of(vo))
    await k.merge(p, await k.t(o, "error out", source=True), await k.t(s, "error out", source=True), await k.term_of(eo))
    await k.connect_any(p, ["Resource", "Serial (COM)?", "error in (no error)"], ["VISA out", "error out"])
    await k.finish(p, clean=True)


async def visa_in(k, vi):
    return await temp_control(k, vi, "VISA Close", VIN[0], "VISA in")


# ---------------------------------------------------------------- lesson 13: FX_ReadD
async def make_readd(k):
    vi = await k.call_new(READD)
    D, p = vi.diagram, vi.path
    vin = await k.term_of(await visa_in(k, vi))
    d = await k.term_of(await u16_control(k, vi, "D"))
    cnt = await k.term_of(await u16_control(k, vi, "Count"))
    ei = await temp_control(k, vi, "VISA Close", "error in", "error in (no error)")
    rf = await k.sub(D, RFRAME, (160, 120))
    await k.wire(d, await k.t(rf, "D"))
    await k.wire(cnt, await k.t(rf, "Words"))
    tx = await k.t(rf, "Frame", source=True)
    await k.create(p, tx, "Create Indicator", label="TX (debug)")
    w = await k.add(D, "VISA Write", (300, 60))
    await k.wire(vin, await k.t(w, *VIN, source=False))
    await k.wire(tx, await k.t(w, "write buffer"))
    await k.wire(await k.term_of(ei), await k.t(w, "error in", source=False))
    r = await k.add(D, "VISA Read", (440, 60))
    await k.wire(await k.t(w, *VOUT, source=True), await k.t(r, *VIN, source=False))
    await k.wire(await k.t(w, "error out", source=True), await k.t(r, "error in", source=False))
    await k.wire(await times_plus(k, p, D, (300, 220), cnt, 4, 4), await k.t(r, "byte count"))
    rx = await k.t(r, "read buffer", source=True)
    await k.create(p, rx, "Create Indicator", label="RX (debug)")
    ck = await k.sub(D, CHECK, (580, 100))
    await k.wire(rx, await k.t(ck, "RX"))
    await k.wire(await k.t(r, "error out", source=True), await k.t(ck, "error in (no error)"))
    data = await k.t(ck, "Data", source=True)
    loop = await k.add(D, "For Loop", (700, 160), (420, 220))
    LD = await k.loop_diagram(loop)
    await k.wire(cnt, await k.t(loop, "N", "count"))
    off = await times_plus(k, p, LD, (740, 240), await k.t(loop, "i"), 4)
    ss = await k.add(LD, "String Subset", (840, 220))
    await k.wire(data, await k.t(ss, "string"))
    await k.wire(off, await k.t(ss, "offset"))
    await k.const_on(p, await k.t(ss, "length"), 4)
    h = await k.add(LD, "Hexadecimal String To Number", (940, 220))
    await k.wire(await k.t(ss, "substring", source=True), await k.t(h, "string"))
    await k.const_on(p, await k.t(h, "default"), 0)
    sw = await k.add(LD, "Swap Bytes", (1040, 230))
    await k.wire(await k.t(h, "number", source=True), await k.t(sw, "anything"))
    u = await k.add(D, "To Unsigned Word Integer", (1180, 240))     # outside the loop: the wire is auto-indexed
    await k.wire(await k.t(sw, "byte swapped", source=True), (await k.ins(u))[0])
    await k.create(p, await out1(k, u), "Create Indicator", label="Words")
    await k.create(p, await k.t(r, *VOUT, source=True), "Create Indicator", label="VISA out")
    await k.create(p, await k.t(ck, "error out", source=True), "Create Indicator", label="error out")
    await k.connect_any(p, ["VISA in", "D", "Count", "error in (no error)"], ["VISA out", "Words", "error out"])
    await k.finish(p, clean=True)


# ---------------------------------------------------------------- lesson 14: FX_WriteD
async def make_writed(k):
    vi = await k.call_new(WRITED)
    D, p = vi.diagram, vi.path
    vin = await k.term_of(await visa_in(k, vi))
    d = await k.term_of(await u16_control(k, vi, "D"))
    v = await k.term_of(await u16_control(k, vi, "Value"))
    ei = await temp_control(k, vi, "VISA Close", "error in", "error in (no error)")
    wf = await k.sub(D, WFRAME, (160, 120))
    await k.wire(d, await k.t(wf, "D"))
    await k.wire(v, await k.t(wf, "Value"))
    w = await k.add(D, "VISA Write", (300, 60))
    await k.wire(vin, await k.t(w, *VIN, source=False))
    await k.wire(await k.t(wf, "Frame", source=True), await k.t(w, "write buffer"))
    await k.wire(await k.term_of(ei), await k.t(w, "error in", source=False))
    r = await k.add(D, "VISA Read", (440, 60))
    await k.wire(await k.t(w, *VOUT, source=True), await k.t(r, *VIN, source=False))
    await k.wire(await k.t(w, "error out", source=True), await k.t(r, "error in", source=False))
    await k.const_on(p, await k.t(r, "byte count"), 1)
    ack = await gate(k, D, "Equal?", (580, 140), await k.t(r, "read buffer", source=True), await k.const_str(D, "\x06", (500, 200)))
    code = await k.add(D, "Select", (660, 160))
    await k.wire(ack, await k.t(code, "s", source=False))
    await k.wire(await num(k, D, (600, 120), 0), await k.t(code, "t", source=False))
    await k.wire(await num(k, D, (600, 220), 5002), await k.t(code, "f", source=False))
    e = await k.sub(D, ERRCODE, (760, 200))
    await k.wire(await out1(k, code), await k.t(e, "error code"))
    await k.wire(await k.const_str(D, "FX_WriteD: PLC answered NAK", (640, 280)), await k.t(e, "error message"))
    m = await k.add(D, "Merge Errors", (880, 120))
    a, b = (await k.ins(m))[:2]
    await k.wire(await k.t(r, "error out", source=True), a)
    await k.wire(await k.t(e, "error out", source=True), b)
    await k.create(p, await k.t(r, *VOUT, source=True), "Create Indicator", label="VISA out")
    await k.create(p, await out1(k, m), "Create Indicator", label="error out")
    await k.connect_any(p, ["VISA in", "D", "Value", "error in (no error)"], ["VISA out", "error out"])
    await k.finish(p, clean=True)


# ---------------------------------------------------------------- lesson 14: a chain to test against the soft PLC
async def make_test(k):
    vi = await k.call_new(TEST)
    D, p = vi.diagram, vi.path
    o = await k.sub(D, OPEN, (60, 100))
    wd = await k.sub(D, WRITED, (260, 100))
    rd = await k.sub(D, READD, (460, 100))
    c = await k.add(D, "VISA Close", (660, 100))
    res = await temp_control(k, vi, "Concatenate Strings", "string", "Resource (text)")   # test only: text coerced to VISA
    await k.wire(await k.term_of(res), await k.t(o, "Resource"))
    await k.wire(await k.t(o, "VISA out", source=True), await k.t(wd, "VISA in"))
    await k.wire(await k.t(o, "error out", source=True), await k.t(wd, "error in (no error)"))
    await k.wire(await k.t(wd, "VISA out", source=True), await k.t(rd, "VISA in"))
    await k.wire(await k.t(wd, "error out", source=True), await k.t(rd, "error in (no error)"))
    await k.wire(await k.t(rd, "VISA out", source=True), await k.t(c, *VIN, source=False))
    await k.wire(await k.t(rd, "error out", source=True), await k.t(c, "error in", source=False))
    for node, name, label in ((wd, "D", "Write D"), (wd, "Value", "Write Value"), (rd, "D", "Read D"), (rd, "Count", "Read Count")):
        await k.create(p, await k.t(node, name), "Create Control", label=label)
    await k.create(p, await k.t(rd, "Words", source=True), "Create Indicator", label="Words")
    await k.create(p, await k.t(c, "error out", source=True), "Create Indicator", label="error out")
    await k.finish(p, clean=True)


STEPS = (("FX_Sum", make_sum), ("FX_ReadFrame", make_rframe), ("FX_WriteFrame", make_wframe), ("FX_Check", make_check),
         ("FX_Open", make_open), ("FX_ReadD", make_readd), ("FX_WriteD", make_writed), ("Test_Driver", make_test))


async def main():
    only = sys.argv[1:]
    async with kit() as k:
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
