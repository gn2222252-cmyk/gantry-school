# -*- coding: utf-8 -*-
"""Runs the reference VIs (the course design) and checks them against the soft PLC of 實作環境 (8-output version).
Run:  powershell -File run_lv.ps1 test_answers.py        result: out\\test_answers.txt and ..\\測試結果.md"""
import asyncio
import json
import socket
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, r"C:\Users\admin\PycharmProjects\PythonProject\labview-native-mcp-v2")
from lvkit import kit  # noqa: E402

ANS = Path(__file__).resolve().parents[1]
SOFTPLC = ANS.parents[1] / "實作環境" / "softplc" / "softplc.py"
PY = r"C:\Users\admin\AppData\Local\Programs\Python\Python312\python.exe"
RES = "TCPIP0::127.0.0.1::5551::SOCKET"
results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok), str(detail)[:200]))
    print("%-4s %-40s %s" % ("PASS" if ok else "FAIL", name, str(detail)[:200]))
    sys.stdout.flush()


def outs(r):
    return r.get("outputs", r) if isinstance(r, dict) else r


async def main():
    plc = subprocess.Popen([PY, "-B", str(SOFTPLC), "--headless", "--no-board"], stdout=subprocess.DEVNULL)
    time.sleep(1.5)
    ctl = socket.create_connection(("127.0.0.1", 5552), timeout=3).makefile("rw", encoding="utf-8", newline="\n")

    def say(text):
        ctl.write(text + "\n")
        ctl.flush()
        return ctl.readline().strip()

    try:
        async with kit() as k:
            async def run(name, inputs, outputs):
                p = ANS / name
                await k.call("open_vi", path=str(p))
                return outs(await k.run(p, inputs, outputs))

            # ---- lessons 9-11: pure string VIs, compared with the frames fx_server.py expects
            o = await run("FX_Sum.vi", {"Body": "010C802\x03"}, ["SS"])
            check("L10 FX_Sum(010C802+ETX) = 71", o["SS"] == "71", o)
            o = await run("FX_ReadFrame.vi", {"D": 100, "Words": 1}, ["Frame"])
            check("L09 FX_ReadFrame(100,1)", o["Frame"] == "\x02010C802\x0371", repr(o["Frame"]))
            o = await run("FX_ReadFrame.vi", {"D": 200, "Words": 30}, ["Frame"])
            check("L10 FX_ReadFrame(200,30)", o["Frame"] == "\x02011903C\x0374", repr(o["Frame"]))
            o = await run("FX_WriteFrame.vi", {"D": 106, "Value": 1}, ["Frame"])
            check("L10 FX_WriteFrame(106,1)", o["Frame"] == "\x02110D4020100\x0330", repr(o["Frame"]))
            o = await run("FX_Check.vi", {"RX": "\x02D204\x03DD"}, ["Data", "error out"])
            check("L11 FX_Check good reply", o["Data"] == "D204" and o["error out"][0] is False, o)
            o = await run("FX_Check.vi", {"RX": "\x02D204\x03DE"}, ["Data", "error out"])
            check("L11 FX_Check bad checksum -> 5001", o["error out"][0] is True and o["error out"][1] == 5001, o["error out"])

            # ---- lessons 12-14: against the soft PLC
            base = {"Resource (text)": RES, "Write D": 100, "Write Value": 1234, "Read D": 100, "Read Count": 3}
            o = await run("Test_Driver.vi", base, ["Words", "error out"])
            check("L13/L14 write D100 then read D100-D102", o["Words"] == [1234, 5, 50], o)
            check("no error", o["error out"][0] is False, o["error out"])
            st = json.loads(say("status"))
            check("soft PLC saw D100 = 1234", st["d"]["100"] == 1234, st["d"]["100"])
            check("no NAK on the soft PLC", st["errors"] == 0, st["errors"])

            o = await run("Test_Driver.vi", dict(base, **{"Write D": 106, "Write Value": 4, "Read D": 200, "Read Count": 3}), ["Words", "error out"])
            homes = []
            poll = dict(base, **{"Write D": 150, "Write Value": 0, "Read D": 200, "Read Count": 3})
            for _ in range(15):
                time.sleep(0.4)
                o = await run("Test_Driver.vi", poll, ["Words", "error out"])
                homes.append(o["Words"][2])
            st = json.loads(say("status"))
            check("L14 D106 = 4 -> homed (M20 = 1, D202 back to 0)", st["m"]["20"] == 1 and homes[-1] == 0, (st["m"]["20"], homes))

            o = await run("Test_Driver.vi", dict(poll, **{"Read Count": 30}), ["Words", "error out"])
            check("L15 read D200 x30 (largest block)", len(o["Words"]) == 30 and o["error out"][0] is False, len(o["Words"]))
            o = await run("Test_Driver.vi", dict(poll, **{"Read D": 230, "Read Count": 12}), ["Words", "error out"])
            x = o["Words"][0]
            check("L15 read D230 x12, X13 and X10 on", len(o["Words"]) == 12 and (x >> 11) & 1 == 1 and (x >> 8) & 1 == 1, hex(x))

            o = await run("Test_Driver.vi", dict(poll, **{"Read Count": 40}), ["error out"])
            check("40 words: PLC answers NAK -> error", o["error out"][0] is True, o["error out"])

            say("mute 1")
            o = await run("Test_Driver.vi", dict(poll, **{"Write D": 100, "Write Value": 5}), ["error out"])
            say("mute 0")
            check("silent line -> error (timeout)", o["error out"][0] is True, o["error out"])
            o = await run("Test_Driver.vi", poll, ["error out"])
            check("line back -> no error again", o["error out"][0] is False, o["error out"])
            for n in ("Test_Driver.vi", "FX_ReadD.vi", "FX_WriteD.vi", "FX_Open.vi", "FX_Check.vi", "FX_ReadFrame.vi", "FX_WriteFrame.vi", "FX_Sum.vi"):
                await k.call("close_vi", path=str(ANS / n))
    finally:
        plc.kill()
    passed = sum(1 for r in results if r[1])
    print("%d/%d" % (passed, len(results)))
    with open(ANS / "測試結果.md", "w", encoding="utf-8") as f:
        f.write("# 參考答案 VI 測試結果\n\n%s，對 實作環境 軟 PLC（8 輸出同步版，TCP 5551），%d/%d 通過\n\n| 項目 | 結果 | 細節 |\n| --- | --- | --- |\n"
                % (time.strftime("%Y-%m-%d %H:%M:%S"), passed, len(results)))
        for name, ok, detail in results:
            f.write("| %s | %s | %s |\n" % (name, "PASS" if ok else "FAIL", detail.replace("|", "/").replace("\x02", "<STX>").replace("\x03", "<ETX>")))
    return 0 if passed == len(results) else 1


sys.exit(asyncio.run(main()))
