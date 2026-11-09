# -*- coding: utf-8 -*-
"""Read and write the GX Works2 program CSV (FX3S), and FX instruction sizes.

File format (taken from SCHOOL_TEST.csv, a GX Works2 style export):
  UTF-16 LE with BOM, Tab separated, every cell in double quotes.
  Line 1  "(未設定工程)"
  Line 2  "PLC資訊:" <Tab> "FXCPU FX3S"
  Line 3-4 column titles. Line 3 ends with Tab + a bare LF, all others CRLF.
  One row per operand. From the 2nd operand on, the step and instruction
  cells are empty, e.g. MOV K3 D0 takes two rows.
"""
import re

HEADER = ('﻿"(未設定工程)"\r\n'
          '"PLC資訊:"\t"FXCPU FX3S"\r\n'
          '"步序編號"\t"列間陳述式"\t"指令"\t"I/O(元件)"\t\n'
          '"空白欄"\t"PI陳述式"\t"便箋"\r\n')

COMPARE_RE = re.compile(r"^(LD|AND|OR)(=|<>|>=|<=|>|<)$")
SPECIAL_BITS = ("M8000", "M8002", "M8012", "M8013")
ALLOWED = {
    "LD", "LDI", "AND", "ANI", "OR", "ORI", "ANB", "ORB", "MPS", "MRD", "MPP",
    "OUT", "SET", "RST", "PLS", "PLF", "MOV", "ADD", "SUB", "INC", "CMP", "ZCP", "END",
}
# operand count of each instruction
OPERANDS = {"LD": 1, "LDI": 1, "AND": 1, "ANI": 1, "OR": 1, "ORI": 1, "ANB": 0, "ORB": 0,
            "MPS": 0, "MRD": 0, "MPP": 0, "SET": 1, "RST": 1, "PLS": 1, "PLF": 1,
            "MOV": 2, "ADD": 3, "SUB": 3, "INC": 1, "CMP": 3, "ZCP": 4, "END": 0}


class LadderError(Exception):
    pass


def instruction_steps(op, operands):
    """Program steps one instruction takes on an FX CPU."""
    if COMPARE_RE.match(op):
        return 5                     # 16-bit compare contact
    if op in ("MOV",):
        return 5
    if op in ("ADD", "SUB", "CMP"):
        return 7
    if op == "INC":
        return 3
    if op == "ZCP":
        return 9
    if op in ("PLS", "PLF"):
        return 2
    if op == "OUT":
        target = operands[0]
        if target[0] in "TC":
            return 3
        return 2 if target.startswith("M8") else 1
    if op == "SET":
        return 2 if operands[0].startswith("M8") else 1
    if op == "RST":
        target = operands[0]
        if target[0] in "TC":
            return 2
        if target[0] == "D":
            return 3
        return 2 if target.startswith("M8") else 1
    return 1                         # LD AND OR ... ANB ORB MPS MRD MPP END


def operand_count(op, operands=None):
    if COMPARE_RE.match(op):
        return 2
    if op == "OUT":
        return 2 if operands and operands[0][0] in "TC" else 1
    return OPERANDS[op]


def _cells(line):
    """Split one row; cells are "..." separated by tabs."""
    cells = []
    for raw in line.split("\t"):
        raw = raw.strip()
        if len(raw) >= 2 and raw[0] == '"' and raw[-1] == '"':
            raw = raw[1:-1]
        cells.append(raw)
    return cells


def load_csv(path):
    """Return [(step, op, [operands]), ...]. Raises LadderError on bad content."""
    with open(path, "rb") as f:
        data = f.read()
    if data[:2] != b"\xff\xfe":
        raise LadderError("%s: not UTF-16 LE with BOM" % path)
    text = data.decode("utf-16-le").lstrip("﻿")
    program = []
    for number, line in enumerate(re.split(r"\r\n|\n", text), 1):
        if not line.strip():
            continue
        cells = _cells(line)
        if number <= 4 or len(cells) < 4:
            continue
        step, op, operand = cells[0], cells[2], cells[3]
        if step and op:
            if not step.isdigit():
                raise LadderError("line %d: bad step %r" % (number, step))
            program.append([int(step), op.upper(), [operand] if operand else []])
        elif operand and not step and not op:
            if not program:
                raise LadderError("line %d: operand before any instruction" % number)
            program[-1][2].append(operand)
        else:
            raise LadderError("line %d: cannot read row %r" % (number, cells[:4]))
    return [tuple(p) for p in program]


def check_program(program):
    """Static checks: instruction whitelist, step numbers, device ranges, block balance."""
    errors = []
    step = 0
    blocks = 0          # open LD blocks not yet merged
    mps = 0
    rung_open = False
    ended = False
    for at, op, ops in program:
        if at != step:
            errors.append("step %d: expected step %d" % (at, step))
            step = at
        compare = COMPARE_RE.match(op)
        if op not in ALLOWED and not compare:
            errors.append("step %d: instruction %s not allowed" % (at, op))
            step += 1
            continue
        if op == "OUT" and not ops:
            errors.append("step %d: OUT without operand" % at)
            continue
        need = operand_count(op, ops)
        if len(ops) != need:
            errors.append("step %d: %s needs %d operands, has %d" % (at, op, need, len(ops)))
        for o in ops:
            m = re.match(r"^([TC])(\d+)$", o)
            if m:
                limit = 199 if m.group(1) == "T" else 99
                if int(m.group(2)) > limit:
                    errors.append("step %d: %s out of range" % (at, o))
            if re.match(r"^M8\d{3}$", o) and o not in SPECIAL_BITS:
                errors.append("step %d: special device %s not allowed" % (at, o))
        base = compare.group(1) if compare else op
        if base == "LD" or op == "LDI":
            if rung_open:
                blocks += 1
            rung_open = True
        elif op in ("ANB", "ORB"):
            if blocks < 1:
                errors.append("step %d: %s without an open block" % (at, op))
            else:
                blocks -= 1
        elif op == "MPS":
            mps += 1
            if mps > 11:
                errors.append("step %d: MPS deeper than 11" % at)
        elif op == "MPP":
            if mps < 1:
                errors.append("step %d: MPP without MPS" % at)
            else:
                mps -= 1
        elif op == "MRD":
            if mps < 1:
                errors.append("step %d: MRD without MPS" % at)
        elif op == "END":
            ended = True
        elif op in ("OUT", "SET", "RST", "PLS", "PLF", "MOV", "ADD", "SUB", "INC", "CMP", "ZCP"):
            if blocks:
                errors.append("step %d: %s with %d unmerged blocks" % (at, op, blocks))
                blocks = 0
            rung_open = False if mps == 0 else rung_open
        step += instruction_steps(op, ops)
    if not ended:
        errors.append("no END")
    if mps:
        errors.append("%d MPS without MPP" % mps)
    return errors, step


def write_csv(path, rows):
    """rows = [(op, [operands]), ...] without step numbers. Returns total steps."""
    out = [HEADER]
    step = 0
    for op, ops in rows:
        first = ops[0] if ops else ""
        out.append('"%d"\t""\t"%s"\t"%s"\t""\t""\t""\r\n' % (step, op, first))
        for extra in ops[1:]:
            out.append('""\t""\t""\t"%s"\t""\t""\t""\r\n' % extra)
        step += instruction_steps(op, ops)
    with open(path, "wb") as f:
        f.write("".join(out).encode("utf-16-le"))
    return step
