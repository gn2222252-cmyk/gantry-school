# -*- coding: utf-8 -*-
"""Draws a parsed program as a standard ladder: left and right power rails, | | contacts, ( ) coils, [ ] instructions.
Painter is shared by the live monitor and the learning window. Colours come from the running PLC.
"""
import math
import time

from ladder_view import (COMMENT, RELATION, Compare, Contact, Parallel, Rung, Series, bit, coil_on, conducts, explain,
                         leaf_on, rung_power, size, word)

CELL_W, CELL_H, RAIL_X, SUB_INDENT = 112, 74, 24, 26
BG, RAIL, WIRE, TEXT, DIM = "#14171b", "#7a8592", "#4a525c", "#e8ebee", "#98a3af"
POWER, HILITE, STATE_ON, STATE_OFF = "#3fe07a", "#1f8f4e", "#e0ae25", "#2c3138"
COIL_ON, CMD_ON, VALUE = "#2fbf5b", "#2f8fe0", "#e6c766"
FONT, FONT_B = ("Microsoft JhengHei", 8), ("Consolas", 10, "bold")


class Painter(object):
    def __init__(self, canvas, rungs, plc, comment=None, right=900, flow=False, sections=True):
        self.c, self.rungs, self.plc = canvas, rungs, plc
        self.comment = COMMENT if comment is None else comment
        self.right, self.flow, self.sections = right, flow, sections
        self.live, self.wires, self.bands = [], [], []
        self.state_y, self.section_y = {}, {}
        self.total, self.widest = 0, 800
        self.cursor = None

    # ---- primitives -------------------------------------------------------
    def wire(self, x1, y1, x2, y2, power, y_key, width=2):
        item = self.c.create_line(x1, y1, x2, y2, fill=WIRE, width=width)
        dot = None
        if self.flow and abs(x2 - x1) + abs(y2 - y1) > 6:
            dot = self.c.create_oval(0, 0, 6, 6, fill="#d8ffe6", outline="", state="hidden")
        self.wires.append((y_key, item, power, (x1, y1, x2, y2), dot))

    def contact(self, node, x, y, pin):
        c, mid = self.c, y + CELL_H // 2
        out = lambda: pin() and leaf_on(self.plc, node)        # noqa: E731
        left, right = x + 36, x + CELL_W - 36
        box = c.create_rectangle(left - 1, mid - 14, right + 1, mid + 14, fill=BG, outline="")
        self.wire(x, mid, left, mid, pin, y)
        self.wire(right, mid, x + CELL_W, mid, out, y)
        if isinstance(node, Contact):
            c.create_line(left, mid - 14, left, mid + 14, fill=TEXT, width=2)
            c.create_line(right, mid - 14, right, mid + 14, fill=TEXT, width=2)
            if node.negated:
                c.create_line(left, mid + 11, right, mid - 11, fill="#ff9a5c", width=2)
            c.create_text(x + CELL_W // 2, mid - 23, text=node.name, fill=TEXT, font=FONT_B)
            c.create_text(x + CELL_W // 2, mid + 24, text=self.comment.get(node.name, "")[:8], fill=DIM, font=FONT)
        else:
            c.create_text(x + CELL_W // 2, mid - 23, text="[%s %s %s]" % (node.a, RELATION[node.relation], node.b),
                          fill=TEXT, font=("Consolas", 9, "bold"))
        value = None
        if isinstance(node, Compare) or node.name[0] in "TC":
            value = c.create_text(x + CELL_W // 2, mid + 2, text="", fill=VALUE, font=("Consolas", 9, "bold"))
        self.live.append(("leaf", y, node, box, value))
        return CELL_W, out

    def block(self, node, x, y, pin):
        """Draws a contact tree. Returns (pixel width, function: is there power at the right end)."""
        if isinstance(node, Series):
            power, cx = pin, x
            for n in node.items:
                w, power = self.block(n, cx, y, power)
                cx += w
            return cx - x, power
        if isinstance(node, Parallel):
            width = size(node)[0] * CELL_W
            cy, ends, first, last = y, [], y + CELL_H // 2, y + CELL_H // 2
            for n in node.items:
                w, power = self.block(n, x, cy, pin)
                mid = cy + CELL_H // 2
                if w < width:
                    self.wire(x + w, mid, x + width, mid, power, y)
                ends.append(power)
                last = mid
                cy += size(n)[1] * CELL_H
            out = (lambda ends=ends: any(p() for p in ends))
            self.wire(x, first, x, last, pin, y)
            self.wire(x + width, first, x + width, last, out, y)
            return width, out
        return self.contact(node, x, y, pin)

    def output(self, rung, op, ops, x, y, xr, power):
        c, mid = self.c, y + CELL_H // 2
        coil = op == "OUT"
        name = ops[0] if ops else ""
        if coil:
            text = name if len(ops) == 1 else "%s %s" % (name, ops[1])
            box = c.create_oval(x, mid - 16, x + 110, mid + 16, outline=TEXT, fill=BG, width=2)
        else:
            text = "%s %s" % (op, " ".join(ops))
            box = c.create_rectangle(x, mid - 16, x + 170, mid + 16, outline=TEXT, fill=BG, width=2)
        width = 110 if coil else 170
        c.create_text(x + width // 2, mid, text=text, fill=TEXT, font=("Consolas", 9, "bold"))
        c.create_text(x + width // 2, mid + 24, text=self.comment.get(name, "")[:12], fill=DIM, font=FONT)
        c.create_line(x + width, mid, xr, mid, fill=WIRE, width=2)
        value = None
        if coil and name[0] in "TC":
            value = c.create_text(x + width // 2, mid - 25, text="", fill=VALUE, font=("Consolas", 9, "bold"))
        self.live.append(("out", y, rung, box, op, ops, value))

    def draw(self):
        c = self.c
        y, section, para, open_state, widest = 14, None, None, None, 800

        def close_state(end):
            nonlocal open_state
            if open_state:
                name, x, top = open_state
                self.wire(x, top, x, end, (lambda n=name: bool(bit(self.plc, n))), top, 3)
                open_state = None

        for item in self.rungs:
            is_tuple = isinstance(item, tuple)
            sec = item.section if not is_tuple else (item[2] if item[0] == "stl" else item[1])
            txt = item.para if not is_tuple else (item[3] if item[0] == "stl" else item[2])
            if sec != section and self.sections:
                close_state(y)
                section = sec
                y += 12
                c.create_rectangle(0, y - 4, 3000, y + 24, fill="#2b3a4d", outline="")
                c.create_text(12, y + 10, text=section, fill="#ffffff", anchor="w", font=("Microsoft JhengHei", 12, "bold"))
                self.section_y[section] = y
                y += 34
            if txt != para and txt:
                para = txt
                c.create_text(RAIL_X + (SUB_INDENT if open_state else 0), y + 8, text=para, fill="#9fc3e8", anchor="w",
                              font=("Microsoft JhengHei", 10))
                y += 22
            if is_tuple and item[0] == "stl":
                close_state(y)
                name = item[1]
                c.create_line(RAIL_X, y, RAIL_X, y + 34, fill=RAIL, width=3)
                box = c.create_rectangle(RAIL_X + 12, y + 4, RAIL_X + 112, y + 30, fill=STATE_OFF, outline=TEXT)
                label = c.create_text(RAIL_X + 62, y + 17, text="STL %s" % name, fill=TEXT, font=FONT_B)
                c.create_line(RAIL_X, y + 17, RAIL_X + 12, y + 17, fill=RAIL, width=2)
                c.create_text(RAIL_X + 122, y + 17, text=self.comment.get(name, ""), fill=VALUE, anchor="w",
                              font=("Microsoft JhengHei", 10, "bold"))
                self.state_y[name] = y
                self.live.append(("state", y, name, box, label))
                open_state = (name, RAIL_X + SUB_INDENT, y + 30)
                y += 38
                continue
            if is_tuple:
                close_state(y)
                c.create_text(RAIL_X + 6, y + 10, text=item[0].upper(), fill=DIM, anchor="w", font=FONT_B)
                y += 26
                continue
            top = y
            state = item.state
            start = RAIL_X + (SUB_INDENT if state else 0)
            pin = (lambda n=state: bool(bit(self.plc, n))) if state else (lambda: True)
            mid = y + CELL_H // 2
            if item.cond is None:
                width, power = 40, pin
                self.wire(start, mid, start + 40, mid, pin, y)
            else:
                width, power = self.block(item.cond, start, y, pin)
            rows = max(size(item.cond)[1], len(item.outputs))
            end = start + width
            need = max((170 if op != "OUT" else 110) for op, _ in item.outputs)
            x2 = max(end + 40, self.right - need - 24)
            xr = x2 + need + 24
            self.wire(end, mid, x2 - 16, mid, power, y)
            for i, (op, ops) in enumerate(item.outputs):
                oy = y + i * CELL_H
                omid = oy + CELL_H // 2
                self.wire(x2 - 16, omid, x2, omid, power, y)
                if i:
                    self.wire(x2 - 16, mid, x2 - 16, omid, power, y)
                self.output(item, op, ops, x2, oy, xr, power)
            height = rows * CELL_H
            if not state:
                c.create_line(RAIL_X, y, RAIL_X, y + height, fill=RAIL, width=3)
            c.create_line(xr, y, xr, y + height, fill=RAIL, width=3)
            self.bands.append((top, top + height, item))
            widest = max(widest, xr + 30)
            y += height + 6
        close_state(y)
        self.total = y + 40
        self.widest = widest
        c.configure(scrollregion=(0, 0, widest, self.total))

    # ---- live -------------------------------------------------------------
    def rung_at(self, y):
        for top, bottom, rung in self.bands:
            if top <= y <= bottom:
                return rung, top, bottom
        return None, 0, 0

    def mark(self, rung):
        """Moves the 'being executed' frame to this rung. None hides it."""
        c = self.c
        if self.cursor is None:
            self.cursor = c.create_rectangle(0, 0, 0, 0, outline="#ffe36b", width=2, dash=(5, 3), state="hidden")
        if rung is None:
            c.itemconfigure(self.cursor, state="hidden")
            return
        for top, bottom, r in self.bands:
            if r is rung:
                c.coords(self.cursor, 6, top - 2, self.widest - 8, bottom + 2)
                c.itemconfigure(self.cursor, state="normal")
                c.tag_raise(self.cursor)
                return

    def update(self, top=-1e9, bottom=1e9, upto=None):
        """upto: rungs below this y have not been computed in this scan, so they stay grey."""
        c, plc = self.c, self.plc
        pending = (lambda y: False) if upto is None else (lambda y: y > upto)
        phase = (time.perf_counter() * 1.2) % 1.0
        for y, item, power, xy, dot in self.wires:
            if y < top or y > bottom:
                continue
            on = power() and not pending(y)
            c.itemconfigure(item, fill=POWER if on else WIRE)
            if dot:
                if on:
                    x = xy[0] + (xy[2] - xy[0]) * phase
                    yy = xy[1] + (xy[3] - xy[1]) * phase
                    c.coords(dot, x - 3, yy - 3, x + 3, yy + 3)
                    c.itemconfigure(dot, state="normal")
                    c.tag_raise(dot)
                else:
                    c.itemconfigure(dot, state="hidden")
        for entry in self.live:
            y = entry[1]
            if y < top or y > bottom:
                continue
            kind = entry[0]
            if kind == "leaf":
                _, _, node, box, value = entry
                c.itemconfigure(box, fill=HILITE if leaf_on(plc, node) and not pending(y) else BG)
                if value:
                    if isinstance(node, Compare):
                        c.itemconfigure(value, text="%d %s %d" % (word(plc, node.a), RELATION[node.relation], word(plc, node.b)))
                    else:
                        c.itemconfigure(value, text=str(word(plc, node.name)))
            elif kind == "state":
                _, _, name, box, label = entry
                on = bit(plc, name)
                c.itemconfigure(box, fill=STATE_ON if on else STATE_OFF)
                c.itemconfigure(label, fill="#14171a" if on else TEXT)
            else:
                _, _, rung, box, op, ops, value = entry
                if op == "OUT":
                    on, color = coil_on(plc, rung, ops) and not (pending(y) and ops[0][0] in "TC"), COIL_ON
                    if value:
                        c.itemconfigure(value, text="現在值 %d／%s" % (word(plc, ops[0]), ops[1]))
                else:
                    on, color = rung_power(plc, rung) and not pending(y), CMD_ON
                    if not on and op == "SET" and ops[0][0] in "YM" and bit(plc, ops[0]):
                        on, color = True, COIL_ON      # the condition is gone, what it set stays on
                c.itemconfigure(box, fill=color if on else BG)


class LadderWindow(object):
    """The real machine program, live."""

    def __init__(self, root, rt, tk):
        self.rt, self.tk, self.root = rt, tk, root
        self.win = tk.Toplevel(root)
        self.win.title("梯形圖監看　綠色＝通電，點任何一條階梯看解釋")
        self.win.geometry("1240x860")
        from ladder_view import COMMENT, parse_program, read_source
        from devices import SYNC_NAMES
        source = getattr(rt, "source", None)
        self.rungs, _ = parse_program(read_source(source) if source else None)
        if source:
            COMMENT.update({k: v[0] for k, v in SYNC_NAMES.items()})
        self.build_controls()
        self.build_canvas()
        self.paint = Painter(self.canvas, self.rungs, rt.plc)
        self.paint.draw()
        for name in sorted(self.paint.section_y, key=self.paint.section_y.get):
            self.sections.insert("end", name)
        self.win.protocol("WM_DELETE_WINDOW", self.close)
        self.refresh()

    def close(self):
        self.rt.paused = False                     # a hidden pause would leave the machine stuck
        self.win.destroy()

    def build_controls(self):
        tk = self.tk
        bar = tk.Frame(self.win)
        bar.pack(fill="x", padx=6, pady=4)
        tk.Button(bar, text="學習模式", width=10, bg="#ffe9a8", command=self.open_learning).pack(side="left", padx=(2, 12))
        tk.Button(bar, text="手動與接線", width=10, bg="#d6f0d0", command=self.open_guide).pack(side="left", padx=(0, 12))
        self.pause_text = tk.StringVar(value="暫停")
        tk.Button(bar, textvariable=self.pause_text, width=8, command=self.toggle_pause).pack(side="left", padx=2)
        tk.Button(bar, text="走一個掃描", width=10, command=self.one_scan).pack(side="left", padx=2)
        tk.Label(bar, text="速度").pack(side="left", padx=(12, 2))
        self.speed = tk.StringVar(value="1 倍")
        tk.OptionMenu(bar, self.speed, "1 倍", "1/5", "1/20", command=self.set_speed).pack(side="left")
        tk.Label(bar, text="畫面跟著").pack(side="left", padx=(12, 2))
        self.follow = tk.StringVar(value="右龍門")
        tk.OptionMenu(bar, self.follow, "不跟隨", "右龍門", "左龍門", "原點復歸").pack(side="left")
        self.info = tk.Label(bar, text="", anchor="w", font=("Consolas", 11))
        self.info.pack(side="left", padx=12)
        self.hint = tk.Label(self.win, text="", anchor="w", bg="#fff3c4", fg="#3a2c00", padx=10, pady=5,
                             font=("Microsoft JhengHei", 12, "bold"))
        self.hint.pack(fill="x")

    def build_canvas(self):
        tk = self.tk
        self.why = tk.Label(self.win, text="點任何一條階梯，這裡會用白話解釋它的條件，和現在卡在哪裡。", anchor="nw", justify="left",
                            bg="#20262d", fg="#e8ebee", padx=10, pady=6, height=5, wraplength=1200, font=("Microsoft JhengHei", 11))
        self.why.pack(side="bottom", fill="x")
        xbar = tk.Scrollbar(self.win, orient="horizontal")
        xbar.pack(side="bottom", fill="x")
        body = tk.Frame(self.win)
        body.pack(fill="both", expand=True)
        self.sections = tk.Listbox(body, width=26, font=("Microsoft JhengHei", 10), exportselection=False)
        self.sections.pack(side="left", fill="y")
        self.sections.bind("<<ListboxSelect>>", self.jump)
        self.canvas = tk.Canvas(body, bg=BG, highlightthickness=0)
        ybar = tk.Scrollbar(body, orient="vertical", command=self.canvas.yview)
        self.canvas.configure(yscrollcommand=ybar.set, xscrollcommand=xbar.set)
        xbar.configure(command=self.canvas.xview)
        ybar.pack(side="right", fill="y")
        self.canvas.pack(side="left", fill="both", expand=True)
        self.canvas.bind("<MouseWheel>", lambda e: self.canvas.yview_scroll(-int(e.delta / 40), "units"))
        self.canvas.bind("<Button-1>", self.pick)

    def open_learning(self):
        import learn
        learn.open_window(self.root, self.tk)

    def open_guide(self):
        import hardware_guide
        hardware_guide.open_window(self.root, self.rt, self.tk)

    def pick(self, event):
        rung, _, _ = self.paint.rung_at(self.canvas.canvasy(event.y))
        self.selected = rung
        self.paint.mark(rung)
        self.show_why()

    def show_why(self):
        rung = getattr(self, "selected", None)
        if rung is not None:
            self.why.configure(text=explain(rung, self.rt.plc, COMMENT))

    def toggle_pause(self):
        self.rt.paused = not self.rt.paused

    def one_scan(self):
        self.rt.paused = True
        self.rt.step_once = True

    def set_speed(self, value):
        self.rt.speed = {"1 倍": 1.0, "1/5": 0.2, "1/20": 0.05}[value]

    def jump(self, _event):
        chosen = self.sections.curselection()
        if chosen:
            self.follow.set("不跟隨")
            self.canvas.yview_moveto(self.paint.section_y[self.sections.get(chosen[0])] / float(self.paint.total))

    def next_action(self):
        """What the person should do now. A monitor that sits still must say why."""
        rt, plc = self.rt, self.rt.plc
        m = plc.m
        if rt.paused:
            return "已暫停，機台和程式都停住：按「繼續」恢復，或按「走一個掃描」一次跑一圈"
        if m[3]:
            if m[2]:
                return "急停中（異常碼 1）：取消勾選 X13，再按模擬器的「復歸」"
            return "異常碼 %d：排除原因後，按模擬器的「復歸」清除" % plc.d[220]
        if m[21]:
            return "原點復歸中：看 P4 的 S11、S12，等氣缸上升、龍門回位"
        if m[0]:
            if m[1]:
                return "循環停止中：做完這一趟就停"
            if not rt.machine.parts:
                return "自動運轉中，但機台上沒有工件：按模擬器的「前輸送帶放工件」"
            return "自動運轉中：看黃色步序往下走，綠線是現在通電的路徑"
        if not plc.x[8]:
            return "手動模式：可按「手動與接線」或 Main.vi 的 Manual 頁點動。要跑自動，勾回模擬器的 X10"
        if not m[20]:
            return "現在什麼都不會動，因為還沒回原點：按模擬器的「原點」（或 Main.vi 的 Home）"
        if not rt.machine.parts:
            return "已回原點：按模擬器的「前輸送帶放工件」，再按「啟動」"
        return "已回原點，機台上有工件：按模擬器的「啟動」（或 Main.vi 的 Start）"

    def follow_step(self):
        ranges = {"右龍門": (20, 28), "左龍門": (40, 48), "原點復歸": (10, 13)}.get(self.follow.get())
        if not ranges:
            return
        if self.rt.plc.m[21]:
            ranges = (10, 13)                      # homing comes before either gantry can move
        active = [s for s in self.rt.plc.active_states() if ranges[0] <= s <= ranges[1]]
        if active and active[0] != getattr(self, "followed", None):
            self.followed = active[0]
            y = self.paint.state_y.get("S%d" % active[0], 0)
            self.canvas.yview_moveto(max(0, y - 60) / float(self.paint.total))

    def refresh(self):
        if not self.win.winfo_exists():
            return
        plc, c = self.rt.plc, self.canvas
        self.follow_step()
        self.paint.update(c.canvasy(0) - 120, c.canvasy(c.winfo_height()) + 120)
        self.show_why()
        self.info.configure(text="掃描 %d　作用中步序 %s" % (plc.scans, plc.active_states()))
        self.pause_text.set("繼續" if self.rt.paused else "暫停")
        self.hint.configure(text=self.next_action())
        self.win.after(120, self.refresh)
