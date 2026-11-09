# -*- coding: utf-8 -*-
"""Runs the real ladder\\AOI_PLC.csv in simulated time with a small LabVIEW stand-in."""
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))

from plc_csv import load_csv                # noqa: E402
from plc_engine import PLC                  # noqa: E402

CSV = os.path.join(HERE, "..", "..", "ladder", "AOI_PLC.csv")
PROGRAM = load_csv(CSV)


class Rig(object):
    """PLC plus the LabVIEW side: heartbeat every 100 ms and the inspection handshake."""

    def __init__(self):
        self.plc = PLC(PROGRAM)
        self.plc.set_x(3, 1)
        self.heartbeat_on = True
        self.answer = 1           # value written to D510; None = never answer
        self.answers = []         # per-part results (overrides answer)
        self.inspect_ms = 300
        self.inspecting = None
        self.flag_set = False
        self.t = 0
        self.steps_seen = []
        self.parts_inspected = []

    def d(self, n):
        return self.plc.d[n]

    def tick(self):
        p = self.plc
        p.scan(10)
        self.t += 10
        if not self.steps_seen or self.steps_seen[-1] != p.d[300]:
            self.steps_seen.append(p.d[300])
        if self.t % 100 == 0 and self.heartbeat_on:
            p.d[520] = p.d[520] + 1
        status = p.d[302]
        if status & 1 and self.inspecting is None and not self.flag_set and self.answer_ready():
            self.inspecting = self.t + self.inspect_ms
            self.parts_inspected.append(p.d[306])
        if self.inspecting is not None and self.t >= self.inspecting:
            self.inspecting = None
            p.d[510] = self.answers.pop(0) if self.answers else self.answer
            p.d[511] = 1
            self.flag_set = True
        if not status & 1 and self.flag_set:
            p.d[511] = 0
            self.flag_set = False

    def answer_ready(self):
        return self.answer is not None or self.answers

    def run(self, ms):
        for _ in range(ms // 10):
            self.tick()

    def wait(self, test, limit_ms=30000, what=""):
        for _ in range(limit_ms // 10):
            if test():
                return
            self.tick()
        raise AssertionError("timeout waiting for %s, step=%d alarm=%d" % (what, self.d(300), self.d(301)))

    def wait_step(self, step, limit_ms=30000):
        self.wait(lambda: self.d(300) == step, limit_ms, "step %d" % step)

    def cmd(self, code):
        self.plc.d[100] = code
        self.tick()
        self.tick()

    def idle(self):
        self.wait_step(30, 15000)
        self.run(30)                # words are refreshed at the end of the next scan
        return self

    def start(self):
        self.cmd(1)

    def reset(self):
        self.cmd(3)

    def do(self, n):
        return (self.d(305) >> n) & 1 if self.d(305) >= 0 else ((self.d(305) & 0xFFFF) >> n) & 1

    def di(self, n):
        return ((self.d(303) & 0xFFFF) >> n) & 1


class Normal(unittest.TestCase):
    def test_power_up_defaults(self):
        r = Rig()
        r.run(50)
        self.assertEqual((r.d(530), r.d(531), r.d(532), r.d(314), r.d(315)), (60, 50, 20, 550, 60))

    def test_startup_sequence(self):
        r = Rig().idle()
        self.assertEqual(r.steps_seen, [10, 20, 30])
        self.assertEqual(r.do(9), 1)
        self.assertEqual(r.d(305) & 0x0FF, 0)

    def test_purge_takes_6s(self):
        r = Rig()
        r.wait_step(20)
        begin = r.t
        r.wait_step(30)
        self.assertAlmostEqual(r.t - begin, 6000, delta=120)

    def test_three_parts(self):
        r = Rig().idle()
        r.answers = [1, 2, 1]
        r.start()
        r.wait(lambda: r.d(310) == 2, what="2 parts")
        self.assertEqual(r.d(301), 0)
        r.cmd(2)
        self.assertEqual(r.d(302) & 8, 8)
        r.wait_step(30, 30000)
        r.run(30)
        self.assertEqual((r.d(310), r.d(311), r.d(312), r.d(313)), (3, 2, 1, 1))
        self.assertEqual(r.parts_inspected, [1001, 1002, 1003])
        self.assertEqual(r.d(302) & 8, 0)
        order = r.steps_seen[r.steps_seen.index(40):]
        self.assertEqual(order[:9], [40, 50, 60, 70, 80, 90, 110, 120, 40])
        self.assertEqual(order[9:18], [50, 60, 70, 80, 90, 100, 120, 40, 50])

    def test_outputs_per_step(self):
        r = Rig().idle()
        r.start()
        r.wait_step(50)
        r.wait(lambda: r.d(300) == 50 and r.d(402) > 100, what="moving")
        self.assertEqual([r.do(i) for i in (0, 1, 2, 10, 9)], [1, 1, 0, 1, 0])
        r.wait_step(70)
        r.run(50)
        self.assertEqual([r.do(i) for i in (0, 1, 2, 6)], [0, 1, 1, 1])
        self.assertEqual(r.d(302) & 1, 1)
        self.assertEqual(r.d(306), 1001)
        r.wait_step(80)
        self.assertEqual(r.d(302) & 1, 0)
        self.assertEqual(r.d(403), 1)
        r.wait_step(110)
        r.run(30)
        self.assertEqual(r.do(5), 1)

    def test_handshake_waits_for_d211_zero(self):
        r = Rig().idle()
        r.plc.d[511] = 1            # stale flag from the last part
        r.answer = None
        r.start()
        r.wait_step(70)
        r.run(300)
        self.assertEqual(r.d(302) & 1, 0)
        r.plc.d[511] = 0
        r.run(30)
        self.assertEqual(r.d(302) & 1, 1)


class Simulation(unittest.TestCase):
    def belt_part(self):
        r = Rig().idle()
        r.start()
        r.wait(lambda: r.d(400) == 1, what="part")
        return r

    def test_part_appears_after_0_3_s(self):
        r = Rig().idle()
        r.start()
        begin = r.t
        r.wait(lambda: r.do(4) == 1, what="DO4")
        r.wait(lambda: r.d(400) == 1, what="part")
        self.assertAlmostEqual(r.t - begin, 300, delta=60)
        self.assertEqual((r.d(401), r.d(402)), (1001, 0))

    def test_speed_15mm_per_tick(self):
        r = self.belt_part()
        r.wait(lambda: r.d(402) > 0, what="move")
        a, ta = r.d(402), r.t
        r.wait(lambda: r.d(402) != a, what="next tick")
        a, ta = r.d(402), r.t
        r.run(500)
        self.assertEqual(r.d(402) - a, 750)

    def test_speed_scale(self):
        r = Rig()
        r.plc.d[530] = 37
        r.run(20)
        self.assertEqual(r.plc.d[32], 92)      # 37 x 2.5 rounded down

    def test_stops_at_4000(self):
        r = self.belt_part()
        r.answer = None
        r.wait_step(70)
        self.assertEqual(r.d(402), 4000)

    def test_entry_sensor_range(self):
        r = self.belt_part()
        r.run(30)
        self.assertEqual(r.di(4), 1)
        r.wait(lambda: r.d(402) > 400, what="past entry")
        r.run(30)
        self.assertEqual(r.di(4), 0)

    def test_cylinder_times(self):
        r = Rig().idle()
        r.answer = None
        r.start()
        r.wait_step(50)
        begin = r.t
        r.wait(lambda: r.di(8) == 1, what="stopper up")
        self.assertAlmostEqual(r.t - begin, 200, delta=60)
        r.wait_step(60)
        begin = r.t
        r.wait(lambda: r.di(10) == 1, what="clamp ext")
        self.assertAlmostEqual(r.t - begin, 300, delta=60)
        self.assertEqual(r.di(11), 0)

    def test_no_move_while_clamped(self):
        r = Rig().idle()
        r.answer = None
        r.start()
        r.wait_step(70)
        before = r.d(402)
        r.plc.m[100] = 1
        r.run(10)
        self.assertEqual(r.d(402), before)

    def test_sim_off_bit(self):
        r = Rig()
        r.run(100)
        r.plc.m[198] = 0
        r.run(1000)
        self.assertEqual(r.d(303) & 0x7F, 0)

    def test_x_inputs_and_y_outputs(self):
        r = Rig().idle()
        self.assertEqual(r.plc.get_y(5), 1)     # yellow on Y5
        r.plc.set_x(0, 1)
        r.run(20)
        r.plc.set_x(0, 0)
        r.wait_step(50, 3000)
        r.run(300)
        self.assertEqual((r.plc.get_y(0), r.plc.get_y(1), r.plc.get_y(4)), (1, 1, 1))


class Alarms(unittest.TestCase):
    def check(self, r, code, limit=30000):
        r.wait(lambda: r.d(301) == code, limit, "alarm %d" % code)
        r.wait_step(910, 1000)
        self.assertEqual(r.d(302) & 4, 4)
        return r

    def recover(self, r):
        r.reset()
        self.assertEqual(r.d(301), 0)
        r.answer = 1
        r.idle()
        self.assertEqual(r.d(301), 0)
        r.start()
        r.wait(lambda: r.d(310) >= 1, what="part after reset")
        self.assertEqual(r.d(301), 0)

    def test_8001_button(self):
        r = Rig().idle()
        r.start()
        r.wait_step(50)
        r.run(500)
        r.plc.set_x(3, 0)
        self.check(r, 8001)
        r.run(100)
        self.assertEqual(r.d(305) & 0xFFF, 0)
        self.assertEqual([r.plc.get_y(i) for i in range(8)], [0] * 8)
        self.assertEqual(r.d(302) & 32, 32)
        self.assertEqual(r.di(0), 0)
        r.reset()
        self.assertEqual(r.d(301), 8001)        # cause still present
        r.plc.set_x(3, 1)
        r.run(50)
        self.recover(r)

    def test_8001_d250(self):
        r = Rig().idle()
        r.plc.d[550] = 1
        self.check(r, 8001)
        r.plc.d[550] = 0
        r.run(50)
        self.recover(r)

    def test_estop_freezes_part_immediately(self):
        r = Rig().idle()
        r.start()
        r.wait(lambda: r.d(402) > 1000, what="moving")
        r.plc.d[550] = 1
        r.run(50)
        pos = r.d(402)
        r.run(1000)
        self.assertEqual(r.d(402), pos)

    def test_8004(self):
        r = Rig().idle()
        r.plc.d[314] = 400
        self.check(r, 8004)
        self.assertEqual(r.di(3), 0)
        r.reset()
        self.assertEqual(r.d(301), 8004)
        r.plc.d[314] = 550
        r.run(50)
        self.recover(r)

    def test_8101(self):
        r = Rig().idle()
        r.answer = 1
        r.start()
        r.wait_step(60)
        r.cmd(5)
        self.assertEqual(r.d(313), 20)
        self.assertEqual(r.d(302) & 16, 16)
        self.check(r, 8101)
        self.assertEqual(r.d(310), 1)
        r.reset()
        self.assertEqual(r.d(301), 8101)        # still full
        r.cmd(4)
        self.assertEqual(r.d(313), 0)
        self.recover(r)

    def test_8101_start_while_full(self):
        r = Rig().idle()
        r.cmd(5)
        r.start()
        self.check(r, 8101, 1000)

    def test_stop_with_full_bin_goes_idle(self):
        r = Rig().idle()
        r.start()
        r.wait_step(60)
        r.cmd(2)
        r.cmd(5)
        r.wait_step(30)
        self.assertEqual(r.d(301), 0)

    def test_9001_stopper(self):
        r2 = Rig().idle()
        r2.answer = None
        r2.start()
        r2.wait_step(70)
        r2.answer = 1
        r2.wait(lambda: r2.d(300) == 80, what="step 80")
        # stopper sensor blocked by keeping the stopper down timer from finishing
        for _ in range(150):
            r2.plc.t_acc[11] = 0
            r2.tick()
            if r2.d(301):
                break
        self.assertEqual(r2.d(301), 9001)
        r2.wait_step(910, 1000)
        self.recover(r2)

    def test_9002_clamp_stuck(self):
        r = Rig().idle()
        r.plc.d[550] = 2
        r.start()
        self.check(r, 9002)
        r.reset()
        self.assertEqual(r.d(301), 9002)        # fault bit still on
        r.plc.d[550] = 0
        r.run(50)
        self.recover(r)

    def test_9002_init(self):
        r = Rig().idle()
        r.plc.m[198] = 0                        # simulation off: no retract sensor
        r.plc.m[231] = r.plc.m[233] = 0
        r.plc.d[300] = 10
        r.wait(lambda: r.d(301) != 0, 4000, "alarm")
        self.assertEqual(r.d(301), 9002)        # no clamp retract sensor

    def test_9003_init(self):
        r = Rig().idle()
        r.start()
        r.wait_step(40)
        r.plc.d[300] = 10
        r.plc.m[233] = 0
        for _ in range(300):
            r.plc.t_acc[15] = 0
            r.tick()
            if r.d(301):
                break
        self.assertEqual(r.d(301), 9003)
        r.wait_step(910, 1000)
        self.recover(r)

    def test_9003_push(self):
        r = Rig().idle()
        r.answer = 2
        r.start()
        r.wait_step(100)
        for _ in range(200):
            r.plc.t_acc[14] = 0
            r.tick()
            if r.d(301):
                break
        self.assertEqual(r.d(301), 9003)
        r.wait_step(910, 1000)
        r.answer = 1
        r.reset()
        r.idle()
        self.assertEqual(r.d(301), 0)

    def test_9004_entry(self):
        r = Rig().idle()
        r.plc.m[198] = 1
        r.start()
        for _ in range(700):
            r.plc.d[400] = 0
            r.tick()
            if r.d(301):
                break
        self.assertEqual(r.d(301), 9004)
        r.wait_step(910, 1000)
        self.recover(r)

    def test_9004_to_stopper(self):
        r = Rig().idle()
        r.plc.d[530] = 10                       # 25 mm/s: cannot reach in 6 s
        r.run(20)
        r.start()
        self.check(r, 9004)
        r.plc.d[530] = 60
        r.run(30)
        r.reset()
        r.wait_step(30, 40000)

    def test_9005(self):
        r = Rig().idle()
        r.answer = None
        r.start()
        r.wait_step(70)
        begin = r.t
        self.check(r, 9005)
        self.assertAlmostEqual(r.t - begin, 5000, delta=200)
        self.recover(r)

    def test_9005_uses_d231(self):
        r = Rig().idle()
        r.plc.d[531] = 10
        r.answer = None
        r.start()
        r.wait_step(70)
        begin = r.t
        self.check(r, 9005)
        self.assertAlmostEqual(r.t - begin, 1000, delta=200)

    def test_9006(self):
        r = Rig().idle()
        r.start()
        r.wait_step(50)
        r.heartbeat_on = False
        begin = r.t
        self.check(r, 9006)
        self.assertAlmostEqual(r.t - begin, 2000, delta=200)
        r.reset()
        self.assertEqual(r.d(301), 9006)        # heartbeat still dead
        r.heartbeat_on = True
        r.run(300)
        self.recover(r)

    def test_no_9006_in_idle(self):
        r = Rig().idle()
        r.heartbeat_on = False
        r.run(5000)
        self.assertEqual(r.d(301), 0)

    def test_9007(self):
        r = Rig().idle()
        r.answer = 7
        r.start()
        self.check(r, 9007)
        self.assertEqual(r.d(302) & 1, 0)
        self.recover(r)

    def test_9008_servo(self):
        r = Rig().idle()
        r.answer = 3
        r.start()
        self.check(r, 9008)
        self.assertEqual(r.d(302) & 1, 0)
        self.assertEqual(r.d(403), 0)
        self.recover(r)

    def test_first_alarm_is_kept(self):
        r = Rig().idle()
        r.answer = None
        r.start()
        r.wait_step(70)
        r.plc.d[314] = 400
        self.check(r, 8004)
        r.plc.d[550] = 1
        r.run(100)
        self.assertEqual(r.d(301), 8004)

    def test_alarm_lamps(self):
        r = Rig().idle()
        r.plc.d[314] = 400
        self.check(r, 8004)
        r.run(50)
        self.assertEqual((r.do(8), r.do(11), r.do(10), r.do(9)), (1, 1, 0, 0))
        self.assertEqual((r.plc.get_y(6), r.plc.get_y(7)), (1, 1))


if __name__ == "__main__":
    unittest.main()
