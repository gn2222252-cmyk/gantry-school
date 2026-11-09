# Host_Main 說明

`Host_Main.vi` 是 PLC 版的上位機。PLC 控制機台，Host_Main 負責檢測、畫面和 MES。

前面板文字全部用英文，因為學校的 LabVIEW 是英文版，中文容易變亂碼。中文對照在這份文件。

## 怎麼操作

### 開機順序

1. 開軟體 PLC（在家才需要）：

```bash
python softplc\softplc.py
```

2. 開周邊模擬（相機、伺服、MES）：

```bash
python periph\periph_sim.py
```

3. 在 LabVIEW 打開 `Host_Main.vi`，按 Run（白色箭頭）。
4. 等 **PLC Connected** 燈亮、**Lot Started** 燈亮，**Step** 顯示 `30 Idle`。
5. 按 **Start** 開始生產。

### 平常操作

| 按鈕 | 做什麼 | 寫入 |
| --- | --- | --- |
| Start | 開始連續生產。MES 開批失敗時不會動作，Exit Status 顯示 `Lot not started`，要排除 MES 問題後重開程式 | D100 = 1 |
| Cycle Stop | 做完這顆再停，回 Idle | D100 = 2 |
| Reset | 警報排除後復歸 | D100 = 3 |
| Exit | 做完這顆再停，PLC 回 Idle 後才結批離線 | D100 = 2 |

### 檔案位置

**Recipe Dir 留空**時，程式用自己所在資料夾的 `periph\recipes`，所以整個資料夾搬到 D 槽也不用改。要用別的機種資料夾才需要填。

### 參數（SETUP 區下方）

只有 Idle 時才會寫入 PLC，運轉中改的值會等回到 Idle 才生效。

| 控制項 | 位址 | 意思 | 範圍 | 預設 |
| --- | --- | --- | --- | --- |
| Speed % | D530 | 輸送帶速度 | 20～100 | 60 |
| Timeout | D531 | 檢測逾時，單位 0.1 秒 | 10～300 | 50（5 秒） |
| Bin Cap | D532 | NG 料盒容量 | 1～99 | 20 |

動線圖上的 `NG n/容量` 會跟著 Bin Cap 變。

### Exit 的流程

1. 按 Exit，**Exit Status** 顯示 `Stopping...`，程式寫 D100 = 2。
2. 等 PLC 回到 Idle。如果已經在警報中或斷線，就不等。
3. 最多等 20 秒。等不到時顯示 `Exit timeout: PLC left to 9006`，由 PLC 的心跳保護接手。
4. MES 結批，關閉連線。

### 生產紀錄

全黑或完全沒有針腳時判 NG，前面板 Pins Defect 和 CSV 都顯示 `image_invalid`，Surface Defect 留空。每檢測一顆寫一行到 **Log Dir**（預設 `D:\aoi_log`）底下的 `yyyy-mm-dd.csv`。欄位：Time, Lot, PartID, Recipe, PinCount, Pitch_mm, Width_mm, DarkPx, Result, PinDefect, WidthDefect, SurfaceDefect。

### 有警報時

1. 看 **Alarm Code** 和 **Alarm Text**，也可以對照下面的表。
2. 排除原因。
3. 按 **Reset**。原因還在時按了沒有用，這是刻意的。
4. 機台會重新清線，回到 Idle，再按 **Start**。

伺服警報（9008）不是 PLC 自己的異常。按 Reset 後，Host_Main 在步序 20 清線時自動重做 ALMCLR、SVON 1、HOME。

### TRAINING 區：故意製造異常來練習

| 控制項 | 種類 | 做什麼 | 預期結果 | 怎麼恢復 |
| --- | --- | --- | --- | --- |
| E-Stop | 開關 | D550 bit0 | 立刻 8001，全部輸出 OFF | 扳回去，按 Reset |
| Clamp Stuck | 開關 | D550 bit1 | 下一顆夾爪時 9002 | 扳回去，按 Reset |
| Bin Full | 按鈕 | D100 = 5 | 這顆做完 8101 | 按 Clear Bin，再按 Reset |
| Clear Bin | 按鈕 | D100 = 4 | NG 料盒歸零 | 不用 |
| Pause Heartbeat | 開關 | 停止增加 D520 | 運轉中 2 秒後 9006 | 扳回去，按 Reset |

Pause Heartbeat 不寫任何位址，只是讓心跳不再變化。

## 面板區塊中文對照

| 區塊 | 中文 | 內容 |
| --- | --- | --- |
| Line Picture | 動線視圖 | 即時畫面，資料來自 D303～D305、D400～D403 |
| SETUP | 生產設定 | 機種資料夾、機種、批號、PLC 連線方式、參數 |
| STATUS | 機台狀態 | 連線、警報、安全、目前步序 |
| OPERATION | 操作 | 啟動、循環停止、復歸、結束 |
| TRAINING | 訓練 | 故障注入 |
| INSPECTION | 檢測結果 | 判定、計數、三項檢查 |
| ALARM TABLE | 警報說明 | 代碼一覽 |
| MES | 製造執行系統 | 開批、上傳狀態 |

## 警報代碼中文對照

| 代碼 | 面板文字 | 中文 |
| --- | --- | --- |
| 8001 | ESTOP | 急停 |
| 8004 | AIR LOW | 氣壓不足 |
| 8101 | NG BIN FULL | NG 料盒滿 |
| 9001 | STOPPER TIMEOUT | 擋料動作逾時 |
| 9002 | CLAMP TIMEOUT | 夾爪動作逾時 |
| 9003 | PUSHER TIMEOUT | 推料動作逾時 |
| 9004 | PART NOT ARRIVED | 零件沒到 |
| 9005 | INSPECT TIMEOUT | 檢測逾時 |
| 9006 | HEARTBEAT TIMEOUT | 心跳逾時 |
| 9007 | BAD RESULT | 檢測結果不合法 |
| 9008 | SERVO ALARM | 伺服警報 |

## 程式結構

四個迴圈同時跑，彼此用佇列和 Notifier 傳資料：

| 迴圈 | 做什麼 | 為什麼分開 |
| --- | --- | --- |
| 通訊 | 每 100 ms 讀 D300～315、D400～403，寫心跳，送出佇列裡的寫入 | 只有它跟 PLC 講話，不會互搶 |
| 檢測 | b0 上升緣取像、檢測、回結果；下降緣寫 D511 = 0 | 一次檢測約 1.4 秒，放在通訊迴圈會讓心跳停掉 |
| UI | 畫動線、更新顯示、讀按鈕 | 畫圖慢的時候不影響通訊 |
| MES | 把結果上傳，失敗時保留重送 | MES 慢的時候不影響生產 |

| 傳遞工具 | 內容 |
| --- | --- |
| 寫入佇列（U32） | 高 16 位元是 D 位址，低 16 位元是值。全部寫入都走這裡 |
| Notifier | 通訊迴圈讀到的 20 個字加連線狀態，只保留最新一筆 |
| MES 佇列（字串） | 要上傳的 JSON |

### 結束順序

按 Exit → 寫 D100 = 2 → 等 PLC 回 Idle → UI 迴圈結束 → 釋放 Notifier 和寫入佇列 → 通訊、檢測迴圈因此結束 → 釋放 MES 佇列 → MES 迴圈結束 → 結批、關連線。

`Release Notifier` 的 `error in` 要接 UI 迴圈的輸出。LabVIEW 是資料流，輸入到齊就執行，沒接的話它會在程式一開始就執行，所有迴圈立刻停止。

## 隱藏控制項

`Test Exit`、`Test Start` 在前面板看不到，功能和 Exit、Start 按鈕相同，也走同一道開批閘門。這兩個按鈕是閂鎖按鈕，程式無法從外部設定，所以自動測試用這兩個開關。

## SubVI

| VI | 做什麼 |
| --- | --- |
| `host\Host_Init.vi` | 載入機種、開伺服、回原點、開相機、MES 開批 |
| `host\Host_CommStep.vi` | 通訊迴圈的一圈，斷線時自動重連 |
| `host\Host_Edge.vi` | 判斷 b0 的上升緣和下降緣 |
| `host\Host_Writes.vi` | 按鈕轉成寫入佇列 |
| `host\Host_ToSnapshot.vi` | PLC 字組轉成 `LV_DrawLine` 的快照格式 |
| `host\Host_Lookup.vi` | 用代碼查文字 |
| `host\Host_Trim.vi` | 去掉前後空白。用基本函式，18.0 不用依賴新版 vi.lib |
| `host\Host_AxisInit.vi` | ALMCLR、SVON、HOME，復歸時用 |
| `host\Host_Params.vi` | D530～D532，Idle 才寫入，限制範圍 |
| `host\Host_ErrOnly.vi` | 只放行真正的錯誤，濾掉警告 |
| `host\Host_LogLine.vi` | 組一行 CSV |
| `host\Host_Exit.vi` | MES 結批、關連線 |

重建方式：刪掉該 VI，再執行 `build_host.py` 或 `build_main.py`，主程式重建後要再跑 `polish_main.py`。
