# -*- coding: utf-8 -*-
"""AOI_PLC_source.il -> AOI_PLC.csv (GX Works2 format) + AOI_PLC.txt (typed-in listing)."""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "softplc"))

from plc_csv import check_program, instruction_steps, load_csv, write_csv  # noqa: E402


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


def main():
    items = parse(os.path.join(HERE, "AOI_PLC_source.il"))
    rows = [(i[1], i[2]) for i in items if i[0] == "ins"]
    csv_path = os.path.join(HERE, "AOI_PLC.csv")
    total = write_csv(csv_path, rows)

    lines = ["AOI_PLC instruction list for FX3S (same content as AOI_PLC.csv)",
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
    with open(os.path.join(HERE, "AOI_PLC.txt"), "w", encoding="utf-8-sig", newline="\r\n") as f:
        f.write("\n".join(lines) + "\n")

    program = load_csv(csv_path)
    errors, end = check_program(program)
    print("%d instructions, %d steps" % (len(program), end))
    for e in errors:
        print("ERROR", e)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
