# -*- coding: utf-8 -*-
"""Main.vi against the soft PLC and machine simulation, real time. Run with run_lv.ps1.
   python test_main.py          Section 8 items, all of them that software can reach
   python test_main.py 9600     short run with 9600 bps timing, measures the polling period
Buttons are pressed with panel_set, which is not a real mouse. See the manual list in REPORTS\\final.md."""
import asyncio
import csv
import json
import socket
import subprocess
import sys
import time
from datetime import date
from pathlib import Path

sys.path.insert(0, r"C:\Users\admin\PycharmProjects\PythonProject\labview-native-mcp-v2")
from lvkit import kit  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
PY = r"C:\Users\admin\AppData\Local\Programs\Python\Python312\python.exe"
MAIN = ROOT / "Main.vi"
results = []
slow = "9600" in sys.argv


def check(name, ok, detail=""):
    results.append((name, bool(ok), str(detail)[:160]))
    print("%-4s %-44s %s" % ("PASS" if ok else "FAIL", name, str(detail)[:160]))
    sys.stdout.flush()


class Plc(object):
    def __init__(self):
        args = [PY, "-B", str(ROOT / "softplc" / "softplc.py"), "--headless"] + (["--slow9600"] if slow else [])
        self.proc = subprocess.Popen(args, stdout=subprocess.DEVNULL)
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

    def stop(self):
        self.proc.kill()


async def wait_for(test, seconds, what):
    end = time.time() + seconds
    while time.time() < end:
        if test():
            return True
        await asyncio.sleep(0.1)
    print("  timed out waiting for", what)
    return False


async def main():
    plc = Plc()
    log_file = ROOT / "logs" / (date.today().isoformat() + ".csv")
    (ROOT / "logs").mkdir(exist_ok=True)
    lines_before = len(log_file.read_text(encoding="utf-8").splitlines()) if log_file.exists() else 0
    try:
        async with kit() as k:
            await k.call("open_vi", path=str(MAIN))
            await k.call("run_start", path=str(MAIN))

            async def get(*names):
                return await k.call("panel_get", path=str(MAIN), names=list(names))

            async def press(name, value=True):
                await k.call("panel_set", path=str(MAIN), values={name: value})

            async def shot(name):
                (ROOT / "REPORTS" / (name + ".png")).write_bytes(await k.lv.png(str(MAIN), "panel"))

            async def panel_until(name, want, seconds):
                end = time.time() + seconds
                while time.time() < end:
                    v = (await get(name))[name]
                    if v == want:
                        return True
                    await asyncio.sleep(0.15)
                return False

            check("connects to the PLC", await panel_until("PLC Connected", True, 8))
            check("PLC Alive lamp", await panel_until("PLC Alive", True, 6))
            await wait_for(lambda: plc.st()["d"]["240"] > 0, 4, "first beat")
            samples = []
            for _ in range(13):                    # 6 s, one sample each 0.5 s
                samples.append(plc.st()["d"]["240"])
                await asyncio.sleep(0.5)
            print("D240 samples", samples)
            steps = [b - a for a, b in zip(samples, samples[1:]) if b != a]
            check("HMI heartbeat D240 moves 1 per s", 5 <= len(steps) <= 7 and all(x == 1 for x in steps), samples)
            s = plc.st()
            check("T01 power on: S0, not homed", s["states"] == [0] and s["m"]["20"] == 0, s["states"])

            if slow:
                r0 = plc.st()["requests"]
                await asyncio.sleep(10)
                r1 = plc.st()["requests"]
                per = 10.0 / max(1, (r1 - r0) / 2.0)
                print("9600: %.1f requests/s, polling period about %.0f ms" % ((r1 - r0) / 10.0, per * 1000))
                await press("Home")
                check("9600 home", await wait_for(lambda: plc.st()["m"]["20"] == 1, 12, "homed"))
                plc.say("part front 800")
                await press("Start")
                check("9600 one transfer", await wait_for(lambda: plc.st()["d"]["210"] >= 1, 25, "count"))
                check("9600 no errors on the line", plc.st()["errors"] == 0, plc.st()["errors"])
                await press("Exit")
                ended = False
                for _ in range(60):
                    if (await k.call("vi_state", path=str(MAIN))).get("state", 2) == 1:
                        ended = True
                        break
                    await asyncio.sleep(0.5)
                check("9600 exit ends every loop", ended)
                await k.call("close_vi", path=str(MAIN))
                return

            await press("Home")
            check("T02 home by HMI", await wait_for(lambda: plc.st()["m"]["20"] == 1, 12, "homed"))
            await asyncio.sleep(0.6)
            s = plc.st()
            check("Homed lamp on the panel", await panel_until("Homed", True, 2))

            plc.say("part front 500")
            await press("Start")
            check("T10 start by HMI", await wait_for(lambda: plc.st()["m"]["0"] == 1, 3, "auto"))
            check("Auto lamp on the panel", await panel_until("Auto Running", True, 2))
            check("T03 full round", await wait_for(lambda: plc.st()["d"]["211"] >= 1, 40, "round"), plc.st()["d"])
            s = plc.st()
            check("T03 counts one each", (s["d"]["210"], s["d"]["211"]) == (1, 1), s["d"])
            check("T09 count on panel", await panel_until("Left Count", s["d"]["211"], 3))

            plc.say("part rear 200")
            plc.say("part front 100")
            await shot("Main_running")
            check("T04 several parts", await wait_for(lambda: plc.st()["d"]["212"] >= 3, 80, "cycles"), plc.st()["d"])
            s = plc.st()
            check("T04 no alarm, no part lost", s["d"]["220"] == 0 and not [p for p in s["parts"] if p["on"] == "lost"], s["parts"])

            check("T09 Right Step text", (await get("Right Step"))["Right Step"] != "", await get("Right Step", "Left Step"))
            await press("Stop")
            check("T05 cycle stop flag or stopped", await wait_for(lambda: plc.st()["m"]["1"] == 1 or plc.st()["m"]["0"] == 0, 3, "M1"))
            check("T05 stops after the trip", await wait_for(lambda: plc.st()["m"]["0"] == 0, 25, "stopped"))
            s = plc.st()
            check("T05 both at home", s["x"][1] == 1 and s["x"][2] == 1, s["x"])

            await press("Vacuum Time (0.1 s)", 20)
            await press("Write")
            check("T12 parameter reaches D100", await wait_for(lambda: plc.st()["d"]["100"] == 20, 3, "D100"), plc.st()["d"]["100"])
            await press("Vacuum Time (0.1 s)", 5)
            await press("Write")
            await wait_for(lambda: plc.st()["d"]["100"] == 5, 3, "D100")
            await press("Clear Counts")
            check("Clear Counts", await wait_for(lambda: plc.st()["d"]["210"] == 0, 3, "cleared"))

            # E-stop during a move
            plc.say("part front 900")
            plc.say("hmi 100")
            await asyncio.sleep(0.2)
            await wait_for(lambda: plc.st()["d"]["200"] == 24, 12, "S24")
            plc.say("press X013 0")
            await asyncio.sleep(0.3)
            s = plc.st()
            check("T06 E-stop clears steps and outputs", s["states"] == [] and sum(s["y"][:8]) == 0, s["y"])
            check("T06 panel shows it", await panel_until("Alarm Code", 1, 2) and await panel_until("E-Stop", True, 2))
            await shot("Main_estop")
            check("T06 alarm text", (await get("Alarm Text"))["Alarm Text"].startswith("E-STOP"), await get("Alarm Text"))
            await press("Reset")
            await asyncio.sleep(0.5)
            check("T06 reset refused while pressed", plc.st()["d"]["220"] == 1)
            plc.say("press X013 1")
            await asyncio.sleep(0.2)
            await press("Reset")
            check("T06 reset after release", await wait_for(lambda: plc.st()["d"]["220"] == 0, 3, "reset"))
            await press("Home")
            check("T06 home again", await wait_for(lambda: plc.st()["m"]["20"] == 1, 12, "homed"), plc.say("status")[:0])

            # timeout: right rear sensor dead
            parts = plc.st()["parts"]
            plc.say("force X003 0")
            if not [q for q in parts if q["on"] == "front"]:
                plc.say("part front 900")
            await press("Start")
            check("T07 timeout code 10", await wait_for(lambda: plc.st()["d"]["220"] == 10, 22, "code 10"), plc.st()["d"]["220"])
            check("T07 panel text", await panel_until("Alarm Text", "RIGHT AXIS TIMEOUT", 2))
            await shot("Main_alarm_timeout")
            plc.say("unforce X003")
            await press("Reset")
            await wait_for(lambda: plc.st()["d"]["220"] == 0, 3, "reset")
            await press("Home")
            await wait_for(lambda: plc.st()["m"]["20"] == 1, 12, "homed")

            # manual
            plc.say("press X010 0")
            check("Manual Allowed lamp", await panel_until("Manual Allowed", True, 3))
            await press("Conveyors", True)
            check("T10 jog conveyor", await wait_for(lambda: plc.st()["y"][2] == 1, 2, "Y2"))
            await press("Conveyors", False)
            check("T10 jog off", await wait_for(lambda: plc.st()["y"][2] == 0, 2, "Y2 off"))
            await press("R Down", True)
            await wait_for(lambda: plc.st()["x"][10] == 1, 3, "X12")
            await press("R Down", False)
            await asyncio.sleep(0.3)
            before = plc.st()["right"][0]
            await press("R Rearward", True)
            await asyncio.sleep(0.6)
            s = plc.st()
            check("T08 axis blocked with cylinder down", s["y"][6] == 0 and s["right"][0] == before, s["right"])
            await press("R Rearward", False)
            await press("R Up", True)
            await wait_for(lambda: plc.st()["x"][9] == 1, 3, "X11")
            await press("R Up", False)
            await asyncio.sleep(0.3)
            s = plc.st()
            x_on = await get("X0 L gantry front pos", "X2 R gantry front pos", "X13 E-stop (NC)")
            check("T09 I/O page matches the PLC", (x_on["X2 R gantry front pos"] == bool(s["x"][2]) and
                                                   x_on["X13 E-stop (NC)"] == bool(s["x"][11])), x_on)

            # link pulled while a jog is held
            await press("Conveyors", True)
            await wait_for(lambda: plc.st()["y"][2] == 1, 2, "Y2")
            plc.say("mute 1")
            check("T11 output stops by itself", await wait_for(lambda: plc.st()["y"][2] == 0, 6, "Y2 off"), plc.st()["d"]["220"])
            check("T11 code 40", plc.st()["d"]["220"] == 40, plc.st()["d"]["220"])
            check("T11 HMI shows the link down", await panel_until("PLC Connected", False, 8))
            await press("Conveyors", False)
            plc.say("mute 0")
            check("T11 reconnects", await panel_until("PLC Connected", True, 10))
            await asyncio.sleep(1.5)
            s = plc.st()
            check("stale jog not sent after reconnect", s["y"][2] == 0 and s["m"]["125"] == 0, s["y"])
            await press("Reset")
            check("reset code 40", await wait_for(lambda: plc.st()["d"]["220"] == 0, 4, "reset"), plc.st()["d"]["220"])

            for number, name in ((1, "Manual"), (2, "Parameters"), (3, "IOMonitor"), (4, "AlarmLog"), (0, "Main")):
                try:
                    await k.call("panel_set", path=str(MAIN), values={"Tab Control": number})
                    await asyncio.sleep(0.4)
                    await shot("Page_" + name)
                except Exception as exc:  # noqa: BLE001
                    print("no page picture", name, str(exc)[:160])

            # record and export
            await asyncio.sleep(0.5)
            await press("Export CSV")
            await asyncio.sleep(1.0)
            exported = ROOT / "logs" / "alarm_export.csv"
            check("export file written", exported.exists() and time.time() - exported.stat().st_mtime < 5,
                  exported.read_text(encoding="utf-8")[:120] if exported.exists() else "")

            # normal exit: no alarm is left behind
            plc.say("press X010 1")
            await asyncio.sleep(0.4)
            await press("Exit")
            ok = False
            for _ in range(60):
                if (await k.call("vi_state", path=str(MAIN))).get("state", 2) == 1:
                    ok = True
                    break
                await asyncio.sleep(0.5)
            check("Exit ends every loop", ok, await k.call("vi_state", path=str(MAIN)))
            await asyncio.sleep(0.5)
            s = plc.st()
            check("Exit writes D240 = 0", s["d"]["240"] == 0, s["d"]["240"])
            await asyncio.sleep(4)
            s = plc.st()
            check("no alarm after a normal exit", s["d"]["220"] == 0, s["d"]["220"])
            rows = list(csv.DictReader(log_file.read_text(encoding="utf-8").splitlines()))
            events = {r["Event"] for r in rows[max(0, lines_before - 1):]}
            print("log lines", len(rows))
            check("daily CSV has the events", {"TRANSFER", "ALARM", "CLEAR"} <= events, events)
            if not ok:
                await k.call("abort_vi", path=str(MAIN))
            await k.call("close_vi", path=str(MAIN))
    finally:
        plc.stop()
        passed = sum(1 for r in results if r[1])
        print("%d/%d" % (passed, len(results)))
        for r in results:
            if not r[1]:
                print("FAILED:", r[0], r[2])
        out = ROOT / "REPORTS" / ("main_9600.md" if slow else "main_test.md")
        with open(out, "w", encoding="utf-8") as f:
            f.write("# Main.vi 整合測試結果\n\n%s，%d/%d 通過\n\n| 項目 | 結果 | 細節 |\n| --- | --- | --- |\n"
                    % (time.strftime("%Y-%m-%d %H:%M:%S"), passed, len(results)))
            for name, ok, detail in results:
                f.write("| %s | %s | %s |\n" % (name, "PASS" if ok else "FAIL", detail.replace("|", "/")))


sys.exit(asyncio.run(main()))
