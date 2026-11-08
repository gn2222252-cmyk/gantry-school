# -*- coding: utf-8 -*-
"""Manual jog panel, parts list, X/Y tables and wiring for FX3S-20MT/ES + FX3G-2EYT-BD.
Terminal layouts and ratings: FX3S User's Manual Hardware Edition JY997D48601, 4.4.2 and 4.7.4-4.7.5.
Field devices: section 2.2 and 3 of the machine spec."""

NPN = "棕→24V　藍→0V　黑→%s"
REED = "棕→%s　藍→0V"
BUTTON = "一端→%s　另一端→0V"

INPUTS = [
    ("X000", "左龍門_前側位置", "光電 M18 NPN 3 線", NPN),
    ("X001", "左龍門_後側位置", "近接 M12 NPN 3 線", NPN),
    ("X002", "右龍門_前側位置", "光電 M18 NPN 3 線", NPN),
    ("X003", "右龍門_後側位置", "近接 M12 NPN 3 線", NPN),
    ("X004", "前輸送帶_右端到位", "光電 M18 NPN 3 線", NPN),
    ("X005", "後輸送帶_左端到位", "光電 M18 NPN 3 線", NPN),
    ("X006", "左氣缸_上限", "磁簧 2 線", REED),
    ("X007", "左氣缸_下限", "磁簧 2 線", REED),
    ("X010", "模式（ON 自動）", "選擇開關", BUTTON),
    ("X011", "右氣缸_上限", "磁簧 2 線", REED),
    ("X012", "右氣缸_下限", "磁簧 2 線", REED),
    ("X013", "急停", "急停鈕第 1 組 NC", BUTTON),
]

COIL = "+24V→線圈→%s　%s→0V"
OUTPUTS = [
    ("Y000", "左橫軸_往前", "中間繼電器 → 左馬達", "COM0"),
    ("Y001", "左橫軸_往後", "中間繼電器 → 左馬達", "COM1"),
    ("Y002", "輸送帶運轉", "中間繼電器 → 兩台輸送帶馬達", "COM2"),
    ("Y003", "右氣缸_上升", "4V220 B 側線圈", "COM3"),
    ("Y004", "右氣缸_下降", "4V220 A 側線圈", "COM4"),
    ("Y005", "吸盤_真空（左右共用）", "左右 3V110 線圈並聯", "COM4"),
    ("Y006", "右橫軸_往後", "繼電器模組 → 右馬達", "COM4"),
    ("Y007", "右橫軸_往前", "繼電器模組 → 右馬達", "COM4"),
    ("BY0", "左氣缸_下降（M8116）", "4V220 A 側線圈", ""),
    ("BY1", "左氣缸_上升（M8117）", "4V220 B 側線圈", ""),
]

OUTPUTS_8Y = [
    ("Y000", "左橫軸_往前", "中間繼電器 → 左馬達", "COM0"),
    ("Y001", "左橫軸_往後", "中間繼電器 → 左馬達", "COM1"),
    ("Y002", "輸送帶運轉", "中間繼電器 → 兩台輸送帶馬達", "COM2"),
    ("Y003", "氣缸_上升（左右一起）", "左右 4V220 B 側線圈並聯", "COM3"),
    ("Y004", "氣缸_下降（左右一起）", "左右 4V220 A 側線圈並聯", "COM4"),
    ("Y005", "吸盤_真空（左右一起）", "左右 3V110 線圈並聯", "COM4"),
    ("Y006", "右橫軸_往後", "繼電器模組 → 右馬達", "COM4"),
    ("Y007", "右橫軸_往前", "繼電器模組 → 右馬達", "COM4"),
]

PARTS = [
    ("控制", "PLC 主機", "FX3S-20MT/ES", "1", "AC 電源，12 入 8 出，電晶體漏型輸出"),
    ("控制", "輸出擴充板", "FX3G-2EYT-BD", "1", "BY0、BY1，對應 M8116、M8117。8 輸出同步版不用"),
    ("控制", "RS-422 轉換線", "USB-SC09-FX 或 FX-USB-AW", "1", "接 PLC 圓形 8 pin 埠，電腦出現 COM 埠，LabVIEW 用這條"),
    ("控制", "程式線", "USB Mini-B 線", "1", "接 FX3S 內建 USB 埠，給 GX Works2 用"),
    ("控制", "軟體", "GX Works2 1.492N 以上", "1", "新建工程時機型選 FX3S"),
    ("電源", "24V 電源", "Omron S8FS DC24V", "1", "線圈、指示燈"),
    ("電源", "12V 電源", "明緯 LRS-100-12", "1", "橫軸與輸送帶馬達"),
    ("電源", "保險絲", "依各負載電流選用", "每路", "FX3S 輸出內部沒有保險絲"),
    ("感測", "光電感測器", "M18 DC24V NPN 3 線", "4", "X0、X2、X4、X5"),
    ("感測", "近接感測器", "M12 DC24V NPN 3 線", "2", "X1、X3"),
    ("感測", "磁簧開關", "DC24V 2 線", "4", "X6、X7、X11、X12"),
    ("感測", "極限開關", "微動開關 NC", "4", "LS1～LS4，串馬達迴路，不進 PLC"),
    ("操作", "急停按鈕", "兩組 NC 接點", "1", "一組進 X13，一組切 +24V 負載電源"),
    ("操作", "選擇開關", "兩段", "1", "X10，ON 自動，OFF 手動"),
    ("氣動", "雙動電磁閥", "AirTAC 4V220-06 DC24V", "2", "升降氣缸"),
    ("氣動", "單動電磁閥", "AirTAC 3V110-06-NC DC24V", "2", "真空"),
    ("氣動", "真空產生器＋吸盤", "依工件選用", "2", "左右龍門"),
    ("氣動", "升降氣缸", "雙軸導桿", "2", "左右龍門"),
    ("驅動", "橫軸馬達", "DC12V 775 級＋螺桿", "2", "左右龍門"),
    ("驅動", "輸送帶馬達", "DC12V 減速馬達", "2", "並聯於 Y2 的繼電器"),
    ("驅動", "中間繼電器", "Omron MY2N-J DC24V＋底座", "6", "R1～R6，馬達正反轉"),
    ("驅動", "雙路繼電器模組", "DC24V 輸入", "1", "右馬達。要選低電位觸發，PLC 是漏型輸出"),
    ("驅動", "PWM 調速板", "DC12V", "2", "馬達速度，不經 PLC"),
    ("保護", "續流二極體", "線圈沒有內建保護時加裝", "每線圈", "陰極接 +24V 側，陽極接 Y 側"),
]

COMPARE = [
    ("項目", "架構書（FX3U-32MR）", "現在（FX3S-20MT＋2EYT-BD）"),
    ("模式開關", "X16", "X10"),
    ("啟動、停止、復歸", "X14、X15、X17 現場按鈕", "沒有輸入點，改由 LabVIEW 寫 M100、M101、M103"),
    ("左氣缸下降、上升", "Y10、Y11", "M8116、M8117（BY0、BY1）"),
    ("左吸盤", "Y12", "和右吸盤一起接 Y5，自動時兩邊輪流"),
    ("指示燈、蜂鳴器", "Y13、Y14、Y15", "沒有輸出點，狀態看 LabVIEW"),
    ("輸出型式", "繼電器，COM 接 24V", "電晶體漏型，COM 接 0V"),
    ("LabVIEW 通訊", "FX3U-485-BD 計算機連結", "內建 RS-422 埠＋編程協定，不用通訊板"),
    ("程式容量", "16000 步", "4000 步，程式約 900 步"),
]

LAYOUT = (["⏚", "S/S", "X1", "X3", "X5", "X7", "X11", "X13"],
          ["L", "N", "X0", "X2", "X4", "X6", "X10", "X12"],
          ["0V", "Y0", "Y1", "Y2", "Y3", "Y4", "Y6", "•"],
          ["24V", "COM0", "COM1", "COM2", "COM3", "COM4", "Y5", "Y7"])
BOARD = ["BY0+", "BY0-", "BY1+", "BY1-"]

STEPS = """開始前：斷電接線。這份是依架構書與三菱手冊整理，還沒有在實機驗證，通電前請對照實際器材再查一次。

1. PLC 電源
　AC 電源接 L、N，接地接 ⏚。電源迴路要有保險絲或斷路器。

2. 輸入共點
　用跳線把 S/S 接到 PLC 的 24V 端子，這就是漏型接法，NPN 感測器才能用。
　PLC 的 24V、0V 服務電源最多 400 mA，只給感測器和按鈕用。
　不要把外部電源接到 PLC 的 24V 端子。

3. 感測器與按鈕
　NPN 3 線：棕接 24V，藍接 0V，黑接 X。
　磁簧 2 線：棕接 X，藍接 0V。
　按鈕、選擇開關：一端接 X，另一端接 0V。
　急停用 NC 接點，平常 X13 要亮。

4. 電晶體輸出（這是和架構書最大的不同）
　架構書寫的是繼電器輸出，COM 接 24V。FX3S-20MT/ES 是電晶體漏型輸出，接法不同：
　　所有 COM 都接外部電源的 0V。
　　負載一端接 +24V，另一端接 Y。
　只能接直流 5～30V。每點最大 0.5 A，COM4（Y4～Y7）四點合計 0.8 A 以下。
　12V 馬達不能直接接 Y，一定要經過繼電器。
　擴充板 BY0、BY1 的接法看 FX3G-2EYT-BD 手冊，現場已接好的線先照原樣對線。
　Y5 同時接左右兩顆 3V110，兩顆線圈電流相加，要算進 COM4 的 0.8 A。

5. 線圈保護
　電磁閥、繼電器是電感負載，斷電會產生反向高壓。
　買有內建保護的線圈，或並聯續流二極體，陰極朝 +24V，陽極朝 Y。接反會短路。

6. 急停硬體迴路
　急停第二組 NC 接點串在負載的 +24V，不是串在 COM。
　這樣就算 PLC 故障，電磁閥和繼電器也會斷電。

7. 馬達超程保護
　LS1～LS4 的常閉接點串在馬達正反轉迴路，撞到就由硬體斷電，不進 PLC。
　繼電器也要做硬體互鎖，正反轉不能同時吸合。

8. 右馬達繼電器模組
　PLC 是漏型輸出，ON 時 Y 被拉到 0V。模組要選低電位觸發，不然要改用中間繼電器。

9. 通訊
　LabVIEW 用編程協定走內建 RS-422 埠，不用通訊板。
　轉換線 USB-SC09-FX 或 FX-USB-AW 接 PLC 圓形 8 pin 埠，裝好驅動後電腦會有 COM 埠。
　Main.vi 底部 PLC Transport 選 RS-422 (COM)，COM Port 選該埠，9600、7 位、偶校驗、1 停止位。
　PLC 參數的 PLC 系統(2) 不要勾，這個埠才會走編程協定。
　內建 USB 接 GX Works2。手冊在 GX2 裡選的是 [USB] 而不是 COM 埠，所以 LabVIEW 不一定抓得到。
　要用 USB 時，先看裝置管理員有沒有出現 COM 埠；有才能選 USB (COM)。

10. 通電檢查順序
　a. 先不接馬達與氣源，通電後看 PLC 面板輸入燈，用手觸發每顆感測器。
　b. PLC 在 STOP，確認輸出全滅。
　c. 接上氣源，手動測吸盤和氣缸。
　d. 手動低速測橫軸，方向相反就對調馬達線，不要改程式。
　e. 全部正確後才做原點復歸和自動運轉。
"""

GX2_TEXT = """PLC 程式裡本來就有手動（P7 段）。LabVIEW 只是寫 D106、D107，PLC 再轉成 M100～M125，真正推動輸出的是 PLC。
所以 GX Works2 也能操作，下面的按鈕做的事和 GX2 修改軟元件值完全相同。

用 GX2 手動：
1. 確認 LabVIEW 已關閉，選擇開關切到手動（X10 OFF），PLC 在 RUN。
2. 開監看，選單 Debug → Modify Value（中文介面名稱依版本而異）。
3. 輸入 M120，按 ON，右龍門開始往前。輸入 M120，按 OFF，才會停。
4. 動完回自動前要重新原點。

要注意：
．GX2 不是按住式，寫 ON 之後就一直 ON，一定要記得寫 OFF。橫軸會停在定位感測器，但感測器故障時會一路走到極限開關。
．吸盤 M114 和 M124 都是 Y5，左右兩顆一起動作。
．不要直接改 Y。程式每次掃描都會重新寫 Y，改了也會被蓋掉，而且會繞過互鎖。
．D240 不是 0 又沒有變化時，PLC 判定 HMI 斷線。重新上電會清成 0，或在 GX2 把 D240 改成 0。"""

JOG = [
    ("左龍門", [("往前", 110, True), ("往後", 111, True), ("上升", 113, True), ("下降", 112, True), ("吸盤（共用）", 114, False)]),
    ("右龍門", [("往前", 120, True), ("往後", 121, True), ("上升", 123, True), ("下降", 122, True), ("吸盤（共用）", 124, False)]),
    ("輸送帶", [("輸送帶", 125, False)]),
]

COLORS = {"bg": "#14171b", "x": "#2f6f4f", "y": "#8a5a18", "lack": "#a12f2f", "power": "#2c5a8c", "none": "#3a4149",
          "text": "#e8ebee", "dim": "#98a3af"}


def terminals():
    return set(t for row in LAYOUT for t in row) | set(BOARD)


def has_point(address):
    """X016 -> X16, the name printed on the terminal block. BY0 -> BY0+."""
    if address.startswith("BY"):
        return address + "+" in BOARD
    return address[0] + address[1:].lstrip("0").rjust(1, "0") in terminals()


def input_wiring(row):
    return row[3] % row[0]


def output_wiring(row):
    return COIL % (row[0], row[3]) if row[3] else "看 2EYT-BD 手冊，現場線照原樣"


def why_not_manual(plc):
    """Reasons M5 is off, in the order an operator can check them."""
    out = []
    if not plc.m[4]:
        out.append("X10 還在自動：模擬器視窗取消勾選「X10 自動模式」")
    if plc.m[0]:
        out.append("自動運轉中：按停止，等這一趟做完")
    if plc.m[21]:
        out.append("原點復歸中")
    if plc.m[2]:
        out.append("急停按著")
    elif plc.m[3]:
        out.append("有異常：先按復歸")
    if plc.t_on[30]:
        out.append("HMI 通訊中斷")
    return out


class GuideWindow(object):
    def __init__(self, root, rt, tk):
        from tkinter import ttk
        self.rt, self.tk, self.ttk = rt, tk, ttk
        self.board = getattr(rt, "board", True)
        self.win = tk.Toplevel(root)
        self.win.title("手動操作、器材與接線　" + ("FX3S-20MT＋2EYT-BD" if self.board else "FX3S-20MT 8 輸出同步版"))
        self.win.geometry("1120x780")
        style = ttk.Style(self.win)
        style.configure("Guide.Treeview", rowheight=27, font=("Microsoft JhengHei", 10))
        style.configure("Guide.Treeview.Heading", font=("Microsoft JhengHei", 10, "bold"))
        self.book = ttk.Notebook(self.win)
        self.book.pack(fill="both", expand=True, padx=6, pady=6)
        self.jog = {}
        self.page_manual()
        self.x_tree = self.io_page("X 輸入", INPUTS, input_wiring)
        self.outputs = OUTPUTS if self.board else OUTPUTS_8Y
        self.y_tree = self.io_page("Y 輸出", self.outputs, output_wiring)
        self.page_terminals()
        self.page_text("接線步驟", STEPS)
        self.page_parts()
        self.page_compare()
        self.refresh()

    def page(self, title):
        frame = self.tk.Frame(self.book)
        self.book.add(frame, text=" %s " % title)
        return frame

    def page_manual(self):
        tk = self.tk
        f = self.page("手動操作")
        self.state = tk.Label(f, text="", anchor="w", justify="left", padx=10, pady=8, font=("Microsoft JhengHei", 12, "bold"))
        self.state.pack(fill="x")
        row = tk.Frame(f)
        row.pack(fill="x", padx=8, pady=4)
        for name, buttons in JOG:
            box = tk.LabelFrame(row, text=name, font=("Microsoft JhengHei", 11))
            box.pack(side="left", padx=6, fill="y")
            for label, m, hold in buttons:
                text = "%s（M%d）%s" % (label, m, "按住" if hold else "切換")
                b = tk.Button(box, text=text, width=20, font=("Microsoft JhengHei", 10))
                if hold:
                    b.bind("<ButtonPress-1>", lambda e, n=m: self.write(n, 1))
                    b.bind("<ButtonRelease-1>", lambda e, n=m: self.write(n, 0))
                else:
                    b.configure(command=lambda n=m: self.write(n, 0 if self.rt.plc.m[n] else 1))
                b.pack(padx=6, pady=3)
                self.jog[m] = b
        tk.Label(f, text=GX2_TEXT, anchor="nw", justify="left", padx=12, pady=8, wraplength=1060,
                 font=("Microsoft JhengHei", 11)).pack(fill="both", expand=True)

    def write(self, m, value):
        self.rt.plc.m[m] = value

    def io_page(self, title, rows, wiring):
        ttk = self.ttk
        f = self.page(title)
        columns = ("addr", "name", "device", "wire", "now")
        tree = ttk.Treeview(f, columns=columns, show="headings", style="Guide.Treeview", height=18)
        heads = (("addr", "位址", 70), ("name", "名稱", 230), ("device", "接到", 250), ("wire", "怎麼接", 390), ("now", "現在", 70))
        for key, text, width in heads:
            tree.heading(key, text=text)
            tree.column(key, width=width, anchor="w")
        tree.tag_configure("on", background="#c8f0d2")
        for r in rows:
            tree.insert("", "end", iid=r[0], values=(r[0], r[1], r[2], wiring(r), "OFF"))
        tree.pack(fill="both", expand=True, padx=6, pady=6)
        self.tk.Label(f, text="綠色列＝現在 ON，和模擬器同步。",
                      anchor="w", font=("Microsoft JhengHei", 10)).pack(fill="x", padx=8, pady=(0, 6))
        return tree

    def page_terminals(self):
        tk = self.tk
        f = self.page("端子與接線圖")
        self.board = tk.Canvas(f, bg=COLORS["bg"], highlightthickness=0, height=640)
        self.board.pack(fill="both", expand=True, padx=6, pady=6)
        self.draw_terminals()

    def draw_terminals(self):
        c = self.board
        c.delete("all")
        top_in, low_in, top_out, low_out = LAYOUT
        c.create_text(20, 16, anchor="w", fill=COLORS["text"], font=("Microsoft JhengHei", 13, "bold"), text="FX3S-20MT/ES 端子台")
        self.strip(top_in, 40, 20)
        self.strip(low_in, 72, 44)
        self.strip(top_out, 122, 20)
        self.strip(low_out, 154, 44)
        if self.board:
            c.create_text(20, 208, anchor="w", fill="#8fe3a7", font=("Microsoft JhengHei", 11), text="擴充板 FX3G-2EYT-BD：")
            self.strip(BOARD, 194, 190)
        else:
            c.create_text(20, 208, anchor="w", fill="#8fe3a7", font=("Microsoft JhengHei", 11),
                          text="8 輸出同步版：左右氣缸線圈並聯在 Y3、Y4，左右吸盤線圈並聯在 Y5。")
        self.input_examples(250)
        self.output_example(250)

    def strip(self, names, y, x):
        c = self.board
        for name in names:
            kind = "none"
            if name[0] == "X":
                kind = "x"
            elif name[0] == "Y" or name.startswith("BY"):
                kind = "y"
            elif name not in ("•",):
                kind = "power"
            c.create_rectangle(x, y, x + 52, y + 30, fill=COLORS[kind], outline="#10151a")
            c.create_text(x + 26, y + 15, text=name, fill=COLORS["text"], font=("Consolas", 10, "bold"))
            x += 54

    def label(self, x, y, text, color=None, anchor="w", bold=False):
        font = ("Microsoft JhengHei", 10, "bold") if bold else ("Microsoft JhengHei", 10)
        self.board.create_text(x, y, anchor=anchor, fill=color or COLORS["text"], font=font, text=text)

    def line(self, points, color, width=2):
        self.board.create_line(*points, fill=color, width=width)

    def input_examples(self, y):
        c = self.board
        red, blue, black = "#e0584f", "#58a6ff", "#c9d1d9"
        self.label(20, y, "輸入（漏型）：S/S 接 24V，訊號接到 0V 時點亮", bold=True)
        self.label(20, y + 34, "PLC 24V", red)
        self.label(20, y + 64, "PLC S/S", red)
        self.line((88, y + 34, 120, y + 34, 120, y + 64, 88, y + 64), red)
        self.label(20, y + 94, "NPN 感測器", bold=True)
        c.create_rectangle(120, y + 118, 230, y + 196, outline=COLORS["dim"])
        self.label(175, y + 157, "3 線", anchor="center")
        for i, (color, text) in enumerate(((red, "棕 → 24V"), (black, "黑 → X0"), (blue, "藍 → 0V"))):
            yy = y + 134 + i * 23
            self.line((230, yy, 300, yy), color)
            self.label(306, yy, text, color)
        self.label(20, y + 228, "磁簧 2 線：棕 → X6，藍 → 0V", black)
        self.label(20, y + 254, "選擇開關：X10 → 開關 → 0V", black)
        self.label(20, y + 280, "急停 NC：X13 → 接點 → 0V，平常要亮", black)

    def output_example(self, y):
        c = self.board
        red, blue = "#e0584f", "#58a6ff"
        x = 500
        self.label(x, y, "輸出（電晶體漏型）：Y 導通時把線圈拉到 0V", bold=True)
        self.label(x, y + 34, "外部電源 +24V", red)
        self.line((x + 108, y + 34, x + 140, y + 34), red)
        c.create_rectangle(x + 140, y + 20, x + 240, y + 48, outline=red)
        self.label(x + 190, y + 34, "急停第 2 組 NC", anchor="center")
        self.line((x + 240, y + 34, x + 268, y + 34), red)
        c.create_rectangle(x + 268, y + 20, x + 330, y + 48, outline=red)
        self.label(x + 299, y + 34, "保險絲", anchor="center")
        self.line((x + 330, y + 34, x + 400, y + 34, x + 400, y + 70), red)
        c.create_rectangle(x + 350, y + 70, x + 450, y + 122, outline=COLORS["dim"])
        self.label(x + 400, y + 96, "電磁閥線圈", anchor="center")
        self.line((x + 400, y + 122, x + 400, y + 162), "#e8b04a")
        c.create_rectangle(x + 360, y + 162, x + 440, y + 190, fill=COLORS["y"], outline="")
        self.label(x + 400, y + 176, "Y3", anchor="center", bold=True)
        self.label(x + 460, y + 176, "PLC 內部電晶體", COLORS["dim"])
        self.line((x + 400, y + 190, x + 400, y + 226), "#e8b04a", 1)
        c.create_rectangle(x + 360, y + 226, x + 440, y + 254, fill=COLORS["power"], outline="")
        self.label(x + 400, y + 240, "COM3", anchor="center", bold=True)
        self.line((x + 400, y + 254, x + 400, y + 284), blue)
        self.label(x + 400, y + 300, "外部電源 0V", blue, anchor="center")
        c.create_line(x + 470, y + 70, x + 470, y + 122, fill="#8fe3a7", width=2)
        self.label(x + 480, y + 96, "續流二極體\n陰極朝 +24V", "#8fe3a7")
        self.label(x, y + 330, "所有 COM 都接 0V。12V 馬達一定要經過繼電器。", "#ffd27a")

    def page_text(self, title, text):
        tk = self.tk
        f = self.page(title)
        bar = tk.Scrollbar(f)
        bar.pack(side="right", fill="y")
        box = tk.Text(f, wrap="word", font=("Microsoft JhengHei", 11), yscrollcommand=bar.set, padx=12, pady=8)
        box.insert("1.0", text)
        box.configure(state="disabled")
        box.pack(fill="both", expand=True)
        bar.configure(command=box.yview)

    def page_parts(self):
        ttk = self.ttk
        f = self.page("器材清單")
        columns = ("kind", "name", "model", "qty", "note")
        tree = ttk.Treeview(f, columns=columns, show="headings", style="Guide.Treeview")
        heads = (("kind", "分類", 60), ("name", "項目", 150), ("model", "型號／規格", 330), ("qty", "數量", 60), ("note", "用途與注意", 470))
        for key, text, width in heads:
            tree.heading(key, text=text)
            tree.column(key, width=width, anchor="w")
        for row in PARTS:
            tree.insert("", "end", values=row)
        tree.pack(fill="both", expand=True, padx=6, pady=6)
        self.parts = tree

    def page_compare(self):
        tk = self.tk
        f = self.page("和架構書的差異")
        grid = tk.Frame(f)
        grid.pack(anchor="nw", padx=10, pady=10)
        for r, row in enumerate(COMPARE):
            for col, text in enumerate(row):
                bg = "#dfe6ee" if r == 0 else "#ffffff"
                tk.Label(grid, text=text, width=(18, 28, 50)[col], height=2, bg=bg, relief="groove",
                         font=("Microsoft JhengHei", 10, "bold" if r == 0 or col == 0 else "normal")).grid(row=r, column=col, sticky="nsew")
        tk.Label(f, justify="left", anchor="nw", padx=12, wraplength=1060, font=("Microsoft JhengHei", 11), text=(
            "左吸盤為什麼和右吸盤共用：\n"
            "機構要 11 個輸出，這台只有 10 個。Y5 同時接左右電磁閥，程式讓兩邊不會同時吸取或搬運，先到的先做，同時到時右龍門優先。\n"
            "代價是兩邊不能同時搬運，另一顆吸盤也會跟著空吸。\n\n"
            "如果現場左吸盤其實接在別的地方，改程式 P9 的 Y5 和 S20、S40 的條件即可。\n\n"
            "不裝擴充板時用 8 輸出同步版（python softplc.py --no-board，程式檔 GANTRY_8Y）：\n"
            "左右氣缸和吸盤一起動作，一邊有料另一邊就空跑一趟，橫軸仍各自控制。")).pack(fill="both", expand=True)

    def refresh(self):
        if not self.win.winfo_exists():
            return
        plc = self.rt.plc
        if plc.m[5]:
            self.state.configure(text="手動有效（M5 ON）：按鈕可用", bg="#c8f0d2", fg="#10321c")
        else:
            reasons = why_not_manual(plc) or ["等待條件"]
            self.state.configure(text="手動無效（M5 OFF），按了 PLC 不會動：" + "；".join(reasons), bg="#f6d5d5", fg="#4a1212")
        for m, button in self.jog.items():
            button.configure(bg="#7fe0a0" if plc.m[m] else "#f0f0f0")
        for tree, names, values in ((self.x_tree, INPUTS, plc.x), (self.y_tree, self.outputs, plc.y)):
            for row in names:
                address = row[0]
                on = plc.m[8116 + int(address[2:])] if address.startswith("BY") else values[int(address[1:], 8)]
                tree.set(address, "now", "ON" if on else "OFF")
                tree.item(address, tags=("on",) if on else ())
        self.win.after(150, self.refresh)


def open_window(root, rt, tk):
    """One window per simulator: it writes the same M bits as LabVIEW."""
    old = getattr(rt, "guide", None)
    if old is not None and old.win.winfo_exists():
        old.win.lift()
        return old
    rt.guide = GuideWindow(root, rt, tk)
    return rt.guide
