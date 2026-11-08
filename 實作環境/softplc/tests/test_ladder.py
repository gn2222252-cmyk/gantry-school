# -*- coding: utf-8 -*-
"""GANTRY_PLC.csv on the soft PLC with the machine simulation, in simulated time.
The items in Section 8 of the spec are named T01-T12 where they can be tested here. Every scan of every
test also checks the interlocks of Section 4.8."""
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))

from gantry_sim import Machine                     # noqa: E402
from plc_csv import load_csv                       # noqa: E402
from plc_engine import PLC                         # noqa: E402

CSV = os.path.join(HERE, "..", "..", "ladder", "GANTRY_PLC.csv")
PROGRAM = load_csv(CSV)
MECH = [0, 1, 2, 3, 4, 5, 6, 7]                    # Y0-Y7 as indexes


class Rig(object):
    def __init__(self):
        self.p = PLC(PROGRAM)
        self.m = Machine(self.p)
        self.violations = []
        self.hmi = 0

    def scan(self, ms=10):
        self.m.apply_inputs()
        self.p.scan(ms)
        self.check()
        self.m.step(ms)

    def check(self):
        y, x = self.p.y_out, self.p.x
        bad = []
        if y[0] and y[1]:
            bad.append("Y0+Y1")
        if y[6] and y[7]:
            bad.append("Y6+Y7")
        if y[3] and y[4]:
            bad.append("Y3+Y4")
        if self.p.m[8116] and self.p.m[8117]:
            bad.append("M8116+M8117")
        if (y[0] or y[1]) and not x[6]:
            bad.append("left axis with cylinder not up")
        if (y[6] or y[7]) and not x[9]:
            bad.append("right axis with cylinder not up")
        if y[4] and not (x[2] or x[3]):
            bad.append("right down away from a stop point")
        if self.p.m[8116] and not (x[0] or x[1]):
            bad.append("left down away from a stop point")
        if (self.p.m[2] or self.p.m[3]) and any(y[i] for i in MECH):
            bad.append("output on in alarm")
        if bad:
            self.violations.append((self.p.scans, bad))

    def run(self, ms):
        for _ in range(int(ms // 10)):
            self.scan()

    def until(self, test, ms=30000, what=""):
        for _ in range(int(ms // 10)):
            if test():
                return True
            self.scan()
        raise AssertionError("timeout waiting for %s\n%s\nD200=%d D201=%d D220=%d states=%s"
                             % (what, self.m.summary(), self.p.d[200], self.p.d[201], self.p.d[220],
                                self.p.active_states()))

    def tap(self, name, ms=100):
        self.p.m[name] = 1                         # no field buttons on FX3S-20M, LabVIEW writes these
        self.run(ms)

    def hmi_pulse(self, n):
        self.p.m[n] = 1
        self.run(50)

    def home(self):
        self.hmi_pulse(102)
        self.until(lambda: self.p.m[20], what="homed")

    def y(self, n):
        board = {"10": 8116, "11": 8117}           # FX3G-2EYT-BD BY0, BY1
        if n in board:
            return self.p.m[board[n]]
        return self.p.get_y("5" if n == "12" else n)


class Base(unittest.TestCase):
    def setUp(self):
        self.r = Rig()
        self.r.run(100)
        self.p = self.r.p
        self.m = self.r.m

    def tearDown(self):
        self.assertEqual(self.r.violations[:3], [])


class Power(Base):
    def test_t01_power_on(self):
        self.assertEqual(self.p.active_states(), [0])
        self.assertEqual(self.p.m[20], 0)
        self.assertEqual((self.p.d[100], self.p.d[101], self.p.d[102], self.p.d[103]), (5, 5, 50, 0))
        self.assertEqual(self.p.d[220], 0)

    def test_latched_alarm_cleared_at_power_on(self):
        p = PLC(PROGRAM)
        p.d[220] = 21                       # FX3U keeps D200-D511 through a power cycle
        p.d[100] = 9
        p.set_x(13, 1)
        p.scan(10)
        self.assertEqual(p.d[220], 0)
        self.assertEqual(p.d[100], 9)

    def test_start_refused_before_homing(self):
        self.r.tap(100)
        self.assertEqual(self.p.m[0], 0)
        self.assertEqual(self.p.active_states(), [0])

    def test_inputs_and_heartbeat_words(self):
        self.m.press("X010", 1)
        self.r.run(30)
        self.assertEqual((self.p.d[230] >> 8) & 1, 1)         # X10
        self.assertEqual((self.p.d[230] >> 11) & 1, 1)        # X13
        before = self.p.d[241]
        self.r.run(3000)
        self.assertIn(self.p.d[241] - before, (2, 3, 4))


class Homing(Base):
    def test_t02_home_from_anywhere(self):
        self.m.left.axis, self.m.left.z, self.m.left.valve = 0.0, 1.0, 1
        self.m.right.axis, self.m.right.z, self.m.right.valve = 1000.0, 1.0, 1
        self.r.hmi_pulse(102)
        self.assertEqual(self.p.m[21], 1)
        self.r.until(lambda: self.p.m[20], what="homed")
        self.assertEqual(self.p.m[21], 0)
        self.assertEqual((self.p.x[1], self.p.x[6], self.p.x[2], self.p.x[9]), (1, 1, 1, 1))
        self.r.run(100)
        self.assertEqual(self.p.active_states(), [0])

    def test_reset_button_homes_when_no_alarm(self):
        self.r.tap(103)
        self.r.until(lambda: self.p.m[20], what="homed")

    def test_home_timeout_30(self):
        self.m.left.axis = 500.0
        self.m.left.axis_stuck = True
        self.r.hmi_pulse(102)
        self.r.until(lambda: self.p.m[3], 6000, "alarm")
        self.assertEqual(self.p.d[220], 30)


class Auto(Base):
    def start(self, *parts):
        self.r.home()
        for belt, pos in parts:
            self.m.add_part(belt, pos)
        self.r.tap(100)
        self.assertEqual(self.p.m[0], 1)

    def test_t03_single_part_full_round(self):
        self.start(("front", 500))
        self.r.until(lambda: self.p.d[211] == 1, 40000, "one round")
        self.assertEqual((self.p.d[210], self.p.d[211], self.p.d[212]), (1, 1, 1))
        self.assertEqual(self.m.placed, {"R": 1, "L": 1})
        self.assertEqual(self.m.parts[0]["on"], "front")

    def test_right_steps_in_order(self):
        self.start(("front", 900))
        seen = []
        def watch():
            if not seen or seen[-1] != self.p.d[200]:
                seen.append(self.p.d[200])
            return self.p.d[210] == 1
        self.r.until(watch, 30000, "right count")
        self.assertEqual(seen[seen.index(21):], [21, 22, 23, 24, 25, 26, 27, 28, 20])

    def test_left_steps_in_order(self):
        self.start(("rear", 900))
        seen = []
        def watch():
            if not seen or seen[-1] != self.p.d[201]:
                seen.append(self.p.d[201])
            return self.p.d[211] == 1
        self.r.until(watch, 30000, "left count")
        self.assertEqual(seen[seen.index(41):], [41, 42, 43, 44, 45, 46, 47, 48, 40])

    def test_t04_three_parts(self):
        self.start(("front", 500), ("front", 100), ("rear", 300))
        self.r.until(lambda: self.p.d[212] >= 5, 180000, "five cycles")
        self.assertEqual(self.p.d[220], 0)
        self.assertEqual([q for q in self.m.parts if q["on"] == "lost"], [])

    def test_conveyor_rule(self):
        self.start()
        self.r.run(50)
        self.assertEqual(self.r.y("2"), 1)
        self.m.add_part("front", 960)
        self.r.run(50)
        self.assertEqual(self.r.y("2"), 0, "part at X4 stops the belts")
        self.r.until(lambda: self.p.d[200] == 24, 10000, "S24")
        self.r.run(50)
        self.assertEqual(self.r.y("2"), 1, "belts run while the gantry travels")
        self.r.until(lambda: self.p.d[200] == 25, 10000, "S25")
        self.r.run(50)
        self.assertEqual(self.r.y("2"), 0, "belts stop while the gantry is at the belt")
        self.r.until(lambda: self.p.d[200] == 28, 10000, "S28")
        self.r.run(50)
        self.assertEqual(self.r.y("2"), 1)

    def test_t05_cycle_stop_finishes_the_trip(self):
        self.start(("front", 900))
        self.r.until(lambda: self.p.d[200] == 24, 10000, "S24")
        self.r.tap(101)
        self.assertEqual(self.p.m[1], 1)
        self.assertEqual(self.p.m[0], 1)
        self.r.until(lambda: self.p.m[0] == 0, 15000, "stopped")
        self.assertEqual(self.p.d[210], 1)
        self.r.run(100)
        self.assertEqual(self.p.active_states(), [0])
        self.assertEqual(self.r.y("2"), 0)
        self.assertEqual(self.p.x[2], 1)

    def test_start_again_after_cycle_stop(self):
        self.start()
        self.r.tap(101)
        self.r.until(lambda: self.p.m[0] == 0, 3000, "stopped")
        self.r.run(100)
        self.r.tap(100)
        self.assertEqual(self.p.m[0], 1)

    def test_target_count_stops(self):
        self.p.d[103] = 2
        self.start(("front", 900))
        self.r.until(lambda: self.p.m[0] == 0, 90000, "target reached")
        self.assertEqual(self.p.d[212], 2)

    def test_mode_switch_is_a_cycle_stop(self):
        self.start(("front", 900))
        self.r.until(lambda: self.p.d[200] == 23, 10000, "S23")
        self.m.press("X010", 0)
        self.r.run(50)
        self.assertEqual(self.p.m[5], 0, "no jogging while the trip finishes")
        self.r.until(lambda: self.p.m[0] == 0, 15000, "stopped")
        self.r.run(100)
        self.assertEqual(self.p.m[5], 1)

    def test_t06_estop(self):
        self.start(("front", 900))
        self.r.until(lambda: self.p.d[200] == 24, 10000, "S24")
        self.m.press("X013", 0)
        self.r.run(20)
        self.assertEqual(self.p.active_states(), [])
        self.assertEqual(self.p.d[220], 1)
        self.assertEqual(self.p.m[20], 0)
        # still pressed: reset does nothing
        self.r.tap(103)
        self.assertEqual(self.p.m[3], 1)
        self.m.press("X013", 1)
        self.r.run(50)
        self.assertEqual(self.p.m[3], 1, "release alone does not clear it")
        self.r.tap(103)
        self.assertEqual((self.p.m[3], self.p.d[220]), (0, 0))
        self.assertEqual(self.p.active_states(), [0])
        self.r.tap(100)
        self.assertEqual(self.p.m[0], 0, "homing is needed first")
        self.r.tap(103)
        self.r.until(lambda: self.p.m[20], what="homed")
        self.r.run(50)
        self.r.tap(100)
        self.assertEqual(self.p.m[0], 1)

    def alarm_case(self, step, code, fault):
        self.start(("front", 900) if step < 40 else ("rear", 900))
        reg = 200 if step < 40 else 201
        fault()
        self.r.until(lambda: self.p.d[reg] == step or self.p.m[3], 15000, "step %d" % step)
        self.r.until(lambda: self.p.m[3], 6000, "alarm")
        self.r.run(30)
        self.assertEqual(self.p.d[220], code)
        self.assertEqual(self.p.active_states(), [])

    def test_t07_right_axis_10(self):
        self.alarm_case(24, 10, lambda: self.m.force.update(X003=0))

    def test_right_cylinder_11(self):
        self.alarm_case(21, 11, lambda: self.m.force.update(X012=0))

    def test_left_axis_20(self):
        self.alarm_case(44, 20, lambda: self.m.force.update(X000=0))

    def test_left_cylinder_21(self):
        self.alarm_case(41, 21, lambda: self.m.force.update(X007=0))

    def test_timeout_takes_five_seconds(self):
        self.start(("front", 900))
        self.m.force["X003"] = 0
        self.r.until(lambda: self.p.d[200] == 24, 10000, "S24")
        start = self.p.clock_ms
        self.r.until(lambda: self.p.m[3], 7000, "alarm")
        self.assertAlmostEqual((self.p.clock_ms - start) / 1000.0, 5.0, delta=0.2)

    def test_no_timeout_while_waiting_for_a_part(self):
        self.start()
        self.r.run(12000)
        self.assertEqual(self.p.d[220], 0)

    def test_reset_after_timeout_then_home_and_run(self):
        self.alarm_case(24, 10, lambda: self.m.force.update(X003=0))
        self.m.force.clear()
        self.r.tap(103)
        self.assertEqual((self.p.m[3], self.p.d[220]), (0, 0))
        self.r.tap(103)
        self.r.until(lambda: self.p.m[20], what="homed")
        self.r.run(50)
        self.r.tap(100)
        self.assertEqual(self.p.m[0], 1)

    def test_only_first_code_is_kept(self):
        self.alarm_case(24, 10, lambda: self.m.force.update(X003=0))
        self.m.press("X013", 0)
        self.r.run(50)
        self.assertEqual(self.p.d[220], 10)

    def test_t12_vacuum_time_parameter(self):
        self.p.d[100] = 20
        self.start(("front", 900))
        self.r.until(lambda: self.p.d[200] == 22, 10000, "S22")
        start = self.p.clock_ms
        self.r.until(lambda: self.p.d[200] == 23, 5000, "S23")
        self.assertAlmostEqual((self.p.clock_ms - start) / 1000.0, 2.0, delta=0.1)

    def test_count_clear(self):
        self.start(("front", 900))
        self.r.until(lambda: self.p.d[210] == 1, 20000, "count")
        self.p.m[104] = 1
        self.r.run(30)
        self.assertEqual(self.p.d[210], 0)
        self.assertEqual(self.p.m[104], 0)


class Manual(Base):
    def setUp(self):
        Base.setUp(self)
        self.m.press("X010", 0)
        self.r.run(30)

    def test_jog_each_output(self):
        self.r.home()
        for cmd, y in ((113, "11"), (112, "10"), (123, "3"), (122, "4"), (124, "5"), (114, "12"), (125, "2")):
            self.p.m[cmd] = 1
            self.r.run(20)
            self.assertEqual(self.r.y(y), 1, "M%d -> Y%s" % (cmd, y))
            self.p.m[cmd] = 0
            self.r.run(20)
            self.assertEqual(self.r.y(y), 0)
        self.m.left.z = self.m.right.z = 0.0
        self.m.left.valve = self.m.right.valve = -1
        self.r.run(20)
        for cmd, y, hold in ((110, "0", 200), (111, "1", 20), (121, "6", 200), (120, "7", 20)):
            self.p.m[cmd] = 1
            self.r.run(hold)
            self.assertEqual(self.r.y(y), 1, "M%d -> Y%s" % (cmd, y))
            self.p.m[cmd] = 0
            self.r.run(20)
        self.assertEqual(self.p.m[20], 0, "hand movement clears homed")

    def test_jog_stops_at_the_sensor_of_its_direction(self):
        self.r.home()
        for cmd, y, sensor, gantry, target in ((110, "0", 0, self.m.left, 0.0), (121, "6", 3, self.m.right, 1000.0),
                                               (111, "1", 1, self.m.left, 1000.0), (120, "7", 2, self.m.right, 0.0)):
            self.p.m[cmd] = 1
            self.r.run(3000)                 # held far longer than the travel takes
            self.assertEqual(self.r.y(y), 0, "M%d stops" % cmd)
            self.assertEqual(self.p.x[sensor], 1)
            self.assertLessEqual(abs(gantry.axis - target), 9.0, "M%d no overrun" % cmd)
            self.p.m[cmd] = 0
            self.r.run(30)

    def test_jog_into_a_lit_sensor_keeps_homed(self):
        self.r.home()
        for cmd in (120, 111):               # right is at front, left is at rear
            self.p.m[cmd] = 1
            self.r.run(100)
            self.p.m[cmd] = 0
        self.r.run(30)
        self.assertEqual(self.p.m[20], 1)

    def test_jog_away_from_a_lit_sensor(self):
        self.r.home()
        self.p.m[121] = 1
        self.r.run(100)
        self.assertEqual(self.r.y("6"), 1)
        self.assertGreater(self.m.right.axis, 20.0)

    def test_recovery_from_past_the_sensor(self):
        """Right axis on its limit switch beyond X2, as it could be after a sensor fault."""
        self.m.right.axis = -40.0
        self.p.m[121] = 1
        self.r.run(1000)
        self.p.m[121] = 0
        self.m.press("X010", 1)
        self.r.run(30)
        self.r.home()
        self.assertEqual(self.p.x[2], 1)

    def test_t08_axis_blocked_with_cylinder_down(self):
        self.p.m[122] = 1
        self.r.run(800)
        self.p.m[122] = 0
        self.r.run(20)
        self.assertEqual(self.p.x[11], 1)
        self.p.m[121] = 1
        self.r.run(100)
        self.assertEqual(self.r.y("6"), 0)
        self.assertEqual(self.m.right.axis, 0.0)

    def test_cylinder_blocked_between_stop_points(self):
        self.p.m[121] = 1
        self.r.run(600)
        self.p.m[121] = 0
        self.r.run(20)
        self.assertEqual((self.p.x[2], self.p.x[3]), (0, 0))
        self.p.m[122] = 1
        self.r.run(100)
        self.assertEqual(self.r.y("4"), 0)

    def test_opposite_commands_cannot_both_drive(self):
        self.p.m[110] = self.p.m[111] = 1
        self.p.m[122] = self.p.m[123] = 1
        self.r.run(200)
        self.assertEqual(self.r.y("0") + self.r.y("1"), 1)
        self.assertEqual(self.r.y("3") + self.r.y("4"), 1)

    def test_manual_ignored_in_auto(self):
        self.m.press("X010", 1)
        self.r.run(30)
        self.p.m[125] = 1
        self.r.run(30)
        self.assertEqual(self.r.y("2"), 0)
        self.assertEqual(self.p.m[125], 0)

    def test_t11_link_lost_stops_jog(self):
        self.p.d[240] = 7
        self.r.run(200)
        self.p.m[125] = 1
        self.r.run(100)
        self.assertEqual(self.r.y("2"), 1)
        self.r.run(3100)                 # D240 stops changing
        self.assertEqual(self.r.y("2"), 0)
        self.assertEqual(self.p.m[125], 0)
        self.assertEqual(self.p.d[220], 40)

    def test_heartbeat_keeps_jog_alive(self):
        self.p.d[240] = 1
        self.p.m[125] = 1
        for i in range(8):
            self.p.d[240] += 1
            self.r.run(1000)
        self.assertEqual(self.r.y("2"), 1)
        self.assertEqual(self.p.d[220], 0)

    def test_no_hmi_means_no_link_alarm(self):
        self.r.run(5000)
        self.assertEqual(self.p.d[220], 0)

    def test_hmi_exit_writes_zero_and_no_alarm(self):
        self.p.d[240] = 5
        self.r.run(500)
        self.p.d[240] = 0
        self.r.run(5000)
        self.assertEqual(self.p.d[220], 0)

    def test_reset_after_link_alarm_stays_cleared(self):
        self.p.d[240] = 5
        self.r.run(3200)
        self.assertEqual(self.p.d[220], 40)
        self.p.m[103] = 1
        self.r.run(300)
        self.assertEqual((self.p.m[3], self.p.d[220]), (0, 0))

    def test_auto_keeps_running_without_hmi(self):
        self.m.press("X010", 1)
        self.r.run(30)
        self.r.home()
        self.p.d[240] = 3
        self.r.tap(100)
        self.r.run(4000)
        self.assertEqual(self.p.m[0], 1)
        self.assertEqual(self.p.d[220], 0)


if __name__ == "__main__":
    unittest.main(verbosity=1)
