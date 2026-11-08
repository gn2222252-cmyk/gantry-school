# 14_Gantry：雙龍門取放系統

三菱 **FX3S-20MT/ES＋FX3G-2EYT-BD** 控制機台（原架構書為 FX3U-32MR/ES，舊版程式在 `backup_FX3U版\`），**LabVIEW** 當上位機。規格在 `docs\雙龍門取放系統架構.md`。

| 想做什麼 | 看哪裡 |
| --- | --- |
| **學階梯圖，互動課程** | `python softplc\learn.py`，30 課，可以自己按 |
| **學 PLC 怎麼運作、怎麼寫** | `docs\PLC學習手冊.md`，配合梯形圖監看視窗 |
| 在家跑起來 | 下面「快速開始」 |
| 操作畫面、VI 清單 | `docs\Main_說明.md` |
| 梯形圖 | `ladder\GANTRY_PLC_說明.md` |
| 通訊封包 | `docs\通訊協定.md` |
| 通訊協定、RS-422 | `docs\通訊協定.md` |
| 手動操作、器材、X/Y、接線 | 模擬器按 **手動操作、器材與接線**；文字版 `docs\實機接線_FX3S-20MT.md` |
| 上實機 | `REPORTS\final.md` 的「到實機要做的事」 |

## 快速開始

```bash
python softplc\softplc.py
```

1. 打開 `Main.vi`，按 Run，等 **PLC Connected** 亮。
2. 按 **Home**，等 **Homed** 亮。
3. 模擬器視窗按 **前輸送帶放工件**。
4. 按 **Start**。

繁體中文系統的電腦（含 LabVIEW 2018）用 `LV2018\Main.vi`，其他檔案相同。

## 中文顯示

LabVIEW 用系統編碼存文字。`Main.vi` 是 GBK，給這台電腦；`LV2018` 是 Big5，給繁體電腦。在錯的電腦上打開只有中文亂碼，英文標籤和功能都正常。詳見 `docs\Main_說明.md`。

## 資料夾

| 資料夾 | 內容 |
| --- | --- |
| `ladder\` | 梯形圖原始檔、指令表、註解 CSV、參數設定 |
| `softplc\` | 軟體 PLC、計算機連結伺服器、機構模擬 |
| `driver\` | `FX_*.vi` 通訊層 |
| `host\` | 上位機 subVI |
| `tests\` | 自動測試 |
| `REPORTS\` | 測試結果、畫面截圖、完工報告 |
| `logs\` | Main.vi 的紀錄檔 |
| `LV2018\` | 另存 18.0 的 VI |

## 重建與測試

VI 由腳本產生。改 `build_host.py`、`build_main.py` 後執行下面指令，完整輸出在 `work_out\`。

```bash
powershell -ExecutionPolicy Bypass -File run_lv.ps1 build_main.py
```

```bash
powershell -ExecutionPolicy Bypass -File run_lv.ps1 tests/test_main.py
```

畫面中文改 `panel_notes.py`，改完重建 `Main.vi` 再執行 `add_notes.py`。

要產生 Big5 版：把 `driver`、`host`、`ladder\devices.py`、`softplc\*.py`、`panel_notes.py`、`build_*.py`、`add_notes.py`、`run_lv.ps1`、`tests` 複製到別的資料夾，設環境變數 `GANTRY_BIG5=1`，依序跑 `build_host.py Draw_Machine`、`build_main.py`、`add_notes.py`，再用 `tests/check_tree.py save18` 另存。不要在 `14_Gantry` 本體裡跑，否則這台電腦的版本會變亂碼。

不需要 LabVIEW 的測試：

```bash
python softplc\tests\test_engine.py
```

```bash
python softplc\tests\test_ladder.py
```
