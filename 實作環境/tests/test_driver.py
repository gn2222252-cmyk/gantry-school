# -*- coding: utf-8 -*-
"""FX_*.vi against the soft PLC over TCP. Run with run_lv.ps1. Also checks a NAK and a dead line give an error."""
import asyncio
import json
import socket
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, r"C:\Users\admin\PycharmProjects\PythonProject\labview-native-mcp-v2")
from lvkit import kit  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
PY = r"C:\Users\admin\AppData\Local\Programs\Python\Python312\python.exe"
DRV = ROOT / "driver"
results = []


def check(name, ok, detail=""):
    results.append(bool(ok))
    print("%-4s %-34s %s" % ("PASS" if ok else "FAIL", name, str(detail)[:200]))
    sys.stdout.flush()


async def main():
    plc = subprocess.Popen([PY, "-B", str(ROOT / "softplc" / "softplc.py"), "--headless"], stdout=subprocess.DEVNULL)
    time.sleep(1.0)
    ctl = socket.create_connection(("127.0.0.1", 5552), timeout=3).makefile("rw", encoding="utf-8", newline="\n")

    def say(text):
        ctl.write(text + "\n")
        ctl.flush()
        return ctl.readline().strip()

    try:
        async with kit() as k:
            test = DRV / "FX_Test.vi"
            await k.call("open_vi", path=str(test))
            base = {"Host": "127.0.0.1", "Port": 5551, "Word Device": "D0100", "Word Value": 1234,
                    "Read Device": "D0100", "Read Count": 3}
            r = await k.run(test, base, ["Words", "error out"])
            print(r)
            out = r.get("outputs", r) if isinstance(r, dict) else r
            check("write then read D100", out["Words"][0] == 1234, out["Words"])
            check("defaults D101 D102", out["Words"][1:3] == [5, 50], out["Words"])
            check("no error", out["error out"][0] is False, out["error out"])
            st = json.loads(say("status"))
            check("PLC saw D100", st["d"]["100"] == 1234, st["d"]["100"])
            check("no NAK on the server", st["errors"] == 0, st["errors"])

            r = await k.run(test, dict(base, **{"Word Device": "D0106", "Word Value": 4}), ["Words", "error out"])
            time.sleep(0.2)
            st = json.loads(say("status"))
            check("D106 reached PLC (homing)", st["m"]["21"] == 1 or st["m"]["20"] == 1, st["m"])

            r = await k.run(test, dict(base, **{"Read Count": 40}), ["Words", "error out"])
            out = r.get("outputs", r)
            e = out["error out"]
            check("NAK becomes error 5412", e[0] is True and e[1] == 5412, e)

            say("mute 1")
            begin = time.time()
            r = await k.run(test, base, ["error out"])
            say("mute 0")
            out = r.get("outputs", r)
            print(out, time.time() - begin)
            e = out["error out"]
            check("silent line gives an error", e[0] is True, e)
            await k.call("close_vi", path=str(test))
    finally:
        plc.kill()
    print("%d/%d" % (sum(results), len(results)))
    return 0 if all(results) else 1


sys.exit(asyncio.run(main()))
