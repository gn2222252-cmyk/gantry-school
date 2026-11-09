# LabVIEW 課程：從零開始自己寫雙龍門上位機

**雙擊 `開始上課.html`**（Edge、Chrome 都可以，不用網路、不用安裝）。

22 堂課，從「LabVIEW 是什麼」一路做到完整的 `GT_Main.vi`：讀 PLC 狀態、送命令、點動、參數、心跳、斷線重連、異常紀錄。另外有 13 堂 **CLAD 證照**課（C1～C12 加模擬考），補齊專案沒用到、但考試會考的知識點。學校 LabVIEW 2018 英文版和家裡的 2026 都適用。

## 每一課的樣子

- **仿 LabVIEW 視窗**：前面板和方塊圖並排，線色、端子、結構框照 LabVIEW 的樣子畫。可以按 **Run**，數字、按鈕都能操作；按工具列的燈泡（Highlight Execution）會看到資料沿著線流動；按「123」顯示每條線上的值。Case Structure 可以點 ◀ ▶ 換頁。
- **跟著做（步驟播放器）**：同一個 VI 一步一步長出來，每一步標出新加的東西，附上完整選盤路徑（例如 Functions ▸ Programming ▸ Structures ▸ While Loop）、Quick Drop 名稱和「從 → 接到」接線表。**請開真的 LabVIEW 照做。**
- **真實截圖**：第 9～14 課附上參考答案在 LabVIEW 裡的真實方塊圖。
- **小測驗、常見錯誤表、完成標準**：每課最後按「我做完這課了」記錄進度（存在瀏覽器裡）。選項每次隨機排列。
- **CLAD 模擬考**：計時、交卷後顯示每題答案與解說、列出要複習的課、記錄最佳成績。考試形式以 NI 官網最新公告為準。

## 課程地圖

| 階段 | 課 | 做出的檔案（存在 `桌面\我的雙龍門\`） |
| --- | --- | --- |
| 起步 | 0 你要做出什麼、1 認識 LabVIEW | L01_Total.vi |
| 基礎 | 2 資料流、3 型別、4 While Loop、5 Shift Register、6 Case、7 Array/For Loop、8 Cluster/Type Def、9 字串與封包、10 SubVI、11 錯誤處理 | GT_AlarmText、GT_StepText、GT_Status.ctl、GT_Cmd.ctl、FX_Sum、FX_ReadFrame、FX_WriteFrame、FX_Check |
| 通訊 | 12 VISA、13 FX_ReadD、14 FX_WriteD | FX_Open、FX_ReadD、FX_WriteD |
| 專案 | 15 GT_Parse/GT_Monitor、16 雙迴圈與 Queue、17 按鈕命令、18 前面板、19 心跳與重連、20 異常紀錄、21 整合測試與上實機 | GT_Parse、GT_Monitor、GT_Log、GT_Main |
| CLAD 證照 | C1 考試與除錯工具、C2 資料型別、C3 迴圈與時間、C4 Case/Sequence/Event/Formula、C5 陣列與 Cluster、C6 字串與檔案 I/O、C7 模組化與 Reentrancy、C8 Local/Global/FGV/Queue/Notifier/Property Node、C9 設計模式、C10 錯誤處理、C11 Chart 與 Graph、C12 DAQmx 與儀器控制、CX 模擬考與速查表 | 不用存檔；每課 5～13 題練習（多數是看圖題），CX 從 201 題原創題庫隨機抽 40 題、60 分鐘計時，也可依主題練習；附台灣報名與應試注意事項、英文術語與題目句型表 |

第 12 課起要開軟 PLC（在 `實作環境` 資料夾）：

```bash
python .\softplc\softplc.py --no-board
```

## 參考答案

`參考答案\` 有依課程設計用 LabVIEW 腳本產生、對軟 PLC 實測過的 VI：
- 驅動（第 9～14 課）：FX_Sum、FX_ReadFrame、FX_WriteFrame、FX_Check、FX_Open、FX_ReadD、FX_WriteD，實測 16/16（`參考答案\測試結果.md`）。
- 專案（第 6、15～20 課）：GT_StepText、GT_AlarmText、GT_Parse、GT_Monitor、GT_Log、GT_Main，照第 21 課測試表實測 44/44（`參考答案\專案測試結果.md`）。
- `參考答案\LV2018\` 是另存 18.0 的版本。

幾個地方因為腳本限制寫法和課文不同（例如用位置式 Bundle 代替 Bundle By Name），對照表在 `參考答案\README.md`；行為相同，照課文寫就對了。

重建或重測參考答案（需要 labview-native-mcp v2，LabVIEW 2026 開著）：

```bash
powershell -ExecutionPolicy Bypass -File 參考答案\_build\run_lv.ps1 build_answers.py
```

```bash
powershell -ExecutionPolicy Bypass -File 參考答案\_build\run_lv.ps1 test_answers.py
```

```bash
powershell -ExecutionPolicy Bypass -File 參考答案\_build\run_lv.ps1 save18.py
```

重建後把 `參考答案\*.png` 複製到 `assets\real\`，課程裡的截圖才會更新。

## 檔案

| 路徑 | 內容 |
| --- | --- |
| `開始上課.html` | 課程入口 |
| `assets\lvdraw.js` | 仿 LabVIEW 前面板／方塊圖的繪圖與模擬元件 |
| `assets\course.js` | 側欄、步驟播放器、測驗、進度、FX 封包示範函式 |
| `lessons\*.js` | 22 堂課的內容（文字、圖、模擬） |
| `assets\real\` | 參考答案的真實方塊圖截圖 |
| `參考答案\` | 參考答案 VI、建置與測試腳本 |

舊版（codex 製作）的課程移到 `..\_舊版LabVIEW課程備份\`，沒有刪除。

## 已知限制

- 網頁裡的 VI 是教學模擬，不是真的 LabVIEW；行為以真的 LabVIEW 為準。
- 實機 FX3S 是否接受編程協定的 0、1 命令和 D 位址 1000h 還沒驗證（見第 21 課）。
