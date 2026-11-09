/* 第六部分 B：拆解 13_PLC（A4～A9）
   通訊迴圈與驅動、檢測迴圈、UI 迴圈、MES 與結束順序、自己規劃大架構、函式速查 */
(function(){
const L=window.LESSONS,fn=C.fn,ctl=C.ctl,qd=C.qd,wt=C.wt;
const PART='13_PLC 架構拆解';
const tip=(t,s)=>`<div class="tip"><b>${t}</b>${s}</div>`;
const warn=(t,s)=>`<div class="warn"><b>${t}</b>${s}</div>`;
const note=(t,s)=>`<div class="note"><b>${t}</b>${s}</div>`;
const why=(t,s)=>`<div class="why"><b>${t}</b>${s}</div>`;
const img=C.p13img,arch=C.arch;

/* ======================================================================
   A4：通訊迴圈與驅動層
   ====================================================================== */
L.push({id:'A04',order:34,no:'A4',part:PART,title:'通訊迴圈與驅動層：唯一跟 PLC 講話的人',mins:80,
goals:[['學會','分層設計（主程式 → 一圈的工作 → 讀寫 → 封包 → VISA）；斷線自動重連；Flush Queue + For Loop 一次寫完；心跳。'],['看懂','Host_CommStep.vi 的 True／False 兩頁；PLC_Open、PLC_WriteWord、PLC_Frame、PLC_Xfer。'],['用在','任何「一個設備一個擁有者」的通訊迴圈都可以照這個模板寫。']],
check:'能說出 Host_CommStep 斷線時做哪 4 件事、連線時做哪 4 件事，以及 21 個字的最後一個是什麼。',
body:[
C.h3('懂','','分 5 層，每層只做一件事'),
arch({w:940,h:210,minw:760,boxes:[
 {id:'a',x:10,y:60,w:150,h:90,t:'Host_Main',sub:['通訊迴圈','每 100 ms 一圈']},
 {id:'b',x:195,y:60,w:160,h:90,k:'#0b8a5f',t:'Host_CommStep',sub:['一圈要做的事','斷線就重連']},
 {id:'c',x:390,y:60,w:170,h:90,k:'#7c3aed',t:'PLC_ReadWords',sub:['PLC_WriteWord','「讀 D300 起 16 個」']},
 {id:'d',x:595,y:60,w:150,h:90,k:'#b45309',t:'PLC_Frame',sub:['STX…ETX＋校驗碼','PLC_Xfer：送、收']},
 {id:'e',x:780,y:60,w:150,h:90,k:'ext',t:'VISA',sub:['TCP（softplc）','COM（實機 RS-422）']}],
 arrows:[{from:'a',to:'b'},{from:'b',to:'c'},{from:'c',to:'d'},{from:'d',to:'e'}],
 notes:[[10,30,'知道「機台」'],[195,30,'知道「連線狀態」'],[390,30,'知道「D 位址」'],[595,30,'知道「FX 封包」'],[780,30,'知道「線」']],
 cap:'換成實機只改最右邊（Transport 選 COM）；換一種 PLC 只改 PLC_ 這幾個；上面的程式都不用動。'}),
C.h3('看','r','PLC_Open.vi：TCP 和 COM 用同一套 VISA'),
C.table(['Transport','做法','結果'],[
 ['TCP（0）','Concatenate Strings 組出 <code>TCPIP0::127.0.0.1::5551::SOCKET</code> → <b>VISA Open</b>','VISA 也能開 TCP socket，所以後面讀寫都用 VISA Write／Read'],
 ['COM（1）','VISA Configure Serial Port：9600、7 位元、偶同位（parity 2）、1 停止位元（stop bits 10）、不用結束字元、逾時 1000 ms','FX 程式口的規格'],
 ['兩種共同','送 ENQ（0x05），收 1 byte，應該是 ACK（0x06）；不是就產生錯誤 5400','確認 PLC 真的在線上']]),
tip('Case 兩頁共用一個輸出','False 頁（TCP）和 True 頁（COM）各產生一條 VISA 參照線，從<b>同一個輸出 Tunnel</b> 出來，後面只要接一次。每一頁的輸出 Tunnel 都要接，否則會變白色空心（Use Default if Unwired）或斷線。'),
C.h3('看','r','PLC_WriteWord.vi 和 PLC_Frame.vi'),
img('P13_PLC_WriteWord.png','PLC_WriteWord.vi','Address D → 1000h＋2n 換成 4 位 16 進位；Value 用 Split Number 拆成低位元組、高位元組（FX 是低位元組在前）→ 組成 payload「1 + 位址 + 02 + 低 + 高」→ PLC_Frame 包框 → PLC_Xfer 送出並收 1 byte，必須是 ACK，否則錯誤 5402。'),
img('P13_PLC_Frame.png','PLC_Frame.vi','payload 後面接 ETX（0x03）→ String To Byte Array → Add Array Elements 加總 → 取最後 2 位 16 進位當校驗碼 → STX（0x02）＋payload＋ETX＋校驗碼。第 9 課 FX_Sum 學過一樣的東西。'),
C.h3('看','r','Host_CommStep.vi：一圈的工作'),
img('P13_Host_CommStep.png','Host_CommStep.vi（True 頁：已連線）','外面一個 Case，selector 接 Connected（上一圈有沒有連上）。True 頁從左到右：讀 D300×16 → 讀 D400×4 → 寫 D520 心跳 → Build Array 接成 20 個字；Flush Queue 把寫入佇列一次全拿出來，For Loop 一筆一筆 Split Number → PLC_WriteWord。PLC 參照和錯誤線用 Shift Register 串過每一筆。',[],1300),
C.table(['Connected','頁','做什麼'],[
 ['False（斷線）','重連','① PLC_Close 關掉舊的 → ② Clear Errors 清掉舊錯誤 → ③ PLC_Open 重開 → ④ Wait 300 ms，Words 給 20 個 0'],
 ['True（連線中）','正常','① 讀 D300×16 ② 讀 D400×4 ③ 寫心跳 D520 ④ Flush Queue + For Loop 寫完所有命令'],
 ['兩頁之後','共同','錯誤 status → Not → <b>Connected out</b>（下一圈用）；20 個字 + 連線旗標（Boolean To (0,1)）→ <b>Words（21 個）</b>']]),
why('為什麼用 Flush Queue 不用 Dequeue','Dequeue 一圈只拿一筆，而且佇列空的時候會等。Flush Queue <b>一次拿走全部、不會等</b>，回傳陣列，For Loop 自動跑陣列長度那麼多次（Auto-indexing），空陣列就跑 0 次。檢測迴圈一次塞 D510、D511 兩筆，同一圈就寫完。'),
warn('順序很重要','D510（結果）一定要在 D511=1（完成）之前寫到 PLC，否則 PLC 會讀到舊結果。佇列是先進先出，For Loop 依陣列順序寫，所以只要檢測迴圈先 Enqueue D510 再 Enqueue D511 就對了。檢測迴圈裡兩個 Enqueue 用<b>錯誤線串起來</b>，保證先後。'),
C.h3('看','r','Host_Main 裡的通訊迴圈'),
arch({w:900,h:250,minw:720,boxes:[
 {id:'sr',x:10,y:60,w:150,h:130,k:'data',t:'Shift Register ×3',sub:['PLC Conn（VISA）','Connected（Bool）','Beat（計數）']},
 {id:'hb',x:200,y:140,w:180,h:90,k:'#0b8a5f',t:'心跳',sub:['Increment','Select：Pause Heartbeat','為真就保持不變']},
 {id:'cs',x:420,y:40,w:180,h:110,t:'Host_CommStep',sub:['Queue、Transport','Host、Port、COM Port','→ Words（21）']},
 {id:'sn',x:640,y:40,w:120,h:70,k:'data',t:'Send Notification',sub:['Words']},
 {id:'st',x:640,y:150,w:240,h:80,k:'#b91c1c',t:'停止條件',sub:['Send Notification 的 error out','Notifier 被釋放 → 出錯 → 停']}],
 arrows:[{from:'sr',to:'cs',fs:'r',ts:'l',p0:[160,95],p1:[420,95]},{from:'sr',to:'hb',fs:'r',ts:'l',p0:[160,170],p1:[200,185]},{from:'hb',to:'cs',fs:'r',ts:'b',p1:[510,150]},{from:'cs',to:'sn',fs:'r',ts:'l',p0:[600,75],p1:[640,75]},{from:'sn',to:'st',fs:'b',ts:'t'}],
 cap:'迴圈裡還有 Wait (ms) 100，決定週期。停止條件不是按鈕，而是「Notifier 不見了」：A7 會講結束順序。'}),
C.h3('做','b','動手：在 13_PLC 裡追一遍'),
{todo:[
 '打開 <code>host\\Host_CommStep.vi</code>，在 Case 的 ◀ ▶ 切 False 頁，找到 PLC_Close → Clear Errors → PLC_Open。',
 '打開 <code>driver\\PLC_Open.vi</code>，看 TCP 的資源字串怎麼組出來。學校實機要選 COM，COM Port 選 NI MAX 看到的 ASRLx::INSTR。',
 '在家：開 softplc，Run Host_Main，然後把 softplc 關掉：PLC Connected 燈會滅（每圈試著重連），再開 softplc，燈自己亮回來。這就是 False 頁在工作。',
 '在 Host_CommStep 的 Words 輸出線上右鍵 ▸ Probe，Run Host_Main，看 21 個值；最後一個是 1（連線中）。'
]},
C.h3('錯','','常見錯誤'),
C.table(['症狀','原因','解法'],[
 ['兩個迴圈都去讀 PLC，偶爾收到亂碼','同一條連線被兩個迴圈交錯使用','只讓一個迴圈擁有連線，其他人送佇列'],
 ['斷線後再也連不回來','錯誤一直留在 Shift Register 裡，後面的 VI 看到 error in 就不做事','重連前 Clear Errors'],
 ['斷線時 CPU 100%','重連失敗立刻再試','重連頁加 Wait（這裡 300 ms）'],
 ['寫入佇列越來越多','通訊迴圈一圈只 Dequeue 一筆','用 Flush Queue 一次寫完']]),
C.h3('測','q','小測驗'),
{quiz:[
 {q:'Host_CommStep 斷線頁為什麼先 Clear Errors 再 PLC_Open？',o:['讓 PLC_Open 不會因為舊錯誤而跳過不執行','加快速度','清除 PLC 的警報'],a:0,ex:'LabVIEW 的 VI 大多「error in 有錯就不做事」。不清掉，重連永遠不會真的執行。'},
 {q:'Flush Queue 接 For Loop，佇列空的時候？',o:['For Loop 跑 0 次，什麼都不寫','For Loop 等到有資料','出錯'],a:0,ex:'Auto-indexing 的 For Loop 次數 = 陣列長度。'},
 {q:'VISA 開 TCP 連線用的資源字串？',o:['TCPIP0::127.0.0.1::5551::SOCKET','COM5551','http://127.0.0.1:5551'],a:0,ex:'VISA 的 TCP socket 格式。'},
 {q:'21 個字的最後一個（索引 20）是？',o:['D320','連線旗標（1 = 連線中）','心跳'],a:1,ex:'Boolean To (0,1) → U16 → Build Array 接在最後。'},
 {q:'通訊迴圈為什麼不用 STOP 按鈕結束？',o:['用 Notifier 被釋放產生的錯誤當停止信號，結束順序由 UI 迴圈統一控制','忘了加','LabVIEW 不允許'],a:0,ex:'A7 會講完整的結束順序。'}
]}
]});

/* ======================================================================
   A5：檢測迴圈
   ====================================================================== */
L.push({id:'A05',order:35,no:'A5',part:PART,title:'檢測迴圈：交握、上升緣、錯誤分流',mins:80,
goals:[['學會','PLC ↔ PC 的 5 步交握；用 Shift Register 做上升緣／下降緣；Wait on Notification；錯誤碼分流；用錯誤線排順序。'],['看懂','檢測迴圈 3 個 Case：上升緣（檢測）、下降緣（D511=0）、進入步序 20（伺服復歸）。'],['用在','任何「PLC 要求、PC 回覆」的工作都用同樣的交握。']],
check:'能默寫 5 步交握，並解釋為什麼要等 b0 下降才把 D511 清 0。',
body:[
C.h3('懂','','5 步交握：PLC 和 PC 怎麼「確定對方收到了」'),
C.table(['步','誰','做什麼','D302.b0','D511'],[
 ['1','PLC','到步序 70：D306 = 零件 ID，<b>b0 = 1</b>（請求檢測）','0 → 1','0'],
 ['2','LabVIEW','看到 b0 上升：取像、檢測 → 寫 <b>D510</b>（結果）→ 寫 <b>D511 = 1</b>（完成）','1','0 → 1'],
 ['3','PLC','看到 D511 = 1：讀 D510（不是 1/2/3 → 9007），<b>b0 = 0</b>，進步序 80','1 → 0','1'],
 ['4','LabVIEW','看到 b0 下降：寫 <b>D511 = 0</b>','0','1 → 0'],
 ['5','PLC','下一顆到步序 70 之前確認 D511 = 0','0','0']]),
why('為什麼要 4 個動作來回','只寫一次「結果」不夠：PC 不知道 PLC 收到沒，PLC 也不知道 D510 是新的還是上一顆的。用「請求 ↑ → 完成 ↑ → 請求 ↓ → 完成 ↓」，每個信號都等對方回應才收回，<b>任何一邊慢了都不會錯</b>。PLC 那邊每一步有逾時（D531），LabVIEW 卡住會變 9005 警報，不會永遠等。'),
C.h3('懂','','上升緣：Host_Edge.vi'),
`<p>通訊迴圈每 100 ms 送一次 b0。b0 = 1 會持續好幾圈，但檢測只能做一次。所以要「這一圈是 1、上一圈是 0」才算：</p>`,
C.table(['輸入','意思'],[['Status','D302（索引 2）'],['Prev','上一圈的 b0（Shift Register）'],['Timed Out','Wait on Notification 逾時（這圈沒有新資料）']]),
C.table(['輸出','公式','意思'],[
 ['Rising','b0 AND (NOT Prev) AND (NOT Timed Out)','剛變 1：開始檢測'],
 ['Falling','(NOT b0) AND Prev AND (NOT Timed Out)','剛變 0：寫 D511 = 0'],
 ['Next','Timed Out ? Prev : b0','逾時時保留舊值，不要把「沒資料」當成 0']]),
img('P13_Host_Edge.png','Host_Edge.vi','Number To Boolean Array → Index Array 取 bit0 → And／Not 組出上升緣、下降緣；Select 決定 Next。'),
tip('Timed Out 為什麼要管','Wait on Notification 逾時時 notification 輸出是預設值（全 0），b0 會被看成 0。如果不檢查，就會誤判一個下降緣，然後下一圈又一個上升緣：同一顆零件檢測兩次。'),
C.h3('看','r','檢測迴圈的結構'),
arch({w:960,h:400,minw:760,boxes:[
 {id:'w',x:10,y:40,w:170,h:100,k:'data',t:'Wait on Notification',sub:['ignore previous = T','timeout 500 ms','→ 21 個字']},
 {id:'e',x:220,y:40,w:150,h:100,k:'#0b8a5f',t:'Host_Edge',sub:['Rising、Falling','Prev（SR）']},
 {id:'c1',x:420,y:10,w:520,h:170,t:'Case 1：Rising = True（檢測）',sub:['① TCP Write "SETID 1001\\n" 給相機','② Do_Inspect_R：伺服到位、取像、針腳／寬度／表面','③ 結果：OK → 33423361、NG → 33423362；伺服錯 5000～5999 → D510=3','④ Enqueue D510 → Enqueue D511=1（錯誤線串）','⑤ MES 佇列：{"lot":…,"part_id":…,"result":"OK"}','⑥ Host_LogLine → Log_Part 寫 CSV']},
 {id:'c2',x:420,y:200,w:250,h:80,k:'#7c3aed',t:'Case 2：Falling = True',sub:['Enqueue 33488896（D511=0）']},
 {id:'c3',x:690,y:200,w:250,h:110,k:'#b45309',t:'Case 3：剛進步序 20',sub:['(步序 = 20) AND NOT(上一圈 = 20)','Host_AxisInit：ALMCLR、SVON、HOME']},
 {id:'st',x:10,y:200,w:370,h:70,k:'#b91c1c',t:'停止：Wait on Notification 的 error out',sub:['Notifier 被釋放 → 錯誤 → 迴圈停']}],
 arrows:[{from:'w',to:'e'},{from:'e',to:'c1',fs:'r',ts:'l',p0:[370,75],p1:[420,75]},{from:'e',to:'c2',fs:'b',ts:'l',p0:[300,140],pts:[[300,240]],p1:[420,240]}],
 cap:'3 個 Case 各自獨立，條件是 False 時那一頁是空的。'}),
C.h3('懂','','檢測結果的幾個細節'),
C.table(['情況','怎麼處理','用到的函式'],[
 ['針腳數 = 0（全黑或沒零件）','Pins Defect 顯示 <code>image_invalid</code>，Surface Defect 留空，結果算 NG','Equal To 0? → Select（字串）'],
 ['伺服錯誤（錯誤碼 5000～5999）','寫 D510 = 3，PLC 發 9008；把這個錯誤清掉，讓後面的 Enqueue 照樣執行','Unbundle（code、status）→ In Range and Coerce（5000～5999）→ And → Clear Errors → Select（錯誤 cluster）'],
 ['其他錯誤（例如相機斷線）','錯誤留著：Enqueue 看到 error in 就不執行，<b>不寫結果</b>；PLC 等不到 → 9005 檢測逾時','錯誤線本身就是開關'],
 ['MES、CSV','只有真的判定過的零件才送（MES 的 Enqueue 接檢測的錯誤線）','Concatenate Strings 組 JSON；Format Into String 組 CSV']]),
why('錯誤線當成開關','LabVIEW 函式的慣例：<b>error in 有錯就什麼都不做，直接把錯誤傳下去</b>。所以把 Enqueue 的 error in 接到檢測的 error out，就等於「檢測失敗就不送結果」，不用另外寫 Case。這招在整個 13_PLC 到處都在用。'),
C.h3('看','r','CSV 一行怎麼組：Host_LogLine'),
`<p>${fn('Programming','String','Format Into String')} 用格式字串一次組好：<code>%s,%s,%d,%s,%d,%.4f,%.4f,%d,%s,%s,%s,%s</code>，依序是時間、批號、零件 ID、機種、針腳數、間距、寬度、暗點數、結果、三個缺陷。時間用 ${fn('Programming','Timing','Format Date/Time String')}。檔名是 <code>yyyy-mm-dd.csv</code>，每天一個檔。</p>`,
C.h3('做','b','動手'),
{todo:[
 '打開 Host_Main 方塊圖，找到檢測迴圈（最下面那個），切換 3 個 Case 的 True／False 頁。',
 '找到 33423361、33423362、33488897、33488896 四個常數，用計算機除以 65536 驗證。',
 '打開 <code>host\\Host_Edge.vi</code>，自己在前面板改 Status、Prev、Timed Out，按 Run，對照上面的公式表。',
 '在家跑整套：TRAINING 區按 Clamp Stuck 不會影響檢測；把 periph 模擬器關掉（相機斷線）→ 這顆不會寫結果 → 5 秒後 PLC 發 9005。'
]},
C.h3('測','q','小測驗'),
{quiz:[
 {q:'為什麼要等 b0 下降才寫 D511 = 0？',o:['確定 PLC 已經收到 D511 = 1 並讀過結果','比較快','PLC 規定 D511 只能寫一次'],a:0,ex:'b0 下降就是 PLC 的回覆：「我收到了」。'},
 {q:'Host_Edge 沒有檢查 Timed Out 會怎樣？',o:['逾時被當成 b0 = 0，可能同一顆檢測兩次','沒影響','迴圈停止'],a:0,ex:'逾時時資料是全 0。'},
 {q:'相機斷線時，檢測迴圈會寫結果給 PLC 嗎？',o:['會，寫 NG','不會，Enqueue 看到錯誤不執行，PLC 逾時發 9005','會，寫 OK'],a:1,ex:'錯誤線就是開關。'},
 {q:'伺服錯誤為什麼要 Clear Errors？',o:['讓後面的 Enqueue 能執行，把 D510 = 3 送給 PLC','隱藏錯誤','加快速度'],a:0,ex:'要讓 PLC 知道是伺服問題（9008），不是單純逾時。'},
 {q:'「剛進步序 20」怎麼判斷？',o:['步序 = 20','(步序 = 20) AND NOT(上一圈步序 = 20)','步序 > 20'],a:1,ex:'又是上升緣，用 Shift Register 記上一圈。'}
]}
]});

/* ======================================================================
   A6：UI 迴圈
   ====================================================================== */
L.push({id:'A06',order:36,no:'A6',part:PART,title:'UI 迴圈：顯示、按鈕、參數、Exit 流程',mins:90,
goals:[['學會','Notifier 逾時保留舊值；查表顯示文字；按鈕轉命令並排優先順序；只在變化時寫；閂鎖 + 計時的退出流程。'],['看懂','Host_Writes、Host_Params、Host_Lookup、Host_ToSnapshot，以及 Exit 的 7 個 Shift Register。'],['用在','任何監控畫面都需要這些小技巧。']],
check:'能說出按 Exit 之後 UI 迴圈什麼時候才真的停止（4 個條件），以及 Start 按鈕要通過哪道閘門才會寫到 PLC。',
body:[
C.h3('懂','','UI 迴圈的 Shift Register 一覽'),
C.table(['Shift Register','型別','存什麼','用在'],[
 ['last','21 個 U16','上一次收到的字','Notifier 逾時時繼續顯示舊值'],
 ['fault','U16','上一次的故障注入值','Host_Writes：只在改變時寫 D550'],
 ['leaving','Bool','是否已經按過 Exit','Exit 閂鎖'],
 ['since','U32','按 Exit 的時間（ms）','20 秒逾時'],
 ['p_speed／p_time／p_cap','U16','上一次寫進 PLC 的參數','Host_Params：只在改變時寫']]),
C.h3('懂','','① 拿資料：逾時就用舊的'),
`<p>Wait on Notification（timeout 200 ms）→ <b>Select</b>：timed out ? last : notification → 存回 last。這樣 PLC 斷線時畫面停在最後狀態，不會一下全變 0。</p>`,
C.h3('懂','','② 顯示：數字變文字'),
C.table(['顯示','做法'],[
 ['Step（30 Idle）','Host_Lookup：查表字串 <code>\\n30=30 Idle\\n70=70 Inspect\\n…</code>'],
 ['Alarm Text','同一個 Host_Lookup，換一張警報表'],
 ['Alarm 燈','警報代碼 Greater Than 0?'],
 ['SafetyOK、Stop Req','Number To Boolean Array → Index Array 取某一個 bit'],
 ['PLC Connected','索引 20 Greater Than 0?'],
 ['動線圖','Host_ToSnapshot（字 → 快照 Cluster）→ LV_DrawLine（畫在 Picture 上），Phase 接迴圈 i 讓燈閃']]),
img('P13_Host_Lookup.png','Host_Lookup.vi','Number To Decimal String 把 30 變 "30"，前後加 "\\n" 和 "="，用 Match Pattern 在表裡找 "\\n30="，取「找到之後」那段，再用第二個 Match Pattern 取到下一個換行之前。表裡沒有的代碼會顯示空白，所以新代碼記得加進表。比 Case Structure 好改：加一個代碼只要改表字串。'),
C.h3('懂','','③ 按鈕 → 命令：Host_Writes'),
img('P13_Host_Writes.png','Host_Writes.vi','上半：5 個按鈕各接一個 Select，串成一條鏈：最後一個 Select（Start）優先。結果 > 0 才 Enqueue（D100 × 65536 + 命令）。下半：E-Stop × 1 + Clamp Stuck × 2 = 故障值，和上一次不同才 Enqueue D550。'),
C.table(['重點','說明'],[
 ['Latch When Released','按鈕被讀一次就自動彈回。所以 UI 迴圈<b>每圈都要讀</b>按鈕端子，不能放在只有某些時候才執行的 Case 裡'],
 ['同一圈按兩個','Select 鏈決定只送一個，避免同時寫兩個 D100'],
 ['開關（Toggle）','E-Stop、Clamp Stuck 是開關，會一直維持；所以要「變了才寫」，不然每 200 ms 寫一次'],
 ['Start 閘門','(Start OR Test Start) AND <b>MES OK</b>：MES 開批失敗就不能生產。Test Start 是隱藏的開關，給自動測試用（Latch 按鈕不能從程式設定值）']]),
C.h3('懂','','④ 參數：Host_Params'),
img('P13_Host_Params.png','Host_Params.vi','步序 = 30（Idle）才寫。每個參數：In Range and Coerce 限制範圍（Speed 20～100、Timeout 10～300、Bin Cap 1～99）→ 和上一次比 Not Equal? → AND Idle → 是就 Enqueue，並把新值存回 Shift Register；否則保留舊值（所以運轉中改的值，回到 Idle 才生效）。'),
C.h3('懂','','⑤ Exit：先停機、再離線'),
C.table(['步','邏輯','函式'],[
 ['按下','press = Exit OR Test Exit','Or'],
 ['閂鎖','now_leaving = press OR leaving（上一圈）','Or + Shift Register'],
 ['第一次','first = now_leaving AND NOT leaving → Enqueue D100 = 2','Not、And、Case'],
 ['記時間','first ? Tick Count : since','Tick Count (ms)、Select、Shift Register'],
 ['完成條件','步序 = 30 <b>或</b> 步序 ≥ 900（警報）<b>或</b> 斷線 <b>或</b> 已過 20 秒','Equal?、Greater Or Equal?、Not、Subtract、Greater?、Or ×3'],
 ['停止','now_leaving AND done → 迴圈停止條件','And'],
 ['訊息','Exit Status：Stopping... ／ Exit timeout: PLC left to 9006 ／ Lot not started','Select ×3']]),
why('為什麼不直接停','直接停 LabVIEW，PLC 正在夾一顆零件，心跳停 2 秒後 9006 警報停機，這顆零件卡在機台裡。先送「做完這顆再停」，等 PLC 回到 Idle 才離線，機台停在乾淨的狀態。20 秒還等不到就放手，交給 PLC 的心跳保護。'),
note('為什麼 UI 迴圈沒用 Event Structure','10 MES 用 Event Structure；Host_Main 的 UI 迴圈本來就要每 200 ms 更新畫面，順便讀 Latch 按鈕最簡單，也比較好用腳本產生和測試。缺點是按鈕最多延遲 200 ms。如果 UI 要處理很多按鈕、或要在按鈕時立刻反應，改成 Event Structure（Timeout 事件做畫面更新）是更好的寫法，A8 的練習 4 就是這個。'),
C.h3('做','b','動手'),
{todo:[
 '打開 <code>host\\Host_Lookup.vi</code>，Table 填 <code>\\n1=one\\n2=two\\n</code>（字串控制項右鍵 ▸ \'\\\' Codes Display），Key 填 2，Run。',
 '打開 <code>host\\Host_Params.vi</code>，Step 填 70（不是 Idle）改 Speed，看 Next Speed 不會變；Step 改 30 再 Run。',
 '在家跑整套：生產中按 Exit，看 Exit Status 顯示 Stopping...，PLC 做完這顆回 Idle 後程式才停。',
 '選做：前面板加一個顯示「氣壓 kPa」：在 UI 迴圈用 Index Array 取索引 14（D314）接一個 Numeric Indicator。'
]},
C.h3('測','q','小測驗'),
{quiz:[
 {q:'UI 迴圈 Notifier 逾時時顯示什麼？',o:['全部歸零','上一次收到的值（Shift Register last）','錯誤'],a:1,ex:'Select 選 last。'},
 {q:'Host_Writes 裡 E-Stop 為什麼要「變了才寫」？',o:['開關會一直維持，不比較就每 200 ms 寫一次','PLC 規定','比較好看'],a:0,ex:'用 Shift Register 存上一次的值。'},
 {q:'運轉中把 Speed 改成 80，什麼時候生效？',o:['立刻','回到 Idle（步序 30）的那一圈','重新開程式'],a:1,ex:'Host_Params 只在 Idle 寫。'},
 {q:'MES 開批失敗時按 Start？',o:['照樣生產','不會寫 D100，Exit Status 顯示 Lot not started','程式當掉'],a:1,ex:'Start AND MES OK 這道閘門。'},
 {q:'按 Exit 後 UI 迴圈停止的條件不包括？',o:['PLC 回到 Idle','PLC 警報中','已過 20 秒','MES 上傳完畢'],a:3,ex:'MES 迴圈在 UI 迴圈停止之後才收尾（A7）。'},
 {q:'Latch 按鈕的端子放在只有 Idle 才執行的 Case 裡，會？',o:['非 Idle 時按下，按鈕不會被讀、也不會彈回，等到 Idle 突然生效','完全正常','LabVIEW 不允許'],a:0,ex:'Latch 按鈕要每圈都讀。'}
]}
]});

/* ======================================================================
   A7：MES 迴圈、結束順序、錯誤處理
   ====================================================================== */
L.push({id:'A07',order:37,no:'A7',part:PART,title:'MES 迴圈、結束順序與錯誤處理',mins:70,
goals:[['學會','失敗重送的待送清單；用「釋放參照」連鎖停止多個迴圈；錯誤線決定執行順序；錯誤和警告的差別。'],['看懂','Host_Main 的關機連鎖、Host_ErrOnly、Host_Exit。'],['用在','多迴圈程式最常出問題的地方就是「怎麼一起停下來」。']],
check:'能按順序說出按 Exit 之後 4 個迴圈停止的順序，以及每一步是被什麼觸發的。',
body:[
C.h3('懂','','MES 迴圈：網路慢不能卡生產'),
C.table(['步','做法','函式'],[
 ['等資料','Dequeue Element，timeout 200 ms','Dequeue Element'],
 ['加入待送','逾時 ? 待送清單 : 待送清單 + 新 JSON','Build Array（Concatenate Inputs）、Select'],
 ['上傳','MES_Flush：每圈送待送清單<b>最前面那一筆</b>，成功就刪掉它、失敗就留著','MES_Flush.vi'],
 ['存回','待送清單存回 Shift Register，下一圈再試','Shift Register'],
 ['停止','Dequeue 的 error out（佇列被釋放）','—']]),
img('P13_MES_Flush.png','MES_Flush.vi（從 10 MES 重用）','Array Size > 0 才做（Case True 頁）：Index Array 取第 0 筆 → MES_Post 送到 /api/result；如果出錯，或回覆是 SERVICE_UNAVAILABLE（Or），Select 選「原本的清單」；成功就選 Delete From Array（刪第 0 筆，長度 1）之後的清單。一圈只送一筆，網路壞的時候不會一直卡在重送。Pending Count = Array Size。'),
why('為什麼 MES 要自己一個迴圈','HTTP 可能要幾秒、可能失敗。如果放在檢測迴圈，MES 慢 = 檢測慢 = PLC 9005。分出去後，MES 掛了生產照樣跑，資料排在待送清單，網路恢復自動補送。'),
C.h3('懂','','關機連鎖：一個停，全部跟著停'),
arch({w:960,h:330,minw:780,boxes:[
 {id:'u',x:10,y:20,w:170,h:90,k:'#b45309',t:'① UI 迴圈停',sub:['Exit 條件成立']},
 {id:'rn',x:220,y:20,w:180,h:90,k:'data',t:'Release Notifier',sub:['error in 接 UI 迴圈的','Wait on Notification 錯誤線']},
 {id:'rq',x:440,y:20,w:160,h:90,k:'data',t:'Release Queue',sub:['寫入佇列']},
 {id:'cm',x:220,y:150,w:180,h:70,t:'② 通訊迴圈停',sub:['Send Notification 出錯']},
 {id:'in',x:440,y:150,w:180,h:70,k:'#7c3aed',t:'② 檢測迴圈停',sub:['Wait on Notification 出錯']},
 {id:'rm',x:660,y:150,w:140,h:70,k:'data',t:'Release Queue',sub:['MES 佇列']},
 {id:'ms',x:660,y:250,w:140,h:70,k:'#0b8a5f',t:'③ MES 迴圈停',sub:['Dequeue 出錯']},
 {id:'ex',x:830,y:250,w:120,h:70,k:'ext',t:'④ Host_Exit',sub:['結批、關連線']}],
 arrows:[{from:'u',to:'rn'},{from:'rn',to:'rq'},{from:'rn',to:'cm',fs:'b',ts:'t'},{from:'rn',to:'in',fs:'b',ts:'t',p0:[380,110],p1:[480,150]},{from:'in',to:'rm',l:'error out'},{from:'rm',to:'ms',fs:'b',ts:'t'},{from:'ms',to:'ex',l:'error out'}],
 cap:'不需要任何 Stop 按鈕或 Local Variable：釋放參照 → 正在等它的函式回傳錯誤 → 迴圈停止條件接錯誤線 → 停。'}),
warn('最常見的錯：Release 沒接 error in','Host_Main_說明.md 特別寫了這條：<b>Release Notifier 的 error in 要接 UI 迴圈的輸出</b>。LabVIEW 是資料流，「輸入到齊就執行」。Release Notifier 如果只接了 notifier 參照，它在程式<b>一開始</b>就會執行，所有迴圈立刻停。錯誤線在這裡的作用不是傳錯誤，而是<b>決定順序</b>。'),
C.h3('懂','','錯誤和警告'),
C.table(['status','code','是什麼','例子'],[
 ['True（紅 ✗）','非 0','錯誤：後面的 VI 會跳過','1122：等待時參照被釋放；5400：PLC 沒回 ACK'],
 ['False（綠 ✓）','非 0','警告：後面的 VI 照常執行','1073676293：VISA Read 讀到結束字元（其實是正常的）'],
 ['False','0','沒事','—']]),
img('P13_Host_Main_fp.png','前面板下面的 4 個錯誤顯示','這張截圖的 Init Error 是綠勾 + 1073676293（警告，不是錯）；Exit Error 是紅叉 1122，來源 Dequeue Element：這正是「MES 佇列被釋放 → Dequeue 出錯 → MES 迴圈停」留下的痕跡，是預期的關機方式，不是故障。',[[0,84.5,22,15,'Init：警告','#0b8a5f'],[62,84.5,15,15,'Exit：1122','#b91c1c']],700),
C.table(['工具','做什麼'],[
 ['Host_ErrOnly.vi','status 為 False（只有警告）就 Clear Errors，畫面只顯示真錯誤'],
 ['Clear Errors.vi','清掉錯誤，讓後面的 VI 照常執行（例如伺服錯誤後仍要送 D510=3）'],
 ['Merge Errors','多條錯誤線合成一條（這個專案沒用到，但很常見）'],
 ['Simple Error Handler','跳出對話框顯示錯誤；機台程式的主迴圈裡不要用，會卡住等人按 OK']]),
tip('想把 1122 也濾掉','在 Exit Error 前面加一個 Case：code = 1122 就 Clear Errors。或在 Host_ErrOnly 多一個「忽略的錯誤碼」輸入。這是很好的練習。'),
C.h3('懂','','Host_Exit：收尾'),
`<p>MES POST <code>/api/lot/end</code>（結批）→ VISA Close（伺服）→ TCP Close Connection（相機）。三個用錯誤線串起來；即使 MES 失敗，後面的 Close 還是會執行（Close 類函式在 error in 有錯時<b>仍然會關閉</b>，這是 LabVIEW 的特例）。</p>`,
C.h3('測','q','小測驗'),
{quiz:[
 {q:'MES 上傳失敗的資料會怎樣？',o:['丟掉','留在待送清單（Shift Register），下一圈再試','程式停止'],a:1,ex:'MES_Flush 回傳失敗的那些。'},
 {q:'Release Notifier 沒接 error in，會？',o:['程式一開始就釋放，所有迴圈立刻停','完全正常','跳出錯誤對話框'],a:0,ex:'資料流：輸入到齊就執行。'},
 {q:'Exit Error 顯示 1122、來源 Dequeue Element，代表？',o:['佇列被釋放，MES 迴圈照設計停止','MES 伺服器壞了','記憶體不足'],a:0,ex:'這是預期的關機訊號。'},
 {q:'status = False、code = 1073676293 是？',o:['錯誤','警告','沒事'],a:1,ex:'status 決定是不是錯誤。'},
 {q:'4 個迴圈停止的順序？',o:['UI → 通訊／檢測 → MES → Host_Exit','MES → UI → 通訊 → 檢測','同時'],a:0,ex:'Release Notifier 停通訊和檢測，檢測停了才 Release MES 佇列。'}
]}
]});

/* ======================================================================
   A8：自己規劃大架構
   ====================================================================== */
const sheet=[
 ['1 列需求','把要做的事全部列出來（看規格書、前面板草圖、PLC 位址表）','13_PLC：讀狀態、寫命令、心跳、檢測、畫面、參數、MES、CSV、故障練習'],
 ['2 分工','哪些給 PLC、哪些給 PC？安全和順序給 PLC','機台順序、急停、逾時 → PLC；影像、網路、畫面 → LabVIEW'],
 ['3 定介面','兩邊說話的「合約」：位址、意義、誰寫誰讀、交握','D100 命令、D300 狀態、D510/D511 交握、D520 心跳（PLC_SPEC.md）'],
 ['4 切迴圈','每件事的「多久一次、一次多久、用什麼資源」→ 分組','通訊 100 ms、檢測 1.4 s、UI 200 ms、MES 不定 → 4 個迴圈'],
 ['5 選傳遞','迴圈之間：命令用 Queue、狀態用 Notifier、自己記用 Shift Register','寫入佇列 U32、Notifier 21 字、MES 佇列字串'],
 ['6 定結束','誰決定結束？其他迴圈怎麼跟著停？資源誰關？','UI 決定 → 釋放連鎖 → Host_Exit'],
 ['7 先寫骨架','4 個空迴圈 + 建立／釋放 + 停止連鎖，<b>能啟動能結束</b>再往下','先確認 Exit 會乾淨停止'],
 ['8 由下往上填','先寫最底層（驅動）並單獨測試，再寫中間層，最後接進迴圈','driver → host → Host_Main'],
 ['9 測試','每個 SubVI 單獨 Run 測；整套用模擬器測；列故障測試表','softplc、periph、tests\\ 的自動測試']];

L.push({id:'A08',order:38,no:'A8',part:PART,title:'自己規劃大架構：從需求到能跑的骨架',mins:120,files:['我的架構骨架.vi'],
goals:[['學會','9 步規劃法；SubVI 的切法與介面規則；資料夾和命名；骨架先行、由下往上。'],['做出','4 迴圈骨架：能啟動、迴圈之間能傳資料、按 Exit 全部按順序停止。'],['之後','照這個方法，任何新機台都知道從哪裡下手。']],
check:'我的架構骨架.vi：Run 後 4 個迴圈的計數都在增加；按 Exit 後依 UI → 通訊／工作 → 紀錄的順序停止，沒有錯誤對話框，沒有迴圈卡住。',
body:[
C.h3('懂','','9 步規劃法（用 13_PLC 當例題）'),
C.table(['步驟','問自己','13_PLC 的答案'],sheet),
tip('先畫圖再開 LabVIEW','第 1～6 步只需要紙筆。畫出 A3 那種方塊圖：每個迴圈一個框、每個傳遞工具一個虛線框、箭頭標方向。圖畫得出來，程式就寫得出來；圖畫不出來，直接寫只會越改越亂。'),
C.h3('懂','','SubVI 怎麼切'),
C.table(['規則','說明','13_PLC 例子'],[
 ['一個 SubVI 一件事，名字就是那件事','名字說不清楚 = 切得不好','Host_Edge 只判斷邊緣；Host_Lookup 只查表'],
 ['迴圈裡「一圈的工作」做成 SubVI','主程式只剩結構，容易看','Host_CommStep'],
 ['同一段出現兩次以上就做成 SubVI','改一處全部生效','PLC_Frame 被讀、寫共用'],
 ['有 error in／error out','讓呼叫者能串順序、能用錯誤當開關','幾乎每個 VI'],
 ['Connector 4-2-2-4，左入右出，參照和錯誤在固定位置','參照左上入右上出、錯誤左下入右下出','driver 全部同一種排法'],
 ['複雜資料用 Type Def Cluster','加欄位時所有地方一起更新','Recipe.ctl、LV_Snapshot.ctl'],
 ['不要在 SubVI 裡放無限迴圈或對話框','SubVI 應該做完就回來','—']]),
C.h3('懂','','資料夾與命名'),
C.table(['層','資料夾','前綴','可以呼叫'],[
 ['主程式','根目錄','Main','所有'],['應用層','host\\','Host_','driver、reuse、LineView'],['畫面','LineView\\','LV_','—'],['驅動層','driver\\','PLC_','只有 LabVIEW 內建函式'],['重用','reuse\\','保留原名','自己那一包']]),
note('一個好習慣','每個資料夾放一份說明（13_PLC 有 Host_Main_說明.md、AOI_PLC_說明.md），寫：這個 VI 做什麼、輸入輸出、怎麼測。半年後的你會感謝現在的你。'),
C.h3('做','b','動手：4 迴圈骨架（不接 PLC，先把架構跑起來）'),
arch({w:960,h:360,minw:760,boxes:[
 {id:'o',x:10,y:140,w:130,h:90,k:'data',t:'建立',sub:['Obtain Queue（U32）','Obtain Notifier（I32）','Obtain Queue（字串）']},
 {id:'p',x:180,y:10,w:240,h:90,t:'通訊迴圈（100 ms）',sub:['計數 +1 → Send Notification','Flush Queue → 顯示收到的命令']},
 {id:'u',x:180,y:130,w:240,h:100,k:'#b45309',t:'UI 迴圈（Wait on Notif. 200）',sub:['顯示計數','按鈕 → Enqueue 位址×65536+值','Exit → 停止']},
 {id:'w',x:180,y:260,w:240,h:90,k:'#7c3aed',t:'工作迴圈（Wait on Notif. 500）',sub:['計數是 10 的倍數 → 「工作」','→ Enqueue 紀錄字串']},
 {id:'g',x:480,y:260,w:200,h:90,k:'#0b8a5f',t:'紀錄迴圈',sub:['Dequeue 200 → 加到 String 顯示']},
 {id:'r',x:480,y:120,w:200,h:110,k:'data',t:'釋放連鎖',sub:['Release Notifier ← UI 錯誤線','Release Queue（命令）','Release Queue（紀錄）← 工作迴圈錯誤線']},
 {id:'s',x:730,y:150,w:210,h:70,k:'ext',t:'Simple Error Handler',sub:['全部結束後才放']}],
 arrows:[{from:'o',to:'p',fs:'t',ts:'l',pts:[[75,55]]},{from:'o',to:'u'},{from:'o',to:'w',fs:'b',ts:'l',pts:[[75,305]]},{from:'u',to:'r',fs:'r',ts:'l',p0:[420,170],p1:[480,170]},{from:'w',to:'g'},{from:'g',to:'s',fs:'r',ts:'b',pts:[[835,305]]},{from:'r',to:'s'}],
 cap:'這是 Host_Main 去掉所有設備後剩下的骨架。先讓它能正確啟動、傳資料、停止，再一個一個把真的工作放進去。'}),
{todo:[
 '新 VI 存 <code>我的架構骨架.vi</code>。前面板：Numeric <code>Count</code>（顯示）、OK Button <code>Start</code>、<code>Exit</code>、String <code>Commands</code>、String <code>Log</code>、Numeric <code>Loops</code> ×4（每個迴圈的 i）。',
 '左邊：'+fn('Data Communication','Synchronization','Queue Operations','Obtain Queue')+' ×2（U32 常數、空字串常數當型別），'+fn('Data Communication','Synchronization','Notifier Operations','Obtain Notifier')+'（I32 常數當型別）。',
 '通訊迴圈：Shift Register 計數 +1 → Send Notification；Flush Queue → For Loop：Split Number → Format Into String "D%d=%d\\n" → 接到 Commands（用 Concatenate 累加，Shift Register 存）。Wait (ms) 100。停止條件 = Send Notification 的 error out。',
 'UI 迴圈：Wait on Notification（timeout 200）→ Count。Start 按 → Enqueue 100×65536+1（Case Structure 包起來）。Exit → 迴圈停止條件。',
 '工作迴圈：Wait on Notification（timeout 500，ignore previous T）→ Quotient & Remainder 除以 10，餘數 = 0 → Enqueue 紀錄字串 "work at n"。停止條件 = Wait on Notification 的 error out。',
 '紀錄迴圈：Dequeue（timeout 200）→ 沒逾時就加到 Log。停止條件 = Dequeue 的 error out。',
 '釋放連鎖：Release Notifier 的 error in 接 <b>UI 迴圈出來的錯誤線</b>；Release Queue（命令）接 Release Notifier 的 error out；Release Queue（紀錄）的 error in 接<b>工作迴圈出來的錯誤線</b>。',
 '最後：紀錄迴圈的錯誤線 → Clear Errors（code 1122 是預期的；進階：用 Case 只清 1122）→ Simple Error Handler。',
 'Run：4 個 Loops 都在增加；按 Start，Commands 出現 D100=1；Log 每秒多一行。按 Exit：全部停止，沒有對話框。',
 '故意拆掉 Release Notifier 的 error in，Run：所有迴圈一開始就停。接回去。這就是 A7 講的那個錯。'
]},
C.h3('練','x','練習：往骨架加功能（由易到難）'),
C.table(['#','題目','會用到','對照 13_PLC'],[
 ['1','UI 迴圈加 Reset 按鈕送 D100=3；Start、Reset 同一圈按只送 Start','Select 鏈','Host_Writes'],
 ['2','工作迴圈改成「計數從奇數變偶數」才工作（上升緣）','Shift Register、And、Not','Host_Edge'],
 ['3','紀錄迴圈改成寫 CSV 檔，每天一個檔','Format Date/Time String、Build Path、Open/Create/Replace File、Write to Text File','Log_Part'],
 ['4','UI 迴圈改成 Event Structure：Timeout 200 做畫面更新，按鈕各自一個事件','Event Structure','10 MES 的 Event 迴圈'],
 ['5','把寫入佇列的元素改成 Cluster {位址 U16, 值 U16}（Type Def），比較和 U32 打包哪個好讀','Bundle By Name、Type Def','—'],
 ['6','加「通訊斷線」：前面板一個開關模擬斷線，通訊迴圈斷線時送全 0 + 旗標，UI 顯示 Offline 並在 3 秒後自動恢復','Case、Shift Register、Tick Count','Host_CommStep 的 False 頁'],
 ['7','（挑戰）把骨架接上真的 driver：通訊迴圈換成 Host_CommStep，接 softplc','全部','Host_Main']]),
C.h3('錯','','架構上最常見的 8 個錯'),
C.table(['錯誤','後果','正確做法'],[
 ['所有東西放一個迴圈','慢的拖累快的，畫面卡、心跳停','依時間尺度切迴圈'],
 ['兩個迴圈都用同一個設備','封包交錯、回覆對不上','一個擁有者，其他人送佇列'],
 ['用 Local／Global Variable 在迴圈間傳命令','漏掉、競爭（Race Condition）','命令用 Queue'],
 ['用 Queue 傳高速狀態','佇列越塞越多、記憶體爆','狀態用 Notifier（只留最新）'],
 ['迴圈停止靠 Stop 按鈕的 Local Variable','Latch 按鈕不能用 Local；停止順序亂','一個迴圈決定，釋放參照連鎖停止'],
 ['Release 沒接 error in','一開始就釋放','錯誤線排順序'],
 ['迴圈裡用 Simple Error Handler','跳對話框卡住整個迴圈','錯誤顯示在前面板，最後才處理'],
 ['不寫骨架直接寫功能','停止和資料流問題最後才發現，改不動','先骨架、再功能']]),
C.h3('測','q','小測驗'),
{quiz:[
 {q:'規劃新機台程式的第一步？',o:['開 LabVIEW 拉 While Loop','列出所有要做的事，並分清楚 PLC 和 PC 各管什麼','先做前面板'],a:1,ex:'需求和分工決定了後面所有東西。'},
 {q:'新增一個「每 5 秒讀一次溫度計（一次 2 秒）」的功能，最好？',o:['放進通訊迴圈','自己一個迴圈，結果用 Notifier 或 Queue 給 UI','放進 UI 迴圈'],a:1,ex:'時間尺度和資源都不同。'},
 {q:'下面哪個最適合做成 SubVI？',o:['整個 Host_Main','「一圈要做的通訊工作」','一個 Add'],a:1,ex:'一件事、有清楚的輸入輸出。'},
 {q:'驅動層（PLC_）可以呼叫 Host_ 開頭的 VI 嗎？',o:['可以','不行：下層不知道上層','看情況'],a:1,ex:'分層：上層呼叫下層。'},
 {q:'骨架完成的判斷標準？',o:['畫面漂亮','能啟動、迴圈間能傳資料、按 Exit 全部按順序停止','功能全部做完'],a:1,ex:'先確認架構正確，再加功能。'}
]}
]});

/* ======================================================================
   A9：函式速查
   ====================================================================== */
const ref=[
 ['結構','While Loop','Programming ▸ Structures','4 個主迴圈','4'],
 ['結構','For Loop','Programming ▸ Structures','Host_CommStep 寫入、PLC_ReadWords 拆字','7'],
 ['結構','Case Structure','Programming ▸ Structures','檢測 3 個 Case、斷線重連','6'],
 ['結構','Shift Register','迴圈邊框右鍵 ▸ Add Shift Register','心跳、上一次 b0、Exit 閂鎖','5'],
 ['結構','Event Structure','Programming ▸ Structures','10 MES 的 UI 迴圈','C4'],
 ['同步','Obtain／Release Queue','Data Communication ▸ Synchronization ▸ Queue Operations','寫入佇列、MES 佇列','16、A3'],
 ['同步','Enqueue Element','同上','按鈕、檢測結果','16'],
 ['同步','Dequeue Element','同上','MES 迴圈、Decode_Cmd','16、A2'],
 ['同步','Flush Queue','同上','Host_CommStep 一次寫完','A4'],
 ['同步','Obtain／Release Notifier','Data Communication ▸ Synchronization ▸ Notifier Operations','21 字狀態','C8、A3'],
 ['同步','Send Notification','同上','通訊迴圈','A3'],
 ['同步','Wait on Notification','同上','UI、檢測迴圈','A5、A6'],
 ['陣列','Index Array','Programming ▸ Array','取 D300、D302…','7'],
 ['陣列','Initialize Array','Programming ▸ Array','斷線時 20 個 0','7'],
 ['陣列','Build Array（Concatenate Inputs）','Programming ▸ Array','20 字 + 連線旗標、MES 待送','7、15'],
 ['陣列','Array Subset／Replace Array Subset','Programming ▸ Array','Host_ToSnapshot','7'],
 ['陣列','Search 1D Array／Reverse 1D Array／Transpose 2D Array','Programming ▸ Array','Inspect_Width','C5'],
 ['陣列','Add Array Elements','Programming ▸ Numeric','PLC_Frame 校驗碼','9'],
 ['數值','Split Number','Programming ▸ Numeric ▸ Data Manipulation','U32 拆位址／值、U16 拆高低位元組','A3'],
 ['數值','To Unsigned Word／Long Integer','Programming ▸ Numeric ▸ Conversion','U16、U32 轉型','3'],
 ['數值','Boolean To (0,1)','Programming ▸ Boolean','連線旗標、故障位元','3'],
 ['數值','Number To Boolean Array','Programming ▸ Boolean','D302 拆 bit','15'],
 ['數值','In Range and Coerce','Programming ▸ Comparison','參數限制、錯誤碼範圍','A6'],
 ['數值','Increment、Add、Subtract、Multiply、Absolute Value','Programming ▸ Numeric','心跳、計時','2'],
 ['比較','Equal?、Not Equal?、Greater?、Greater Or Equal?、Greater Than 0?、Equal To 0?','Programming ▸ Comparison','步序判斷','6'],
 ['比較','Select','Programming ▸ Comparison','到處：保留舊值、選命令','6'],
 ['布林','And、Or、Not','Programming ▸ Boolean','邊緣、閘門','2'],
 ['字串','Concatenate Strings','Programming ▸ String','JSON、VISA 資源字串、封包','9'],
 ['字串','Match Pattern','Programming ▸ String','Host_Lookup、Host_Trim','9'],
 ['字串','Format Into String','Programming ▸ String','CSV 一行','C6'],
 ['字串','Number To Decimal／Hexadecimal String、Hexadecimal String To Number','Programming ▸ String ▸ Number/String Conversion','封包、查表','9'],
 ['字串','String Subset、String To Byte Array','Programming ▸ String','解回覆、算校驗','9'],
 ['檔案','Current VI\'s Path、Strip Path、Build Path、Empty String/Path?','Programming ▸ File I/O','Recipe Dir 留空時自動找路徑','C6'],
 ['檔案','Format Date/Time String','Programming ▸ Timing','CSV 時間、檔名','C6'],
 ['時間','Wait (ms)、Tick Count (ms)','Programming ▸ Timing','迴圈週期、Exit 20 秒','4'],
 ['通訊','VISA Open／Configure Serial Port／Write／Read／Close','Instrument I/O ▸ VISA（Serial）','驅動層','12'],
 ['通訊','TCP Open Connection／Write／Close Connection','Data Communication ▸ Protocols ▸ TCP','相機','C12'],
 ['Cluster','Bundle、Unbundle（By Name）','Programming ▸ Cluster','錯誤 cluster 拆 code、快照','8'],
 ['錯誤','Clear Errors.vi','Programming ▸ Dialog & User Interface','重連、伺服錯誤','11'],
 ['分析','Mean.vi','Mathematics ▸ Probability & Statistics','Inspect_Width、CSV 間距','—'],
 ['畫面','Picture 控制項＋繪圖函式','Controls ▸ Graph ▸ Controls ▸ 2D Picture','LV_DrawLine 動線圖','—'],
 ['畫面','Mechanical Action（Latch When Released）','按鈕右鍵','所有按鈕','6'],
 ['畫面','Visible 屬性（隱藏控制項）','右鍵 ▸ Advanced ▸ Hide Control','Test Start、Test Exit','C8']];

L.push({id:'A09',order:39,no:'A9',part:PART,title:'速查：13_PLC 用到的每一個函式',mins:30,
goals:[['用途','看 13_PLC 的程式時，不認識的函式來這裡查：在哪個選盤、這專案用在哪、哪一課有教。'],['小技巧','記不得在哪個選盤時，按 Ctrl+Space 打英文名字（Quick Drop）最快。']],
check:'在 Host_Main 方塊圖隨便點 5 個函式，都能在這張表找到並說出它在做什麼。',
body:[
note('怎麼用這張表','「課」那一欄：數字是 0～21 課，C 開頭是 CLAD 課，A 開頭是這一部分。滑鼠停在 LabVIEW 函式上按 Ctrl+H 會開 Context Help，看輸入輸出說明。'),
C.table(['類別','函式','選盤路徑（Functions ▸ …）','13_PLC 用在','課'],ref.map(r=>[r[0],`<b>${r[1]}</b>`,r[2],r[3],r[4]])),
C.h3('測','q','小測驗'),
{quiz:[
 {q:'把 U32 拆成高 16 位元和低 16 位元？',o:['Split Number','Join Numbers','Index Array'],a:0,ex:'反過來是 Join Numbers。'},
 {q:'一次拿出佇列裡全部元素、不等待？',o:['Dequeue Element','Flush Queue','Preview Queue Element'],a:1,ex:'回傳陣列。'},
 {q:'Host_Lookup 用哪個函式在字串裡找「\\n30=」？',o:['Match Pattern','Search 1D Array','Scan From String'],a:0,ex:'Match Pattern 回傳找到之前、找到的、之後三段。'},
 {q:'限制參數在 20～100？',o:['In Range and Coerce','Select','Max & Min'],a:0,ex:'coerced(x) 輸出限制後的值，In Range? 輸出是否在範圍內。'}
]}
]});

})();
