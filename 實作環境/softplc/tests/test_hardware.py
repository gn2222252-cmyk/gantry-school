# -*- coding: utf-8 -*-
"""Wiring tables against the program, and the machine with no LabVIEW: what GX Works2 can do alone."""
import os
import re
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))
sys.path.insert(0, os.path.join(HERE, "..", "..", "ladder"))

import devices                                     # noqa: E402
import hardware_guide as g                         # noqa: E402
from gantry_sim import Machine                     # noqa: E402
from plc_csv import load_csv                       # noqa: E402
from plc_engine import PLC                         # noqa: E402

CSV = os.path.join(HERE, "..", "..", "ladder", "GANTRY_PLC.csv")
SOURCE = os.path.join(HERE, "..", "..", "ladder", "GANTRY_PLC_source.il")


def used(prefix):
    with open(SOURCE, encoding="utf-8") as f:
        text = "\n".join(line for line in f if not line.startswith(";"))
    return set(int(n, 8) for n in re.findall(r"\b%s(\d+)\b" % prefix, text))


def run(machine, ms):
    for _ in range(ms // 10):
        machine.apply_inputs()
        machine.plc.scan(10)
        machine.step(10)


class Tables(unittest.TestCase):
    def test_every_used_point_has_a_terminal(self):
        self.assertTrue(used("X") <= set(int(r[0][1:], 8) for r in g.INPUTS))
        self.assertTrue(used("Y") <= set(int(r[0][1:], 8) for r in g.OUTPUTS if r[0][0] == "Y"))
        for row in g.INPUTS + g.OUTPUTS:
            self.assertTrue(g.has_point(row[0]), row[0])

    def test_program_stays_inside_the_model(self):
        self.assertTrue(max(used("X")) <= 0o13)
        self.assertTrue(max(used("Y")) <= 0o7)

    def test_addresses_match_the_device_table(self):
        known = set(r[0] for r in devices.X + devices.Y)
        self.assertEqual(set(r[0] for r in g.INPUTS + g.OUTPUTS if r[0][0] in "XY"), known)

    def test_terminal_count(self):
        t = g.terminals()
        self.assertEqual(sum(1 for n in t if n[0] == "X"), 12)
        self.assertEqual(sum(1 for n in t if n[0] == "Y"), 8)

    def test_hmi_word_lists_stay_sixteen(self):
        self.assertEqual((len(devices.X_WORD), len(devices.Y_WORD)), (16, 16))

    def test_wiring_text(self):
        self.assertEqual(g.output_wiring(g.OUTPUTS[3]), "+24V→線圈→Y003　COM3→0V")
        self.assertEqual(g.input_wiring(g.INPUTS[0]), "棕→24V　藍→0V　黑→X000")


class NoLabVIEW(unittest.TestCase):
    def rig(self):
        self.m = Machine(PLC(load_csv(CSV)))
        self.p = self.m.plc
        self.m.press("X010", 0)
        run(self.m, 200)
        return self.p

    def test_manual_allowed_without_hmi(self):
        self.assertEqual(self.rig().m[5], 1)

    def test_written_bit_moves_the_output(self):
        p = self.rig()
        run(self.m, 3000)                          # move away from the rear switch if needed
        p.m[121] = 1
        run(self.m, 300)
        self.assertEqual(p.y_out[6] or p.x[3], 1)
        p.m[121] = 0
        run(self.m, 100)
        self.assertEqual(p.y_out[6], 0)

    def test_written_bit_stays_until_written_off(self):
        p = self.rig()
        p.m[124] = 1
        run(self.m, 2000)
        self.assertEqual(p.m[124], 1)
        self.assertEqual(p.y_out[5], 1)

    def test_writing_y_is_overwritten(self):
        p = self.rig()
        p.y[6] = 1
        run(self.m, 50)
        self.assertEqual(p.y_out[6], 0)

    def test_commands_drop_in_auto(self):
        p = self.rig()
        p.m[124] = 1
        run(self.m, 100)
        self.m.press("X010", 1)
        run(self.m, 100)
        self.assertEqual(p.m[124], 0)
        self.assertEqual(p.m[5], 0)

    def test_reasons(self):
        p = self.rig()
        self.assertEqual(g.why_not_manual(p), [])
        self.m.press("X010", 1)
        run(self.m, 100)
        self.assertIn("X10", g.why_not_manual(p)[0])


class LabVIEWWords(unittest.TestCase):
    """LabVIEW only writes D. The M bits come out of the program."""
    def rig(self):
        self.m = Machine(PLC(load_csv(CSV)))
        self.p = self.m.plc
        self.m.press("X010", 0)
        run(self.m, 200)
        return self.p

    def test_pulse_word_taken_once(self):
        p = self.rig()
        p.d[106] = 4                               # M102 home
        run(self.m, 30)
        self.assertEqual(p.d[106], 0)
        self.assertEqual(p.m[102], 0)
        self.assertEqual(p.m[21] or p.m[20], 1)

    def test_clear_counts_bit(self):
        p = self.rig()
        p.c_val[0] = 7
        p.d[106] = 16
        run(self.m, 30)
        self.assertEqual(p.c_val[0], 0)

    def test_jog_word_runs_and_stops(self):
        p = self.rig()
        p.d[107] = 0x8000                          # conveyors, M125
        run(self.m, 30)
        self.assertEqual(p.y_out[2], 1)
        p.d[107] = 0
        run(self.m, 30)
        self.assertEqual(p.y_out[2], 0)

    def test_gx_works_write_survives(self):
        p = self.rig()
        p.m[125] = 1
        run(self.m, 100)
        self.assertEqual(p.y_out[2], 1)

    def test_jog_word_dropped_when_manual_ends(self):
        p = self.rig()
        p.d[107] = 0x8000
        run(self.m, 30)
        self.m.press("X010", 1)
        run(self.m, 30)
        self.assertEqual(p.d[107], 0)
        self.assertEqual(p.m[125], 0)
        self.m.press("X010", 0)
        run(self.m, 50)
        self.assertEqual(p.y_out[2], 0)

    def test_status_word(self):
        p = self.rig()
        run(self.m, 20)
        self.assertEqual(p.d[232] & 2, 2)          # M201 manual


class SharedVacuum(unittest.TestCase):
    def rig(self):
        self.m = Machine(PLC(load_csv(CSV)))
        self.p = self.m.plc
        run(self.m, 100)
        self.p.m[102] = 1
        run(self.m, 5000)
        self.assertEqual(self.p.m[20], 1)
        return self.p

    def test_gantries_never_hold_at_once(self):
        p = self.rig()
        self.m.add_part("front", 900)
        self.m.add_part("rear", 900)
        p.m[100] = 1
        seen = set()
        for _ in range(3000):
            run(self.m, 10)
            states = p.active_states()
            right = any(21 <= s <= 26 for s in states)
            left = any(41 <= s <= 46 for s in states)
            self.assertFalse(right and left, states)
            seen.update(states)
            self.assertEqual(p.y_out[8:16], [0] * 8)
        self.assertTrue({22, 26, 42, 46} <= seen, seen)
        self.assertEqual(self.m.parts[0]["on"] != "lost" and self.m.parts[1]["on"] != "lost", True)

    def test_parts_keep_circulating(self):
        p = self.rig()
        self.m.add_part("front", 900)
        self.m.add_part("rear", 900)
        p.m[100] = 1
        run(self.m, 60000)
        self.assertGreaterEqual(min(p.c_val[0], p.c_val[1]), 3, (p.c_val[0], p.c_val[1]))

    def test_left_cylinder_uses_the_board(self):
        p = self.rig()
        self.m.press("X010", 0)
        run(self.m, 100)
        p.m[112] = 1
        run(self.m, 800)
        self.assertEqual(p.m[8116], 1)
        self.assertEqual(p.x[7], 1)
        self.assertEqual((p.d[231] >> 8) & 1, 1)

    def test_manual_vacuum_drives_both(self):
        p = self.rig()
        self.m.press("X010", 0)
        run(self.m, 100)
        p.m[114] = 1
        run(self.m, 100)
        self.assertEqual(p.y_out[5], 1)
        self.assertTrue(self.m.left.vacuum and self.m.right.vacuum)


class FX3SLatchedStates(unittest.TestCase):
    def test_power_up_leaves_only_stand_by(self):
        p = PLC(load_csv(CSV))
        p.x_in[0o13] = 1                           # E-stop released, or the alarm path clears every state
        p.s[23] = 1                                # FX3S keeps S0-S127 through a power cut
        p.s[44] = 1
        p.d[200] = 23
        p.scan(10)
        self.assertEqual(p.active_states(), [0])
        self.assertEqual(p.d[200], 0)


if __name__ == "__main__":
    unittest.main()
