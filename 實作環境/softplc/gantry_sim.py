# -*- coding: utf-8 -*-
"""Machine simulation: reads the PLC outputs, moves axes, cylinders and parts, sets the PLC inputs.
The ladder program has no simulation code in it, so the same program goes into the real PLC.

Axis position: 0 = front, 1000 = rear. Belt position: 0 = entry, 1000 = end stop.
Front belt runs left to right, rear belt right to left. A part is on 'front', 'rear', 'R' or 'L'
(held by a gantry) or 'lost' (dropped away from a belt).
"""
AXIS_MS = 2000.0            # one way
CYL_MS = 500.0
BELT_MM_S = 400.0
PART_GAP = 150.0
END_SENSOR = 950.0
POS_TOL = 8.0
OVERTRAVEL = 40.0           # LS1-LS4 stop the motor here


class Gantry(object):
    def __init__(self, axis, z=0.0):
        self.axis = axis
        self.z = z              # 0 up, 1 down
        self.valve = 0          # 4V220 keeps the last coil: -1 up, 1 down
        self.vacuum = False
        self.axis_stuck = False
        self.cyl_stuck = False


class Machine(object):
    def __init__(self, plc, board=True):
        self.plc = plc
        self.board = board               # False: 8-output version, the left valves share Y3, Y4
        self.left = Gantry(1000.0)       # left home is rear
        self.right = Gantry(0.0)         # right home is front
        self.parts = []
        self.next_id = 1
        self.placed = {"R": 0, "L": 0}
        self.buttons = {"X013": 1, "X010": 1}
        self.force = {}                  # {'X003': 0} sensor stuck, for fault tests
        self.apply_inputs()

    # ---- operator -----------------------------------------------------
    def add_part(self, belt="front", pos=0.0):
        part = {"id": self.next_id, "on": belt, "pos": float(pos)}
        self.next_id += 1
        self.parts.append(part)
        return part

    def press(self, name, value):
        self.buttons[name] = 1 if value else 0

    # ---- one scan -----------------------------------------------------
    def step(self, dt_ms):
        y = self.plc.y_out
        cut = not self.buttons["X013"]   # second E-stop contact removes the output COM supply
        out = (lambda n: 0) if cut else (lambda n: y[int(n, 8)])
        self._axis(self.left, out("0"), out("1"), dt_ms)
        self._axis(self.right, out("7"), out("6"), dt_ms)
        if self.board:
            down, up = (0, 0) if cut else (self.plc.m[8116], self.plc.m[8117])     # FX3G-2EYT-BD
        else:
            down, up = out("4"), out("3")
        self._cylinder(self.left, down, up, dt_ms)
        self._cylinder(self.right, out("4"), out("3"), dt_ms)
        self._vacuum("L", self.left, out("5"))           # both valves share Y5
        self._vacuum("R", self.right, out("5"))
        if out("2"):
            self._belt("front", dt_ms)
            self._belt("rear", dt_ms)
        self.apply_inputs()

    @staticmethod
    def _axis(g, forward, rearward, dt_ms):
        if g.axis_stuck:
            return
        d = 1000.0 * dt_ms / AXIS_MS
        if forward and not rearward:
            g.axis = max(-OVERTRAVEL, g.axis - d)
        elif rearward and not forward:
            g.axis = min(1000.0 + OVERTRAVEL, g.axis + d)

    @staticmethod
    def _cylinder(g, down, up, dt_ms):
        if down and not up:
            g.valve = 1
        elif up and not down:
            g.valve = -1
        if not g.cyl_stuck:
            g.z = min(1.0, max(0.0, g.z + g.valve * dt_ms / CYL_MS))

    def _vacuum(self, name, g, coil):
        was, g.vacuum = g.vacuum, bool(coil)
        held = next((p for p in self.parts if p["on"] == name), None)
        if g.vacuum and not was and held is None and g.z >= 0.98:
            belt, stop = ("front", 0.0) if name == "R" else ("rear", 1000.0)
            if abs(g.axis - stop) <= POS_TOL:
                part = next((p for p in self.parts if p["on"] == belt and p["pos"] >= END_SENSOR), None)
                if part:
                    part["on"] = name
        if was and not g.vacuum and held is not None:
            target = "rear" if name == "R" else "front"
            stop = 1000.0 if name == "R" else 0.0
            if g.z >= 0.98 and abs(g.axis - stop) <= POS_TOL:
                held["on"], held["pos"] = target, 0.0
                self.placed[name] += 1
            elif abs(g.axis - (1000.0 - stop)) <= POS_TOL:
                # dropped back over the belt it came from
                held["on"], held["pos"] = ("front", 1000.0) if name == "R" else ("rear", 1000.0)
            else:
                held["on"] = "lost"

    def _belt(self, belt, dt_ms):
        ahead = 1000.0 + PART_GAP
        for part in sorted((p for p in self.parts if p["on"] == belt), key=lambda p: -p["pos"]):
            part["pos"] = min(ahead - PART_GAP, part["pos"] + BELT_MM_S * dt_ms / 1000.0)
            ahead = part["pos"]

    def sensor_words(self):
        def near(g, where):
            return abs(g.axis - where) <= POS_TOL

        def end(belt):
            return any(p["on"] == belt and p["pos"] >= END_SENSOR for p in self.parts)

        values = {"X000": near(self.left, 0.0), "X001": near(self.left, 1000.0),
                  "X002": near(self.right, 0.0), "X003": near(self.right, 1000.0),
                  "X004": end("front"), "X005": end("rear"),
                  "X006": self.left.z <= 0.02, "X007": self.left.z >= 0.98,
                  "X011": self.right.z <= 0.02, "X012": self.right.z >= 0.98}
        values.update(self.buttons)
        values.update(self.force)
        return values

    def apply_inputs(self):
        for name, value in self.sensor_words().items():
            self.plc.set_x(name[1:], 1 if value else 0)

    def summary(self):
        return ("L axis %5.0f z %.2f vac %d | R axis %5.0f z %.2f vac %d | parts %s"
                % (self.left.axis, self.left.z, self.left.vacuum, self.right.axis, self.right.z,
                   self.right.vacuum, " ".join("%d:%s@%.0f" % (p["id"], p["on"], p["pos"]) for p in self.parts)))
