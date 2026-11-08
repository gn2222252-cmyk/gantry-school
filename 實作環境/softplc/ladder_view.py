# -*- coding: utf-8 -*-
"""Live ladder monitor, like the monitor mode of GX Works2, for learning how the program runs.

The picture is rebuilt from GANTRY_PLC_source.il, so it always shows the program that is really running.
parse_program() is plain Python without Tk, tests\\test_ladder_view.py checks that its contact trees give the
same result as the PLC engine, so the picture cannot quietly disagree with the program.
"""
import os
import re
import sys

# Frozen build (softplc_exe\softplc.exe): data files are found next to the exe folder, like the .py files here.
HERE = os.path.dirname(sys.executable) if getattr(sys, "frozen", False) else os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "ladder"))
sys.path.insert(0, HERE)

from devices import table                          # noqa: E402
from plc_csv import COMPARE_RE                     # noqa: E402

SOURCE = os.path.join(HERE, "..", "ladder", "GANTRY_PLC_source.il")
COMMENT = {row[0]: row[1] for row in table()}
COMMENT.update({"M8000": "RUN 中常 ON", "M8002": "開機第一掃描", "M8013": "1 秒時脈"})
RELATION = {"=": "＝", "<>": "≠", ">": "＞", "<": "＜", ">=": "≧", "<=": "≦"}


class Contact(object):
    def __init__(self, name, negated=False):
        self.name, self.negated = name, negated


class Compare(object):
    def __init__(self, relation, a, b):
        self.relation, self.a, self.b = relation, a, b


class Series(object):
    def __init__(self, items):
        self.items = items


class Parallel(object):
    def __init__(self, items):
        self.items = items


class Rung(object):
    def __init__(self, cond, section, para, state):
        self.cond, self.section, self.para, self.state = cond, section, para, state
        self.outputs = []            # (op, operands)
        self.first = self.last = 0   # instruction numbers


def _join(cls, a, b):
    items = (a.items if isinstance(a, cls) else [a]) + (b.items if isinstance(b, cls) else [b])
    return cls(items)


def read_source(path=SOURCE):
    """[('title', text), ('para', text), ('ins', op, operands)] in file order."""
    items = []
    with open(path, encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if line.startswith(";;"):
                items.append(("title", line[2:].split("|")[0].strip()))
            elif line.startswith(";#"):
                items.append(("para", line[2:].split("|")[0].strip()))
            elif line and not line.startswith(";"):
                w = line.split()
                items.append(("ins", w[0], w[1:]))
    return items


def parse_program(items=None):
    """Turns the instruction list into rungs. Returns (rungs, instruction_count_used)."""
    items = read_source() if items is None else items
    rungs, section, para, state = [], "", "", None
    cur, stack, rung, used, begin = None, [], None, 0, 0

    def close():
        nonlocal cur, stack, rung
        if rung is not None:
            rung.last = used - 2 if used else 0
            rungs.append(rung)
        cur, stack, rung = None, [], None

    for item in items:
        if item[0] == "title":
            close()
            section = item[1]
        elif item[0] == "para":
            close()
            para = item[1]
        else:
            op, ops = item[1], item[2]
            used += 1
            compare = COMPARE_RE.match(op)
            base = compare.group(1) if compare else op
            leaf = None
            if compare:
                leaf = Compare(compare.group(2), ops[0], ops[1])
            elif base in ("LD", "AND", "OR"):
                leaf = Contact(ops[0])
            elif base in ("LDI", "ANI", "ORI"):
                leaf = Contact(ops[0], True)
            if base in ("LD", "LDI"):
                if rung is not None:
                    close()
                if cur is None:
                    begin = used - 1
                else:
                    stack.append(cur)
                cur = leaf
            elif base in ("AND", "ANI"):
                cur = _join(Series, cur, leaf)
            elif base in ("OR", "ORI"):
                cur = _join(Parallel, cur, leaf)
            elif op == "ANB":
                cur = _join(Series, stack.pop(), cur)
            elif op == "ORB":
                cur = _join(Parallel, stack.pop(), cur)
            elif op == "STL":
                close()
                state = ops[0]
                rungs.append(("stl", ops[0], section, para))
            elif op == "RET":
                close()
                state = None
                rungs.append(("ret", section, para))
            elif op == "END":
                close()
                rungs.append(("end", section, para))
            else:
                if rung is None:
                    rung = Rung(cur, section, para, state)
                    rung.first = begin if cur is not None else used - 1
                rung.outputs.append((op, ops))
    used += 1
    close()
    return rungs, used - 1


# ---- values --------------------------------------------------------------
def bit(plc, name):
    kind, digits = name[0], name[1:]
    if kind == "X":
        return plc.x[int(digits, 8)]
    if kind == "Y":
        return plc.y[int(digits, 8)]               # the program's own copy, it changes during the scan
    if kind == "M":
        return plc.m[int(digits)]
    if kind == "S":
        return plc.s[int(digits)]
    if kind == "T":
        return plc.t_on[int(digits)]
    if kind == "C":
        return plc.c_on[int(digits)]
    return 0


def word(plc, name):
    m = re.match(r"^K(-?\d+)$", name)
    if m:
        return int(m.group(1))
    kind, digits = name[0], name[1:]
    if kind == "D":
        return plc.d[int(digits)]
    if kind == "T":
        return min(plc.t_acc[int(digits)] // 100, 32767)
    if kind == "C":
        return plc.c_val[int(digits)]
    m = re.match(r"^K4([XY])(\d+)$", name)
    if m:
        table_ = plc.x if m.group(1) == "X" else plc.y_out
        start = int(m.group(2), 8)
        return sum(1 << i for i in range(16) if table_[start + i])
    return 0


COMPARE = {"=": lambda a, b: a == b, "<>": lambda a, b: a != b, ">": lambda a, b: a > b, "<": lambda a, b: a < b,
           ">=": lambda a, b: a >= b, "<=": lambda a, b: a <= b}


def leaf_on(plc, node):
    if isinstance(node, Contact):
        return bool(bit(plc, node.name)) != node.negated
    return COMPARE[node.relation](word(plc, node.a), word(plc, node.b))


def conducts(plc, node):
    if node is None:
        return True
    if isinstance(node, Series):
        return all(conducts(plc, n) for n in node.items)
    if isinstance(node, Parallel):
        return any(conducts(plc, n) for n in node.items)
    return leaf_on(plc, node)


def rung_power(plc, rung):
    if rung.state is not None and not bit(plc, rung.state):
        return False
    return conducts(plc, rung.cond)


def coil_on(plc, rung, ops):
    """Is this OUT coil powered now. A timer or counter coil is not its contact: T0's contact closes only when the
    time is up, its coil is on all the time it counts."""
    if ops[0][0] in "TC":
        return rung_power(plc, rung)
    return bool(bit(plc, ops[0]))


def output_text(op, ops):
    if op == "OUT" and len(ops) == 2:
        return "OUT %s 預設 %s" % (ops[0], ops[1])
    return "%s %s" % (op, " ".join(ops))


def size(node):
    """(columns, rows) a contact tree takes on the ladder."""
    if node is None:
        return 0, 1
    if isinstance(node, Series):
        sizes = [size(n) for n in node.items]
        return sum(x[0] for x in sizes), max(x[1] for x in sizes)
    if isinstance(node, Parallel):
        sizes = [size(n) for n in node.items]
        return max(x[0] for x in sizes), sum(x[1] for x in sizes)
    return 1, 1


def source_items(il):
    """Instruction text, one per line, into the same form read_source gives."""
    items = []
    for line in il.strip().splitlines():
        w = line.split()
        if w:
            items.append(("ins", w[0], w[1:]))
    return items


def rung_of(rungs, index):
    """The rung that holds instruction number index, None for STL, RET and END."""
    for r in rungs:
        if isinstance(r, Rung) and r.first <= index <= r.last:
            return r
    return None


def set_bit(plc, name, value):
    kind, digits = name[0], name[1:]
    if kind == "X":
        plc.x_in[int(digits, 8)] = value
    elif kind == "M":
        plc.m[int(digits)] = value


def leaf_name(node, comment):
    if isinstance(node, Compare):
        return "%s %s %s" % (node.a, RELATION[node.relation], node.b)
    text = comment.get(node.name, "")
    return "%s（%s）" % (node.name, text) if text else node.name


def describe(node, comment):
    """The condition in words."""
    if node is None:
        return "沒有條件，一直成立"
    if isinstance(node, Series):
        parts = []
        for n in node.items:
            t = describe(n, comment)
            parts.append("（%s）" % t if isinstance(n, Parallel) else t)
        return " 而且 ".join(parts)
    if isinstance(node, Parallel):
        return " 或 ".join(describe(n, comment) for n in node.items)
    if isinstance(node, Contact) and node.negated:
        return "不是 " + leaf_name(node, comment)
    return leaf_name(node, comment)


def blockers(plc, node):
    """Leaves that stop the power. In a parallel any one branch would do, so all of them are listed."""
    if node is None or conducts(plc, node):
        return []
    if isinstance(node, Series):
        found = []
        for n in node.items:
            found += blockers(plc, n)
        return found
    if isinstance(node, Parallel):
        found = []
        for n in node.items:
            found += blockers(plc, n)
        return found
    return [node]


def explain(rung, plc, comment):
    """What a rung means and why it is, or is not, powered now. For people, so plain words."""
    outs = []
    for op, ops in rung.outputs:
        name = comment.get(ops[0], "") if ops else ""
        word_ = {"OUT": "讓 %s ON", "SET": "鎖定 %s ON", "RST": "清除 %s", "PLS": "讓 %s ON 一個掃描",
                 "MOV": "複製數值到 %s", "ZRST": "整批清除 %s", "INC": "%s 加 1"}.get(op, op + " %s")
        target = ops[-1] if op == "MOV" else " ".join(ops[:2]) if op == "ZRST" else ops[0]
        outs.append(word_ % ("%s（%s）" % (target, name) if name else target))
    lines = ["這條的意思：%s，就 %s。" % (describe(rung.cond, comment), "、".join(outs))]
    if rung.state and not bit(plc, rung.state):
        lines.append("現在不動作：它屬於步序 %s，這一步沒有作用，所以整條沒電。" % rung.state)
    elif rung_power(plc, rung):
        lines.append("現在：條件成立，通電中。")
    else:
        names = []
        for leaf in blockers(plc, rung.cond):
            if isinstance(leaf, Contact):
                names.append("%s 要 %s" % (leaf_name(leaf, comment), "OFF" if leaf.negated else "ON"))
            else:
                names.append("%s 現在是 %d 和 %d" % (leaf_name(leaf, comment), word(plc, leaf.a), word(plc, leaf.b)))
        lines.append("現在不通，卡在：" + "；".join(names))
    return "\n".join(lines)
