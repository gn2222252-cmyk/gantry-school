import asyncio, sys, os, tempfile
sys.path.insert(0, r"C:\Users\admin\PycharmProjects\PythonProject\labview-native-mcp-v2")
from lvkit import kit, VI
async def tryit(label, coro):
    try:
        r = await coro; print("OK ", label, str(r)[:300]); return r
    except BaseException as e:
        print("ERR", label, str(e)[:250])
async def main():
    async with kit() as k:
        p = os.path.join(tempfile.gettempdir(), "gt_probe4.vi")
        r = await k.call("new_vi", path=p, overwrite=True); D = r["diagram"]
        ba = await k.add(D, "Build Array", (100, 100))
        for cls, mem in [("BuildArray","Concatenate Inputs"),("BuildArray","Concatenate"),("BuildArray","Concatenate Inputs?")]:
            await tryit("get "+cls+"."+mem, k.get(cls, mem, ba))
            await tryit("set "+cls+"."+mem, k.set(cls, mem, ba, True))
        await tryit("style Search 1D Array", k.style("Search 1D Array"))
        await tryit("style Flush Queue", k.style("Flush Queue"))
        await tryit("style Clear Errors", k.find_vilib("Clear Errors") if hasattr(k,'find_vilib') else k.call("find_vilib", query="Clear Errors"))
        await tryit("style Tick Count", k.style("Tick Count (ms)"))
        await tryit("style Format Date/Time String", k.style("Format Date/Time String"))
        await tryit("style Current VI's Path", k.style("Current VI's Path"))
        await tryit("style Strip Path", k.style("Strip Path"))
        await tryit("style Build Path", k.style("Build Path"))
        await tryit("style Simple Error Handler", k.call("find_vilib", query="Simple Error Handler"))
        loop = await k.add(D, "While Loop", (300, 300), (300, 200))
        LD = await k.loop_diagram(loop)
        tmp = await k.add(LD, "VISA Close", (400, 350))
        await tryit("wire err to stop", k.wire(await k.t(tmp, "error out", source=True), await k.t(loop, "loop condition", "condition", "stop")))
        print("loop terms", [(t["name"], t.get("source")) for t in await k.terms(loop)])
        s = await k.snap(p); print("broken", [w for w in s["wires"] if w.get("broken")], s["executable"])
        await k.call("close_vi", path=p)
asyncio.run(main())
