import asyncio, subprocess, sys, time
from pathlib import Path
sys.path.insert(0, r"C:\Users\admin\PycharmProjects\PythonProject\labview-native-mcp-v2")
from lvkit import kit
ANS = Path(__file__).resolve().parents[1]
EXE = ANS.parents[1] / "實作環境" / "softplc_exe" / "softplc.exe"
VI = ANS / "PLC_Link_Test.vi"
OUTS = ["Resource used", "1 Port opened", "2 PLC answers ENQ with ACK", "3 D241 read OK", "PLC Beat 1 (D241)", "PLC Beat 2 (2 s later)", "4 PLC program running (D241 counts)",
        "D230 X word, D231 Y word", "error out (code and source tell what failed)"]
async def main():
    plc = subprocess.Popen([str(EXE), "--no-board"])
    time.sleep(3)
    try:
        async with kit() as k:
            await k.call("open_vi", path=str(VI))
            T = ANS / "Test_Driver.vi"
            await k.call("open_vi", path=str(T))
            r = await k.run(T, {"Resource (text)": "TCPIP0::127.0.0.1::5551::SOCKET", "Write D": 150, "Write Value": 0, "Read D": 241, "Read Count": 1}, ["Words", "error out"]); print("DRV:", r.get("outputs", r))
            r = await k.run(VI, {"Use Soft PLC (TCP 5551)": True}, OUTS); print("SIM:", r.get("outputs", r))
            r = await k.run(VI, {"Use Soft PLC (TCP 5551)": False, "COM Port (e.g. COM3)": "COM99"}, OUTS); print("COM99:", r.get("outputs", r))
            await k.call("close_vi", path=str(VI))
    finally:
        plc.kill()
asyncio.run(main())
