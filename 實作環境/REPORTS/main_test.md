# Main.vi 整合測試結果

2026-11-08 04:41:52，43/43 通過

| 項目 | 結果 | 細節 |
| --- | --- | --- |
| connects to the PLC | PASS |  |
| PLC Alive lamp | PASS |  |
| HMI heartbeat D240 moves 1 per s | PASS | [2, 3, 3, 3, 4, 4, 5, 6, 6, 7, 7, 7, 8] |
| T01 power on: S0, not homed | PASS | [0] |
| T02 home by HMI | PASS |  |
| Homed lamp on the panel | PASS |  |
| T10 start by HMI | PASS |  |
| Auto lamp on the panel | PASS |  |
| T03 full round | PASS | {'200': 20, '201': 40, '202': 0, '210': 1, '211': 1, '212': 1, '220': 0, '240': 25, '241': 34, '100': 5, '101': 5, '102': 50, '103': 0} |
| T03 counts one each | PASS | {'200': 20, '201': 40, '202': 0, '210': 1, '211': 1, '212': 1, '220': 0, '240': 25, '241': 34, '100': 5, '101': 5, '102': 50, '103': 0} |
| T09 count on panel | PASS |  |
| T04 several parts | PASS | {'200': 24, '201': 40, '202': 0, '210': 3, '211': 3, '212': 3, '220': 0, '240': 46, '241': 55, '100': 5, '101': 5, '102': 50, '103': 0} |
| T04 no alarm, no part lost | PASS | [{'id': 1, 'on': 'front', 'pos': 408.0}, {'id': 2, 'on': 'R', 'pos': 952.0}, {'id': 3, 'on': 'rear', 'pos': 564.0}] |
| T09 Right Step text | PASS | {'Right Step': 'To rear', 'Left Step': 'Back home'} |
| T05 cycle stop flag or stopped | PASS |  |
| T05 stops after the trip | PASS |  |
| T05 both at home | PASS | [0, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0] |
| T12 parameter reaches D100 | PASS | 20 |
| Clear Counts | PASS |  |
| T06 E-stop clears steps and outputs | PASS | [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] |
| T06 panel shows it | PASS |  |
| T06 alarm text | PASS | {'Alarm Text': 'E-STOP'} |
| T06 reset refused while pressed | PASS |  |
| T06 reset after release | PASS |  |
| T06 home again | PASS |  |
| T07 timeout code 10 | PASS | 10 |
| T07 panel text | PASS |  |
| Manual Allowed lamp | PASS |  |
| T10 jog conveyor | PASS |  |
| T10 jog off | PASS |  |
| T08 axis blocked with cylinder down | PASS | [5.0, 1.0, False] |
| T09 I/O page matches the PLC | PASS | {'X0 L gantry front pos': False, 'X2 R gantry front pos': True, 'X13 E-stop (NC)': True} |
| T11 output stops by itself | PASS | 40 |
| T11 code 40 | PASS | 40 |
| T11 HMI shows the link down | PASS |  |
| T11 reconnects | PASS |  |
| stale jog not sent after reconnect | PASS | [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] |
| reset code 40 | PASS | 0 |
| export file written | PASS | 2026-11-08 04:41:10,1,E-STOP
2026-11-08 04:41:21,10,RIGHT AXIS TIMEOUT
2026-11-08 04:41:33,40,HMI LINK LOST
 |
| Exit ends every loop | PASS | {'state': 1, 'running': False} |
| Exit writes D240 = 0 | PASS | 0 |
| no alarm after a normal exit | PASS | 0 |
| daily CSV has the events | PASS | {'CLEAR', 'TRANSFER', 'ALARM'} |
