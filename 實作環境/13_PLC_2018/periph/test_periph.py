# -*- coding: utf-8 -*-
"""Starts periph_sim.py and checks: ID chooses the defect and image, faults, scoring."""
import json
import os
import socket
import struct
import subprocess
import sys
import time
import unittest
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
MES = "http://127.0.0.1:18080"


def post(path, body):
    req = urllib.request.Request(MES + path, json.dumps(body).encode(), {"Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req, timeout=3).read())


class Periph(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.proc = subprocess.Popen([sys.executable, "-B", os.path.join(HERE, "periph_sim.py"), "--rate", "0",
                                     "--seed", "1", "--quiet"], stdin=subprocess.PIPE,
                                    stdout=subprocess.DEVNULL, text=True, encoding="utf-8")
        for _ in range(50):
            try:
                cls.cam = socket.create_connection(("127.0.0.1", 6040), timeout=2)
                break
            except OSError:
                time.sleep(0.1)
        cls.mot = socket.create_connection(("127.0.0.1", 5030), timeout=3)
        cls.motf = cls.mot.makefile("r")
        for c in ("SVON 1", "HOME"):
            cls.axis(c)
        for _ in range(200):
            if cls.axis("STAT?").split(",")[1] == "1":
                break
            time.sleep(0.05)

    @classmethod
    def tearDownClass(cls):
        cls.say("q")
        cls.cam.close()
        cls.mot.close()
        cls.proc.wait(5)

    @classmethod
    def say(cls, text):
        cls.proc.stdin.write(text + "\n")
        cls.proc.stdin.flush()
        time.sleep(0.1)

    @classmethod
    def axis(cls, text):
        cls.mot.sendall((text + "\n").encode())
        return cls.motf.readline().strip()

    def move(self, x):
        self.assertEqual(self.axis("MOVA %.1f 300" % x), "OK")
        for _ in range(100):
            if self.axis("STAT?").split(",")[3] == "1":
                return
            time.sleep(0.02)
        self.fail("no in-position")

    def grab(self, cmd):
        self.cam.sendall((cmd + "\n").encode())
        head = b""
        while len(head) < 4:
            head += self.cam.recv(4 - len(head))
        size = struct.unpack(">I", head)[0]
        data = b""
        while len(data) < size:
            data += self.cam.recv(min(65536, size - len(data)))
        status, w, h, frame, pid = struct.unpack(">BHHII", data[:13])
        return status, w, h, pid, data[13:]

    def pin_runs(self, image):
        row = image[120 * 320:121 * 320]
        runs, last = 0, False
        for v in row:
            on = v > 120
            if on and not last:
                runs += 1
            last = on
        return runs

    def test_1_good_then_missing_pin(self):
        self.move(110)
        status, w, h, pid, img = self.grab("TRIG 2001")
        self.assertEqual((status, w, h, pid, len(img)), (0, 320, 240, 2001, 76800))
        self.assertEqual(self.pin_runs(img), 8)
        self.say("n missing_pin")
        _, _, _, pid, img = self.grab("TRIG 2002")
        self.assertEqual(pid, 2002)
        self.assertEqual(self.pin_runs(img), 7)

    def test_2_same_id_same_truth(self):
        self.move(110)
        self.say("n missing_pin")
        _, _, _, _, img = self.grab("TRIG 2003")
        _, _, _, _, again = self.grab("TRIG 2003")
        self.assertEqual(self.pin_runs(again), self.pin_runs(img))

    def test_3_setid_then_plain_trig(self):
        self.cam.sendall(b"SETID 2004\n")
        self.assertEqual(self.grab("TRIG")[3], 2004)

    def test_4_cam_black(self):
        self.move(110)
        self.say("f cam_black")
        img = self.grab("TRIG 2005")[4]
        self.say("f none")
        self.assertLess(max(img), 40)

    def test_5_cam_timeout(self):
        self.say("f cam_timeout")
        self.cam.sendall(b"TRIG 2006\n")
        self.cam.settimeout(0.3)
        with self.assertRaises(socket.timeout):
            self.cam.recv(4)
        self.cam.settimeout(2)
        self.say("f none")

    def test_6_score(self):
        self.move(110)
        for pid, defect in ((3001, "good"), (3002, "good"), (3003, "stain"), (3004, "bent_pin")):
            self.say("n %s" % defect)
            self.grab("TRIG %d" % pid)
        self.assertTrue(post("/api/lot/start", {"lot": "L2610-001", "recipe": "CN-08"})["ok"])
        for pid, result in ((3001, "OK"), (3002, "NG"), (3003, "NG"), (3004, "OK")):
            self.assertTrue(post("/api/result", {"lot": "L2610-001", "part_id": pid, "result": result})["ok"])
        rep = json.loads(urllib.request.urlopen(MES + "/api/stats", timeout=3).read())["mes_report"]
        self.assertEqual((rep["reported"], rep["correct"], rep["escape"], rep["overkill"], rep["unknown_id"]),
                         (4, 2, 1, 1, 0))
        self.assertEqual((rep["ok"], rep["ng"]), (2, 2))


if __name__ == "__main__":
    unittest.main()
