# -*- coding: utf-8 -*-
"""Reads text back from a VI built with GANTRY_BIG5=1 and checks the stored bytes are Big5.
LabVIEW returns text through the system code page, so: reply -> bytes as 936 -> read as 950 must equal the source."""
import asyncio
import ctypes
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, r"C:\Users\admin\PycharmProjects\PythonProject\labview-native-mcp-v2")
sys.path.insert(0, str(HERE))
from lvkit import kit  # noqa: E402


def bytes_936(text):
    k32 = ctypes.windll.kernel32
    size = k32.WideCharToMultiByte(936, 0, text, len(text), None, 0, None, None)
    buf = ctypes.create_string_buffer(size)
    k32.WideCharToMultiByte(936, 0, text, len(text), buf, size, None, None)
    return buf.raw[:size]


async def main():
    root = Path(sys.argv[1])
    good, bad, total = 0, [], 0
    async with kit() as k:
        await k.call("close_vi", path="")
        for vi in [root / "Main.vi", root / "host" / "Draw_Machine.vi", root / "driver" / "FX_Xfer.vi"]:
            await k.call("open_vi", path=str(vi))
            for panel in (True, False):
                for ref in await k.call("find_objects", path=str(vi), object_class="Text", panel=panel):
                    try:
                        text = str(await k.get("Text", "Text", ref))
                    except Exception:  # noqa: BLE001
                        continue
                    if all(ord(c) < 128 for c in text):
                        continue
                    total += 1
                    try:
                        back = bytes_936(text).decode("cp950")
                        good += 1
                        if good <= 4:
                            print("sample:", back.replace("\n", " / ")[:60])
                    except UnicodeDecodeError:
                        bad.append(text[:30])
    print("non-ASCII texts %d, valid Big5 %d, not Big5 %d" % (total, good, len(bad)))
    return 1 if bad or not total else 0


sys.exit(asyncio.run(main()))
