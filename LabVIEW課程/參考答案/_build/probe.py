import asyncio, sys, os, tempfile
sys.path.insert(0, r"C:\Users\admin\PycharmProjects\PythonProject\labview-native-mcp-v2")
from lvkit import kit
async def main():
    async with kit() as k:
        p = os.path.join(tempfile.gettempdir(), "gt_probe.vi")
        r = await k.call("new_vi", path=p, overwrite=True); D = r["diagram"]
        for st in ["Format Into String", "Swap Bytes", "Hexadecimal String To Number", "Index Array", "Build Array", "Bundle By Name", "Unbundle By Name", "Obtain Queue", "Dequeue Element", "Write Delimited Spreadsheet", "VISA Open", "In Range and Coerce", "Boolean Array To Number", "Error Cluster Constant"]:
            try:
                n = await k.add(D, st, (100, 100))
                ts = await k.terms(n)
                print(st, "->", [(t["name"], "out" if t.get("source") else "in") for t in ts])
            except BaseException as e:
                print(st, "FAIL", e)
        n = await k.add(D, "Format Into String", (300, 300)); await k.grow(n, 3)
        print("FIS grown", [(t["name"], "out" if t.get("source") else "in") for t in await k.terms(n)])
        await k.call("close_vi", path=p)
asyncio.run(main())
