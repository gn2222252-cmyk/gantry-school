# -*- coding: utf-8 -*-
"""Checks the project VIs of the course (lessons 6, 15-20) and runs GT_Main.vi through the lesson 21 test list
against the soft PLC of 實作環境 (8-output version).
Run:  powershell -File run_lv.ps1 test_project.py        result: out\\test_project.txt and ..\\專案測試結果.md"""
import asyncio
import json
import socket
import subprocess
import sys
import time
from datetime import date
from pathlib import Path

sys.path.insert(0, r"C:\Users\admin\PycharmProjects\PythonProject\labview-native-mcp-v2")
from lvkit import kit  # noqa: E402

ANS = Path(__file__).resolve().parents[1]
SOFTPLC = ANS.parents[1] / "實作環境" / "softplc" / "softplc.py"
PY = r"C:\Users\admin\AppData\Local\Programs\Python\Python312\python.exe"
RES = "TCPIP0::127.0.0.1::5551::SOCKET"
MAIN = ANS / "GT_Main.vi"
results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok), str(detail)[:200]))
    print("%-4s %-46s %s" % ("PASS" if ok else "FAIL", name, str(detail)[:200]))
    sys.stdout.flush()


def outs(r):
    return r.get("outputs", r) if isinstance(r, dict) else r


class Plc:
    def __init__(self):
        self.proc = subprocess.Popen([PY, "-B", str(SOFTPLC), "--headless", "--no-board"], stdout=subprocess.DEVNULL)
        for _ in range(50):
            try:
                self.f = socket.create_connection(("127.0.0.1", 5552), timeout=5).makefile("rw", encoding="utf-8", newline="\n")
                return
            except OSError:
                time.sleep(0.1)
        raise SystemExit("soft PLC did not start")

    def say(self, text):
        self.f.write(text + "\n")
        self.f.flush()
        return self.f.readline().strip()

    def st(self):
        return json.loads(self.say("status"))


async def wait_for(test, seconds):
    end = time.time() + seconds
    while time.time() < end:
        if test():
            return True
        await asyncio.sleep(0.1)
    return False


async def main():
    log_file = ANS / "logs" / (date.today().isoformat() + ".csv")
    plc = Plc()
    try:
        async with kit() as k:
            async def run(name, inputs, outputs):
                p = ANS / name
                await k.call("open_vi", path=str(p))
                return outs(await k.run(p, inputs, outputs))

            # ---- lesson 6: text VIs
            o = await run("GT_StepText.vi", {"Step": 24}, ["Step Text"])
            check("L06 GT_StepText(24) = To rear", o["Step Text"] == "To rear", o)
            o = await run("GT_StepText.vi", {"Step": 47}, ["Step Text"])
            check("L06 GT_StepText(47) = Up", o["Step Text"] == "Up", o)
            o = await run("GT_StepText.vi", {"Step": 99}, ["Step Text"])
            check("L06 GT_StepText(99) = Unknown", o["Step Text"] == "Unknown", o)
            o = await run("GT_AlarmText.vi", {"Alarm Code": 10}, ["Alarm Text"])
            check("L06 GT_AlarmText(10)", o["Alarm Text"] == "RIGHT AXIS TIMEOUT", o)
            # ---- lesson 15: GT_Parse
            w = [0] * 42
            w[0], w[1], w[2], w[10], w[11], w[12], w[20], w[30], w[31], w[32], w[41] = 22, 42, 0, 5, 4, 4, 10, 0x0B54, 0x0024, 0b000101, 7
            o = await run("GT_Parse.vi", {"Words": w}, ["Status"])
            s = o["Status"]
            print("Status value:", s)
            check("L15 GT_Parse numbers", list(s[:7]) == [22, 42, 0, 5, 4, 4, 10] and s[15] == 7, s[:7])
            x = s[7]
            check("L15 GT_Parse X bits (X2, X4, X6, X10, X11, X13)", [i for i, b in enumerate(x) if b] == [2, 4, 6, 8, 9, 11], x)
            check("L15 GT_Parse status bits (Auto, Homed)", list(s[9:15]) == [True, False, True, False, False, False], s[9:15])
            # ---- lesson 20: GT_Log
            before = log_file.read_text(encoding="utf-8").splitlines() if log_file.exists() else []
            o = await run("GT_Log.vi", {"Event": "TEST", "Code": 99, "Text": "from test"}, ["error out"])
            after = log_file.read_text(encoding="utf-8").splitlines() if log_file.exists() else []
            check("L20 GT_Log appends a CSV line", len(after) == len(before) + 1 and after[-1].endswith(",TEST,99,from test"),
                  after[-1:] or o)

            # ---- lesson 15: GT_Monitor (read only; homing is started from the soft PLC side)
            mon = ANS / "GT_Monitor.vi"
            await k.call("open_vi", path=str(mon))
            await k.call("run_start", path=str(mon), inputs={"PLC Port": RES})
            await asyncio.sleep(1.5)
            plc.say("hmi 102")
            seen = set()
            for _ in range(30):
                st0 = (await k.call("panel_get", path=str(mon), names=["Status"]))["Status"]
                seen.add(st0[2])
                if st0[11]:
                    break
                await asyncio.sleep(0.2)
            check("L15 GT_Monitor shows homing and Homed", st0[11] is True, (sorted(seen), st0[11]))
            await k.call("panel_set", path=str(mon), values={"stop": True})
            ended = await wait_for(lambda: True, 0)
            for _ in range(20):
                await asyncio.sleep(0.25)
                if not (await k.call("vi_state", path=str(mon))).get("running"):
                    break
            check("L15 GT_Monitor STOP ends it", not (await k.call("vi_state", path=str(mon))).get("running"))
            await k.call("close_vi", path=str(mon))
            plc.say("press X013 0")
            await asyncio.sleep(0.3)
            plc.say("press X013 1")
            await asyncio.sleep(0.3)
            plc.say("hmi 103")                     # back to not homed, so GT_Main starts from power-on state
            await asyncio.sleep(0.5)

            # ---- lessons 16-21: GT_Main against the soft PLC
            await k.call("open_vi", path=str(MAIN))
            await k.call("run_start", path=str(MAIN), inputs={"PLC Port": RES})

            async def get(*names):
                return await k.call("panel_get", path=str(MAIN), names=list(names))

            async def press(name, value=True):
                await k.call("panel_set", path=str(MAIN), values={name: value})

            async def panel_until(name, want, seconds):
                end = time.time() + seconds
                while time.time() < end:
                    if (await get(name))[name] == want:
                        return True
                    await asyncio.sleep(0.15)
                return False

            check("connects (PLC Connected)", await panel_until("PLC Connected", True, 8))
            samples = []
            for _ in range(8):
                samples.append(plc.st()["d"]["240"])
                await asyncio.sleep(0.5)
            steps = [b - a for a, b in zip(samples, samples[1:]) if b != a]
            check("L19 heartbeat D240 moves about 1 per s", 2 <= len(steps) <= 5 and all(x == 1 for x in steps), samples)
            check("power on: not homed", (await get("Homed"))["Homed"] is False)
            await press("Home")
            check("L17 Home -> homed", await wait_for(lambda: plc.st()["m"]["20"] == 1, 12))
            check("Homed lamp", await panel_until("Homed", True, 2))
            plc.say("part front 0")
            await press("Start")
            check("L17 Start -> auto", await wait_for(lambda: plc.st()["m"]["0"] == 1, 3))
            check("Auto Running lamp", await panel_until("Auto Running", True, 2))
            check("Right Step Text follows", await panel_until("Right Step Text", "Down to pick", 8), await get("Right Step Text"))
            check("one transfer counted", await wait_for(lambda: plc.st()["d"]["210"] >= 1, 40), plc.st()["d"]["210"])
            check("Right Count on the panel", await panel_until("Right Count", plc.st()["d"]["210"], 3))
            await press("Stop")
            check("L17 Stop -> stops after the trip", await wait_for(lambda: plc.st()["m"]["0"] == 0, 25))
            await press("Vacuum Time (0.1 s)", 20)
            await press("Write")
            check("L17 parameter Write -> D100 = 20", await wait_for(lambda: plc.st()["d"]["100"] == 20, 3), plc.st()["d"]["100"])
            await press("Vacuum Time (0.1 s)", 999)
            await press("Write")
            check("In Range and Coerce: 999 -> D100 = 100", await wait_for(lambda: plc.st()["d"]["100"] == 100, 3), plc.st()["d"]["100"])
            await press("Vacuum Time (0.1 s)", 5)
            await press("Write")
            await press("Clear Counts")
            check("Clear Counts", await wait_for(lambda: plc.st()["d"]["210"] == 0, 3))
            # E-stop and alarm log
            plc.say("press X013 0")
            check("E-stop: Alarm Code 1 on panel", await panel_until("Alarm Code", 1, 3))
            check("E-stop: Alarm Text", (await get("Alarm Text"))["Alarm Text"] == "E-STOP", await get("Alarm Text"))
            check("E-Stop lamp", await panel_until("E-Stop", True, 2))
            await press("Reset")
            await asyncio.sleep(0.5)
            check("reset refused while pressed", plc.st()["d"]["220"] == 1)
            plc.say("press X013 1")
            await asyncio.sleep(0.3)
            await press("Reset")
            check("reset after release", await wait_for(lambda: plc.st()["d"]["220"] == 0, 3))
            await asyncio.sleep(0.6)
            hist = (await get("Alarm History"))["Alarm History"]
            check("L20 Alarm History has the E-STOP row", any(r[1:] == ["1", "E-STOP"] for r in hist), hist)
            lines = log_file.read_text(encoding="utf-8").splitlines()
            check("L20 CSV has ALARM 1 and CLEAR 0", any(",ALARM,1,E-STOP" in x for x in lines) and any(",CLEAR,0,OK" in x for x in lines), lines[-3:])
            await press("Home")
            await wait_for(lambda: plc.st()["m"]["20"] == 1, 12)
            # manual and jog
            plc.say("press X010 0")
            check("Manual Allowed lamp", await panel_until("Manual Allowed", True, 3))
            await press("Conveyors", True)
            check("L17 jog Conveyors -> Y2 on", await wait_for(lambda: plc.st()["y"][2] == 1, 2))
            check("D107 shows 8000h", (await get("D107"))["D107"] == 0x8000, await get("D107"))
            await press("Conveyors", False)
            check("Conveyors off -> Y2 off", await wait_for(lambda: plc.st()["y"][2] == 0, 2))
            await press("R Down", True)
            check("hold R Down -> X12 down", await wait_for(lambda: plc.st()["x"][10] == 1, 3))
            await press("R Down", False)
            await press("R Up", True)
            await wait_for(lambda: plc.st()["x"][9] == 1, 3)
            await press("R Up", False)
            # link lost while a jog is held, then back (lesson 19)
            await press("Conveyors", True)
            await wait_for(lambda: plc.st()["y"][2] == 1, 2)
            plc.say("mute 1")
            check("L19 link lost: PLC stops the output", await wait_for(lambda: plc.st()["y"][2] == 0, 6))
            check("L19 panel shows the link down", await panel_until("PLC Connected", False, 8))
            await press("Conveyors", False)
            plc.say("mute 0")
            check("L19 reconnects by itself", await panel_until("PLC Connected", True, 12))
            await asyncio.sleep(1.5)
            s = plc.st()
            check("L19 stale jog not sent after reconnect", s["y"][2] == 0 and s["m"]["125"] == 0, s["y"])
            await press("Reset")
            await wait_for(lambda: plc.st()["d"]["220"] == 0, 4)
            # exit (lessons 16, 19)
            await press("Exit")
            ended = False
            for _ in range(60):
                await asyncio.sleep(0.25)
                stt = await k.call("vi_state", path=str(MAIN))
                if not stt.get("running"):
                    ended = True
                    break
            check("L16 Exit ends both loops", ended, stt)
            check("L19 Exit writes D240 = 0", plc.st()["d"]["240"] == 0, plc.st()["d"]["240"])
            await asyncio.sleep(3.5)
            check("L19 no alarm 40 after a normal exit (manual mode)", plc.st()["d"]["220"] == 0, plc.st()["d"]["220"])
            e = (await get("error out"))["error out"]
            check("no error at the end", e[0] is False, e)
            if not ended:
                await k.call("abort_vi", path=str(MAIN))
            for n in ("GT_Main.vi", "GT_StepText.vi", "GT_AlarmText.vi", "GT_Parse.vi", "GT_Log.vi"):
                await k.call("close_vi", path=str(ANS / n))
    finally:
        plc.proc.kill()
    passed = sum(1 for r in results if r[1])
    print("%d/%d" % (passed, len(results)))
    for r in results:
        if not r[1]:
            print("FAILED:", r[0], r[2])
    with open(ANS / "專案測試結果.md", "w", encoding="utf-8") as f:
        f.write("# 專案 VI（第 6、15～21 課）測試結果\n\n%s，對 實作環境 軟 PLC（8 輸出同步版），%d/%d 通過\n\n| 項目 | 結果 | 細節 |\n| --- | --- | --- |\n"
                % (time.strftime("%Y-%m-%d %H:%M:%S"), passed, len(results)))
        for name, ok, detail in results:
            f.write("| %s | %s | %s |\n" % (name, "PASS" if ok else "FAIL", detail.replace("|", "/")))
    return 0 if passed == len(results) else 1


sys.exit(asyncio.run(main()))
