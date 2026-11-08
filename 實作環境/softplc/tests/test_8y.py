# -*- coding: utf-8 -*-
"""GANTRY_8Y.csv, the synchronous version with no expansion board, on the soft PLC with the machine simulation.
Every scan checks the interlocks."""
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))

from gantry_sim import Machine                     # noqa: E402
from plc_csv import load_csv                       # noqa: E402
from plc_engine import PLC                         # noqa: E402

PROGRAM = load_csv(os.path.join(HERE, "..", "..", "ladder", "GANTRY_8Y.csv"))


class Rig(unittest.TestCase):
    def setUp(self):
        self.p = PLC(PROGRAM)
        self.m = Machine(self.p, board=False)
        self.bad = []
        self.run_ms(100)

    def run_ms(self, ms):
        for _ in range(ms // 10):
            self.m.apply_inputs()
            self.p.scan(10)
            self.check()
            self.m.step(10)

    def check(self):
        y, x = self.p.y_out, self.p.x
        if y[0] and y[1] or y[6] and y[7] or y[3] and y[4]:
            self.bad.append("both directions")
        if (y[0] or y[1] or y[6] or y[7]) and not (x[6] and x[9]):
            self.bad.append("axis with a cylinder not up")
        if y[4] and not ((x[2] or x[3]) and (x[0] or x[1])):
            self.bad.append("down away from a stop point")
        if (self.p.m[2] or self.p.m[3]) and any(y[:8]):
            self.bad.append("output in alarm")
        if any(y[8:16]) or self.p.m[8116] or self.p.m[8117]:
            self.bad.append("output above Y7")

    def home(self):
        self.p.d[106] = 4
        self.run_ms(6000)
        self.assertEqual(self.p.m[20], 1)

    def start(self):
        self.p.d[106] = 1
        self.run_ms(100)

    def tearDown(self):
        self.assertEqual(self.bad, [])

    def test_home(self):
        self.m.left.axis, self.m.right.axis = 500.0, 500.0
        self.m.left.z = self.m.right.z = 0.0
        self.p.d[106] = 4
        self.run_ms(6000)
        self.assertEqual(self.p.m[20], 1)
        self.assertEqual((self.p.x[1], self.p.x[2]), (1, 1))

    def test_part_on_one_side_moves_and_other_side_runs_empty(self):
        self.home()
        part = self.m.add_part("front", 900)
        self.start()
        self.run_ms(8000)
        self.assertEqual(part["on"] in ("rear", "L"), True, part)
        self.assertEqual(self.p.c_val[0], 1)
        self.assertEqual(self.p.c_val[1], 0)

    def test_two_parts_swap(self):
        self.home()
        a, b = self.m.add_part("front", 900), self.m.add_part("rear", 900)
        self.start()
        self.run_ms(8000)
        self.assertEqual((a["on"] != "front" or a["pos"] < 900, b["on"] != "rear" or b["pos"] < 900), (True, True), (a, b))
        self.assertEqual((self.p.c_val[0], self.p.c_val[1]), (1, 1))

    def test_keeps_circulating(self):
        self.home()
        parts = [self.m.add_part("front", 900), self.m.add_part("rear", 500)]
        self.start()
        self.run_ms(60000)
        self.assertGreaterEqual(min(self.p.c_val[0], self.p.c_val[1]), 3, (self.p.c_val[0], self.p.c_val[1]))
        self.assertTrue(all(p["on"] != "lost" for p in parts), parts)

    def test_step_words_for_labview(self):
        self.home()
        self.m.add_part("front", 900)
        self.start()
        self.run_ms(300)
        self.assertEqual(self.p.d[201], self.p.d[200] + 20)

    def test_cycle_stop(self):
        self.home()
        self.m.add_part("front", 900)
        self.start()
        self.run_ms(500)
        self.p.d[106] = 2
        self.run_ms(9000)
        self.assertEqual(self.p.active_states(), [0])
        self.assertEqual(self.p.m[0], 0)

    def test_timeout_when_left_sensor_is_stuck(self):
        self.home()
        self.m.add_part("front", 900)
        self.p.d[102] = 20
        self.start()
        self.m.left.cyl_stuck = True
        self.run_ms(4000)
        self.assertEqual(self.p.d[220], 11)
        self.assertEqual(self.p.m[3], 1)

    def test_manual_cylinders_and_vacuum_go_together(self):
        self.m.press("X010", 0)
        self.run_ms(100)
        self.p.d[107] = 0x0004                     # L Down
        self.run_ms(800)
        self.p.d[107] = 0
        self.run_ms(50)
        self.assertEqual((self.p.x[7], self.p.x[10]), (1, 1))
        self.p.d[107] = 0x0010                     # L Vacuum
        self.run_ms(50)
        self.assertEqual(self.p.y_out[5], 1)
        self.assertTrue(self.m.left.vacuum and self.m.right.vacuum)

    def test_y_word_keeps_left_bits_for_the_picture(self):
        self.m.press("X010", 0)
        self.run_ms(100)
        self.p.d[107] = 0x1000                     # R Down
        self.run_ms(100)
        self.assertEqual((self.p.d[231] >> 8) & 1, 1)

    def test_power_up_clears_old_steps(self):
        p = PLC(PROGRAM)
        p.x_in[0o13] = 1
        p.s[24] = 1
        p.scan(10)
        self.assertEqual(p.active_states(), [0])


if __name__ == "__main__":
    unittest.main()
