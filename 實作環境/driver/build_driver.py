# -*- coding: utf-8 -*-
"""Builds the FX programming protocol driver VIs through labview-native-mcp v2.
Run:  powershell -File ..\\run_lv.ps1 driver\\build_driver.py [names]      no names = every VI, rebuilt.
Frame layout: see softplc\\fx_server.py and docs\\通訊協定.md. Based on 13_PLC\\driver.
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, r"C:\Users\admin\PycharmProjects\PythonProject\labview-native-mcp-v2")
from lvkit import VI, kit  # noqa: E402

HERE = Path(__file__).resolve().parent
LV = Path(r"C:\Program Files\National Instruments\LabVIEW 2026")
ERR = LV / "vi.lib" / "Utility" / "error.llb" / "Error Cluster From Error Code.vi"
SERIAL = LV / "vi.lib" / "Instr" / "_visa.llb" / "VISA Configure Serial Port (Instr).vi"

FRAME = HERE / "FX_BuildFrame.vi"
XFER = HERE / "FX_Xfer.vi"
PARSE = HERE / "FX_ParseResponse.vi"
OPEN = HERE / "FX_Open.vi"
CLOSE = HERE / "FX_Close.vi"
RWORDS = HERE / "FX_ReadWords.vi"
WWORD = HERE / "FX_WriteWord.vi"
TEST = HERE / "FX_Test.vi"

E_UNKNOWN, E_SUM, E_NAK = 5410, 5411, 5412

VOUT = ("VISA resource name out", "dup VISA name", "VISA resource name")
VIN = ("VISA resource name", "VISA name")


async def hex_text(k, path, D, xy, source, width):
    n = await k.add(D, "Number To Hexadecimal String", xy)
    await k.wire(source, await k.t(n, "number"))
    await k.const_on(path, await k.t(n, "width"), width)
    return await k.t(n, "hex integer string", source=True)


async def out1(k, n):
    return (await k.outs(n))[0]


async def select(k, D, xy, s, t, f):
    n = await k.add(D, "Select", xy)
    await k.wire(s, await k.t(n, "s", source=False))
    await k.wire(t, await k.t(n, "t", source=False))
    await k.wire(f, await k.t(n, "f", source=False))
    return await out1(k, n)


async def equal_str(k, D, xy, a_src, text):
    n = await k.add(D, "Equal?", xy)
    a, b = await k.ins(n)
    await k.wire(a_src, a)
    await k.wire(await k.const_str(D, text, (xy[0] - 70, xy[1] + 30)), b)
    return await out1(k, n)


async def make_frame(k):
    vi = await k.call_new(FRAME)
    D, p = vi.diagram, vi.path
    n = await k.add(D, "Concatenate Strings", (200, 100))
    await k.grow(n, 3)
    a, b, c = await k.ins(n)
    await k.create(p, a, "Create Control", label="Command")
    await k.create(p, b, "Create Control", label="Content")
    await k.wire(await k.const_str(D, "\x03", (120, 150)), c)
    body = await out1(k, n)
    to_bytes = await k.add(D, "String To Byte Array", (340, 180))
    await k.wire(body, await k.t(to_bytes, "string"))
    total = await k.add(D, "Add Array Elements", (460, 180))
    await k.wire(await out1(k, to_bytes), (await k.ins(total))[0])
    text = await hex_text(k, p, D, (560, 180), await out1(k, total), 2)
    stx = await k.const_str(D, "\x02", (340, 60))
    out = await k.concat(D, (680, 100), stx, body, text)
    await k.create(p, out, "Create Indicator", label="Frame")
    await k.connect_any(p, ["Command", "Content"], ["Frame"])
    await k.finish(p, clean=True)


async def make_xfer(k):
    vi = await k.call_new(XFER)
    D, p = vi.diagram, vi.path
    w = await k.add(D, "VISA Write", (200, 150))
    r1 = await k.add(D, "VISA Read", (360, 150))
    r2 = await k.add(D, "VISA Read", (760, 150))
    await k.create(p, await k.t(w, *VIN, source=False), "Create Control", label="PLC Conn")
    await k.wire(await k.t(w, *VOUT, source=True), await k.t(r1, *VIN, source=False))
    await k.wire(await k.t(w, "error out", source=True), await k.t(r1, "error in", source=False))
    await k.create(p, await k.t(w, "error in", source=False), "Create Control")
    await k.create(p, await k.t(w, "write buffer"), "Create Control", label="TX")
    await k.const_on(p, await k.t(r1, "byte count"), 1)
    first = await k.t(r1, "read buffer", source=True)
    plus = await k.add(D, "Add", (500, 300))
    a, b = await k.ins(plus)
    await k.create(p, a, "Create Control", label="Data Chars")
    await k.const_on(p, b, 3)                # ETX S S
    zero = await k.add(D, "Numeric Constant", (520, 420))
    is_stx = await equal_str(k, D, (500, 200), first, "\x02")
    rest = await select(k, D, (680, 280), is_stx, await out1(k, plus), await k.t(zero, "value"))
    await k.wire(rest, await k.t(r2, "byte count"))
    await k.wire(await k.t(r1, *VOUT, source=True), await k.t(r2, *VIN, source=False))
    await k.wire(await k.t(r1, "error out", source=True), await k.t(r2, "error in", source=False))
    rx = await k.concat(D, (900, 200), first, await k.t(r2, "read buffer", source=True))
    await k.create(p, rx, "Create Indicator", label="RX")
    await k.create(p, await k.t(r2, *VOUT, source=True), "Create Indicator", label="PLC Conn out")
    await k.create(p, await k.t(r2, "error out", source=True), "Create Indicator")
    await k.connect_any(p, ["PLC Conn", "TX", "Data Chars", "error in (no error)"], ["PLC Conn out", "RX", "error out"])
    await k.finish(p, clean=True)


async def make_parse(k):
    vi = await k.call_new(PARSE)
    D, p = vi.diagram, vi.path
    length = await k.add(D, "String Length", (120, 220))
    rx_c = await k.create(p, await k.t(length, "string"), "Create Control", label="RX")
    rx = await k.term_of(rx_c)
    n = await out1(k, length)
    head = await k.add(D, "String Subset", (240, 60))
    await k.wire(rx, await k.t(head, "string"))
    await k.const_on(p, await k.t(head, "offset"), 0)
    await k.const_on(p, await k.t(head, "length"), 1)
    first = await k.t(head, "substring", source=True)
    is_stx = await equal_str(k, D, (380, 40), first, "\x02")
    is_ack = await equal_str(k, D, (380, 110), first, "\x06")
    is_nak = await equal_str(k, D, (380, 180), first, "\x15")

    async def minus(xy, value):
        s = await k.add(D, "Subtract", xy)
        a, b = await k.ins(s)
        await k.wire(n, a)
        await k.const_on(p, b, value)
        return await out1(k, s)

    data = await k.add(D, "String Subset", (340, 280))
    await k.wire(rx, await k.t(data, "string"))
    await k.const_on(p, await k.t(data, "offset"), 1)
    await k.wire(await minus((240, 300), 4), await k.t(data, "length"))
    await k.create(p, await k.t(data, "substring", source=True), "Create Indicator", label="Data")
    covered = await k.add(D, "String Subset", (340, 400))
    await k.wire(rx, await k.t(covered, "string"))
    await k.const_on(p, await k.t(covered, "offset"), 1)
    await k.wire(await minus((240, 420), 3), await k.t(covered, "length"))
    to_bytes = await k.add(D, "String To Byte Array", (480, 400))
    await k.wire(await k.t(covered, "substring", source=True), await k.t(to_bytes, "string"))
    total = await k.add(D, "Add Array Elements", (580, 400))
    await k.wire(await out1(k, to_bytes), (await k.ins(total))[0])
    calc = await hex_text(k, p, D, (680, 400), await out1(k, total), 2)
    tail = await k.add(D, "String Subset", (560, 500))
    await k.wire(rx, await k.t(tail, "string"))
    await k.wire(await minus((460, 520), 2), await k.t(tail, "offset"))
    await k.const_on(p, await k.t(tail, "length"), 2)
    same = await k.add(D, "Equal?", (820, 440))
    a, b = await k.ins(same)
    await k.wire(calc, a)
    await k.wire(await k.t(tail, "substring", source=True), b)
    good = await k.add(D, "And", (900, 300))
    a, b = await k.ins(good)
    await k.wire(is_stx, a)
    await k.wire(await out1(k, same), b)
    ok = await k.add(D, "Or", (980, 200))
    a, b = await k.ins(ok)
    await k.wire(is_ack, a)
    await k.wire(await out1(k, good), b)

    async def num(xy, value):
        c = await k.add(D, "Numeric Constant", xy)
        await k.lv.set("Constant", "Value", c, value)
        return await k.t(c, "value")

    code = await select(k, D, (860, 120), is_nak, await num((780, 100), E_NAK), await num((780, 140), E_UNKNOWN))
    code = await select(k, D, (980, 80), is_stx, await num((900, 60), E_SUM), code)
    code = await select(k, D, (1080, 140), await out1(k, ok), await num((1000, 120), 0), code)
    e = await k.sub(D, ERR, (1180, 140))
    await k.wire(code, await k.t(e, "error code"))
    await k.create(p, await k.t(e, "error in"), "Create Control")
    await k.create(p, await k.t(e, "error out", source=True), "Create Indicator")
    await k.connect_any(p, ["RX", "error in (no error)"], ["Data", "error out"])
    await k.finish(p, clean=True)


async def make_open(k):
    vi = await k.call_new(OPEN)
    D, p = vi.diagram, vi.path
    enum = await k.add(vi.panel, "Enum (modern)", (40, 40))
    await k.label(enum, "Transport")
    await k.set("Enum", "Strings[]", enum, ["TCP (simulator)", "RS-422 (COM)", "USB (COM)"])
    eq = await k.add(D, "Not Equal To 0?", (140, 300))
    await k.wire(await k.term_of(enum), await k.t(eq, "x"))
    tmp = await k.add(D, "VISA Close", (40, 500))
    com = await k.create(p, await k.t(tmp, *VIN, source=False), "Create Control", label="COM Port")
    await k.delete(p, [tmp])
    tmp = await k.add(D, "VISA Close", (40, 560))
    err = await k.create(p, await k.t(tmp, "error in", source=False), "Create Control")
    await k.delete(p, [tmp])
    tmp = await k.add(D, "TCP Open Connection", (40, 620))
    host = await k.create(p, await k.t(tmp, "address"), "Create Control", label="Host")
    port = await k.create(p, await k.t(tmp, "remote port or service name"), "Create Control", label="Port")
    await k.delete(p, [tmp])
    await k.set("Numeric", "Rep", port, 7)
    dec = await k.add(D, "Number To Decimal String", (200, 200))
    await k.wire(await k.term_of(port), await k.t(dec, "number"))
    res = await k.concat(D, (320, 120), await k.const_str(D, "TCPIP0::", (240, 60)), await k.term_of(host),
                         await k.const_str(D, "::", (240, 100)),
                         await k.t(dec, "decimal integer string", source=True),
                         await k.const_str(D, "::SOCKET", (240, 140)))
    case = await k.add(D, "Case Structure", (420, 60), (560, 360))
    frames = await k.case_on(case, await out1(k, eq))
    F, T = k.page(frames, "False"), k.page(frames, "True")
    o = await k.add(F, "VISA Open", (560, 160))
    await k.wire(res, await k.t(o, *VIN, source=False))
    await k.wire(await k.term_of(err), await k.t(o, "error in", source=False))
    s = await k.sub(T, SERIAL, (560, 160))
    await k.wire(await k.term_of(com), await k.t(s, *VIN, source=False))
    await k.wire(await k.term_of(err), await k.t(s, "error in", source=False))
    await k.const_on(p, await k.t(s, "baud rate"), 9600)
    await k.const_on(p, await k.t(s, "data bits"), 7)
    await k.const_on(p, await k.t(s, "parity"), 2)         # Even
    await k.const_on(p, await k.t(s, "stop bits"), 10)     # 1 bit
    await k.wire(await k.const_bool(T, False, (480, 300)), await k.t(s, "Enable Termination Char"))
    await k.const_on(p, await k.t(s, "timeout"), 1000)
    x = await k.sub(D, XFER, (1040, 140))
    await k.merge(p, await k.t(o, *VOUT, source=True), await k.t(s, *VOUT, source=True), await k.t(x, "PLC Conn"))
    await k.merge(p, await k.t(o, "error out", source=True), await k.t(s, "error out", source=True),
                  await k.t(x, "error in (no error)"))
    # ENQ answers ACK when the line and the PLC are alive
    await k.wire(await k.const_str(D, "\x05", (900, 60)), await k.t(x, "TX"))
    await k.const_on(p, await k.t(x, "Data Chars"), 0)
    pr = await k.sub(D, PARSE, (1180, 140))
    await k.wire(await k.t(x, "RX", source=True), await k.t(pr, "RX"))
    await k.wire(await k.t(x, "error out", source=True), await k.t(pr, "error in (no error)"))
    await k.create(p, await k.t(x, "PLC Conn out", source=True), "Create Indicator", label="PLC Conn")
    await k.create(p, await k.t(pr, "error out", source=True), "Create Indicator")
    await k.connect_any(p, ["Transport", "Host", "Port", "COM Port", "error in (no error)"], ["PLC Conn", "error out"])
    await k.finish(p, clean=True)


async def make_close(k):
    vi = await k.call_new(CLOSE)
    D, p = vi.diagram, vi.path
    c = await k.add(D, "VISA Close", (200, 150))
    await k.create(p, await k.t(c, *VIN, source=False), "Create Control", label="PLC Conn")
    await k.create(p, await k.t(c, "error in", source=False), "Create Control")
    await k.create(p, await k.t(c, "error out", source=True), "Create Indicator")
    await k.connect_any(p, ["PLC Conn", "error in (no error)"], ["error out"])
    await k.finish(p, clean=True)


async def wrap(k, vi, command, content, chars):
    """Common part of every read and write: frame -> transfer -> parse. Returns the parse node."""
    D, p = vi.diagram, vi.path
    made = await k.controls_like(vi, XFER, {"PLC Conn": "control", "error in (no error)": "control"})
    frame = await k.sub(D, FRAME, (560, 140))
    await k.wire(await k.const_str(D, command, (480, 100)), await k.t(frame, "Command"))
    await k.wire(await content(), await k.t(frame, "Content"))
    x = await k.sub(D, XFER, (700, 140))
    await k.wire(await k.t(frame, "Frame", source=True), await k.t(x, "TX"))
    await k.wire(await k.term_of(made["PLC Conn"]), await k.t(x, "PLC Conn"))
    await k.wire(await k.term_of(made["error in (no error)"]), await k.t(x, "error in (no error)"))
    if isinstance(chars, int):
        await k.const_on(p, await k.t(x, "Data Chars"), chars)
    else:
        await k.wire(await chars(), await k.t(x, "Data Chars"))
    pr = await k.sub(D, PARSE, (840, 140))
    await k.wire(await k.t(x, "RX", source=True), await k.t(pr, "RX"))
    await k.wire(await k.t(x, "error out", source=True), await k.t(pr, "error in (no error)"))
    await k.create(p, await k.t(x, "PLC Conn out", source=True), "Create Indicator", label="PLC Conn out")
    await k.create(p, await k.t(pr, "error out", source=True), "Create Indicator")
    return pr


async def ins_of(k, n):
    return await k.ins(n)


async def device_control(k, vi, xy=(120, 60)):
    n = await k.add(vi.diagram, "Concatenate Strings", (40, 1000))
    c = await k.create(vi.path, (await k.ins(n))[0], "Create Control", label="Device")
    await k.delete(vi.path, [n])
    return await k.term_of(c)


async def count_control(k, vi):
    n = await k.add(vi.diagram, "To Unsigned Byte Integer", (40, 1060))
    c = await k.create(vi.path, (await k.ins(n))[0], "Create Control", label="Count")
    await k.delete(vi.path, [n])
    await k.set("Numeric", "Rep", c, 7)        # U16
    return await k.term_of(c)


async def address_of(k, vi, xy, dev):
    """'D0200' -> '1190': D0 is at 1000h, two bytes per D."""
    D, p = vi.diagram, vi.path
    sub = await k.add(D, "String Subset", xy)
    await k.wire(dev, await k.t(sub, "string"))
    await k.const_on(p, await k.t(sub, "offset"), 1)
    num = await k.add(D, "Decimal String To Number", (xy[0] + 100, xy[1]))
    await k.wire(await k.t(sub, "substring", source=True), await k.t(num, "string"))
    m = await k.add(D, "Multiply", (xy[0] + 200, xy[1]))
    a, b = await k.ins(m)
    await k.wire(await k.t(num, "number", source=True), a)
    await k.const_on(p, b, 2)
    add = await k.add(D, "Add", (xy[0] + 280, xy[1]))
    a, b = await k.ins(add)
    await k.wire(await out1(k, m), a)
    await k.const_on(p, b, 4096)
    return await hex_text(k, p, D, (xy[0] + 360, xy[1]), await out1(k, add), 4)


async def make_read_words(k):
    vi = await k.call_new(RWORDS)
    D, p = vi.diagram, vi.path
    dev = await device_control(k, vi)
    cnt = await count_control(k, vi)

    async def times(xy, value):
        m = await k.add(D, "Multiply", xy)
        a, b = await k.ins(m)
        await k.wire(cnt, a)
        await k.const_on(p, b, value)
        return await out1(k, m)

    async def content():
        return await k.concat(D, (480, 200), await address_of(k, vi, (40, 200), dev),
                              await hex_text(k, p, D, (320, 300), await times((240, 300), 2), 2))

    async def chars():
        return await times((600, 300), 4)

    pr = await wrap(k, vi, "0", content, chars)
    data = await k.t(pr, "Data", source=True)
    loop = await k.add(D, "For Loop", (960, 220), (520, 240))
    LD = await k.loop_diagram(loop)
    await k.wire(cnt, await k.t(loop, "N", "count"))
    m = await k.add(LD, "Multiply", (1010, 300))
    a, b = await k.ins(m)
    await k.wire(await k.t(loop, "i"), a)
    await k.const_on(p, b, 4)
    off = await out1(k, m)
    lo = await k.add(LD, "String Subset", (1110, 280))
    await k.wire(data, await k.t(lo, "string"))
    await k.wire(off, await k.t(lo, "offset"))
    await k.const_on(p, await k.t(lo, "length"), 2)
    two = await k.add(LD, "Add", (1040, 380))
    a, b = await k.ins(two)
    await k.wire(off, a)
    await k.const_on(p, b, 2)
    hi = await k.add(LD, "String Subset", (1110, 380))
    await k.wire(data, await k.t(hi, "string"))
    await k.wire(await out1(k, two), await k.t(hi, "offset"))
    await k.const_on(p, await k.t(hi, "length"), 2)
    word = await k.concat(LD, (1220, 320), await k.t(hi, "substring", source=True), await k.t(lo, "substring", source=True))
    h = await k.add(LD, "Hexadecimal String To Number", (1300, 320))
    await k.wire(word, await k.t(h, "string"))
    u = await k.add(LD, "To Unsigned Word Integer", (1400, 320))
    await k.wire(await k.t(h, "number", source=True), (await k.ins(u))[0])
    u2 = await k.add(D, "To Unsigned Word Integer", (1520, 320))     # outside: makes the array
    await k.wire(await out1(k, u), (await k.ins(u2))[0])
    await k.create(p, await out1(k, u2), "Create Indicator", label="Words")
    await k.connect_any(p, ["PLC Conn", "Device", "Count", "error in (no error)"], ["PLC Conn out", "Words", "error out"])
    await k.finish(p)


async def make_write_word(k):
    vi = await k.call_new(WWORD)
    D, p = vi.diagram, vi.path
    dev = await device_control(k, vi)
    v = await count_control(k, vi)
    s = await k.snap(p)
    ctrl = next(c["reference"] for c in s["controls"] if c.get("label") == "Count")
    await k.label(ctrl, "Value")

    async def content():
        split = await k.add(D, "Split Number", (240, 300))
        await k.wire(v, (await ins_of(k, split))[0])
        hi, lo = await k.outs(split)
        return await k.concat(D, (480, 200), await address_of(k, vi, (40, 200), dev), await k.const_str(D, "02", (420, 160)),
                              await hex_text(k, p, D, (340, 300), lo, 2), await hex_text(k, p, D, (340, 360), hi, 2))

    await wrap(k, vi, "1", content, 0)
    await k.connect_any(p, ["PLC Conn", "Device", "Value", "error in (no error)"], ["PLC Conn out", "error out"])
    await k.finish(p, clean=True)


async def make_test(k):
    vi = await k.call_new(TEST)
    D, p = vi.diagram, vi.path
    o = await k.sub(D, OPEN, (100, 100))
    w = await k.sub(D, WWORD, (300, 100))
    r = await k.sub(D, RWORDS, (660, 100))
    c = await k.sub(D, CLOSE, (1020, 100))
    chain = [o, w, r, c]
    for src, dst in zip(chain, chain[1:]):
        await k.wire(await k.t(src, "PLC Conn out" if src is not o else "PLC Conn", source=True),
                     await k.t(dst, "PLC Conn"))
        await k.wire(await k.t(src, "error out", source=True), await k.t(dst, "error in (no error)"))
    for node, name, label in ((o, "Host", "Host"), (o, "Port", "Port"), (w, "Device", "Word Device"), (w, "Value", "Word Value"),
                              (r, "Device", "Read Device"), (r, "Count", "Read Count")):
        await k.create(p, await k.t(node, name), "Create Control", label=label)
    await k.create(p, await k.t(r, "Words", source=True), "Create Indicator", label="Words")
    await k.create(p, await k.t(c, "error out", source=True), "Create Indicator", label="error out")
    await k.finish(p, clean=True)


STEPS = (("FX_BuildFrame", make_frame), ("FX_Xfer", make_xfer), ("FX_ParseResponse", make_parse),
         ("FX_Open", make_open), ("FX_Close", make_close), ("FX_ReadWords", make_read_words),
         ("FX_WriteWord", make_write_word), ("FX_Test", make_test))


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
