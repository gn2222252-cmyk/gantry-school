# -*- coding: utf-8 -*-
"""Every lesson must do what its text says. Each demo is played on the real engine without a window."""
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))

import ladder_view as lv                                # noqa: E402
import learn                                            # noqa: E402
from lessons import LESSONS                             # noqa: E402


def play(lesson, seconds_after=4.0):
    run = learn.Runner(lesson)
    for wait, action, device, _ in lesson["demo"]:
        if action == "stage":
            run = learn.Runner(dict(lesson, il=lesson["stages"][device]))
        if action == "press":
            run.set_input(device, 1)
        elif action == "release":
            run.set_input(device, 0)
        elif action == "toggle":
            run.set_input(device, 0 if run.get_input(device) else 1)
        run.finish(0.1 if action == "rung" else wait)
    run.finish(seconds_after)
    return run


def by_title(number):
    return next(x for x in LESSONS if x["title"].startswith("%s " % number))


class Every(unittest.TestCase):
    def test_all_lessons_end_as_stated(self):
        for lesson in LESSONS:
            run = play(lesson)
            for device, want in lesson["check"]:
                self.assertEqual(bool(lv.bit(run.plc, device)), bool(want), (lesson["title"], device))

    def test_comments_and_buttons_refer_to_the_program(self):
        for lesson in LESSONS:
            run = learn.Runner(lesson)
            self.assertTrue(run.rungs, lesson["title"])
            everything = lesson["il"] + " ".join(lesson.get("stages", {}).values())
            for name, _, _ in lesson["inputs"]:
                self.assertIn(name, everything, lesson["title"])
            for name, _ in lesson["outputs"]:
                self.assertIn(name, everything, lesson["title"])
            for state, _ in lesson.get("sfc", []):
                self.assertIn("STL " + state, everything, lesson["title"])
            for stage in lesson.get("stages", {}).values():
                learn.Runner(dict(lesson, il=stage))

    def test_every_rung_can_be_explained(self):
        for lesson in LESSONS:
            run = learn.Runner(lesson)
            for r in run.rungs:
                if isinstance(r, lv.Rung):
                    self.assertIn("這條的意思", lv.explain(r, run.plc, {}))


class Claims(unittest.TestCase):
    """What the lesson text says, checked one by one."""

    def test_1_button(self):
        run = learn.Runner(by_title(1))
        run.set_input("X000", 1)
        run.finish(0.1)
        self.assertEqual(run.plc.y_out[0], 1)

    def test_2_series_and_parallel(self):
        run = learn.Runner(by_title(2))
        run.set_input("X000", 1)
        run.finish(0.1)
        self.assertEqual(run.plc.y_out[0], 1)
        run.set_input("X001", 1)
        run.finish(0.1)
        self.assertEqual(run.plc.y_out[0], 0)

    def test_3_order_costs_one_scan(self):
        run = learn.Runner(by_title(3))
        run.finish(0.1)
        run.set_input("X000", 1)
        run.plc.scan(20)
        self.assertEqual((run.plc.y_out[0], run.plc.y_out[1]), (1, 0))
        run.plc.scan(20)
        self.assertEqual((run.plc.y_out[0], run.plc.y_out[1]), (1, 1))

    def test_edge_lasts_one_scan_and_counts_once(self):
        run = learn.Runner(by_title("3-2"))
        run.finish(0.1)
        run.set_input("X000", 1)
        on = 0
        for _ in range(40):
            run.plc.scan(20)
            on += run.plc.m[0]
        self.assertEqual(on, 1)
        self.assertEqual((run.plc.d[0], run.plc.d[1]), (1, 40))
        run.set_input("X000", 0)
        run.finish(0.1)
        run.set_input("X000", 1)
        run.finish(0.1)
        self.assertEqual(run.plc.d[0], 2)

    def test_table_matches_what_the_captions_say(self):
        lesson = by_title("3-2")
        run = learn.Runner(lesson)
        run.slow = True
        run.step_ms = 1
        def one_scan():
            run.slow_step()
            while run.scanner is not None:
                run.slow_step()
        one_scan()
        run.set_input("X000", 1)
        one_scan()
        one_scan()
        one_scan()
        rows = [r[1] for r in run.trace_rows]
        # X0, M1 seen by rung 1, M0, M1 after, D0, D1
        self.assertEqual(rows[0], [0, 0, 0, 0, 0, 0])
        self.assertEqual(rows[1], [1, 0, 1, 1, 1, 1])     # just pressed: M0 and M1 in the same scan
        self.assertEqual(rows[2], [1, 1, 0, 1, 1, 2])     # M0 lived one scan, D1 goes on
        self.assertEqual(rows[3], [1, 1, 0, 1, 1, 3])

    def test_lesson_3_table_shows_one_scan_late(self):
        run = learn.Runner(by_title("3"))
        run.slow = True
        def one_scan():
            run.slow_step()
            while run.scanner is not None:
                run.slow_step()
        one_scan()
        run.set_input("X000", 1)
        one_scan()
        one_scan()
        rows = [r[1] for r in run.trace_rows]
        self.assertEqual(rows[1], [1, 1, 1, 0, 0])
        self.assertEqual(rows[2], [1, 1, 1, 1, 1])

    def test_captions_wait_for_the_instruction(self):
        """Every number in a demo must be a real instruction, so a caption can never hang."""
        for lesson in LESSONS:
            count = len(learn.Runner(lesson).program)
            for row in lesson["demo"]:
                if row[1] == "rung":
                    self.assertTrue(row[0] in ("read", "done") or 0 <= row[0] < count, (lesson["title"], row))

    def test_last_is_what_really_ran(self):
        run = learn.Runner(by_title("3-2"))
        run.slow = True
        run.set_input("X000", 1)
        for _ in range(40):
            run.slow_step()
            if run.last == 2:
                self.assertEqual(run.plc.m[0], 1)         # caption says M0 ON: it is
                self.assertEqual(run.plc.m[1], 0)         # and M1 is not computed yet
            if run.last == 4:
                self.assertEqual(run.plc.m[1], 1)
                break
        self.assertEqual(run.last, 4)

    def test_edge_needs_the_order(self):
        """The lesson says: with M1 above, M0 never comes on."""
        items, program = learn.build_program("LD X000\nOUT M1\nLD X000\nANI M1\nOUT M0")
        plc = learn.PLC(program)
        plc.x_in[0] = 1
        for _ in range(20):
            plc.scan(20)
            self.assertEqual(plc.m[0], 0)

    def test_machine_really_uses_it(self):
        """Lesson 3-2 points at P8 and P3, so those lines must exist."""
        text = open(lv.SOURCE, encoding="utf-8").read()
        self.assertIn("MOV D200 D250", text)
        self.assertLess(text.index("OUT M14"), text.index("MOV K0 D220"))

    def test_3_slow_scan_outputs_wait_for_the_end(self):
        run = learn.Runner(by_title(3))
        run.slow = True
        run.finish(0.1)
        run.set_input("X000", 1)
        seen = []
        for _ in range(60):
            run.slow_step()
            seen.append((run.index, run.plc.y[0], run.plc.y_out[0]))
        self.assertTrue(any(y and not out for _, y, out in seen), "computed before it is sent")
        self.assertEqual(seen[-1][2], 1)

    def test_4_self_hold(self):
        run = learn.Runner(by_title(4))
        run.set_input("X000", 1)
        run.finish(0.1)
        run.set_input("X000", 0)
        run.finish(0.5)
        self.assertEqual(run.plc.y_out[0], 1)
        run.set_input("X001", 1)
        run.finish(0.1)
        run.set_input("X001", 0)
        run.finish(0.5)
        self.assertEqual(run.plc.y_out[0], 0)

    def sequence(self, number, start):
        run = learn.Runner(by_title(number))
        run.finish(0.1)
        run.set_input("X000", 1)
        run.finish(0.1)
        run.set_input("X000", 0)
        seen, same, last = [], 0, None
        for _ in range(450):
            run.finish(0.02)
            row = (run.plc.y_out[0], run.plc.y_out[1], run.plc.y_out[2])
            same = same + 1 if row == last else 1
            last = row
            # steady states only: the self-hold version has both outputs on for one scan at each change
            if same == 3 and (not seen or seen[-1] != row):
                seen.append(row)
        return seen

    def test_5_and_6_do_the_same_thing(self):
        order = [(1, 0, 0), (0, 1, 0), (0, 1, 1), (0, 0, 0)]
        self.assertEqual(self.sequence(5, 1)[-4:], order)
        self.assertEqual(self.sequence(6, 20)[-4:], order)

    def press_during_lift(self, number):
        run = learn.Runner(by_title(number))
        run.finish(0.1)
        run.set_input("X000", 1)
        run.finish(0.1)
        run.set_input("X000", 0)
        while not run.plc.y_out[2]:
            run.finish(0.02)
        run.finish(0.3)
        run.set_input("X000", 1)
        run.finish(0.1)
        run.set_input("X000", 0)
        run.finish(8)
        return run

    def test_5_x0_during_lift_jams_the_machine(self):
        run = self.press_during_lift(5)
        self.assertEqual((run.plc.y_out[0], run.plc.y_out[2]), (1, 1), "down and up together")
        self.assertEqual(run.plc.m[3], 0, "the upper limit never comes")

    def test_6_x0_during_lift_is_ignored(self):
        run = self.press_during_lift(6)
        self.assertEqual(run.plc.active_states(), [0])
        self.assertEqual((run.plc.y_out[0], run.plc.y_out[2]), (0, 0))

    def test_5_x0_during_vacuum_is_safe(self):
        run = learn.Runner(by_title(5))
        run.finish(0.1)
        run.set_input("X000", 1)
        run.finish(0.1)
        run.set_input("X000", 0)
        run.finish(2.5)
        self.assertEqual(run.plc.m[1], 1)
        run.set_input("X000", 1)
        run.finish(0.3)
        self.assertEqual(run.plc.y_out[0], 0)

    def outputs_seen(self, run):
        run.finish(0.1)
        run.set_input("X000", 1)
        run.finish(0.1)
        run.set_input("X000", 0)
        seen, same, last = [], 0, None
        for _ in range(450):
            run.finish(0.02)
            row = (run.plc.y_out[0], run.plc.y_out[1], run.plc.y_out[2])
            same = same + 1 if row == last else 1
            last = row
            if same == 3 and (not seen or seen[-1] != row):
                seen.append(row)
        return seen

    def test_6_1_inactive_step_is_skipped(self):
        run = learn.Runner(by_title("6-1"))
        run.finish(0.1)
        run.set_input("X001", 1)
        run.finish(0.1)
        run.set_input("X001", 0)
        self.assertEqual(run.plc.active_states(), [0])         # X1 lives in S20, which is not active
        run.set_input("X003", 1)
        run.finish(0.1)
        self.assertEqual(run.plc.y_out[2], 1)                  # ordinary rung runs every scan
        run.set_input("X003", 0)
        run.set_input("X000", 1)
        run.finish(0.1)
        run.set_input("X000", 0)
        run.set_input("X001", 1)
        run.finish(0.1)
        run.set_input("X001", 0)
        self.assertEqual(run.plc.active_states(), [21])
        self.assertEqual((run.plc.y_out[0], run.plc.y_out[1]), (0, 1))

    def test_6_2_same_coil_in_two_steps_and_set_stays(self):
        run = learn.Runner(by_title("6-2"))
        run.finish(0.1)
        run.set_input("X000", 1)
        run.finish(0.1)
        run.set_input("X000", 0)
        run.finish(1.0)
        self.assertEqual((run.plc.active_states(), run.plc.y_out[0]), ([20], 1))
        run.finish(1.5)
        self.assertEqual((run.plc.active_states(), run.plc.y_out[0]), ([21], 1))
        run.finish(1.5)
        self.assertEqual((run.plc.active_states(), run.plc.y_out[0], run.plc.y_out[2]), ([22], 0, 1))
        run.set_input("X001", 1)
        run.finish(0.1)
        run.set_input("X001", 0)
        self.assertEqual((run.plc.active_states(), run.plc.y_out[2]), ([0], 1))  # SET stays after leaving the step
        run.set_input("X002", 1)
        run.finish(0.1)
        self.assertEqual(run.plc.y_out[2], 0)

    def test_6_3_register_version_does_the_same(self):
        order = [(1, 0, 0), (0, 1, 0), (0, 1, 1), (0, 0, 0)]
        self.assertEqual(self.outputs_seen(learn.Runner(by_title("6-3")))[-4:], order)

    def test_6_3_x0_during_lift_is_ignored(self):
        run = self.press_during_lift("6-3")
        self.assertEqual(run.plc.d[0], 0)
        self.assertEqual((run.plc.y_out[0], run.plc.y_out[2]), (0, 0))

    def test_6_4_conversion_keeps_the_behaviour(self):
        lesson = by_title("6-4")
        order = [(1, 0, 0), (0, 1, 0), (0, 1, 1), (0, 0, 0)]
        before = learn.Runner(dict(lesson, il=lesson["stages"]["before"]))
        after = learn.Runner(dict(lesson, il=lesson["stages"]["after"]))
        self.assertEqual(self.outputs_seen(before)[-4:], order)
        self.assertEqual(self.outputs_seen(after)[-4:], order)

    def test_a2_timer_resets_and_times_three_seconds(self):
        run = learn.Runner(by_title("A2"))
        run.set_input("X000", 1)
        run.finish(2.0)
        self.assertEqual(run.plc.y_out[0], 0)
        run.set_input("X000", 0)
        run.finish(0.1)
        self.assertEqual(lv.word(run.plc, "T0"), 0)
        run.set_input("X000", 1)
        run.finish(3.1)
        self.assertEqual(run.plc.y_out[0], 1)

    def test_a2_flash_period_is_one_second(self):
        run = learn.Runner(by_title("A2"))
        changes, last = 0, 0
        for _ in range(250):
            run.finish(0.02)
            if run.plc.y_out[1] != last:
                changes += 1
                last = run.plc.y_out[1]
        self.assertIn(changes, (9, 10, 11))           # 5 s, a change every 0.5 s

    def test_timer_coil_is_on_while_counting(self):
        """The coil and the contact are different things. The monitor must show the coil."""
        run = learn.Runner(by_title("A8"))
        run.finish(0.1)
        run.set_input("X000", 1)
        run.finish(0.1)
        run.set_input("X000", 0)
        run.finish(0.5)
        rung = next(r for r in run.rungs if isinstance(r, lv.Rung) and ("OUT", ["T0", "K30"]) in r.outputs)
        self.assertTrue(lv.coil_on(run.plc, rung, ["T0", "K30"]), "counting: coil on")
        self.assertEqual(run.plc.t_on[0], 0, "not yet time: contact open")

    def test_a4_set_stays_after_release(self):
        run = learn.Runner(by_title("A4"))
        run.set_input("X000", 1)
        run.finish(0.1)
        run.set_input("X000", 0)
        run.finish(1.0)
        self.assertEqual((run.plc.y_out[0], run.plc.y_out[1]), (0, 1))
        run.set_input("X001", 1)
        run.finish(0.1)
        self.assertEqual(run.plc.y_out[1], 0)

    def test_a4_pulse_is_on_in_the_same_scan(self):
        run = learn.Runner(by_title("A4"))
        run.plc.scan(20)
        run.set_input("X002", 1)
        run.plc.scan(20)
        self.assertEqual((run.plc.m[0], run.plc.d[0]), (1, 1))     # same scan
        run.plc.scan(20)
        self.assertEqual((run.plc.m[0], run.plc.d[0]), (0, 1))     # one scan only
        run.set_input("X002", 0)
        run.plc.scan(20)
        self.assertEqual((run.plc.m[1], run.plc.d[1]), (1, 1))
        run.plc.scan(20)
        self.assertEqual(run.plc.m[1], 0)

    def test_a6_without_pls_counts_every_scan(self):
        run = learn.Runner(by_title("A6"))
        run.finish(5.0)
        self.assertEqual(run.plc.d[0], 1)
        self.assertIn(run.plc.d[1], (5, 6))
        self.assertGreater(run.plc.d[2], 50)

    def test_a6_clock_is_half_a_second_each(self):
        run = learn.Runner(by_title("A6"))
        run.finish(0.02)
        on = sum(1 for _ in range(100) if (run.finish(0.02) or run.plc.y_out[1]))
        self.assertAlmostEqual(on, 50, delta=6)

    def test_a7_stays_in_s0_without_x0(self):
        run = learn.Runner(by_title("A7"))
        run.finish(3.0)
        self.assertEqual(run.plc.active_states(), [0])

    def test_a3_counter_counts_edges_and_holds(self):
        run = learn.Runner(by_title("A3"))
        for _ in range(3):
            run.set_input("X000", 1)
            run.finish(0.2)
            run.set_input("X000", 0)
            run.finish(0.1)
        self.assertEqual((lv.word(run.plc, "C0"), run.plc.y_out[0]), (3, 1))
        run.set_input("X001", 1)
        run.finish(0.1)
        self.assertEqual((lv.word(run.plc, "C0"), run.plc.y_out[0]), (0, 0))

    def test_a4_pulses(self):
        run = learn.Runner(by_title("A4"))
        run.set_input("X002", 1)
        run.finish(0.5)
        self.assertEqual((run.plc.d[0], run.plc.d[1]), (1, 0))
        run.set_input("X002", 0)
        run.finish(0.1)
        self.assertEqual((run.plc.d[0], run.plc.d[1]), (1, 1))

    def test_a5_numbers(self):
        run = learn.Runner(by_title("A5"))
        for _ in range(3):
            run.set_input("X000", 1)
            run.finish(0.1)
            run.set_input("X000", 0)
            run.finish(0.1)
        self.assertEqual((run.plc.d[0], run.plc.y_out[0]), (30, 1))
        run.set_input("X002", 1)
        run.finish(0.1)
        self.assertEqual(run.plc.d[1], 16)

    def test_a6_first_scan_and_seconds(self):
        run = learn.Runner(by_title("A6"))
        run.finish(5.0)
        self.assertEqual(run.plc.d[0], 1)
        self.assertIn(run.plc.d[1], (5, 6))

    def test_a7_only_one_branch(self):
        for x1, state in ((1, 21), (0, 22)):
            run = learn.Runner(by_title("A7"))
            run.finish(0.1)
            run.set_input("X001", x1)
            run.set_input("X000", 1)
            run.finish(0.1)
            run.set_input("X000", 0)
            run.finish(1.7)
            self.assertEqual(run.plc.active_states(), [state])

    def test_a8_timeout_stops_everything_and_reset_returns(self):
        run = learn.Runner(by_title("A8"))
        run.finish(0.1)
        run.set_input("X000", 1)
        run.finish(0.1)
        run.set_input("X000", 0)
        run.finish(3.3)
        self.assertEqual((run.plc.m[3], run.plc.active_states(), run.plc.y_out[0], run.plc.y_out[1]), (1, [], 0, 1))
        run.set_input("X002", 1)
        run.finish(0.1)
        run.set_input("X002", 0)
        run.finish(0.1)
        self.assertEqual((run.plc.m[3], run.plc.active_states(), run.plc.y_out[1]), (0, [0], 0))

    def test_a9_broken_wire_stops_the_motor(self):
        run = learn.Runner(by_title("A9"))
        self.assertEqual(run.get_input("X001"), 1)
        run.set_input("X000", 1)
        run.finish(0.1)
        run.set_input("X000", 0)
        run.finish(0.1)
        self.assertEqual(run.plc.y_out[0], 1)
        run.set_input("X001", 0)              # a broken wire looks exactly like pressing the button
        run.finish(0.1)
        self.assertEqual(run.plc.y_out[0], 0)

    def test_a9_contrast_lesson_4_wiring_ignores_a_broken_wire(self):
        run = learn.Runner(by_title("4"))
        run.set_input("X000", 1)
        run.finish(0.1)
        run.set_input("X000", 0)
        run.finish(0.1)
        run.set_input("X001", 0)              # a normally open stop button with a cut wire reads OFF, as always
        run.finish(0.5)
        self.assertEqual(run.plc.y_out[0], 1, "this is why the emergency stop is wired normally closed")

    def test_vendor_table_is_filled(self):
        rows = by_title("6-3")["table"]["rows"]
        self.assertEqual(len({r[0] for r in rows}), len(rows))
        self.assertTrue(all(all(cell for cell in r) for r in rows))

    def test_6_one_step_at_a_time(self):
        run = learn.Runner(by_title(6))
        run.finish(0.1)
        run.set_input("X000", 1)
        for _ in range(200):
            run.finish(0.02)
            self.assertEqual(len(run.plc.active_states()), 1)

    def test_7_two_steps_at_once(self):
        run = learn.Runner(by_title(7))
        run.finish(0.1)
        run.set_input("X000", 1)
        run.finish(0.2)
        run.set_input("X000", 0)
        self.assertEqual(run.plc.active_states(), [20, 40])
        run.finish(1.6)
        self.assertEqual(run.plc.active_states(), [21, 40])

    def test_8_last_coil_wins(self):
        run = learn.Runner(by_title(8))
        run.set_input("X000", 1)
        run.finish(0.1)
        self.assertEqual(run.plc.y_out[0], 0)
        run.set_input("X000", 0)
        run.set_input("X001", 1)
        run.finish(0.1)
        self.assertEqual(run.plc.y_out[0], 1)

    def test_9_interlock_first_come_first_served(self):
        run = learn.Runner(by_title(9))
        run.set_input("X000", 1)
        run.finish(0.1)
        run.set_input("X001", 1)
        run.finish(0.1)
        self.assertEqual((run.plc.y_out[0], run.plc.y_out[1]), (1, 0))
        run.set_input("X000", 0)
        run.finish(0.1)
        self.assertEqual((run.plc.y_out[0], run.plc.y_out[1]), (0, 1))

    def test_10_interlock_blocks_the_wish(self):
        run = learn.Runner(by_title(10))
        run.finish(0.1)
        run.set_input("X003", 0)
        run.set_input("X000", 1)
        run.finish(0.2)
        run.set_input("X000", 0)
        run.finish(0.5)
        self.assertEqual((run.plc.m[54], run.plc.y_out[0]), (1, 0))
        run.set_input("X003", 1)
        run.finish(0.1)
        self.assertEqual(run.plc.y_out[0], 1)


if __name__ == "__main__":
    unittest.main()
