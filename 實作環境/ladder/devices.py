# -*- coding: utf-8 -*-
"""Device comment table: (device, Chinese comment, English comment). build_ladder.py writes the CSV files.
FX3S-20MT/ES has X0-X13, Y0-Y7. FX3G-2EYT-BD adds BY0 (M8116), BY1 (M8117). Change the wiring here, not in the program."""

X = [
    ("X000", "左龍門_前側位置", "L gantry front pos"),
    ("X001", "左龍門_後側位置", "L gantry rear pos"),
    ("X002", "右龍門_前側位置", "R gantry front pos"),
    ("X003", "右龍門_後側位置", "R gantry rear pos"),
    ("X004", "前輸送帶_右端到位", "Front belt right end"),
    ("X005", "後輸送帶_左端到位", "Rear belt left end"),
    ("X006", "左氣缸_上限", "L cylinder up"),
    ("X007", "左氣缸_下限", "L cylinder down"),
    ("X010", "模式(ON自動)", "Mode (ON auto)"),
    ("X011", "右氣缸_上限", "R cylinder up"),
    ("X012", "右氣缸_下限", "R cylinder down"),
    ("X013", "急停(NC)", "E-stop (NC)"),
]

Y = [
    ("Y000", "左橫軸_往前", "L axis forward"),
    ("Y001", "左橫軸_往後", "L axis rearward"),
    ("Y002", "輸送帶運轉", "Conveyors run"),
    ("Y003", "右氣缸_上升", "R cylinder up"),
    ("Y004", "右氣缸_下降", "R cylinder down"),
    ("Y005", "吸盤_真空(左右共用)", "Vacuum, both"),
    ("Y006", "右橫軸_往後", "R axis rearward"),
    ("Y007", "右橫軸_往前", "R axis forward"),
]

# LabVIEW's I/O page shows the 16 bits of D230 and D231.
X_WORD = X + [("X0%d" % n, "未接", "Not wired") for n in (14, 15, 16, 17)]
Y_WORD = Y + [("Y010", "左氣缸_下降 M8116", "L down M8116"), ("Y011", "左氣缸_上升 M8117", "L up M8117"),
              ("Y012", "左吸盤(Y5)", "L vacuum (Y5)")] + [("Y0%d" % n, "未接", "Not wired") for n in (13, 14, 15, 16, 17)]

# Everything the program drives, in the order of the auto relays M50-M60 and manual relays M70-M80.
OUTPUTS = Y + [("M8116", "左氣缸_下降", "L cylinder down"), ("M8117", "左氣缸_上升", "L cylinder up"),
               ("Y005", "左吸盤_真空", "L vacuum")]

_AUTO = "自動"
_HAND = "手動"

OTHER = [
    ("S0", "待機", "Stand-by"),
    ("S10", "原點_輸出全關", "Home all off"),
    ("S11", "原點_氣缸上升", "Home cylinders up"),
    ("S12", "原點_橫軸回位", "Home axes"),
    ("S13", "原點_完成", "Home done"),
    ("S20", "右_等料", "R wait part"),
    ("S21", "右_下降取料", "R down to pick"),
    ("S22", "右_吸附", "R vacuum on"),
    ("S23", "右_上升", "R up"),
    ("S24", "右_往後", "R to rear"),
    ("S25", "右_下降放料", "R down to place"),
    ("S26", "右_釋放", "R vacuum off"),
    ("S27", "右_上升", "R up"),
    ("S28", "右_回原點", "R back home"),
    ("S40", "左_等料", "L wait part"),
    ("S41", "左_下降取料", "L down to pick"),
    ("S42", "左_吸附", "L vacuum on"),
    ("S43", "左_上升", "L up"),
    ("S44", "左_往前", "L to front"),
    ("S45", "左_下降放料", "L down to place"),
    ("S46", "左_釋放", "L vacuum off"),
    ("S47", "左_上升", "L up"),
    ("S48", "左_回原點", "L back home"),
    ("S59", "ZRST範圍上限", "ZRST range end"),
    ("M0", "自動運轉中", "Auto running"),
    ("M1", "循環停止要求", "Cycle stop request"),
    ("M2", "急停中", "E-stop active"),
    ("M3", "異常中", "Alarm active"),
    ("M4", "手動模式", "Manual mode"),
    ("M5", "手動有效", "Manual allowed"),
    ("M6", "啟動脈衝", "Start pulse"),
    ("M7", "停止脈衝", "Stop pulse"),
    ("M8", "復歸脈衝", "Reset pulse"),
    ("M9", "原點命令脈衝", "Home cmd pulse"),
    ("M14", "開始原點復歸", "Start homing"),
    ("M15", "異常解除脈衝", "Alarm cleared pulse"),
    ("M16", "開始自動", "Start auto"),
    ("M17", "右步序受監視", "R step watched"),
    ("M18", "左步序受監視", "L step watched"),
    ("M20", "原點完成", "Homed"),
    ("M21", "原點復歸執行中", "Homing"),
    ("M22", "通訊中斷脈衝", "Link lost pulse"),
    ("M24", "右龍門這趟有料", "R carried a part"),
    ("M25", "左龍門這趟有料", "L carried a part"),
    ("M23", "PLC心跳脈衝", "PLC beat pulse"),
    ("M100", "HMI_自動啟動", "HMI start"),
    ("M101", "HMI_停止", "HMI stop"),
    ("M102", "HMI_原點復歸", "HMI home"),
    ("M103", "HMI_異常復歸", "HMI reset"),
    ("M110", "手動_左橫軸往前", "Jog L forward"),
    ("M111", "手動_左橫軸往後", "Jog L rearward"),
    ("M112", "手動_左氣缸下降", "Jog L down"),
    ("M113", "手動_左氣缸上升", "Jog L up"),
    ("M114", "手動_左吸盤", "Manual L vacuum"),
    ("M120", "手動_右橫軸往前", "Jog R forward"),
    ("M121", "手動_右橫軸往後", "Jog R rearward"),
    ("M122", "手動_右氣缸下降", "Jog R down"),
    ("M123", "手動_右氣缸上升", "Jog R up"),
    ("M124", "手動_右吸盤", "Manual R vacuum"),
    ("M125", "手動_輸送帶", "Manual conveyors"),
    ("M104", "計數清除", "Clear counts"),
    ("M308", "Y字_左氣缸下降", "Y word L down"),
    ("M309", "Y字_左氣缸上升", "Y word L up"),
    ("M310", "Y字_左吸盤", "Y word L vacuum"),
    ("M200", "狀態_自動運轉中", "St auto"),
    ("M201", "狀態_手動模式", "St manual"),
    ("M202", "狀態_原點完成", "St homed"),
    ("M203", "狀態_異常中", "St alarm"),
    ("M204", "狀態_急停中", "St e-stop"),
    ("M205", "狀態_循環停止中", "St cycle stop"),
    ("T0", "右吸附延時", "R vacuum delay"),
    ("T1", "右釋放延時", "R release delay"),
    ("T2", "左吸附延時", "L vacuum delay"),
    ("T3", "左釋放延時", "L release delay"),
    ("T10", "右龍門步序逾時", "R step timeout"),
    ("T11", "左龍門步序逾時", "L step timeout"),
    ("T12", "原點復歸逾時", "Home timeout"),
    ("T30", "HMI心跳監視", "HMI link watch"),
    ("C0", "右龍門搬運次數", "R transfers"),
    ("C1", "左龍門搬運次數", "L transfers"),
    ("D100", "吸附時間x0.1s", "Vacuum time x0.1s"),
    ("D101", "釋放時間x0.1s", "Release time x0.1s"),
    ("D102", "動作逾時x0.1s", "Timeout x0.1s"),
    ("D103", "目標循環次數", "Target cycles"),
    ("D106", "HMI脈衝命令字", "HMI pulse word"),
    ("D107", "HMI手動命令字", "HMI jog word"),
    ("D200", "右龍門步序", "R step"),
    ("D201", "左龍門步序", "L step"),
    ("D202", "原點步序", "Home step"),
    ("D210", "右搬運次數", "R count"),
    ("D211", "左搬運次數", "L count"),
    ("D212", "總循環數", "Total cycles"),
    ("D220", "異常碼", "Alarm code"),
    ("D230", "X狀態字", "X word"),
    ("D231", "Y狀態字", "Y word"),
    ("D232", "HMI狀態字", "HMI status word"),
    ("D240", "HMI心跳", "HMI beat"),
    ("D241", "PLC心跳", "PLC beat"),
    ("D250", "前一掃描右步序", "Prev R step"),
    ("D251", "前一掃描左步序", "Prev L step"),
    ("D252", "前一掃描原點步序", "Prev home step"),
    ("D253", "前一掃描HMI心跳", "Prev HMI beat"),
    ("D254", "前一掃描手動命令字", "Prev jog word"),
]


def relays():
    """M50-M60 auto relays and M70-M80 manual relays, one for each output in order."""
    out = []
    for base, zh, en in ((50, _AUTO, "Auto "), (70, _HAND, "Hand ")):
        for i, (_, z, e) in enumerate(OUTPUTS):
            out.append(("M%d" % (base + i), zh + "_" + z, en + e))
    return out


# 8-output synchronous version: left and right valves are wired in parallel
SYNC_NAMES = {"Y003": ("氣缸_上升(左右)", "Cylinders up"), "Y004": ("氣缸_下降(左右)", "Cylinders down")}


def table_sync():
    rows = []
    for row in table():
        if row[0] in SYNC_NAMES:
            rows.append((row[0],) + SYNC_NAMES[row[0]])
        elif row[0] not in ("M8116", "M8117"):
            rows.append(row)
    return rows


def table():
    extra = [("M8116", "擴充板BY0_左氣缸下降", "Board BY0 L down"), ("M8117", "擴充板BY1_左氣缸上升", "Board BY1 L up")]
    return X + Y + extra + OTHER + relays()
