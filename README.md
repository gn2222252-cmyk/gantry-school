# 雙龍門完整學習專案

這是獨立的學習與實作副本，目標是學會從機台需求設計 PLC 階梯圖，再建置 LabVIEW 上位機與 PLC 通訊。機台、PLC 和 Main.vi 的可建置副本在 `實作環境`；PLC 互動教室在 `實作環境/softplc`；LabVIEW 課程在 `LabVIEW課程`（`開始上課.html`）；理論章節在 `課程`。

## 從這裡開始

1. 開啟 [學習地圖](課程/00_學習地圖.md)，從 PLC 互動課程和 LabVIEW 課程開始。
2. 查看 [專案檔案導覽](專案檔案導覽.md)，分辨 8Y 不擴充版和擴充版。
3. 在 PowerShell 啟動隔離副本的 8Y 模擬器：

```cmd
cd /d "C:\Users\admin\Desktop\labview檢測分選機模擬訓練\雙龍門完整學習專案\實作環境"
python .\softplc\softplc.py --no-board --ladder
```

4. 開啟同一個 `實作環境` 裡的 `Main.vi`，Run 後依主程式面板選模擬通訊。注意要開這個副本的 VI，別誤開原本 `14_Gantry`、`backup_FX3U版` 或 `LV2018` 的版本。
5. 在另一個 PowerShell 視窗開啟 PLC 互動課程：

```powershell
python .\softplc\learn.py
```

先播放示範，再自己操作按鈕；需要看掃描順序時勾選「慢動作掃描」。

6. LabVIEW 課程：雙擊 `LabVIEW課程` 裡的 `開始上課.html`（不用網路）。22 堂課從零做到自己寫出完整的 GT_Main.vi，第 12 課起要開上面的軟 PLC。

## 資料夾

- `課程/PLC/`：規格到 I/O、步序、梯形圖、模擬與 GX Works2。
- `LabVIEW課程/`：LabVIEW 課程 22 課，從零到完整上位機；`參考答案/` 有對軟 PLC 實測過的驅動 VI（含 LV2018 版）。
- `_舊版LabVIEW課程備份/`：舊版 LabVIEW 課程，已不使用，只做保存。
- `實作環境/`：從現有 14_Gantry 複製的可修改程式與工程檔。
- `專案檔案導覽.md`：各副本檔案用途、版本差異和未驗證項目。

## 已知限制

本副本沒有連實體 FX3S，也沒有證明 GX Works2 能直接匯入目前 IL/CSV。FX 編程協定、RS-422 線材及擴充模組端子都要按實際硬體手冊與台架測試確認。軟 PLC 通過操作只代表模擬邏輯可運作，不代表真機配線或安全設計已驗證。

