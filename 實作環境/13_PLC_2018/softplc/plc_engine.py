# -*- coding: utf-8 -*-
"""Soft PLC engine: executes the instruction list loaded from AOI_PLC.csv.

Scan order: read inputs -> execute -> write outputs. Communication is handled by
the caller after scan() returns, so a request is only answered at the end of a scan.
All time comes from the dt_ms argument, which lets tests run faster than real time.
"""
import re

from plc_csv import COMPARE_RE, check_program, LadderError

M_SIZE = 8256
D_SIZE = 8000


def wrap16(v):
    return ((int(v) + 0x8000) & 0xFFFF) - 0x8000


class PLC(object):
    def __init__(self, program, scan_ms=10):
        errors, self.total_steps = check_program(program)
        if errors:
            raise LadderError("; ".join(errors[:10]))
        self.scan_ms = scan_ms
        self.x_in = [0] * 256       # physical inputs, set from outside
        self.y_out = [0] * 256      # physical outputs, read from outside
        self.x = [0] * 256
        self.y = [0] * 256
        self.m = [0] * M_SIZE
        self.d = [0] * D_SIZE
        self.t_acc = [0] * 256      # accumulated ms
        self.t_on = [0] * 256       # timer contact
        self.c_val = [0] * 256
        self.c_on = [0] * 256
        self.clock_ms = 0
        self.scans = 0
        self.acc = 0
        self.blocks = []
        self.mps = []
        self.fresh = True
        self.code = [self._compile(op, ops, i) for i, (_, op, ops) in enumerate(program)]
        self._edge = [0] * len(program)
        self._dt = scan_ms
        self.stopped = False

    # ---- public helpers -------------------------------------------------
    def set_x(self, n, value):
        self.x_in[int(str(n), 8)] = 1 if value else 0

    def get_y(self, n):
        return self.y_out[int(str(n), 8)]

    def run(self, ms):
        """Advance simulated time (tests)."""
        for _ in range(int(ms // self.scan_ms)):
            self.scan(self.scan_ms)

    def scan(self, dt_ms=None):
        self._dt = self.scan_ms if dt_ms is None else dt_ms
        # read inputs
        self.x[:] = self.x_in
        # special relays
        self.m[8000] = 1
        self.m[8002] = 1 if self.scans == 0 else 0
        self.m[8012] = 1 if (self.clock_ms % 100) < 50 else 0
        self.m[8013] = 1 if (self.clock_ms % 1000) < 500 else 0
        # execute
        self.acc = 0
        self.blocks = []
        self.mps = []
        self.fresh = True
        for fn in self.code:
            if fn():
                break
        # write outputs
        self.y_out[:] = self.y
        self.scans += 1
        self.clock_ms += self._dt

    # ---- operands -------------------------------------------------------
    def _bit_get(self, name):
        kind, n = self._split(name)
        if kind == "X":
            return lambda: self.x[n]
        if kind == "Y":
            return lambda: self.y[n]
        if kind == "M":
            return lambda: self.m[n]
        if kind == "T":
            return lambda: self.t_on[n]
        if kind == "C":
            return lambda: self.c_on[n]
        raise LadderError("bad bit device %s" % name)

    def _bit_set(self, name):
        kind, n = self._split(name)
        if kind == "Y":
            def put(v):
                self.y[n] = v
            return put
        if kind == "M":
            def put(v):
                self.m[n] = v
            return put
        raise LadderError("cannot write bit device %s" % name)

    @staticmethod
    def _split(name):
        m = re.match(r"^([XYMTC])(\d+)$", name)
        if not m:
            raise LadderError("bad device %s" % name)
        kind, digits = m.group(1), m.group(2)
        return kind, int(digits, 8) if kind in "XY" else int(digits)

    def _word_get(self, name):
        m = re.match(r"^K(-?\d+)$", name)
        if m and not re.match(r"^K\d[XYM]", name):
            value = wrap16(int(m.group(1)))
            return lambda: value
        m = re.match(r"^H([0-9A-Fa-f]+)$", name)
        if m:
            value = wrap16(int(m.group(1), 16))
            return lambda: value
        m = re.match(r"^D(\d+)$", name)
        if m:
            n = int(m.group(1))
            return lambda: self.d[n]
        m = re.match(r"^T(\d+)$", name)
        if m:
            n = int(m.group(1))
            return lambda: min(self.t_acc[n] // 100, 32767)
        m = re.match(r"^C(\d+)$", name)
        if m:
            n = int(m.group(1))
            return lambda: self.c_val[n]
        m = re.match(r"^K([1-4])([XYM])(\d+)$", name)
        if m:
            bits, kind, start = int(m.group(1)) * 4, m.group(2), m.group(3)
            start = int(start, 8) if kind in "XY" else int(start)
            table = {"X": self.x, "Y": self.y, "M": self.m}[kind]

            def read():
                v = 0
                for i in range(bits):
                    if table[start + i]:
                        v |= 1 << i
                return wrap16(v)
            return read
        raise LadderError("bad word operand %s" % name)

    def _word_set(self, name):
        m = re.match(r"^D(\d+)$", name)
        if m:
            n = int(m.group(1))

            def put(v):
                self.d[n] = wrap16(v)
            return put
        m = re.match(r"^K([1-4])([YM])(\d+)$", name)
        if m:
            bits, kind, start = int(m.group(1)) * 4, m.group(2), m.group(3)
            start = int(start, 8) if kind == "Y" else int(start)
            table = self.y if kind == "Y" else self.m

            def put(v):
                for i in range(bits):
                    table[start + i] = (v >> i) & 1
            return put
        raise LadderError("cannot write word operand %s" % name)

    # ---- instructions ---------------------------------------------------
    def _load(self, value):
        if self.fresh and not self.blocks:
            self.acc = value
        else:
            self.blocks.append(self.acc)
            self.acc = value
        self.fresh = False

    def _compile(self, op, ops, index):
        compare = COMPARE_RE.match(op)
        if compare:
            return self._compile_compare(compare.group(1), compare.group(2), ops)
        if op in ("LD", "LDI", "AND", "ANI", "OR", "ORI"):
            get = self._bit_get(ops[0])
            if op == "LD":
                def fn():
                    self._load(1 if get() else 0)
            elif op == "LDI":
                def fn():
                    self._load(0 if get() else 1)
            elif op == "AND":
                def fn():
                    self.acc = 1 if self.acc and get() else 0
            elif op == "ANI":
                def fn():
                    self.acc = 1 if self.acc and not get() else 0
            elif op == "OR":
                def fn():
                    self.acc = 1 if self.acc or get() else 0
            else:
                def fn():
                    self.acc = 1 if self.acc or not get() else 0
            return fn
        if op == "ANB":
            def fn():
                self.acc = 1 if self.blocks.pop() and self.acc else 0
            return fn
        if op == "ORB":
            def fn():
                self.acc = 1 if self.blocks.pop() or self.acc else 0
            return fn
        if op == "MPS":
            def fn():
                self.mps.append(self.acc)
            return fn
        if op == "MRD":
            def fn():
                self.acc = self.mps[-1]
                self.fresh = False
            return fn
        if op == "MPP":
            def fn():
                self.acc = self.mps.pop()
                self.fresh = False
            return fn
        if op == "END":
            return lambda: True
        if op == "OUT":
            return self._compile_out(ops, index)
        if op in ("SET", "RST"):
            return self._compile_set_rst(op, ops[0])
        if op in ("PLS", "PLF"):
            put = self._bit_set(ops[0])
            rising = op == "PLS"

            def fn():
                now = self.acc
                before = self._edge[index]
                self._edge[index] = now
                put(1 if (now and not before if rising else before and not now) else 0)
                self.fresh = True
            return fn
        if op == "MOV":
            get, put = self._word_get(ops[0]), self._word_set(ops[1])

            def fn():
                if self.acc:
                    put(get())
                self.fresh = True
            return fn
        if op in ("ADD", "SUB"):
            a, b, put = self._word_get(ops[0]), self._word_get(ops[1]), self._word_set(ops[2])
            sign = 1 if op == "ADD" else -1

            def fn():
                if self.acc:
                    put(wrap16(a() + sign * b()))
                self.fresh = True
            return fn
        if op == "INC":
            get, put = self._word_get(ops[0]), self._word_set(ops[0])

            def fn():
                if self.acc:
                    put(wrap16(get() + 1))
                self.fresh = True
            return fn
        if op == "CMP":
            a, b = self._word_get(ops[0]), self._word_get(ops[1])
            kind, n = self._split(ops[2])
            if kind != "M":
                raise LadderError("CMP result must be M")

            def fn():
                if self.acc:
                    x, y = a(), b()
                    self.m[n], self.m[n + 1], self.m[n + 2] = int(x > y), int(x == y), int(x < y)
                self.fresh = True
            return fn
        if op == "ZCP":
            lo, hi, s = self._word_get(ops[0]), self._word_get(ops[1]), self._word_get(ops[2])
            kind, n = self._split(ops[3])
            if kind != "M":
                raise LadderError("ZCP result must be M")

            def fn():
                if self.acc:
                    v = s()
                    self.m[n] = int(v < lo())
                    self.m[n + 1] = int(lo() <= v <= hi())
                    self.m[n + 2] = int(v > hi())
                self.fresh = True
            return fn
        raise LadderError("not implemented: %s" % op)

    def _compile_compare(self, base, relation, ops):
        a, b = self._word_get(ops[0]), self._word_get(ops[1])
        test = {"=": lambda x, y: x == y, "<>": lambda x, y: x != y, ">": lambda x, y: x > y,
                "<": lambda x, y: x < y, ">=": lambda x, y: x >= y, "<=": lambda x, y: x <= y}[relation]
        if base == "LD":
            def fn():
                self._load(1 if test(a(), b()) else 0)
        elif base == "AND":
            def fn():
                self.acc = 1 if self.acc and test(a(), b()) else 0
        else:
            def fn():
                self.acc = 1 if self.acc or test(a(), b()) else 0
        return fn

    def _compile_out(self, ops, index):
        name = ops[0]
        if name[0] == "T":
            n = int(name[1:])
            k = self._word_get(ops[1])

            def fn():
                if self.acc:
                    self.t_acc[n] = min(self.t_acc[n] + self._dt, 3276700)
                    self.t_on[n] = 1 if self.t_acc[n] // 100 >= k() else 0
                else:
                    self.t_acc[n] = 0
                    self.t_on[n] = 0
                self.fresh = True
            return fn
        if name[0] == "C":
            n = int(name[1:])
            k = self._word_get(ops[1])

            def fn():
                now = self.acc
                if now and not self._edge[index]:
                    self.c_val[n] = min(self.c_val[n] + 1, 32767)
                self._edge[index] = now
                self.c_on[n] = 1 if self.c_val[n] >= k() else 0
                self.fresh = True
            return fn
        put = self._bit_set(name)

        def fn():
            put(self.acc)
            self.fresh = True
        return fn

    def _compile_set_rst(self, op, name):
        if op == "RST" and name[0] == "T":
            n = int(name[1:])

            def fn():
                if self.acc:
                    self.t_acc[n] = 0
                    self.t_on[n] = 0
                self.fresh = True
            return fn
        if op == "RST" and name[0] == "C":
            n = int(name[1:])

            def fn():
                if self.acc:
                    self.c_val[n] = 0
                    self.c_on[n] = 0
                self.fresh = True
            return fn
        if op == "RST" and name[0] == "D":
            n = int(name[1:])

            def fn():
                if self.acc:
                    self.d[n] = 0
                self.fresh = True
            return fn
        put = self._bit_set(name)
        value = 1 if op == "SET" else 0

        def fn():
            if self.acc:
                put(value)
            self.fresh = True
        return fn
