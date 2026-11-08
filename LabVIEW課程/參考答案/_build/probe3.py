import asyncio, sys, os, tempfile, json
sys.path.insert(0, r"C:\Users\admin\PycharmProjects\PythonProject\labview-native-mcp-v2")
from lvkit import kit, VI
from build_answers import u16_control, temp_control
async def tryit(label, coro):
    try:
        r = await coro; print("OK ", label, str(r)[:400]); return r
    except BaseException as e:
        print("ERR", label, str(e)[:300])
async def main():
    async with kit() as k:
        p = os.path.join(tempfile.gettempdir(), "gt_probe3.vi")
        r = await k.call("new_vi", path=p, overwrite=True); vi = VI(p, r["diagram"], r["panel"]); D = vi.diagram
        a = await u16_control(k, vi, "D"); b2 = await u16_control(k, vi, "Value")
        b = await k.add(D, "Bundle", (500, 300)); await k.grow(b, 2)
        ins = await k.ins(b)
        await k.wire(await k.term_of(a), ins[0]); await k.wire(await k.term_of(b2), ins[1])
        ind = await k.create(p, (await k.outs(b))[0], "Create Indicator", label="Cmd")
        await tryit("elems", k.get("Cluster","Controls[]",ind))
        els = await k.get("Cluster","Controls[]",ind)
        for e in (els if isinstance(els, list) else []):
            await tryit("label", k.get("Control","Label",e))
            lab = await k.get("Control","Label",e); await tryit("text", k.get("Text","Text",lab))
        ub = await k.add(D, "Unbundle By Name", (700, 300))
        await k.wire((await k.outs(b))[0], (await k.ins(ub))[0])
        print("ubn terms", [(t["name"], t.get("source")) for t in await k.terms(ub)])
        await tryit("grow ub", k.call("invoke", object_class="GrowableFunction", member="Resize.AddChunk", reference=ub, inputs={"Chunks To Add":1}))
        print("ubn terms2", [(t["name"], t.get("source")) for t in await k.terms(ub)])
        bb = await k.add(D, "Bundle By Name", (700, 400))
        await k.wire((await k.outs(b))[0], await k.t(bb, "input cluster"))
        await k.call("invoke", object_class="GrowableFunction", member="Resize.AddChunk", reference=bb, inputs={"Chunks To Add":1})
        print("bbn terms", [(t["name"], t.get("source")) for t in await k.terms(bb)])
        for cls, mem in [("BundleByName","Names"),("Bundler","Names"),("NamedBundler","Names"),("NamedUnbundler","Names"),("Node","Names")]:
            await tryit(cls+"."+mem, k.get(cls, mem, bb))
        # create constant from indicator terminal
        await tryit("const", k.create(p, await k.term_of(ind), "Create Constant"))
        q = await k.add(D, "Obtain Queue", (300, 500))
        print("WDS", await k.call("find_vilib", query="Write Delimited Spreadsheet"))
        await k.call("close_vi", path=p)
asyncio.run(main())
