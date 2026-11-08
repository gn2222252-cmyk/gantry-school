# -*- coding: utf-8 -*-
"""Adds a Chinese note to the panel and the diagram of each subVI. Run after a rebuild:
powershell -File run_lv.ps1 add_notes.py        An existing note is rewritten, so this also converts to Big5."""
import asyncio
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, r"C:\\Users\\admin\\PycharmProjects\\PythonProject\\labview-native-mcp-v2")
from lvkit import kit  # noqa: E402
from panel_notes import SUBVI, zh  # noqa: E402

MARK = zh("說明：")
PLAIN = "說明："


async def old_notes(k, path, panel):
    found = []
    for ref in await k.call("find_objects", path=str(path), object_class="Text", panel=panel):
        try:
            text = str(await k.get("Text", "Text", ref))
        except Exception:  # noqa: BLE001
            continue
        if text.startswith((PLAIN, MARK)):
            found.append(ref)
    return found


async def main():
    async with kit() as k:
        await k.call("close_vi", path="")
        for name, text in SUBVI.items():
            path = HERE / name
            vi = await k.open(path)
            note = MARK + text
            wrapped = "\n".join(note[i:i + 34] for i in range(0, len(note), 34))
            on_panel, on_diagram = await old_notes(k, path, True), await old_notes(k, path, False)
            if on_panel:
                await k.set("Text", "Text", on_panel[0], wrapped)
            else:
                await k.free_label(vi.panel, wrapped, (20, -90))
            if on_diagram:
                await k.set("Text", "Text", on_diagram[0], note)
            else:
                await k.free_label(vi.diagram, note, (0, -40))
            s = await k.snap(path)
            if not s["executable"]:
                raise SystemExit(name + " is not executable")
            await k.call("save_vi", path=str(path))
            print("note", name, len(on_panel), len(on_diagram))
            sys.stdout.flush()


asyncio.run(main())
