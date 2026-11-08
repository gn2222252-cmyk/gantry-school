# 參考答案

依 LabVIEW 課程的設計，用 labview-native-mcp v2 腳本產生的 VI：第 9～14 課的驅動層，和第 6、15～20 課的雙龍門專案（含完整的 GT_Main.vi）。

| VI | 課 | 做什麼 |
| --- | --- | --- |
| FX_Sum.vi | 10 | Body → 校驗 SS（2 個十六進位字元） |
| FX_ReadFrame.vi | 9、10 | D、Words → 讀取封包 |
| FX_WriteFrame.vi | 10 | D、Value → 寫入封包（Swap Bytes 讓低位元組在前） |
| FX_Check.vi | 11 | 檢查回應的 STX 和校驗，取出資料，錯誤 5001 |
| FX_Open.vi | 12 | TCP 用 VISA Open；COM 用 VISA Configure Serial Port 9600 7E1 |
| FX_ReadD.vi | 13 | 讀 D，回傳 U16 陣列（一次最多 32 個） |
| FX_WriteD.vi | 14 | 寫 1 個 D，確認 ACK，NAK 時錯誤 5002 |
| Test_Driver.vi | 14 | 測試用：Open → WriteD → ReadD → Close（Resource 用字串輸入） |
| GT_StepText.vi、GT_AlarmText.vi | 6 | 步序號、異常碼 → 文字 |
| GT_Parse.vi | 15 | 42 個字 → Status（Cluster） |
| GT_Monitor.vi | 15 | 只讀的監看程式 |
| GT_Log.vi | 20 | 寫一列到 logs\yyyy-mm-dd.csv |
| GT_Main.vi | 16～20 | 完整上位機：UI 迴圈＋通訊迴圈＋Queue、D106/D107/參數命令、心跳、斷線重連、異常紀錄、正確結束 |

- `LV2018\`：另存 18.0，給學校 LabVIEW 2018。
- `測試結果.md`：驅動 VI 對軟 PLC 的實測結果（16/16）。
- `專案測試結果.md`：GT_ VI 和 GT_Main 照第 21 課測試表的實測結果（44/44）。
- `logs\`：GT_Log 寫的紀錄檔。
- `_build\`：建置（build_answers.py 驅動、build_project.py 專案）、測試（test_answers.py、test_project.py）、另存舊版（save18.py），用 `_build\run_lv.ps1` 執行。

## 和課文不同的地方

FX_Check.vi 沒有用 Error Case，而是檢查永遠執行、最後用 **Merge Errors** 合併 error in 和自己產生的錯誤（error in 有錯時優先傳它）；錯誤碼用 **Error Cluster From Error Code.vi** 產生。這是腳本做 Case 輸出通道合併時一直失敗而改用的等效寫法，兩種寫法結果相同。課文教的 Error Case 寫法是 LabVIEW 的標準樣式，照課文寫就對了。

腳本做不到、所以和課文寫法不同的地方（行為相同，照課文寫就對了）：

| 課文 | 參考答案 | 原因 |
| --- | --- | --- |
| GT_StepText、GT_AlarmText 用 Case Structure，頁籤 10、20… | Search 1D Array 在代碼陣列裡找，再 Index Array 取文字 | 腳本可以加 Case 頁，但不能指定頁籤的值 |
| Bundle By Name / Unbundle By Name | 位置式 Bundle / Unbundle | 腳本不能選 By Name 的元素名稱 |
| GT_Status.ctl、GT_Cmd.ctl（Type Def） | GT_Parse.vi 的 Status 指示器（一般 Cluster）；佇列元素是兩個 U16 的 Cluster | 腳本不能做 Type Def |
| PLC Port 是 VISA Resource Name | 字串控制項（接到 FX_Open 時自動轉成 VISA） | 測試工具不能設定 VISA 控制項的值 |
| 前面板用 Tab Control 分五頁 | 沒有分頁，控制項排在同一頁 | 第 18 課是面板排版，自動測試不需要 |
| 結束時 Simple Error Handler | error out 指示器 | 自動測試時對話框會卡住 |
| 心跳的時間用迴圈開頭那次 Tick Count | 寫心跳的那一頁裡再取一次 Tick Count | 腳本合併 Case 通道的限制，差不到 1 ms |
