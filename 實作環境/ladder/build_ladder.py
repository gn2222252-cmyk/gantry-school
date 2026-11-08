# -*- coding: utf-8 -*-
"""<name>_source.il -> <name>.csv (GX Works2 format), <name>.txt (instruction list by section) and the device
comment CSV files, for GANTRY_PLC (FX3S-20MT/ES + FX3G-2EYT-BD) and GANTRY_8Y (no board). Fails when a device has no comment."""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "softplc"))
sys.path.insert(0, HERE)

from devices import table, table_sync  # noqa: E402
from plc_csv import check_program, instruction_steps, load_csv, write_csv  # noqa: E402

STEP_LIMIT = 4000           # FX3S program capacity
VERSIONS = (("GANTRY_PLC", "GANTRY", "FX3S-20MT/ES + FX3G-2EYT-BD", table),
            ("GANTRY_8Y", "GANTRY_8Y", "FX3S-20MT/ES", table_sync))


def parse(path):
    """Returns items: ('title', text), ('para', text) or ('ins', op, operands)."""
    items = []
    with open(path, encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line:
                continue
            if line.startswith(";;"):
                items.append(("title", line[2:].strip()))
            elif line.startswith(";#"):
                items.append(("para", line[2:].strip()))
            elif line.startswith(";"):
                continue
            else:
                words = line.split()
                items.append(("ins", words[0], words[1:]))
    return items


def write_comments(path, rows, column):
    """UTF-16 LE with BOM, Tab separated, the same text form as the program CSV."""
    out = ['"Device Name"\t"Comment"\r\n']
    for row in rows:
        out.append('"%s"\t"%s"\r\n' % (row[0], row[column]))
    with open(path, "wb") as f:
        f.write(b"\xff\xfe" + "".join(out).encode("utf-16-le"))


def used_devices(rows):
    found = set()
    for _, ops in rows:
        for o in ops:
            m = re.match(r"^(?:K4)?([XYMSTCD])(\d+)$", o)
            if m and not o.startswith("K4") and not re.match(r"^M8\d{3}$", o):
                found.add(o)
    return found


def build(name, comment_name, model, device_table):
    items = parse(os.path.join(HERE, name + "_source.il"))
    rows = [(i[1], i[2]) for i in items if i[0] == "ins"]
    csv_path = os.path.join(HERE, name + ".csv")
    total = write_csv(csv_path, rows)

    lines = ["%s instruction list for %s (same content as %s.csv)" % (name, model, name),
             "Step  Instruction  Operands", ""]
    step = 0
    for item in items:
        if item[0] == "title":
            lines += ["", "===== %s =====" % item[1]]
        elif item[0] == "para":
            lines.append("; %s" % item[1])
        else:
            lines.append("%5d  %-7s %s" % (step, item[1], " ".join(item[2])))
            step += instruction_steps(item[1], item[2])
    lines += ["", "Total %d steps" % total]
    with open(os.path.join(HERE, name + ".txt"), "w", encoding="utf-8-sig", newline="\r\n") as f:
        f.write("\n".join(lines) + "\n")

    comments = device_table()
    write_comments(os.path.join(HERE, comment_name + "_comments_zh.csv"), comments, 1)
    write_comments(os.path.join(HERE, comment_name + "_comments_en.csv"), comments, 2)

    program = load_csv(csv_path)
    errors, end = check_program(program)
    if end > STEP_LIMIT:
        errors.append("%d steps is over the %d step limit" % (end, STEP_LIMIT))
    missing = sorted(used_devices(rows) - {c[0] for c in comments})
    if missing:
        errors.append("no comment for: " + " ".join(missing))
    names = [c[0] for c in comments]
    double = sorted({n for n in names if names.count(n) > 1})
    if double:
        errors.append("comment listed twice: " + " ".join(double))
    print("%s: %d instructions, %d steps, %d comments" % (name, len(program), end, len(comments)))
    for e in errors:
        print("ERROR", e)
    return 1 if errors else 0


def main():
    return max(build(*v) for v in VERSIONS)


if __name__ == "__main__":
    sys.exit(main())
