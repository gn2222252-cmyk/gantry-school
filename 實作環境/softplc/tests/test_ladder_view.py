# -*- coding: utf-8 -*-
"""The monitor must not lie: its contact trees are compared with the PLC engine, rung by rung, on random values."""
import os
import random
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))

import ladder_view as lv                                # noqa: E402
from plc_csv import instruction_steps, load_csv         # noqa: E402
from plc_engine import PLC                              # noqa: E402

CSV = os.path.join(HERE, "..", "..", "ladder", "GANTRY_PLC.csv")


def devices(node, found):
    if isinstance(node, (lv.Series, lv.Parallel)):
        for n in node.items:
            devices(n, found)
    elif isinstance(node, lv.Contact):
        found.add(node.name)
    elif isinstance(node, lv.Compare):
        found.update(x for x in (node.a, node.b) if x[0] in "DTC")
    return found


def rung_program(items):
    """Instructions of one rung, without its other outputs, ending in a test coil M999."""
    body, step = [], 0
    for op, ops in items + [("OUT", ["M999"]), ("END", [])]:
        body.append((step, op, ops))
        step += instruction_steps(op, ops)
    return body


def split(items):
    """Yields the contact part of every rung from the raw instruction list."""
    cur = []
    for item in items:
        if item[0] != "ins":
            continue
        op, ops = item[1], item[2]
        if op in ("STL", "RET", "END"):
            cur = []
        elif op.startswith(("LD", "AND", "OR")) or op in ("LDI", "ANI", "ORI", "ANB", "ORB"):
            if cur and cur[-1] == "done":
                cur = []
            cur.append((op, ops))
        elif cur and cur[-1] != "done":
            yield list(cur)
            cur.append("done")


class Parse(unittest.TestCase):
    def test_every_instruction_is_used(self):
        rungs, used = lv.parse_program()
        self.assertEqual(used, len(load_csv(CSV)))
        self.assertGreater(len(rungs), 150)

    def test_every_stl_step_is_shown(self):
        rungs, _ = lv.parse_program()
        shown = {r[1] for r in rungs if isinstance(r, tuple) and r[0] == "stl"}
        wanted = {"S0"} | {"S%d" % n for n in list(range(10, 14)) + list(range(20, 29)) + list(range(40, 49))}
        self.assertEqual(shown, wanted)

    def test_a_known_rung(self):
        rungs, _ = lv.parse_program()
        y4 = next(r for r in rungs if isinstance(r, lv.Rung) and r.outputs[0] == ("OUT", ["Y004"]))
        self.assertIsInstance(y4.cond, lv.Series)
        self.assertIsInstance(y4.cond.items[0], lv.Parallel)      # M54 OR M74
        self.assertIsInstance(y4.cond.items[1], lv.Parallel)      # X2 OR X3
        self.assertEqual([getattr(n, "name", "") for n in y4.cond.items[2:]], ["Y003", "M3", "M2"])
        self.assertTrue(all(n.negated for n in y4.cond.items[2:]))


class Explain(unittest.TestCase):
    def setUp(self):
        self.rungs, _ = lv.parse_program()
        self.plc = PLC(load_csv(CSV))

    def rung(self, device):
        return next(r for r in self.rungs if isinstance(r, lv.Rung) and r.outputs[0] == ("OUT", [device]))

    def test_names_what_is_missing(self):
        text = lv.explain(self.rung("Y004"), self.plc, lv.COMMENT)
        self.assertIn("卡在", text)
        self.assertIn("M54", text)
        self.assertIn("X002", text)

    def test_powered_rung(self):
        self.plc.m[54] = 1
        self.plc.x[2] = 1
        self.assertIn("通電中", lv.explain(self.rung("Y004"), self.plc, lv.COMMENT))

    def test_step_not_active(self):
        rung = next(r for r in self.rungs if isinstance(r, lv.Rung) and r.state == "S25")
        self.assertIn("步序 S25", lv.explain(rung, self.plc, lv.COMMENT))

    def test_rung_numbers_cover_every_contact(self):
        rungs = [r for r in self.rungs if isinstance(r, lv.Rung)]
        for a, b in zip(rungs, rungs[1:]):
            self.assertLess(a.last, b.first + 1)
        self.assertLessEqual(rungs[0].first, rungs[0].last)


class SameAsEngine(unittest.TestCase):
    def test_random_values(self):
        random.seed(7)
        source = lv.read_source()
        contact_parts = list(split(source))
        self.assertGreater(len(contact_parts), 100)
        checks = 0
        for part in contact_parts:
            tree, _ = lv.parse_program([("ins", op, ops) for op, ops in part + [("OUT", ["M999"]), ("END", [])]])
            rung = next(r for r in tree if isinstance(r, lv.Rung))
            names = sorted(devices(rung.cond, set()))
            for _ in range(24):
                plc = PLC(rung_program(part))
                for name in names:
                    value = random.randint(0, 1)
                    kind, digits = name[0], name[1:]
                    if kind == "X":
                        plc.x_in[int(digits, 8)] = value
                    elif kind == "Y":
                        plc.y[int(digits, 8)] = value
                    elif kind == "M":
                        plc.m[int(digits)] = value
                    elif kind == "S":
                        plc.s[int(digits)] = value
                    elif kind == "D":
                        plc.d[int(digits)] = random.randint(-2, 2)
                    elif kind == "T":
                        plc.t_on[int(digits)] = value
                    elif kind == "C":
                        plc.c_on[int(digits)] = value
                plc.scan(10)
                self.assertEqual(bool(plc.m[999]), lv.conducts(plc, rung.cond), part)
                checks += 1
        print("compared %d random cases" % checks)


if __name__ == "__main__":
    unittest.main()
