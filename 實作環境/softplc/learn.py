# -*- coding: utf-8 -*-
"""Learning window: small real programs on the PLC engine, with live ladder, step chart and a slow-motion scan.

    python softplc\\learn.py

Runner has no Tk in it, so tests\\test_lessons.py can play every lesson without a window.
"""
import os
import sys

# Frozen build (softplc_exe\softplc.exe): data files are found next to the exe folder, like the .py files here.
HERE = os.path.dirname(sys.executable) if getattr(sys, "frozen", False) else os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from lessons import LESSONS                        # noqa: E402
from ladder_view import bit, parse_program, rung_of, set_bit, source_items, word  # noqa: E402
from plc_csv import instruction_steps              # noqa: E402
from plc_engine import PLC                         # noqa: E402

SCAN_MS = 20


def build_program(il):
    items = source_items(il)
    rows, step = [], 0
    for item in items:
        rows.append((step, item[1], item[2]))
        step += instruction_steps(item[1], item[2])
    rows.append((step, "END", []))
    return items, rows


class Plant(object):
    """A small cylinder so sensors change by themselves."""

    def __init__(self, kind, plc):
        self.kind, self.plc = kind, plc
        self.z = 0.0
        self.apply()

    def step(self, ms):
        if self.kind == "cylinder":
            down, up = self.plc.y_out[0], self.plc.y_out[2]
        else:
            down, up = self.plc.y_out[0], self.plc.y_out[1]
        speed = ms / 2000.0                         # slow enough to read the captions
        if down and not up:
            self.z = min(1.0, self.z + speed)
        elif up and not down:
            self.z = max(0.0, self.z - speed)
        self.apply()

    def apply(self):
        self.plc.x_in[1] = 1 if self.z >= 0.98 else 0
        self.plc.x_in[2] = 1 if self.z <= 0.02 else 0


class Runner(object):
    """One lesson running. tick(ms) moves it on: whole scans, or one instruction at a time in slow motion."""

    def __init__(self, lesson):
        self.lesson = lesson
        self.items, self.program = build_program(lesson["il"])
        self.rungs, _ = parse_program(self.items)
        self.plc = PLC(self.program)
        self.plant = Plant(lesson["plant"], self.plc) if lesson.get("plant") else None
        for name in lesson.get("start_on", []):
            self.set_input(name, 1)
        self.slow = False
        self.scanner = None
        self.phase = ""
        self.index = None
        self.spare = 0.0
        self.step_ms = lesson.get("slow_ms", SCAN_MS * 15)
        self.trace_rows = []
        self.before = {}
        self.round = 0
        self.last = None            # what the scan finished last: 'read', an instruction number, 'done'

    def remember(self):
        """Values at the start of a scan: what the first rungs will still see."""
        self.before = {dev: self.read(dev) for _, dev, when in self.lesson.get("trace", []) if when == "old"}

    def read(self, dev):
        if dev[0] == "D":
            return self.plc.d[int(dev[1:])]
        if dev[0] == "X":
            return self.plc.x[int(dev[1:], 8)]
        return bit(self.plc, dev)

    def record(self):
        """One row per scan in slow motion. At full speed only when a bit changed, or the table would just scroll."""
        columns = self.lesson.get("trace")
        if not columns:
            return
        row = [self.before.get(dev, 0) if when == "old" else self.read(dev) for _, dev, when in columns]
        bits = [v for v, (_, dev, _) in zip(row, columns) if dev[0] != "D"]
        if not self.slow and self.trace_rows and self.trace_rows[-1][2] == bits:
            return
        self.round += 1
        self.trace_rows.append((self.round, row, bits))
        del self.trace_rows[:-4]

    def set_input(self, name, value):
        self.plc.x_in[int(name[1:], 8)] = 1 if value else 0

    def get_input(self, name):
        return self.plc.x_in[int(name[1:], 8)]

    def tick(self, ms):
        self.spare += ms
        if not self.slow:
            while self.scanner is not None:          # finish the slow scan that was running
                self.slow_step()
            while self.spare >= SCAN_MS:
                self.spare -= SCAN_MS
                self.remember()
                self.plc.scan(SCAN_MS)
                self.record()
                if self.plant:
                    self.plant.step(SCAN_MS)
            self.index, self.phase = None, ""
            return
        while self.spare >= self.step_ms:
            self.spare -= self.step_ms
            self.slow_step()

    def slow_step(self):
        if self.scanner is None:
            self.remember()
            self.scanner = self.plc.scan_iter(SCAN_MS * 15)
            self.phase = "準備下一圈"
            self.index = None
            return
        try:
            at = next(self.scanner)
        except StopIteration:
            at = "done"
        self.last = at - 1 if isinstance(at, int) and at > 0 else at if at in ("read", "done") else None
        if at == "read":
            self.phase = "① 讀輸入：把 X 拍照存起來，這一圈都用這張照片"
            self.index = None
        elif at == "done":
            self.record()
            self.scanner = None
            self.index = None
            self.phase = "③ 寫輸出：這時候 Y 才真的送到外面。接著下一圈"
            if self.plant:
                self.plant.step(SCAN_MS * 15)
        else:
            self.index = self.last              # the frame stays on the rung until its last instruction ran
            self.phase = "② 執行程式：由上往下，一次算一個指令"

    def current_rung(self):
        return rung_of(self.rungs, self.index) if self.index is not None else None

    def computed_to(self, paint):
        """Canvas y up to which this scan has run, None when no scan is under way. Below it nothing counts yet."""
        if self.scanner is None:
            return None
        rung = self.current_rung()
        if rung is None:
            return -1 if self.index is None else None
        for top, _, r in paint.bands:
            if r is rung:
                return top
        return None

    def finish(self, seconds):
        """Tests: run on without a window."""
        self.tick(seconds * 1000)


def open_window(root, tk):
    old = getattr(root, "learn_window", None)
    if old is not None and old.win.winfo_exists():
        old.win.lift()
        return old
    root.learn_window = LearnWindow(root, tk)
    return root.learn_window


class LearnWindow(object):
    def __init__(self, root, tk):
        self.root, self.tk = root, tk
        self.win = tk.Toplevel(root)
        self.win.title("階梯圖學習模式")
        self.win.geometry("1520x900")
        self.at = 0
        self.script = []
        self.wait = 0
        self.until = None
        self.buttons = {}
        self.speed = 0.5            # people read slower than the machine runs
        self.paused = False
        self.line = self.lines = 0
        self.build()
        self.load(0)
        self.tick()

    def build(self):
        tk = self.tk
        self.lesson_list = tk.Listbox(self.win, width=31, font=("Microsoft JhengHei", 11), exportselection=False, activestyle="none")
        self.lesson_list.pack(side="left", fill="y")
        for lesson in LESSONS:
            self.lesson_list.insert("end", lesson["title"])
        self.lesson_list.bind("<<ListboxSelect>>", lambda e: self.pick())
        main = tk.Frame(self.win)
        main.pack(side="left", fill="both", expand=True)
        self.title = tk.Label(main, text="", anchor="w", font=("Microsoft JhengHei", 16, "bold"))
        self.title.pack(fill="x", padx=10, pady=(8, 2))
        self.text = tk.Label(main, text="", anchor="nw", justify="left", wraplength=1160, font=("Microsoft JhengHei", 11))
        self.text.pack(fill="x", padx=10)
        bar = tk.Frame(main)
        bar.pack(fill="x", padx=8, pady=6)
        tk.Button(bar, text="▶ 播放示範", width=12, bg="#ffe9a8", command=self.play).pack(side="left", padx=2)
        self.pause_text = tk.StringVar(value="⏸ 暫停")
        tk.Button(bar, textvariable=self.pause_text, width=9, command=self.toggle_pause).pack(side="left", padx=2)
        tk.Button(bar, text="下一句 ⏭", width=9, command=self.next_line).pack(side="left", padx=2)
        tk.Label(bar, text="速度").pack(side="left", padx=(10, 2))
        self.speed_text = tk.StringVar(value="1/2")
        tk.OptionMenu(bar, self.speed_text, "1/4", "1/2", "1 倍", command=self.set_speed).pack(side="left")
        self.hold = tk.IntVar(value=0)
        tk.Checkbutton(bar, text="每句停下來等我", variable=self.hold).pack(side="left", padx=(8, 2))
        tk.Button(bar, text="重來", width=6, command=lambda: self.load(self.at)).pack(side="left", padx=(10, 2))
        tk.Button(bar, text="下一課 →", width=9, command=self.next_lesson).pack(side="left", padx=2)
        self.slow = tk.IntVar(value=0)
        tk.Checkbutton(bar, text="慢動作掃描", variable=self.slow, command=self.set_slow).pack(side="left", padx=8)
        self.say = tk.Label(main, text="", anchor="w", bg="#fff3c4", fg="#3a2c00", padx=10, pady=6, wraplength=1160, justify="left",
                            font=("Microsoft JhengHei", 13, "bold"))
        self.say.pack(fill="x", padx=8)
        self.phase = tk.Label(main, text="", anchor="w", fg="#a06800", font=("Microsoft JhengHei", 11, "bold"))
        self.phase.pack(fill="x", padx=10)
        self.table = tk.Frame(main)
        self.log = tk.Text(main, height=6, wrap="word", font=("Microsoft JhengHei", 10), bg="#20262d", fg="#e8ebee")
        self.log_shown = False
        body = tk.Frame(main)
        body.pack(fill="both", expand=True, padx=6, pady=6)
        self.body = body
        self.side = tk.Frame(body, width=420)
        self.side.pack(side="right", fill="y", padx=(6, 0))
        self.side.pack_propagate(False)
        from ladder_paint import BG
        self.canvas = tk.Canvas(body, bg=BG, highlightthickness=0)
        ybar = tk.Scrollbar(body, orient="vertical", command=self.canvas.yview)
        self.canvas.configure(yscrollcommand=ybar.set)
        ybar.pack(side="right", fill="y")
        self.canvas.pack(side="left", fill="both", expand=True)
        self.canvas.bind("<MouseWheel>", lambda e: self.canvas.yview_scroll(-int(e.delta / 40), "units"))
        self.canvas.bind("<Button-1>", self.pick_rung)

    def pick(self):
        chosen = self.lesson_list.curselection()
        if chosen:
            self.load(chosen[0])

    def next_lesson(self):
        self.load(min(self.at + 1, len(LESSONS) - 1))

    def load(self, index):
        from ladder_paint import Painter
        from lessons import COMMENT
        self.at = index
        lesson = LESSONS[index]
        self.lesson_list.selection_clear(0, "end")
        self.lesson_list.selection_set(index)
        self.script, self.wait, self.until = [], 0, None
        self.line, self.lines = 0, 0
        self.paused = False
        self.title.configure(text=lesson["title"])
        self.text.configure(text=lesson["text"])
        self.say.configure(text="按「▶ 播放示範」看它怎麼動，或自己按右邊的按鈕。點階梯可以看解釋。")
        self.run = Runner(lesson)
        self.run.slow = bool(self.slow.get())
        self.log.configure(state="normal")
        self.log.delete("1.0", "end")
        self.log.insert("end", "過程紀錄：字幕講過的內容會留在這裡，可以回頭看。\n")
        self.log.configure(state="disabled")
        if lesson.get("log") and not self.log_shown:
            self.log.pack(side="bottom", fill="x", padx=8, pady=(0, 6))
            self.log_shown = True
        elif not lesson.get("log") and self.log_shown:
            self.log.pack_forget()
            self.log_shown = False
        self.show_table(lesson)
        self.paint_program(lesson)
        self.build_side(lesson)

    def paint_program(self, lesson):
        from ladder_paint import Painter
        from lessons import COMMENT
        self.canvas.delete("all")
        comment = dict(COMMENT)
        comment.update(lesson.get("comment", {}))
        self.comment = comment
        self.paint = Painter(self.canvas, self.run.rungs, self.run.plc, comment, right=720, flow=True, sections=False)
        self.paint.draw()
        self.canvas.yview_moveto(0)
        self.shown = None

    def show_table(self, lesson):
        """The comparison under the ladder, when a lesson has one."""
        tk = self.tk
        for w in self.table.winfo_children():
            w.destroy()
        table = lesson.get("table")
        if not table:
            self.table.pack_forget()
            return
        self.table.pack(side="bottom", fill="x", padx=8, pady=(0, 6), before=self.body)
        width = 1120 // len(table["head"])
        for i, text in enumerate(table["head"]):
            tk.Label(self.table, text=text, relief="ridge", bg="#2b3a4d", fg="white", wraplength=width,
                     font=("Microsoft JhengHei", 10, "bold")).grid(row=0, column=i, sticky="nsew")
            self.table.grid_columnconfigure(i, weight=1)
        for r, row in enumerate(table["rows"], 1):
            for i, text in enumerate(row):
                tk.Label(self.table, text=text, relief="ridge", anchor="w", justify="left", wraplength=width,
                         font=("Microsoft JhengHei", 10, "bold" if i == 0 else "normal")).grid(row=r, column=i, sticky="nsew")

    def use_stage(self, name):
        """Replaces the program on screen, for a lesson that turns one program into another."""
        lesson = LESSONS[self.at]
        self.run = Runner(dict(lesson, il=lesson["stages"][name]))
        self.run.slow = bool(self.slow.get())
        self.paint_program(lesson)

    def build_side(self, lesson):
        tk = self.tk
        for w in self.side.winfo_children():
            w.destroy()
        self.buttons = {}
        self.lamps = {}
        self.sfc = {}
        self.warning = None
        if lesson.get("conflict"):
            self.warning = tk.Label(self.side, text="", font=("Microsoft JhengHei", 13, "bold"), fg="white", bg="#f0f0f0")
            self.warning.pack(fill="x", pady=(0, 6))
        box = tk.LabelFrame(self.side, text="輸入（自己按按看）", font=("Microsoft JhengHei", 10))
        box.pack(fill="x", pady=(0, 6))
        for name, label, kind in lesson["inputs"]:
            if kind == "sensor":
                w = tk.Label(box, text=label, relief="groove", width=24, font=("Microsoft JhengHei", 10))
                w.pack(padx=6, pady=3)
                self.lamps[name] = (w, "#3fe07a", "x")
            else:
                b = tk.Button(box, text=label, width=24, font=("Microsoft JhengHei", 10))
                if kind == "hold":
                    b.bind("<ButtonPress-1>", lambda e, n=name: self.run.set_input(n, 1))
                    b.bind("<ButtonRelease-1>", lambda e, n=name: self.run.set_input(n, 0))
                elif kind == "nc":                  # wired normally closed: pressing it takes the input away
                    b.bind("<ButtonPress-1>", lambda e, n=name: self.run.set_input(n, 0))
                    b.bind("<ButtonRelease-1>", lambda e, n=name: self.run.set_input(n, 1))
                else:
                    b.configure(command=lambda n=name: self.run.set_input(n, 0 if self.run.get_input(n) else 1))
                b.pack(padx=6, pady=3)
                self.buttons[name] = b
                self.lamps[name] = (b, "#a8f0c0", "x")
        if lesson["outputs"]:
            box = tk.LabelFrame(self.side, text="輸出", font=("Microsoft JhengHei", 10))
            box.pack(fill="x", pady=(0, 6))
            for name, label in lesson["outputs"]:
                w = tk.Label(box, text=label, relief="groove", width=24, font=("Microsoft JhengHei", 10))
                w.pack(padx=6, pady=3)
                self.lamps[name] = (w, "#3fe07a", "y")
        self.watch = {}
        if lesson.get("watch"):
            box = tk.LabelFrame(self.side, text="內部訊號", font=("Microsoft JhengHei", 10))
            box.pack(fill="x", pady=(0, 6))
            for name, label in lesson["watch"]:
                w = tk.Label(box, text=label, relief="groove", width=24, font=("Microsoft JhengHei", 10))
                w.pack(padx=6, pady=3)
                self.watch[name] = w
        self.values = {}
        if lesson.get("values"):
            box = tk.LabelFrame(self.side, text="數值", font=("Microsoft JhengHei", 10))
            box.pack(fill="x", pady=(0, 6))
            for name, label in lesson["values"]:
                tk.Label(box, text=label, anchor="w", font=("Microsoft JhengHei", 10)).pack(fill="x", padx=6)
                w = tk.Label(box, text="0", anchor="e", font=("Consolas", 14, "bold"), fg="#1f6fb0")
                w.pack(fill="x", padx=6)
                self.values[name] = w
        self.trace_cells = []
        if lesson.get("trace"):
            box = tk.LabelFrame(self.side, text="每圈紀錄表：每跑完一圈多一列", font=("Microsoft JhengHei", 10))
            box.pack(fill="x", pady=(0, 6))
            grid = tk.Frame(box)
            grid.pack(padx=4, pady=4)
            heads = ["圈"] + [c[0] for c in lesson["trace"]]
            for i, head in enumerate(heads):
                tk.Label(grid, text=head, relief="ridge", wraplength=52, font=("Microsoft JhengHei", 8, "bold")).grid(row=0, column=i, sticky="nsew")
            for r in range(1, 5):
                cells = [tk.Label(grid, text="", relief="ridge", width=6, font=("Consolas", 9)) for _ in heads]
                for i, cell in enumerate(cells):
                    cell.grid(row=r, column=i, sticky="nsew")
                self.trace_cells.append(cells)
        if lesson.get("notes"):
            box = tk.LabelFrame(self.side, text="名詞", font=("Microsoft JhengHei", 10))
            box.pack(fill="both", expand=True)
            tk.Label(box, text=lesson["notes"], justify="left", anchor="nw", wraplength=395, font=("Microsoft JhengHei", 9)).pack(fill="both", padx=6, pady=4)
        self.mini = None
        if lesson.get("plant"):
            box = tk.LabelFrame(self.side, text="機構", font=("Microsoft JhengHei", 10))
            box.pack(fill="x", pady=(0, 6))
            self.mini = tk.Canvas(box, width=260, height=70 if lesson.get("table") else 120, bg="#1b1f24", highlightthickness=0)
            self.mini.pack(padx=4, pady=4)
        if lesson.get("sfc"):
            box = tk.LabelFrame(self.side, text="流程圖（SFC）：黃色是現在這一步", font=("Microsoft JhengHei", 10))
            box.pack(fill="both", expand=True)
            for state, label in lesson["sfc"]:
                w = tk.Label(box, text="%s　%s" % (state, label), relief="ridge", width=24, font=("Microsoft JhengHei", 10))
                w.pack(padx=6, pady=2)
                self.sfc[state] = w

    def pick_rung(self, event):
        from ladder_view import explain
        rung, _, _ = self.paint.rung_at(self.canvas.canvasy(event.y))
        if rung is not None:
            self.say.configure(text=explain(rung, self.run.plc, self.comment))

    def set_slow(self):
        self.run.slow = bool(self.slow.get())

    def set_speed(self, value):
        self.speed = {"1/4": 0.25, "1/2": 0.5, "1 倍": 1.0}[value]

    def toggle_pause(self):
        self.paused = not self.paused

    def next_line(self):
        """Goes straight to the next caption, whatever the wait was."""
        self.wait = 0
        self.paused = False
        guard = 0
        while self.until is not None and guard < 60:     # caption skipped: bring the machine along with it
            guard += 1
            if self.reached():
                break
            self.run.slow_step()
        self.until = None

    def reached(self):
        return self.run.last == self.until

    def play(self):
        self.load(self.at)
        self.script = list(LESSONS[self.at]["demo"])
        self.wait = 0
        self.line, self.lines = 0, sum(1 for row in self.script if row[3])
        self.paused = False
        self.hold.set(1 if LESSONS[self.at].get("hold") else self.hold.get())

    def do_script(self, ms):
        if self.until is not None:
            if self.reached():
                self.until = None
                if self.hold.get() and self.script:
                    self.paused = True
            return
        if self.wait > 0:
            self.wait -= ms
            if self.wait <= 0 and self.hold.get() and self.script:
                self.paused = True          # "wait for me": the machine holds too, so nothing is missed
            return
        if not self.script:
            return
        seconds, action, device, words = self.script[0]
        if action == "sync":                        # start the next line at the top of a scan
            if self.run.scanner is None:
                self.script.pop(0)
            return
        self.script.pop(0)
        if action == "mark":                        # the demo's first scan is called scan 1
            self.run.round, self.run.trace_rows = 0, []
            return
        if words:
            self.line += 1
            self.say.configure(text=words)
            self.log.configure(state="normal")
            self.log.insert("end", words + "\n")
            self.log.see("end")
            self.log.configure(state="disabled")
        if action == "press":
            self.run.set_input(device, 1)
        elif action == "release":
            self.run.set_input(device, 0)
        elif action == "toggle":
            self.run.set_input(device, 0 if self.run.get_input(device) else 1)
        elif action == "slow":
            self.slow.set(1)
            self.set_slow()
        elif action == "fast":
            self.slow.set(0)
            self.set_slow()
        elif action == "stage":
            self.use_stage(device)
        elif action == "look":                      # scroll to the rung that drives this device
            for top, _, rung in self.paint.bands:
                if any(ops and ops[-1] == device for _, ops in rung.outputs):
                    self.canvas.yview_moveto(max(0, top - 40) / float(self.paint.total))
                    break
        if action == "rung":                        # this caption lasts until that instruction has really run
            self.until = seconds
            return
        self.wait = seconds * 1000

    def refresh(self):
        run, paint = self.run, self.paint
        paint.plc = run.plc
        rung = run.current_rung()
        paint.mark(rung)
        self.keep_in_view(rung)
        paint.update(upto=run.computed_to(paint))
        state = "已暫停，按「繼續」或「下一句」　" if self.paused else ""
        count = "第 %d／%d 句　" % (self.line, self.lines) if self.lines else ""
        self.phase.configure(text=state + count + run.phase)
        self.pause_text.set("▶ 繼續" if self.paused else "⏸ 暫停")
        plc = run.plc
        for name, (w, color, kind) in self.lamps.items():
            on = plc.x_in[int(name[1:], 8)] if kind == "x" else plc.y_out[int(name[1:], 8)]
            if isinstance(w, self.tk.Button):
                w.configure(bg=color if on else "SystemButtonFace")
            else:
                w.configure(bg=color if on else "#d9d9d9")
        for state, w in self.sfc.items():
            w.configure(bg="#e0ae25" if bit(plc, state) else "#d9d9d9")
        for name, w in self.watch.items():
            w.configure(bg="#3fe07a" if bit(plc, name) else "#d9d9d9")
        for name, w in self.values.items():
            w.configure(text="%s = %d" % (name, word(plc, name)))
        if self.warning is not None:
            a, b, text = run.lesson["conflict"]
            both = plc.y_out[int(a[1:], 8)] and plc.y_out[int(b[1:], 8)]
            self.warning.configure(text=text if both else "", bg="#d02020" if both else "#f0f0f0")
        rows = run.trace_rows
        columns = run.lesson.get("trace", [])
        for r, cells in enumerate(self.trace_cells):
            if r < len(rows):
                texts = [str(rows[r][0])]
                for value, (_, dev, _) in zip(rows[r][1], columns):
                    texts.append(str(value) if dev[0] == "D" else ("ON" if value else "OFF"))
            else:
                texts = [""] * len(cells)
            for cell, text in zip(cells, texts):
                cell.configure(text=text, bg="#a8f0c0" if text == "ON" else "SystemButtonFace")
        if self.mini is not None and run.plant:
            c, z = self.mini, run.plant.z
            c.delete("all")
            scale = 22 if run.lesson.get("table") else 60
            c.create_rectangle(110, 6, 150, 30, fill="#777777", outline="")
            c.create_rectangle(124, 30, 136, 30 + z * scale, fill="#d0d0d0", outline="")
            vac = plc.y_out[1] if run.lesson["plant"] == "cylinder" else 0
            c.create_rectangle(104, 30 + z * scale, 156, 42 + z * scale, fill="#33cc55" if vac else "#d0a020", outline="")

    def keep_in_view(self, rung):
        """Scrolls to the rung being executed, or to the active step."""
        paint, c = self.paint, self.canvas
        y = None
        if rung is not None:
            for top, _, r in paint.bands:
                if r is rung:
                    y = top
        elif not self.run.slow:
            active = ["S%d" % s for s in self.run.plc.active_states()]
            if active and active != getattr(self, "shown", None):
                self.shown = active
                y = paint.state_y.get(active[0])
        if y is not None and (y < c.canvasy(0) or y + 120 > c.canvasy(c.winfo_height())):
            c.yview_moveto(max(0, y - 40) / float(paint.total))

    def tick(self):
        if not self.win.winfo_exists():
            return
        if not self.paused:
            self.do_script(40 * self.speed)
            self.run.tick(40 * self.speed)
        self.refresh()
        self.win.after(40, self.tick)


def main():
    import tkinter as tk
    root = tk.Tk()
    root.withdraw()
    window = open_window(root, tk)
    window.win.protocol("WM_DELETE_WINDOW", root.destroy)
    root.mainloop()


if __name__ == "__main__":
    main()
