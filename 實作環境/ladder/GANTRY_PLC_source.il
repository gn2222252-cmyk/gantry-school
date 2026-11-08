; 雙龍門取放機 Dual gantry pick-and-place, FX3S-20MT/ES + FX3G-2EYT-BD. 改完執行 python build_ladder.py
; ';' = comment, ';;' = section title, ';#' = paragraph title.
; Devices and comments: devices.py. Explanation: GANTRY_PLC_說明.md

;; P1 初始化 | P1  INITIALIZE
;# FX3U 的 D200～D511、FX3S 的 D128～D255 與 S0～S127 都斷電保持。開機先清掉，否則上次的步序會和 S0 同時動作 | Latched on FX3U: D200-D511. On FX3S: D128-D255, S0-S127. Clear them at power-up, or the old step runs together with S0
LD M8002
ZRST D200 D254
ZRST S0 S59
SET S0
;# 參數為 0 時填預設值 | Default parameters when they are 0
LD M8002
AND= D100 K0
MOV K5 D100
LD M8002
AND= D101 K0
MOV K5 D101
LD M8002
AND= D102 K0
MOV K50 D102

;; P2 HMI 命令轉成一掃描脈衝。FX3S-20M 沒有啟動、停止、復歸的輸入點 | P2  HMI commands to one scan pulses. FX3S-20M has no input points for start, stop, reset
;# 編程協定只讀寫 D。D106 位元 0～4 對應 M100～M104，收到一次就清掉 | The programming protocol only reads and writes D. Bits 0-4 of D106 are M100-M104, taken once
LD> D106 K0
MOV D106 K2M100
MOV K0 D106
LD M100
PLS M6
LD M101
PLS M7
LD M103
PLS M8
LD M102
PLS M9
;# HMI 脈衝命令取完邊緣後在這裡清除 | HMI pulses are cleared here after the edge is taken
LD M100
RST M100
LD M101
RST M101
LD M102
RST M102
LD M103
RST M103
;# 計數清除 | Count clear
LD M104
RST C0
RST C1
RST M104

;; P3 模式與安全 | P3  MODE AND SAFETY
;# M2 急停（X13 是常閉）、M4 手動模式（X10 OFF） | M2 emergency stop (X13 is NC), M4 manual mode
LDI X013
OUT M2
LDI X010
OUT M4
;# 急停是異常碼 1，只保留第一個發生的異常碼 | Emergency stop is an alarm with code 1, only the first code is kept
LD M2
AND= D220 K0
MOV K1 D220
LD M2
SET M3
;# M14 開始原點：HMI M102，或未原點時下復歸命令。只能從 S0 且無異常 | M14 start homing: HMI M102, or reset button when not homed. Only from S0 and without alarm
LD M8
ANI M20
OR M9
ANI M3
ANI M2
AND S0
OUT M14
;# M16 開始自動：自動模式、已原點、無異常、在 S0 | M16 start auto: auto mode, homed, no alarm, in S0
LD M6
AND X010
AND M20
ANI M3
ANI M2
AND S0
OUT M16
;# 異常復歸：急停要先放開 | Alarm reset needs the emergency stop released
LD M8
AND M3
ANI M2
RST M3
MOV K0 D220
;# 異常中：清除全部步序與自動輸出 | In alarm: clear every step and auto output
LD M3
ZRST S0 S59
ZRST M50 M60
RST M0
RST M1
RST M20
RST M21
;# 異常解除：回 S0 待機，要重新原點 | Alarm released: wait in S0, homing is needed again
LD M3
PLF M15
LD M15
SET S0
;# 循環停止：按停止、切手動、或到達目標次數 | Cycle stop: stop key, mode switch, or target count reached
LD M7
AND M0
SET M1
LD M0
ANI X010
SET M1
LD M0
AND> D103 K0
AND>= D212 D103
SET M1

;; P4 原點復歸（S0、S10～S13） | P4  HOMING (S0, S10-S13)
;# S0 待機 | S0 stand-by
STL S0
LD M14
RST M20
SET M21
SET S10
LD M16
SET M0
SET S20
SET S40
;# S10 輸出全關、吸盤關 | S10 all outputs off, vacuum off
STL S10
ZRST M50 M60
LD M8000
SET S11
;# S11 兩邊氣缸上升 | S11 both cylinders up
STL S11
OUT M59
OUT M53
LD X006
AND X011
SET S12
;# S12 左龍門回後側、右龍門回前側，同時進行 | S12 left to rear (X1), right to front (X2), both at once
STL S12
LDI X001
OUT M51
LDI X002
OUT M57
LD X001
AND X002
SET S13
;# S13 原點完成 | S13 homed
STL S13
SET M20
RST M21
LD M8000
SET S0

;; P5 右龍門（前 → 後，S20～S28） | P5  RIGHT GANTRY (front to rear, S20-S28)
;# S20 等料。左右吸盤共用 Y5，左龍門吸取到放下之間不能開始，右龍門優先 | S20 wait for a part. Both vacuums share Y5: do not start while the left gantry holds or picks. Right has priority
STL S20
LD X004
AND X002
AND X011
ANI M1
ANI S41
ANI S42
ANI S43
ANI S44
ANI S45
ANI S46
SET S21
;# S21 下降取料 | S21 down
STL S21
OUT M54
LD X012
SET S22
;# S22 吸盤開，等 D100 | S22 vacuum on, wait D100
STL S22
SET M55
OUT T0 D100
LD T0
SET S23
;# S23 上升 | S23 up
STL S23
OUT M53
LD X011
SET S24
;# S24 往後 | S24 to rear
STL S24
OUT M56
LD X003
SET S25
;# S25 下降放料 | S25 down
STL S25
OUT M54
LD X012
SET S26
;# S26 吸盤關，等 D101 | S26 vacuum off, wait D101
STL S26
RST M55
OUT T1 D101
LD T1
SET S27
;# S27 上升 | S27 up
STL S27
OUT M53
LD X011
SET S28
;# S28 回前側原點，計數加 1 | S28 back to front, count one transfer
STL S28
OUT M57
LD X002
OUT C0 K32767
SET S20

;; P6 左龍門（後 → 前，S40～S48） | P6  LEFT GANTRY (rear to front, S40-S48)
;# S40 等料。右龍門吸取到放下之間不能開始 | S40 wait for a part. Do not start while the right gantry picks or holds
STL S40
LD X005
AND X001
AND X006
ANI M1
ANI S21
ANI S22
ANI S23
ANI S24
ANI S25
ANI S26
SET S41
;# S41 下降取料 | S41 down
STL S41
OUT M58
LD X007
SET S42
;# S42 吸盤開，等 D100 | S42 vacuum on, wait D100
STL S42
SET M60
OUT T2 D100
LD T2
SET S43
;# S43 上升 | S43 up
STL S43
OUT M59
LD X006
SET S44
;# S44 往前 | S44 to front
STL S44
OUT M50
LD X000
SET S45
;# S45 下降放料 | S45 down
STL S45
OUT M58
LD X007
SET S46
;# S46 吸盤關，等 D101 | S46 vacuum off, wait D101
STL S46
RST M60
OUT T3 D101
LD T3
SET S47
;# S47 上升 | S47 up
STL S47
OUT M59
LD X006
SET S48
;# S48 回後側原點，計數加 1 | S48 back to rear, count one transfer
STL S48
OUT M51
LD X001
OUT C1 K32767
SET S40
RET
;# 兩邊都在等料且循環停止中：結束自動 | Both gantries waiting and a cycle stop pending: leave auto
LD M1
AND S20
AND S40
RST S20
RST S40
RST M0
RST M1
SET S0

;; P7 手動 | P7  MANUAL
;# M5 手動有效：手動模式、非運轉、非原點中、無異常、HMI 通訊正常 | M5 manual allowed: manual mode, not running, not homing, no alarm, HMI link alive
LD M4
ANI M0
ANI M21
ANI M3
ANI M2
ANI T30
OUT M5
;# 不有效時清除全部手動命令 | Otherwise every held command is dropped
LDI M5
ZRST M110 M125
MOV K0 D107
MOV K0 D254
;# D107 變動時才搬到 M110～M125。GX Works2 直接改 M 也有效，不會被蓋掉 | D107 reaches M110-M125 only when it changes, so GX Works2 can still write the M bits
LD<> D107 D254
MOV D107 K4M110
MOV D107 D254
;# 手動命令轉到手動輸出繼電器 M70～M85。橫軸點動碰到該方向的定位感測器就停，不會衝過頭 | Commands to the manual output relays M70-M85. An axis jog stops at the sensor of its direction
LD M110
ANI X000
OUT M70
LD M111
ANI X001
OUT M71
LD M125
OUT M72
LD M123
OUT M73
LD M122
OUT M74
LD M124
OUT M75
LD M121
ANI X003
OUT M76
LD M120
ANI X002
OUT M77
LD M112
OUT M78
LD M113
OUT M79
LD M114
OUT M80
;# 手動動過機構，原點就不再可信 | Anything moved by hand means the machine is no longer at a known home
LD M70
OR M71
OR M73
OR M74
OR M75
OR M76
OR M77
OR M78
OR M79
OR M80
RST M20

;; P8 逾時監視 | P8  TIMEOUT WATCH
;# 受監視的步序：等感測器到位的步。等料和定時步不監視 | Monitored steps: every step that waits for a sensor. Waiting for a part and timed steps are not watched
LD S21
OR S23
OR S24
OR S25
OR S27
OR S28
OUT M17
LD S41
OR S43
OR S44
OR S45
OR S47
OR S48
OUT M18
;# 步序號改變時計時器重新開始 | Timers restart when the step number changes
LD= D200 D250
AND M17
OUT T10 D102
LD= D201 D251
AND M18
OUT T11 D102
LD= D202 D252
LD S11
OR S12
ANB
OUT T12 D102
;# 右龍門：橫軸 10、氣缸 11 | Right: axis 10, cylinder 11
LD S24
OR S28
AND T10
AND= D220 K0
MOV K10 D220
LD S21
OR S23
OR S25
OR S27
AND T10
AND= D220 K0
MOV K11 D220
;# 左龍門：橫軸 20、氣缸 21 | Left: axis 20, cylinder 21
LD S44
OR S48
AND T11
AND= D220 K0
MOV K20 D220
LD S41
OR S43
OR S45
OR S47
AND T11
AND= D220 K0
MOV K21 D220
;# 原點復歸 30 | Homing 30
LD T12
AND= D220 K0
MOV K30 D220
LD T10
OR T11
OR T12
SET M3
;# HMI 心跳：D240 = 0 代表沒有 HMI，3 秒沒變化算斷線（T30） | HMI heartbeat: D240 = 0 means no HMI. 3 s without a change = link lost (T30)
LD= D240 D253
AND> D240 K0
OUT T30 K30
;# 只有手動模式斷線才報 40，因為此時 HMI 是唯一操作站 | Link lost raises code 40 only in manual, where the HMI is the only operator station
LD T30
AND M4
PLS M22
LD M22
AND= D220 K0
MOV K40 D220
LD M22
SET M3
;# 記下這一掃描的值 | Remember this scan's values
LD M8000
MOV D200 D250
MOV D201 D251
MOV D202 D252
MOV D240 D253

;; P9 輸出：自動 OR 手動，再加互鎖（唯一驅動 Y 的地方） | P9  OUTPUTS: auto OR manual, then interlocks (only place that drives Y)
;# M52 自動時輸送帶：兩端有料、或龍門在帶上作業時暫停 | M52 conveyor in auto: stops for a part at either end and while a gantry works at the belt
LD M0
ANI X004
ANI X005
ANI S21
ANI S22
ANI S23
ANI S25
ANI S26
ANI S27
ANI S41
ANI S42
ANI S43
ANI S45
ANI S46
ANI S47
OUT M52
;# Y0 左橫軸往前：氣缸在上，且 Y1 沒動作 | Y0 left forward: cylinder up, not Y1
LD M50
OR M70
AND X006
ANI Y001
ANI M3
ANI M2
OUT Y000
;# Y1 左橫軸往後：氣缸在上，且 Y0 沒動作 | Y1 left rearward: cylinder up, not Y0
LD M51
OR M71
AND X006
ANI Y000
ANI M3
ANI M2
OUT Y001
;# Y2 輸送帶 | Y2 conveyors
LD M52
OR M72
ANI M3
ANI M2
OUT Y002
;# Y3 右氣缸上升：Y4 沒動作 | Y3 right up: not Y4
LD M53
OR M73
ANI Y004
ANI M3
ANI M2
OUT Y003
;# Y4 右氣缸下降：在定位點，且 Y3 沒動作 | Y4 right down: at a stop point, not Y3
LD M54
OR M74
LD X002
OR X003
ANB
ANI Y003
ANI M3
ANI M2
OUT Y004
;# Y5 吸盤：左右電磁閥並聯在這一點，自動時不會同時使用 | Y5 vacuum: both valves are wired to this point, auto never uses them at once
LD M55
OR M75
OR M60
OR M80
ANI M3
ANI M2
OUT Y005
;# Y6 右橫軸往後：氣缸在上，且 Y7 沒動作 | Y6 right rearward: cylinder up, not Y7
LD M56
OR M76
AND X011
ANI Y007
ANI M3
ANI M2
OUT Y006
;# Y7 右橫軸往前：氣缸在上，且 Y6 沒動作 | Y7 right forward: cylinder up, not Y6
LD M57
OR M77
AND X011
ANI Y006
ANI M3
ANI M2
OUT Y007
;# M8116（擴充板 BY0）左氣缸下降：在定位點，且上升沒動作 | M8116 (board BY0) left down: at a stop point, not up
LD M58
OR M78
LD X000
OR X001
ANB
ANI M8117
ANI M3
ANI M2
OUT M8116
;# M8117（擴充板 BY1）左氣缸上升：下降沒動作 | M8117 (board BY1) left up: not down
LD M59
OR M79
ANI M8116
ANI M3
ANI M2
OUT M8117

;; P10 HMI 狀態。FX3S-20M 沒有指示燈和蜂鳴器輸出，狀態都由 LabVIEW 顯示 | P10  HMI STATUS. FX3S-20M has no lamp or buzzer output, LabVIEW shows the state
;# 狀態位元 M200～M205 | Status bits M200-M205
LD M0
OUT M200
LD M4
OUT M201
LD M20
OUT M202
LD M3
OUT M203
LD M2
OUT M204
LD M1
OUT M205
;# 步序號：0 代表該組沒有作用中的步 | Step numbers: 0 = no step of that group is active
LD M8000
MOV K0 D200
MOV K0 D201
MOV K0 D202
LD S20
MOV K20 D200
LD S21
MOV K21 D200
LD S22
MOV K22 D200
LD S23
MOV K23 D200
LD S24
MOV K24 D200
LD S25
MOV K25 D200
LD S26
MOV K26 D200
LD S27
MOV K27 D200
LD S28
MOV K28 D200
LD S40
MOV K40 D201
LD S41
MOV K41 D201
LD S42
MOV K42 D201
LD S43
MOV K43 D201
LD S44
MOV K44 D201
LD S45
MOV K45 D201
LD S46
MOV K46 D201
LD S47
MOV K47 D201
LD S48
MOV K48 D201
LD S10
MOV K10 D202
LD S11
MOV K11 D202
LD S12
MOV K12 D202
LD S13
MOV K13 D202
;# 計數與 I/O 字。D231 的位元 8、9、10 是左氣缸下降、上升、左吸盤，LabVIEW 位址不變。D212 取兩邊計數較小者 | Counts, I/O words. Bits 8-10 of D231 stay left down, up, vacuum for LabVIEW. D212 = the smaller count
LD M8000
MOV C0 D210
MOV C1 D211
MOV K4X000 D230
MOV K2Y000 K2M300
LD M8116
OUT M308
LD M8117
OUT M309
LD Y005
OUT M310
LD M8000
MOV K4M300 D231
MOV K2M200 D232
LD<= D210 D211
MOV D210 D212
LD> D210 D211
MOV D211 D212
;# PLC 心跳，每秒加 1 | PLC heartbeat, +1 per second
LD M8013
PLS M23
LD M23
INC D241
END
