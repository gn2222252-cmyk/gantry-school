# -*- coding: utf-8 -*-
"""Chinese text for the LabVIEW panels and diagrams. English labels stay, so a PC whose code page cannot show
Chinese still has a readable panel. Coordinates are panel coordinates; page 0 Main ... 4 Alarm Log.

LabVIEW stores text in the system code page, not Unicode. This PC is 936 (GBK), a Traditional Chinese PC is
950 (Big5). With GANTRY_BIG5=1 every string is turned into Big5 bytes, then read as 936, because LabVIEW will
write it back here as 936: the bytes in the VI end up being Big5. Such a VI looks wrong here and right on a 950 PC."""
import ctypes
import os

BIG5 = os.environ.get("GANTRY_BIG5") == "1"


def zh(text):
    """The string to hand to LabVIEW for Chinese text."""
    if not BIG5:
        return text
    data = text.encode("cp950")
    k32 = ctypes.windll.kernel32
    size = k32.MultiByteToWideChar(936, 8, data, len(data), None, 0)       # 8: refuse invalid bytes
    if not size:
        raise ValueError("cannot pass as code page 936: " + text)
    buf = ctypes.create_unicode_buffer(size)
    k32.MultiByteToWideChar(936, 8, data, len(data), buf, size)
    return buf.value[:size]


def _walk(x):
    if isinstance(x, str):
        return zh(x)
    if isinstance(x, list):
        return [_walk(v) for v in x]
    if isinstance(x, tuple):
        return tuple(_walk(v) for v in x)
    if isinstance(x, dict):
        return {k: _walk(v) for k, v in x.items()}          # keys are names and paths, values are text
    return x

MAIN_INFO = (
    "【這是什麼機台】雙龍門取放循環搬運機\n"
    "兩條平行、方向相反的輸送帶由同一個輸出驅動，兩端各跨一座龍門。\n"
    "流程：前輸送帶（左→右）送到右端 → 右龍門吸起，搬到後輸送帶 →\n"
    "　　　後輸送帶（右→左）送到左端 → 左龍門吸起，放回前輸送帶，一直循環。\n"
    "龍門機構：橫軸＝直流馬達＋螺桿，在前側、後側之間移動；\n"
    "　　　　　升降氣缸＝雙動電磁閥；吸盤＝真空，單動常閉電磁閥。\n"
    "控制分工：FX3S PLC 負責動作與互鎖，本程式只下命令、看狀態、改參數、記錄。\n"
    "操作順序：Home 回原點 → 放工件 → Start。Stop 會做完這一趟才停。"
)

PAGE_MAIN = [
    (696, 70, "與 PLC 通訊正常"), (696, 114, "自動運轉中"), (696, 158, "模式開關在手動"), (696, 202, "原點完成"),
    (696, 246, "循環停止中"), (696, 290, "異常中"), (696, 334, "急停按下中"),
    (862, 76, "右龍門搬運次數"), (862, 128, "左龍門搬運次數"), (862, 180, "完整循環圈數"), (862, 232, "異常碼 0＝正常"),
    (84, 372, "左龍門步序"), (248, 372, "原點步序"), (408, 372, "右龍門步序"), (566, 372, "異常說明"),
    (670, 426, "啟動"), (750, 426, "停止"), (830, 426, "原點復歸"),
    (670, 486, "異常復歸"), (750, 486, "計數清除"), (670, 546, "結束程式"), (14, 448, MAIN_INFO),
]

PAGE_MANUAL = [
    (160, 54, "手動說明：模式開關 X10 切到手動（OFF）、沒有異常、通訊正常時，左邊的燈才會亮，按鈕才有效。\n"
              "燈不亮時按了也不會動，這是 PLC 擋下來的。"),
    (130, 96, "左龍門（原點在後側）"), (630, 96, "右龍門（原點在前側）"),
    (130, 148, "上升（按住）"), (130, 268, "下降（按住）"), (130, 338, "吸盤（按一下切換）"),
    (30, 208, "往後（按住）"), (230, 208, "往前（按住）"),
    (630, 148, "上升（按住）"), (630, 268, "下降（按住）"), (630, 338, "吸盤（按一下切換）"),
    (530, 208, "往後（按住）"), (730, 208, "往前（按住）"), (380, 428, "兩條輸送帶（按一下切換）"),
    (30, 470, "互鎖由 PLC 負責，按了不動通常是互鎖擋下：\n"
              "1. 氣缸不在上限時，橫軸不能動。　2. 不在前側或後側定位點時，氣缸不能下降。\n"
              "3. 往前／往後、上升／下降不會同時動作。　4. 通訊中斷時，手動動作全部自動停止。\n"
              "手動動過機構後會清除原點完成，回自動前要再按一次 Home。"),
]

PAGE_PARAM = [
    (40, 40, "參數說明：改好數字後按 Write 才會寫進 PLC。單位 0.1 秒，例如 5 ＝ 0.5 秒。"),
    (104, 92, "吸附時間（D100）：吸盤開啟後等多久才上升，太短可能吸不牢。範圍 1～100"),
    (104, 152, "釋放時間（D101）：吸盤關閉後等多久才上升，太短工件可能被帶起來。範圍 1～100"),
    (104, 212, "動作逾時（D102）：一個動作超過這個時間沒到位就報異常。範圍 10～600"),
    (104, 272, "目標循環次數（D103）：做到這個圈數自動停止，0 ＝ 不限。"),
    (40, 348, "Write：把上面四個值寫進 PLC。"),
    (40, 372, "注意：D100～D103 斷電不保持，PLC 重新上電後回到預設值，要再按一次 Write。"),
]

ALARM_HELP = (
    "異常碼對照與處理\n"
    "1　急停：放開急停 → Reset → Home\n"
    "10　右橫軸逾時：查馬達、X2、X3、極限開關\n"
    "11　右氣缸逾時：查氣壓、X11、X12\n"
    "20　左橫軸逾時：查馬達、X0、X1、極限開關\n"
    "21　左氣缸逾時：查氣壓、X6、X7\n"
    "30　原點復歸逾時：查上面全部\n"
    "40　手動模式通訊中斷：查 485 線 → Reset\n\n"
    "復歸：按一次 Reset 清異常，再按一次回原點。\n"
    "急停會放掉工件，復歸前先確認工件位置。"
)

PAGE_LOG = [
    (130, 62, "匯出到 logs\\alarm_export.csv（會覆蓋舊檔）。每日完整紀錄在 logs\\yyyy-mm-dd.csv。"),
    (560, 110, ALARM_HELP),
]

STATUS_BAR = [
    (8, 664, "連線：TCP＝模擬器，RS-422＝實機"), (234, 664, "模擬器埠號"), (320, 664, "實機序列埠"),
    (470, 664, "PLC 心跳有在變化"), (620, 664, "最後更新時間"),
]

ALARM_ZH = ("\n0=正常\n1=急停 E-STOP\n10=右橫軸逾時 RIGHT AXIS TIMEOUT\n11=右氣缸逾時 RIGHT CYLINDER TIMEOUT\n"
            "20=左橫軸逾時 LEFT AXIS TIMEOUT\n21=左氣缸逾時 LEFT CYLINDER TIMEOUT\n30=原點復歸逾時 HOMING TIMEOUT\n"
            "40=通訊中斷 HMI LINK LOST\n")
RIGHT_ZH = "\n0=停止\n20=等料\n21=下降取料\n22=吸附\n23=上升\n24=往後\n25=下降放料\n26=釋放\n27=上升\n28=回原點\n"
LEFT_ZH = "\n0=停止\n40=等料\n41=下降取料\n42=吸附\n43=上升\n44=往前\n45=下降放料\n46=釋放\n47=上升\n48=回原點\n"
HOME_ZH = "\n0=待機\n10=輸出全關\n11=氣缸上升\n12=橫軸回原點\n13=完成\n"

TIPS = {
    "Start": "自動啟動：要在自動模式且已原點完成", "Stop": "循環停止：做完這一趟、回原點才停",
    "Home": "原點復歸：氣缸上升，左龍門回後側，右龍門回前側", "Reset": "異常復歸：急停要先放開，復歸後要重新 Home",
    "Clear Counts": "計數歸零", "Exit": "結束程式。運轉中會先循環停止，最多等 20 秒。不要用 LabVIEW 的紅色 Abort",
    "L Forward": "左橫軸往前（Y0），按住動作", "L Rearward": "左橫軸往後（Y1），按住動作",
    "L Down": "左氣缸下降（M8116），按住動作", "L Up": "左氣缸上升（M8117），按住動作", "L Vacuum": "吸盤（Y5，左右共用），按一下切換",
    "R Forward": "右橫軸往前（Y7），按住動作", "R Rearward": "右橫軸往後（Y6），按住動作",
    "R Down": "右氣缸下降（Y4），按住動作", "R Up": "右氣缸上升（Y3），按住動作", "R Vacuum": "吸盤（Y5，左右共用），按一下切換",
    "Conveyors": "兩條輸送帶（Y2），按一下切換", "Write": "把參數寫進 PLC", "Export CSV": "把異常表匯出成 CSV",
}

DIAGRAM = [
    ((244, -24), "【通訊迴圈】唯一碰序列埠的迴圈，週期 200 ms。先寫佇列裡的命令，再讀 D200～D241 和 M200～M205，結果用 Notifier 傳給其他迴圈。"),
    ((244, 336), "【顯示迴圈】收到資料就更新畫面。Exit 也在這裡：運轉中先下循環停止，最多等 20 秒。這個迴圈結束會帶動整個程式結束。"),
    ((244, 996), "【UI 迴圈】每 50 ms 掃描按鈕，有變化才放進命令佇列。按鈕不直接碰通訊，所以不會卡畫面。"),
    ((244, 1456), "【紀錄迴圈】異常碼或搬運次數變化時寫 CSV，新異常加進 Alarm History 表。"),
    ((-200, 20), "佇列：命令一筆都不能掉。\nNotifier：監視資料只要最新一筆。"),
    ((1240, 60), "通訊迴圈結束後：寫 D240 = 0 告訴 PLC 是正常離線，再關埠，最後釋放 Notifier 讓紀錄迴圈結束。"),
    ((2600, 660), "顯示迴圈結束 → 釋放佇列 → UI、通訊迴圈結束。\nerror in 一定要接前一個迴圈的輸出，否則一開始就會釋放。"),
]

SUBVI = {
    "driver/FX_BuildFrame.vi": "組編程協定封包：STX + 命令 + 內容 + ETX + 和校驗。和校驗＝STX 之後到 ETX 的總和取低 8 位。",
    "driver/FX_Xfer.vi": "送出封包並收回應。先讀 1 位元組判斷種類：STX 再讀資料＋3，ACK、NAK 不用再讀。",
    "driver/FX_ParseResponse.vi": "檢查回應。ACK 沒有資料；STX 驗和校驗後取出資料；NAK 或校驗錯誤轉成錯誤碼。",
    "driver/FX_Open.vi": "開通訊。TCP 給模擬器，RS-422、USB 走 COM 埠，固定 9600、7 位、偶校驗、1 停止位。送 ENQ 收到 ACK 才算連上。",
    "driver/FX_Close.vi": "關閉通訊埠。有錯誤也會執行。",
    "driver/FX_ReadWords.vi": "讀 D。D0 位址 1000h，每個 D 兩位元組，低位元組在前。每次最多 64 位元組。",
    "driver/FX_WriteWord.vi": "寫一個 D，低位元組在前。",
    "driver/FX_Test.vi": "單獨測通訊用，固定走 TCP，只給模擬器。",
    "host/Comm_Step.vi": "通訊迴圈的一圈。已連線：寫完佇列命令再讀監視資料。未連線：重開，並清空佇列，避免舊的點動命令在重連後才送出。",
    "host/Cmd_JogWord.vi": "手動按鈕有變動時，把全部按鈕組成一個字寫到 D107。放開時寫回 0。",
    "host/FX_WriteRaw.vi": "把佇列字串變成一次寫入。例：D01060004 表示 D106 寫 4，後 4 位是十六進位。",
    "host/Beat_Tick.vi": "每秒把 D240 放進佇列，值在 1～32767 循環。0 保留給「沒有 HMI」。",
    "host/Tags_Parse.vi": "把 44 個字拆成各項狀態。0～41 ＝ D200～D241，42 ＝ M200～M205，43 ＝ 連線旗標。",
    "host/Cmd_Edges.vi": "按鈕陣列和上一圈比較，有變化才放進佇列。Rising Only 為 True 時只送按下，放開不送。",
    "host/Param_Cmds.vi": "按 Write 時把四個參數限制範圍後放進佇列。",
    "host/AlarmText.vi": "異常碼轉英文文字。",
    "host/Log_Write.vi": "在 logs 資料夾的當天 CSV 後面加一行，新檔先寫標題。用 open or create，不能用 replace。",
    "host/Draw_Machine.vi": "畫機台圖。這台沒有位置回授，只能依感測器畫前側、後側、中間三種位置。",
    "host/Host_Lookup.vi": "代碼查文字，表格格式：換行 + 代碼 = 文字。從 13_PLC 複製。",
    "host/Host_ErrOnly.vi": "只放行真正的錯誤，濾掉 VISA 的警告。從 13_PLC 複製。",
}

if BIG5:
    for _name in ("MAIN_INFO", "PAGE_MAIN", "PAGE_MANUAL", "PAGE_PARAM", "ALARM_HELP", "PAGE_LOG", "STATUS_BAR", "ALARM_ZH",
                  "RIGHT_ZH", "LEFT_ZH", "HOME_ZH", "TIPS", "SUBVI"):
        globals()[_name] = _walk(globals()[_name])
    DIAGRAM = [(xy, zh(text)) for xy, text in DIAGRAM]
