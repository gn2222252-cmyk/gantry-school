import asyncio, sys, os, tempfile, json
sys.path.insert(0, r"C:\Users\admin\PycharmProjects\PythonProject\labview-native-mcp-v2")
from lvkit import kit
async def tryit(k, label, coro):
    try:
        r = await coro; print("OK ", label, str(r)[:300])
    except BaseException as e:
        print("ERR", label, str(e)[:200])
async def main():
    async with kit() as k:
        p = os.path.join(tempfile.gettempdir(), "gt_probe2.vi")
        r = await k.call("new_vi", path=p, overwrite=True); D = r["diagram"]
        case = await k.add(D, "Case Structure", (100, 100), (300, 200))
        c = await k.add(D, "Numeric Constant", (20, 150))
        fr = await k.case_on(case, await k.t(c, "value"))
        print("frames", list(fr))
        for cls, mem, inp in [("CaseStructure","Add Case",{}),("CaseStructure","AddCase",{}),("CaseStructure","Duplicate Case",{}),("MultiFrameStructure","Add Frame",{}),("CaseStructure","Add Case After",{}),("CaseStructure","Add Frame",{})]:
            await tryit(k, cls+"."+mem, k.call("invoke", object_class=cls, member=mem, reference=case, inputs=inp))
        await tryit(k, "names", k.get("CaseStructure","Frame Names",case))
        await tryit(k, "set names", k.set("CaseStructure","Frame Names",case,"0\r\n10\r\n20, 40\r\nDefault"))
        await tryit(k, "names2", k.get("CaseStructure","Frame Names",case))
        await tryit(k, "frames2", k.case_frames(case))
        # cluster naming via Bundle
        b = await k.add(D, "Bundle", (500, 300))
        await k.grow(b, 2)
        ins = await k.ins(b); print("bundle ins", len(ins))
        a1 = await k.create(p, ins[0], "Create Control", label="D")
        a2 = await k.create(p, ins[1], "Create Control", label="Value")
        ind = await k.create(p, (await k.outs(b))[0], "Create Indicator", label="Cmd")
        s = await k.snap(p)
        print("controls", [(c.get("label"), c.get("class")) for c in s["controls"]])
        await tryit(k, "cluster elems", k.get("Cluster","Controls[]",ind))
        ub = await k.add(D, "Unbundle By Name", (700, 300))
        await k.wire((await k.outs(b))[0], (await k.ins(ub))[0])
        print("ubn terms", await k.terms(ub))
        bb = await k.add(D, "Bundle By Name", (700, 400))
        await k.wire((await k.outs(b))[0], await k.t(bb, "input cluster"))
        await k.grow(bb, 3)
        print("bbn terms", await k.terms(bb))
        await k.call("close_vi", path=p)
asyncio.run(main())
