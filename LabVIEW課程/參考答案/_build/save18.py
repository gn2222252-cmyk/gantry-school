# -*- coding: utf-8 -*-
"""Save for Previous 18.0 of every reference VI into ../LV2018 (school: LabVIEW 2018). Run with run_lv.ps1."""
import asyncio
import shutil
import sys
from pathlib import Path

sys.path.insert(0, r"C:\Users\admin\PycharmProjects\PythonProject\labview-native-mcp-v2")
from lvkit import kit  # noqa: E402

ANS = Path(__file__).resolve().parents[1]
TARGET = ANS / "LV2018"


async def main():
    if TARGET.exists():
        shutil.rmtree(TARGET)
    async with kit() as k:
        for f in sorted(ANS.glob("*.vi")):
            await k.call("open_vi", path=str(f))
        w = await k.save_tree(ANS, TARGET)
        print("saved", len(list(TARGET.glob("*.vi"))), "VIs, warnings", w)
        for f in sorted(ANS.glob("*.vi")):
            await k.call("close_vi", path=str(f))


asyncio.run(main())
