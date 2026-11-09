# -*- coding: utf-8 -*-
"""Instruction semantics, CSV reader and FX protocol."""
import os
import socket
import sys
import threading
import time
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))

import fx_server                                        # noqa: E402
from plc_csv import LadderError, check_program, instruction_steps, load_csv  # noqa: E402
from plc_engine import PLC                              # noqa: E402


def program(text):
    out, step = [], 0
    for line in text.strip().splitlines():
        w = line.split()
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


class Protocol(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.p = plc("LD X000\nOUT Y001\nLD M8000\nOUT M9")
        cls.p.set_x(0, 1)
        cls.server = fx_server.FxServer(cls.p, port=5599)
        cls.server.start()
        cls.stop = threading.Event()

        def scan():
            while not cls.stop.is_set():
                cls.p.scan()
                cls.server.service()
                time.sleep(0.002)
        threading.Thread(target=scan, daemon=True).start()
        cls.s = socket.create_connection(("127.0.0.1", 5599), timeout=2)

    @classmethod
    def tearDownClass(cls):
        cls.stop.set()
        cls.s.close()
        cls.server.stop()

    def ask(self, payload, answer):
        self.s.sendall(payload)
        got = b""
        while len(got) < answer:
            got += self.s.recv(256)
        return got

    def test_enq(self):
        self.assertEqual(self.ask(b"\x05", 1), b"\x06")

    def test_write_read_d(self):
        self.assertEqual(self.ask(fx_server.frame(b"110C8023412"), 1), b"\x06")
        self.assertEqual(self.p.d[100], 0x1234)
        got = self.ask(fx_server.frame(b"010C802"), 8)
        self.assertEqual(got, fx_server.frame(b"3412"))

    def test_known_frame(self):
        # '0100002' + ETX: 30+31+30+30+30+30+32+03 = 156h, low byte 56
        self.assertEqual(fx_server.frame(b"0100002"), bytes.fromhex("02") + b"0100002" + b"\x03" + b"56")

    def test_read_negative(self):
        self.p.d[5] = -1
        self.assertEqual(self.ask(fx_server.frame(b"0100A02"), 8), fx_server.frame(b"FFFF"))

    def test_read_bits(self):
        self.assertEqual(self.ask(fx_server.frame(b"0008001"), 6), fx_server.frame(b"01"))
        self.assertEqual(self.ask(fx_server.frame(b"000A001"), 6), fx_server.frame(b"02"))
        self.assertEqual(self.ask(fx_server.frame(b"0010101"), 6), fx_server.frame(b"02"))

    def test_nak(self):
        self.assertEqual(self.ask(fx_server.frame(b"0700002"), 1), b"\x15")
        self.assertEqual(self.ask(fx_server.frame(b"1008002FF"[:7] + b"FFFF"), 1), b"\x15")
        self.assertEqual(self.ask(b"\x020100002\x0300", 1), b"\x15")


if __name__ == "__main__":
    unittest.main()
