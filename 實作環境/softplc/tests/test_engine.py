# -*- coding: utf-8 -*-
"""Instruction semantics, CSV reader and the FX computer link protocol."""
import os
import socket
import sys
import threading
import time
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))

import fx_server as cl                              # noqa: E402
from plc_csv import LadderError, check_program, instruction_steps, load_csv  # noqa: E402
from plc_engine import PLC                              # noqa: E402


def program(text):
    out, step = [], 0
    for line in text.strip().splitlines():
        w = line.split()
        if not w:
            continue
        out.append((step, w[0], w[1:]))
        step += instruction_steps(w[0], w[1:])
    return out


def plc(text):
    return PLC(program(text + "\nEND"))


class Csv(unittest.TestCase):
    def test_school_sample(self):
        rows = load_csv(os.path.join(HERE, "SCHOOL_TEST.csv"))
        errors, total = check_program(rows)
        self.assertEqual(errors, [])
        self.assertEqual(total, 26)
        self.assertEqual(rows[1], (1, "MOV", ["K3", "D0"]))
        self.assertEqual(rows[-1], (25, "END", []))

    def test_school_sample_runs(self):
        p = PLC(load_csv(os.path.join(HERE, "SCHOOL_TEST.csv")))
        p.set_x(0, 1)
        p.scan()
        self.assertEqual((p.d[0], p.d[100], p.get_y(0)), (3, 1234, 1))

    def test_step_sizes(self):
        for op, ops, n in (("LD", ["X000"], 1), ("OUT", ["Y000"], 1), ("OUT", ["T0", "K5"], 3),
                           ("MOV", ["K1", "D0"], 5), ("ADD", ["D0", "D1", "D2"], 7), ("INC", ["D0"], 3),
                           ("CMP", ["D0", "D1", "M0"], 7), ("ZCP", ["K0", "K1", "D0", "M0"], 9),
                           ("LD=", ["D0", "K1"], 5), ("PLS", ["M0"], 2), ("END", [], 1)):
            self.assertEqual(instruction_steps(op, ops), n, op)

    def test_rejects_other_instructions(self):
        with self.assertRaises(LadderError):
            PLC([(0, "DIV", ["D0", "D1", "D2"]), (7, "END", [])])
        with self.assertRaises(LadderError):
            PLC([(0, "LD", ["M8011"]), (1, "OUT", ["Y000"]), (2, "END", [])])


class Instructions(unittest.TestCase):
    def test_contacts(self):
        p = plc("LD X000\nAND X001\nOUT Y000\nLDI X000\nOUT Y001\nLD X000\nANI X001\nOUT Y002\n"
                "LD X000\nOR X001\nOUT Y003\nLD X000\nORI X001\nOUT Y004")
        p.set_x(0, 1)
        p.scan()
        self.assertEqual([p.get_y(i) for i in range(5)], [0, 0, 1, 1, 1])

    def test_blocks(self):
        p = plc("LD X000\nAND X001\nLD X002\nAND X003\nORB\nOUT Y000\n"
                "LD X000\nOR X001\nLD X002\nOR X003\nANB\nOUT Y001")
        p.set_x(0, 1)
        p.set_x(2, 1)
        p.scan()
        self.assertEqual((p.get_y(0), p.get_y(1)), (0, 1))

    def test_mps(self):
        p = plc("LD X000\nMPS\nAND X001\nOUT Y000\nMRD\nAND X002\nOUT Y001\nMPP\nOUT Y002")
        p.set_x(0, 1)
        p.set_x(2, 1)
        p.scan()
        self.assertEqual([p.get_y(i) for i in range(3)], [0, 1, 1])

    def test_set_rst_pulses(self):
        p = plc("LD X000\nSET M0\nLD X001\nRST M0\nLD X000\nPLS M1\nLD X000\nPLF M2")
        p.set_x(0, 1)
        p.scan()
        self.assertEqual((p.m[0], p.m[1], p.m[2]), (1, 1, 0))
        p.scan()
        self.assertEqual(p.m[1], 0)
        p.set_x(0, 0)
        p.scan()
        self.assertEqual(p.m[2], 1)
        p.scan()
        self.assertEqual(p.m[2], 0)
        p.set_x(1, 1)
        p.scan()
        self.assertEqual(p.m[0], 0)

    def test_arithmetic(self):
        p = plc("LD M8002\nMOV K7 D0\nMOV K5 D1\nLD M8000\nADD D0 D1 D2\nSUB D0 D1 D3\n"
                "CMP D0 D1 M0\nZCP K1 K6 D0 M3\nLD M8002\nINC D4")
        p.scan()
        p.scan()
        self.assertEqual(p.d[2:5], [12, 2, 1])
        self.assertEqual(p.m[0:3], [1, 0, 0])
        self.assertEqual(p.m[3:6], [0, 0, 1])

    def test_16bit_wrap(self):
        p = plc("LD M8000\nADD K32767 K1 D0\nSUB K-32768 K1 D1")
        p.scan()
        self.assertEqual(p.d[0:2], [-32768, 32767])

    def test_compare_contacts(self):
        p = plc("LD M8002\nMOV K5 D0\nLD= D0 K5\nOUT M0\nLD> D0 K5\nOUT M1\nLD< D0 K6\nOUT M2\n"
                "LD>= D0 K5\nOUT M3\nLD<= D0 K4\nOUT M4\nLD M8000\nAND= D0 K5\nOUT M5\nLD= D0 K4\nOR= D0 K5\nOUT M6")
        p.scan()
        self.assertEqual(p.m[0:7], [1, 0, 1, 1, 0, 1, 1])

    def test_timer_and_counter(self):
        p = plc("LD X000\nOUT T0 K3\nLD T0\nOUT Y000\nLD X001\nOUT C0 K2\nLD C0\nOUT Y001\nLD X002\nRST C0")
        p.set_x(0, 1)
        p.run(290)
        self.assertEqual(p.get_y(0), 0)
        p.run(20)
        p.scan()
        self.assertEqual(p.get_y(0), 1)
        p.set_x(0, 0)
        p.scan()
        p.scan()
        self.assertEqual((p.get_y(0), p.t_acc[0]), (0, 0))
        for _ in range(2):
            p.set_x(1, 1)
            p.scan()
            p.set_x(1, 0)
            p.scan()
        self.assertEqual(p.get_y(1), 1)
        p.set_x(2, 1)
        p.scan()
        self.assertEqual(p.c_val[0], 0)

    def test_timer_value_compare_and_d_preset(self):
        p = plc("LD M8002\nMOV K2 D0\nLD M8000\nOUT T1 D0\nLD>= T1 K1\nOUT M0\nLD T1\nOUT M1")
        p.run(120)
        self.assertEqual((p.m[0], p.m[1]), (1, 0))
        p.run(100)
        self.assertEqual(p.m[1], 1)

    def test_bit_words(self):
        p = plc("LD M8002\nMOV K21 K2M10\nLD M8000\nMOV K2M10 D0\nMOV K1M10 D1")
        p.scan()
        self.assertEqual(p.d[0:2], [21, 5])

    def test_clocks(self):
        p = plc("LD M8000\nOUT M0")
        seen = set()
        for _ in range(20):
            p.scan()
            seen.add(p.m[8012])
        self.assertEqual(seen, {0, 1})

    def test_scan_order(self):
        p = plc("LD X000\nOUT Y000")
        p.set_x(0, 1)
        self.assertEqual(p.get_y(0), 0)   # input is only read at the next scan
        p.scan()
        self.assertEqual(p.get_y(0), 1)


class Stl(unittest.TestCase):
    TEXT = """
LD M8002
SET S0
STL S0
LD M1
SET S10
STL S10
OUT Y000
OUT T0 K5
LD T0
SET S11
STL S11
OUT Y000
OUT Y001
LD X000
SET S0
RET
LD S11
OUT Y002
"""

    def test_transfer_and_coils(self):
        p = plc(self.TEXT)
        p.scan()
        self.assertEqual(p.active_states(), [0])
        p.m[1] = 1
        p.scan()
        self.assertEqual(p.active_states(), [10])
        p.m[1] = 0
        p.scan()
        self.assertEqual(p.get_y(0), 1)
        p.run(600)
        self.assertEqual(p.active_states(), [11])
        self.assertEqual((p.get_y(0), p.get_y(1), p.get_y(2)), (1, 1, 1))
        p.set_x(0, 1)
        p.run(30)
        self.assertEqual(p.active_states(), [0])
        self.assertEqual((p.get_y(0), p.get_y(1), p.get_y(2)), (0, 0, 0))

    def test_timer_drops_when_state_left(self):
        p = plc(self.TEXT)
        p.scan()
        p.m[1] = 1
        p.run(700)
        p.m[1] = 0
        self.assertEqual(p.t_acc[0], 0)

    def test_parallel_branches(self):
        p = plc("""
LD M8002
SET S0
STL S0
LD M1
SET S20
SET S40
STL S20
OUT Y000
STL S40
OUT Y001
RET
""")
        p.scan()
        p.m[1] = 1
        p.run(30)
        self.assertEqual(p.active_states(), [20, 40])
        self.assertEqual((p.get_y(0), p.get_y(1)), (1, 1))

    def test_zrst_turns_coils_off(self):
        p = plc("""
LD M8002
SET S5
STL S5
OUT Y000
RET
LD M1
ZRST S0 S59
""")
        p.run(30)
        self.assertEqual(p.get_y(0), 1)
        p.m[1] = 1
        p.run(30)
        self.assertEqual((p.active_states(), p.get_y(0)), ([], 0))

    def test_same_coil_in_two_states(self):
        p = plc("""
LD M8002
SET S1
STL S1
OUT Y000
LD M1
SET S2
STL S2
LD M2
SET S3
STL S3
OUT Y000
RET
""")
        p.run(30)
        self.assertEqual(p.get_y(0), 1)
        p.m[1] = 1
        p.run(30)
        self.assertEqual(p.get_y(0), 0)
        p.m[2] = 1
        p.run(30)
        self.assertEqual(p.get_y(0), 1)

    def test_set_inside_stl_on_m_is_not_a_transfer(self):
        p = plc("""
LD M8002
SET S1
STL S1
SET M5
RET
""")
        p.run(30)
        self.assertEqual((p.active_states(), p.m[5]), ([1], 1))

    def test_bad_programs(self):
        for text in ("STL S1\nEND", "STL M1\nRET\nEND", "RET\nEND", "LD M1\nOUT S1\nEND"):
            with self.assertRaises(LadderError, msg=text):
                PLC(program(text))
        self.assertEqual(instruction_steps("SET", ["S1"]), 2)
        self.assertEqual(instruction_steps("ZRST", ["M0", "M9"]), 5)
        self.assertEqual(instruction_steps("STL", ["S1"]), 1)


class Protocol(unittest.TestCase):
    """FX programming protocol over TCP."""
    @classmethod
    def setUpClass(cls):
        cls.p = plc("LD X000\nOUT Y001\nLD M8000\nOUT M9")
        cls.server = cl.LinkServer(cls.p, port=5599)
        cls.server.start()
        cls.stop = threading.Event()

        def scan():
            while not cls.stop.is_set():
                cls.p.scan()
                cls.server.service()
                time.sleep(0.002)
        threading.Thread(target=scan, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.stop.set()
        cls.server.stop()

    def setUp(self):
        self.s = socket.create_connection(("127.0.0.1", 5599), timeout=2)

    def tearDown(self):
        self.s.close()

    def ask(self, frame, n):
        self.s.sendall(frame)
        got = b""
        while len(got) < n:
            got += self.s.recv(4096)
        return got

    def test_enq(self):
        self.assertEqual(self.ask(b"\x05", 1), b"\x06")

    def test_read_frame_is_byte_exact(self):
        # read D100, two bytes: 1000h + 200 = 10C8h
        self.assertEqual(cl.build(b"0", 0x10C8, count=2), b"\x02" + b"010C802\x03" + b"71")

    def test_write_then_read_low_byte_first(self):
        self.assertEqual(self.ask(cl.build(b"1", 0x10C8, bytes([0x34, 0x12])), 1), b"\x06")
        self.assertEqual(self.p.d[100], 0x1234)
        self.assertEqual(self.ask(cl.build(b"0", 0x10C8, count=2), 8), cl.reply_frame(bytes([0x34, 0x12])))

    def test_negative_word(self):
        self.ask(cl.build(b"1", 0x1000 + 2 * 50, bytes([0xFF, 0xFF])), 1)
        self.assertEqual(self.p.d[50], -1)

    def test_sum_error(self):
        frame = bytearray(cl.build(b"0", 0x10C8, count=2))
        frame[-1] ^= 1
        self.assertEqual(self.ask(bytes(frame), 1), b"\x15")

    def test_address_outside_d(self):
        self.assertEqual(self.ask(cl.build(b"0", 0x0800, count=2), 1), b"\x15")

    def test_more_than_64_bytes_refused(self):
        self.assertEqual(self.ask(cl.build(b"0", 0x1000, count=66), 1), b"\x15")

    def test_split_frame(self):
        frame = cl.build(b"0", 0x10C8, count=2)
        self.s.sendall(frame[:4])
        time.sleep(0.03)
        self.assertEqual(len(self.ask(frame[4:], 8)), 8)


if __name__ == "__main__":
    unittest.main()
