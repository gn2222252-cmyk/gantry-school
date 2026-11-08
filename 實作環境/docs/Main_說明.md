# Main.vi 說明

Main.vi 是上位機：看狀態、下命令、改參數、記錄。**機台邏輯全部在 PLC**，LabVIEW 只寫 M 命令與 D 參數，不直接寫 Y，上位機當掉時互鎖和急停仍由 PLC 負責。

面板同時有英文和中文：英文是控制項標籤，中文是旁邊的說明文字。中文全部是另外加的，就算變亂碼，英文還看得懂，功能也不受影響。

## 中文顯示與版本

LabVIEW 不是用 Unicode 存文字，而是用電腦的系統編碼，所以中文跟著檔案走，換編碼不同的電腦就亂碼。

| 版本 | 檔案 | 編碼 | 用在哪裡 |
| --- | --- | --- | --- |
| 2026 版 | `Main.vi` | GBK（936） | 這台電腦 |
| 18.0 版 | `LV2018\Main.vi` | Big5（950） | 繁體中文系統的電腦，LabVIEW 2018 以上 |

- **這台打開 `LV2018` 會是亂碼，這是正常的**，那份是給繁體電腦用的。
- 要確認電腦是哪一種，在 PowerShell 執行下面指令，950 是繁體，936 是簡體，437 或 1252 是英文。

```bash
powershell -c "[System.Text.Encoding]::Default.CodePage"
```

- 系統是英文時兩份的中文都會亂碼，只剩英文。可以到控制台的「地區 → 系統管理 → 變更系統地區設定」改成「中文（繁體，台灣）」，重開機後就正常。
- 畫面文字集中在 `panel_notes.py`，改完要重建，Big5 版的建法在 `README.md`。

## 怎麼操作

1. 在家沒有 PLC，先開模擬器：

```bash
python softplc\softplc.py
```

2. 打開 `Main.vi`，按 Run（白色箭頭）。等 **PLC Connected** 和底部 **PLC Alive** 亮。
3. 按 **Home**，等 **Homed** 亮。
4. 模擬器視窗按 **Add part on front belt** 放一個物件。
5. 按 **Start**。龍門開始搬運，機台圖和計數跟著動。
6. 按 **Stop**：做完這一趟才停。
7. 按 **Exit** 結束程式，不要用 Abort（紅色停止鈕），否則 PLC 收不到「HMI 離線」，手動模式下會報 40。

到實機時，**PLC Transport** 選 `COM`，**COM Port** 選埠，按 Run。

## 哪裡有中文說明

| 位置 | 內容 |
| --- | --- |
| Main 頁 | 機構介紹、流程、控制分工；每顆燈、每個數值、每個按鈕的中文 |
| 機台圖 | 輸送帶、龍門、感測器名稱，顏色圖例，異常時顯示中文訊息 |
| Manual 頁 | 什麼時候有效、每個按鈕的動作、互鎖規則 |
| Parameters 頁 | 每個參數的意義、範圍、斷電不保持 |
| IO Monitor 頁 | 32 點的中文名稱 |
| Alarm Log 頁 | 異常碼對照與處理方法 |
| 底部狀態列 | 每個欄位是什麼 |
| 滑鼠停在按鈕上 | 提示文字（Tip Strip） |
| 方塊圖 | 每個迴圈的用途、結束順序 |
| 每個 subVI | 面板與方塊圖上方有「說明：」，上方可能要捲動才看得到 |
| 模擬器視窗 | 全中文 |
| `GANTRY_PLC.txt` | 每段、每步都有中文註解 |

## 五個頁面

| 頁面 | 中文 | 內容 |
| --- | --- | --- |
| Main | 主畫面 | 機台圖、狀態燈、步序、計數、操作按鈕 |
| Manual | 手動 | 點動。**Manual Allowed** 亮才有效，不亮時按了 PLC 也不會動 |
| Parameters | 參數 | 改好數字按 **Write** |
| IO Monitor | I/O 監視 | D230、D231 共 32 顆燈；Y10、Y11、Y12 顯示左氣缸與左吸盤，標「未接」的點沒有端子 |
| Alarm Log | 異常紀錄 | 本次執行的異常表，**Export CSV** 匯出 |

### 操作按鈕

| 按鈕 | 中文 | 寫入 |
| --- | --- | --- |
| Start | 自動啟動 | M100 |
| Stop | 循環停止 | M101 |
| Home | 原點復歸 | M102 |
| Reset | 異常復歸 | M103 |
| Clear Counts | 計數清除 | D106 位元 4（M104） |
| Exit | 結束程式：運轉中先循環停止，最多等 20 秒 | M101，最後 D240 = 0 |

### 手動按鈕

| 按鈕 | 動作 | 寫入 | 方式 |
| --- | --- | --- | --- |
| L Forward／L Rearward | 左橫軸往前／往後 | M110／M111 | 按住 |
| L Down／L Up | 左氣缸下降／上升 | M112／M113 | 按住 |
| L Vacuum | 左吸盤 | M114 | 切換 |
| R Forward／R Rearward | 右橫軸往前／往後 | M120／M121 | 按住 |
| R Down／R Up | 右氣缸下降／上升 | M122／M123 | 按住 |
| R Vacuum | 右吸盤 | M124 | 切換 |
| Conveyors | 輸送帶 | D107 位元 15（M125） | 切換 |

橫軸點動碰到該方向的定位感測器會自動停下。龍門已經在前側時，按往前不會動，這是正常的。

**如果龍門在定位感測器外側**（例如感測器故障後撞到極限開關）：Home 找不回來，會報異常碼 30。切手動，往反方向點動約 1 秒，再按 Home。工件不用動。

### 參數

| 控制項 | 位址 | 範圍 | 預設 |
| --- | --- | --- | --- |
| Vacuum Time (0.1 s) | D100 | 1～100 | 5 |
| Release Time (0.1 s) | D101 | 1～100 | 5 |
| Step Timeout (0.1 s) | D102 | 10～600 | 50 |
| Target Cycles (0 = no limit) | D103 | 0～32767 | 0 |

### 異常碼

| 碼 | 面板文字 | 中文 | 處理 |
| --- | --- | --- | --- |
| 1 | E-STOP | 急停 | 放開急停 → Reset → Home |
| 10 | RIGHT AXIS TIMEOUT | 右橫軸逾時 | 查馬達、X2、X3、極限開關 |
| 11 | RIGHT CYLINDER TIMEOUT | 右氣缸逾時 | 查氣壓、X11、X12 |
| 20 | LEFT AXIS TIMEOUT | 左橫軸逾時 | 查馬達、X0、X1、極限開關 |
| 21 | LEFT CYLINDER TIMEOUT | 左氣缸逾時 | 查氣壓、X6、X7 |
| 30 | HOMING TIMEOUT | 原點復歸逾時 | 查上面全部 |
| 40 | HMI LINK LOST | 手動模式通訊中斷 | 查 485 線 → Reset |

## 程式結構

| 迴圈 | 週期 | 做什麼 | 為什麼分開 |
| --- | --- | --- | --- |
| 通訊 | 200 ms | 唯一碰序列埠的迴圈：寫佇列命令、讀監視資料、傳給 Notifier | 避免多個迴圈搶 VISA |
| 顯示 | 收到資料就更新 | 更新畫面、處理 Exit | 畫圖慢時不影響通訊 |
| UI | 50 ms | 掃描按鈕，有變化才放進佇列 | 按鈕反應不用等通訊 |
| 紀錄 | 收到資料就檢查 | 異常碼或計數變化時寫 CSV | 寫檔慢時不影響通訊 |

**Notifier** 只保留最新一筆，適合監視資料；**佇列**一筆都不能掉，適合命令。

Notifier 內容是 44 個 U16：

| 索引 | 內容 |
| --- | --- |
| 0～41 | D200～D241 |
| 42 | M200～M205 組成的字 |
| 43 | 連線旗標，1 = 這圈通訊成功 |

### 結束順序

按 Exit → 顯示迴圈結束 → **Release Queue** → UI、通訊迴圈因佇列失效而結束 → 寫 D240 = 0 → 關埠 → **Release Notifier** → 紀錄迴圈結束。

釋放節點的 **error in** 都接前一個迴圈的輸出。LabVIEW 是資料流，沒接的話它一開始就會執行。

### 斷線

讀寫出錯 → `Comm_Step` 把 Connected 設 False → 下一圈關埠重開，並**清空命令佇列**。斷線期間按的點動不會在重連後才送出去，這是刻意的。

## VI 清單

### driver\（通訊層）

| VI | 輸入 | 輸出 | 流程 |
| --- | --- | --- | --- |
| `FX_BuildFrame` | Command、Content | Frame | `00FF` + 指令 + `0` + 內容 → 加總取低 8 位 → 前面加 ENQ，後面加校驗 |
| `FX_Xfer` | PLC Conn、TX、Data Chars | RX | 寫出 → 讀 1 位元組判斷種類 → STX 再讀 Data Chars + 7，NAK 讀 6，其餘讀 4 |
| `FX_ParseResponse` | RX | Data | 驗校驗，取出資料。NAK 或校驗錯轉成錯誤碼 |
| `FX_Open` | Transport、Host、Port、COM Port | PLC Conn | TCP 走 VISA Open；COM 走 9600 7E1。再讀一次 D241 確認通 |
| `FX_Close` | PLC Conn | | VISA Close |
| `FX_ReadWords` | Device、Count | Words | WR，4 字元一字用 For Loop 轉 U16 |
| `FX_ReadBits` | Device、Count | Bits | BR，字元等於 '1' 就是 True |
| `FX_WriteBit` | Device、Value | | BW |
| `FX_WriteWord` | Device、Value | | WW |
| `FX_PulseBit` | Device | | 寫 ON，PLC 端自行 RST |
| `FX_Test` | | | 單獨測通訊用 |

Device 是 5 字元文字，例如 `D0200`、`M0100`、`X0000`。

### host\（上位機）

| VI | 做什麼 |
| --- | --- |
| `Comm_Step` | 通訊迴圈的一圈，含斷線重連 |
| `FX_WriteRaw` | 依命令字串第一字決定 BW 或 WW |
| `Beat_Tick` | 每秒把 D240 放進佇列，值在 1～32767 循環（0 保留給「沒有 HMI」） |
| `Tags_Parse` | 44 字拆成各項狀態 |
| `Cmd_Edges` | 按鈕陣列與上一圈比較，有變化才放進佇列 |
| `Param_Cmds` | 限制範圍後寫 D100～D103 |
| `AlarmText` | 異常碼轉文字 |
| `Draw_Machine` | 畫機台圖。沒有位置回授，只能畫「前側、後側、中間」三種位置 |
| `Log_Write` | 寫 `logs\yyyy-mm-dd.csv`，新檔先寫標題 |
| `Host_Lookup`、`Host_ErrOnly` | 從 13_PLC 複製，沒有改 |

## 和架構書不同的地方

| 架構書 | 實際 | 原因 |
| --- | --- | --- |
| `.vi` 無法產生，只交說明 | 交真的 VI，也附這份說明 | v2 工具可以建 |
| UI 迴圈用 Event Structure | 50 ms 掃描 | 腳本無法註冊事件。要改的話用手動在 LabVIEW 加，邏輯都在 `Cmd_Edges` |
| 手動頁非手動模式反灰 | 用 **Manual Allowed** 燈表示，PLC 拒絕命令 | 腳本無法建立 Property Node。安全由 PLC 保證 |
| `Tags.ctl` 叢集 | `Tags_Parse.vi` | 腳本無法做 Type Def 叢集 |
| `FX_ParseResponse` 等 VI 名稱 | 相同，另加 `FX_Xfer`、`FX_Test` | 拆出共用部分 |

## 紀錄檔

`logs\yyyy-mm-dd.csv`，欄位：Time, Event, Code, Text, RightCount, LeftCount。Event 是 ALARM、CLEAR 或 TRANSFER。

**Export CSV** 把異常表寫到 `logs\alarm_export.csv`，會覆蓋舊檔。
