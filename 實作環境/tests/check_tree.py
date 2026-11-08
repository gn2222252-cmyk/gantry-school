# -*- coding: utf-8 -*-
"""Link and version checks. Run with run_lv.ps1.
   check_tree.py main       every VI of the 2026 version: executable, links stay inside this folder
   check_tree.py save18     Save for Previous 18.0 into LV2018 (the folder must not exist)
   check_tree.py check18    the 18.0 copy: version text, executable, links stay inside LV2018
A result of 0 problems only counts when links were really found, so that is checked as well."""
import asyncio
import re
import sys
from pathlib import Path

sys.path.insert(0, r"C:\Users\admin\PycharmProjects\PythonProject\labview-native-mcp-v2")
from lvkit import kit  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OLD = ROOT / "LV2018"


def version_of(path):
    data = path.read_bytes()
    return sorted(set(m.group(1).decode() for m in re.finditer(rb"\x00[\x04-\x0c]((?:1\d|2\d)\.\d(?:\.\d)?(?:f\d)?)", data)))


async def check(k, root, files):
    problems, links = [], 0
    for f in files:
        await k.call("open_vi", path=str(f))
        r = await k.call("vi_links", path=str(f), root=str(root))
        links += len(r["subvis"]) + len(r["typedefs"])
        problems += ["%s -> %s" % (f.name, x) for x in r["outside"]]
        state = await k.call("vi_state", path=str(f))
        if state.get("state") == 0:
            problems.append("not executable: " + f.name)
    print("checked %d VIs, %d links, %d problems" % (len(files), links, len(problems)))
    for p in problems[:30]:
        print("  ", p)
    if not links:
        problems.append("no links found: nothing was really checked")
    return problems


async def main():
    mode = sys.argv[1]
    async with kit() as k:
        await k.call("close_vi", path="")
        if mode == "main":
            files = [f for f in sorted(ROOT.rglob("*.vi")) if OLD not in f.parents]
            return 1 if await check(k, ROOT, files) else 0
        if mode == "save18":
            if OLD.exists():
                raise SystemExit("LV2018 exists")
            files = [f for f in sorted(ROOT.rglob("*.vi"))]
            warn = []
            for f in files:
                r = await k.call("save_for_previous", path=str(f), target=str(OLD / f.relative_to(ROOT)), version="18.0")
                if r["warnings"]:
                    warn.append("%s: %s" % (f.name, r["warnings"]))
            print("saved %d VIs, warnings %d" % (len(files), len(warn)))
            for w in warn[:20]:
                print("  ", w[:300])
            return 0
        if mode == "check18":
            files = sorted(OLD.rglob("*.vi"))
            bad = {f.name: version_of(f) for f in files if not version_of(f) or any(not v.startswith("18.") for v in version_of(f))}
            print("files %d, not plainly 18.x: %d %s" % (len(files), len(bad), list(bad.items())[:6]))
            problems = await check(k, OLD, files)
            return 1 if bad or problems else 0
    return 2


sys.exit(asyncio.run(main()))
