# -*- coding: utf-8 -*-
"""PLC_Link_Test.vi: one-button communication check for the real FX3S (or the soft PLC).
Step 1 opens the port, step 2 reads D241, step 3 reads D241 again 2 s later: it must have changed (the PLC program
counts it once per second), and D230/D231 show X/Y. Run:  powershell -File run_lv.ps1 build_school.py"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, r"C:\Users\admin\PycharmProjects\PythonProject\labview-native-mcp-v2")
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lvkit import VI, kit  # noqa: E402
from build_answers import OUT, OPEN, READD, VIN, VOUT, out1, temp_control, gate  # noqa: E402

TEST = OUT / "PLC_Link_Test.vi"
SIM = "TCPIP0::127.0.0.1::5551::SOCKET"


async def ok_led(k, vi, err, name):
    st = (await k.outs(await unbundle(k, vi.diagram, err)))[0]
    await k.create(vi.path, await gate(k, vi.diagram, "Not", (900, 600), st), "Create Indicator", label=name)


async def unbundle(k, D, cluster):
    u = await k.add(D, "Unbundle", (800, 600))
    await k.wire(cluster, (await k.ins(u))[0])
    return u


async def read(k, vi, xy, visa, err, d, count):
    p = vi.path
    r = await k.sub(vi.diagram, READD, xy)
    await k.wire(visa, await k.t(r, "VISA in"))
    await k.wire(err, await k.t(r, "error in (no error)"))
    await k.wire(d, await k.t(r, "D"))
    await k.const_on(p, await k.t(r, "Count"), count)
    return r


async def main():
    async with kit() as k:
        r = await k.call("new_vi", path=str(TEST), overwrite=True)
        vi = VI(str(TEST), r["diagram"], r["panel"])
        D, p = vi.diagram, vi.path
        com = await k.term_of(await temp_control(k, vi, "Concatenate Strings", "string", "COM Port (e.g. COM3)"))
        sim = await k.term_of(await k.typed_control(p, D, "Select", "s", "Use Soft PLC (TCP 5551)"))
        sel = await k.add(D, "Select", (200, 100))
        await k.wire(sim, await k.t(sel, "s", source=False))
        await k.wire(await k.const_str(D, SIM, (100, 60)), await k.t(sel, "t", source=False))
        await k.wire(com, await k.t(sel, "f", source=False))
        res = await out1(k, sel)
        await k.create(p, res, "Create Indicator", label="Resource used")
        o = await k.sub(D, OPEN, (320, 100))
        await k.wire(res, await k.t(o, "Resource"))
        await k.wire(await gate(k, D, "Not", (260, 160), sim), await k.t(o, "Serial (COM)?"))
        visa, err = await k.t(o, "VISA out", source=True), await k.t(o, "error out", source=True)
        await ok_led(k, vi, err, "1 Port opened")
        # ENQ -> ACK: the simplest frame of the protocol; answers even if D reads are refused
        w = await k.add(D, "VISA Write", (400, 40))
        await k.wire(visa, await k.t(w, *VIN, source=False))
        await k.wire(err, await k.t(w, "error in", source=False))
        await k.wire(await k.const_str(D, "", (340, 20)), await k.t(w, "write buffer"))
        rd = await k.add(D, "VISA Read", (440, 40))
        await k.wire(await k.t(w, *VOUT, source=True), await k.t(rd, *VIN, source=False))
        await k.wire(await k.t(w, "error out", source=True), await k.t(rd, "error in", source=False))
        await k.const_on(p, await k.t(rd, "byte count"), 1)
        ack = await gate(k, D, "Equal?", (520, 30), await k.t(rd, "read buffer", source=True), await k.const_str(D, "", (460, 0)))
        await k.create(p, ack, "Create Indicator", label="2 PLC answers ENQ with ACK")
        visa, err = await k.t(rd, *VOUT, source=True), await k.t(rd, "error out", source=True)
        d241 = await k.add(D, "Numeric Constant", (360, 260))
        await k.lv.set("Constant", "Value", d241, 241)
        r1 = await read(k, vi, (480, 100), visa, err, await k.t(d241, "value"), 1)
        await ok_led(k, vi, await k.t(r1, "error out", source=True), "3 D241 read OK")
        b1 = await k.add(D, "Index Array", (620, 200))
        await k.wire(await k.t(r1, "Words", source=True), await k.t(b1, "array", source=False))
        beat1 = await k.t(b1, "element", source=True)
        await k.create(p, beat1, "Create Indicator", label="PLC Beat 1 (D241)")
        # second read 2 s later: the Wait output feeds D through x*0, so the read cannot start earlier
        wt = await k.add(D, "Wait (ms)", (480, 300))
        await k.const_on(p, (await k.ins(wt))[0], 2000)
        zero = await k.add(D, "Multiply", (560, 300))
        a, b = await k.ins(zero)
        await k.wire(await out1(k, wt), a)
        await k.const_on(p, b, 0)
        d2 = await gate(k, D, "Add", (620, 280), await out1(k, zero), await k.t(d241, "value"))
        u = await k.add(D, "To Unsigned Word Integer", (680, 280))
        await k.wire(d2, (await k.ins(u))[0])
        r2 = await read(k, vi, (760, 100), await k.t(r1, "VISA out", source=True), await k.t(r1, "error out", source=True), await out1(k, u), 1)
        b2 = await k.add(D, "Index Array", (900, 200))
        await k.wire(await k.t(r2, "Words", source=True), await k.t(b2, "array", source=False))
        beat2 = await k.t(b2, "element", source=True)
        await k.create(p, beat2, "Create Indicator", label="PLC Beat 2 (2 s later)")
        noerr = (await k.outs(await unbundle(k, D, await k.t(r2, "error out", source=True))))[0]
        changed = await gate(k, D, "Not Equal?", (980, 220), beat1, beat2)
        running = await gate(k, D, "And", (1040, 240), changed, await gate(k, D, "Not", (980, 280), noerr))
        await k.create(p, running, "Create Indicator", label="4 PLC program running (D241 counts)")
        d230 = await k.add(D, "Numeric Constant", (900, 330))
        await k.lv.set("Constant", "Value", d230, 230)
        r3 = await read(k, vi, (1040, 100), await k.t(r2, "VISA out", source=True), await k.t(r2, "error out", source=True), await k.t(d230, "value"), 2)
        await k.create(p, await k.t(r3, "Words", source=True), "Create Indicator", label="D230 X word, D231 Y word")
        c = await k.add(D, "VISA Close", (1180, 100))
        await k.wire(await k.t(r3, "VISA out", source=True), await k.t(c, *VIN, source=False))
        await k.wire(await k.t(r3, "error out", source=True), await k.t(c, "error in", source=False))
        await k.create(p, await k.t(c, "error out", source=True), "Create Indicator", label="error out (code and source tell what failed)")
        await k.finish(p, clean=True)


asyncio.run(main())
