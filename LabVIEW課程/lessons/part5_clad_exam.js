/* 第五部分：CLAD 模擬考（題庫隨機抽 40 題）與考前速查表 */
(function(){
const L=window.LESSONS;
const {tip,warn,note,PART}=C.clad;

/* ---------- 看圖題用的小方塊圖 ---------- */
const loopSR={bd:{w:480,h:170,structs:[{id:'fl',k:'for',x:140,y:30,w:220,h:120}],nodes:[
  {id:'cn',k:'const',t:'i32',v:4,x:80,y:29},{id:'N',k:'N',s:'fl'},{id:'k1',k:'const',t:'i32',v:1,x:70,y:71},{id:'sr',k:'sr',t:'i32',s:'fl',y:80},
  {id:'k2',k:'const',t:'i32',v:2,x:180,y:110},{id:'mul',k:'fn',fn:'Multiply',x:230,y:73},{id:'o',k:'ind',t:'i32',label:'Result',x:400,y:70}],
 wires:[{id:'w1',from:'cn',to:'N',t:'i32'},{id:'w2',from:'k1',to:'sr.init',t:'i32'},{id:'w3',from:'sr.L',to:'mul.x',t:'i32'},{id:'w4',from:'k2',to:'mul.y',t:'i32',mx:215},{id:'w5',from:'mul.out',to:'sr.R',t:'i32'},{id:'w6',from:'sr.out',to:'o',t:'i32'}]}};
const whileCount={bd:{w:480,h:180,structs:[{id:'wl',k:'while',x:60,y:20,w:300,h:140}],nodes:[
  {id:'iter',k:'iter',s:'wl'},{id:'k5',k:'const',t:'i32',v:5,x:150,y:90},{id:'eq',k:'fn',fn:'Equal?',x:230,y:100},{id:'cond',k:'stop',s:'wl'},
  {id:'to',k:'tunnel',t:'i32',s:'wl',side:'r',y:50},{id:'o',k:'ind',t:'i32',label:'i out',x:400,y:40}],
 wires:[{id:'w1',from:'iter',to:'eq.x',t:'i32',mx:120},{id:'w2',from:'k5',to:'eq.y',t:'i32',mx:215},{id:'w3',from:'eq.out',to:'cond',t:'bool'},{id:'w4',from:'iter',to:'to.i',t:'i32',pts:[[100,149],[100,56]]},{id:'w5',from:'to.o',to:'o',t:'i32'}]}};
const caseDef={bd:{w:480,h:150,structs:[{id:'cs',k:'case',x:140,y:30,w:200,h:100,frames:['1','2..4','Default'],def:'Default',cur:1}],nodes:[
  {id:'k',k:'const',t:'i32',v:5,x:60,y:71},{id:'sel',k:'sel',t:'i32',s:'cs',y:80},
  {id:'a',k:'const',t:'str',v:'A',x:220,y:71,f:'cs:1'},{id:'b',k:'const',t:'str',v:'B',x:220,y:71,f:'cs:2..4'},{id:'c',k:'const',t:'str',v:'C',x:220,y:71,f:'cs:Default'},
  {id:'to',k:'tunnel',t:'str',s:'cs',side:'r',y:80},{id:'o',k:'ind',t:'str',label:'Out',x:390,y:70}],
 wires:[{id:'w1',from:'k',to:'sel',t:'i32'},{id:'wa',from:'a',to:'to.i',t:'str',f:'cs:1'},{id:'wb',from:'b',to:'to.i',t:'str',f:'cs:2..4'},{id:'wc',from:'c',to:'to.i',t:'str',f:'cs:Default'},{id:'w2',from:'to.o',to:'o',t:'str'}]}};
const parallel={bd:{w:460,h:150,nodes:[
  {id:'a',k:'ctl',t:'dbl',label:'A',x:20,y:20},{id:'b',k:'ctl',t:'dbl',label:'B',x:20,y:90},{id:'add',k:'fn',fn:'Add',x:150,y:16},{id:'mul',k:'fn',fn:'Multiply',x:150,y:86},
  {id:'o1',k:'ind',t:'dbl',label:'Sum',x:300,y:20},{id:'o2',k:'ind',t:'dbl',label:'Product',x:300,y:90}],
 wires:[{id:'w1',from:'a',to:'add.x',t:'dbl'},{id:'w2',from:'a',to:'mul.x',t:'dbl',mx:100},{id:'w3',from:'b',to:'add.y',t:'dbl',mx:120},{id:'w4',from:'b',to:'mul.y',t:'dbl'},{id:'w5',from:'add.out',to:'o1',t:'dbl'},{id:'w6',from:'mul.out',to:'o2',t:'dbl'}]}};

/* ---------- 題庫（topic 用來提示要複習哪一課） ---------- */
const T={env:'C1 環境與除錯',dt:'C2 資料型別',loop:'C3 迴圈與時間',st:'C4 結構',arr:'C5 陣列與 Cluster',file:'C6 字串與檔案',mod:'C7 模組化',com:'C8 迴圈間通訊',dp:'C9 設計模式',err:'C10 錯誤處理',ui:'C11 圖表與 UI',hw:'C12 DAQmx 與儀器',df:'第 2 課 資料流'};
const BANK=[
 {topic:T.loop,q:'Shift Register 初始值 1，每圈乘 2，N = 4。Result = ？',lv:loopSR,o:['8','16','32','4'],a:1,ex:'1 → 2 → 4 → 8 → 16。'},
 {topic:T.loop,q:'While Loop 在 i = 5 時停止，i 從 Last Value 通道輸出。i out = ？迴圈共執行幾次？',lv:whileCount,o:['5；5 次','5；6 次','4；5 次','6；6 次'],a:1,ex:'i = 0～5 共 6 圈，最後一圈 i = 5。'},
 {topic:T.st,q:'Case 頁籤有 1、2..4、Default，Selector 接 5。Out = ？',lv:caseDef,o:['A','B','C','錯誤'],a:2,ex:'5 不在 1 或 2..4 → Default。'},
 {topic:T.df,q:'Add 和 Multiply 哪一個先執行？',lv:parallel,o:['Add（在上面）','Multiply','同時或不一定，沒有資料相依','Sum 先顯示'],a:2,ex:'兩者沒有線相連，LabVIEW 可平行執行，順序不保證。'},
 {topic:T.env,q:'一個 VI 的 Run 箭頭是斷的，要看是什麼錯誤，最快的方法？',o:['按 Ctrl+B','點斷掉的 Run 箭頭開 Error List','開 Highlight Execution','重新開機'],a:1,ex:'Error List 列出所有錯誤，雙擊會跳到位置。'},
 {topic:T.env,q:'Step Out 的作用？',o:['進入 SubVI','跳過下一個節點','執行完目前的 SubVI 或結構後暫停在上一層','結束程式'],a:2,ex:'Step Into 進入、Step Over 跳過、Step Out 出去。'},
 {topic:T.env,q:'Retain Wire Values 開啟後可以？',o:['讓程式變快','執行結束後用 Probe 看線上最後的值','保留 Shift Register 的值','把線鎖住不能刪'],a:1,ex:'平常 Probe 要在執行前放好才有值。'},
 {topic:T.env,q:'在 Project 裡建立 .exe 需要什麼？',o:['Build Specifications ▸ Application','VI Properties ▸ Protection','Dependencies','Tools ▸ Profile'],a:0,ex:'需要 Application Builder；目標電腦裝 Run-Time Engine。'},
 {topic:T.dt,q:'To Unsigned Byte Integer（U8）輸入 DBL 300.7，輸出？',o:['44','255','45','300'],a:1,ex:'浮點轉整數超出範圍時會限制在該型別的最大值（255）。整數運算溢位才會繞回。'},
 {topic:T.dt,q:'I16 的 32767 加上 I16 的 1，結果？',o:['32768','-32768','32767','0'],a:1,ex:'有號整數溢位繞到最小值。'},
 {topic:T.dt,q:'Round To Nearest 輸入 4.5，輸出？',o:['4','5','4.5','錯誤'],a:0,ex:'LabVIEW 五取偶：4.5 → 4，5.5 → 6。'},
 {topic:T.dt,q:'Enum 和 Ring 最主要的差別？',o:['Enum 只能放 Boolean','Enum 的項目文字是資料型別的一部分，值只能 0 起連續','Ring 不能放在前面板','沒有差別'],a:1,ex:'Ring 的值可自訂、文字不屬於型別。'},
 {topic:T.dt,q:'哪一種控制項設定會讓「外觀」也和 .ctl 同步？',o:['Control','Type Def','Strict Type Def','Typedef 都會'],a:2,ex:'Strict Type Def 同步型別和外觀。'},
 {topic:T.dt,q:'Timestamp 從什麼時間開始計算秒數？',o:['1970-01-01','1904-01-01 00:00 UTC','2000-01-01','電腦開機時'],a:1,ex:'LabVIEW 的時間原點是 1904 年。'},
 {topic:T.dt,q:'Boolean 按鈕設成 Latch When Released 時，哪件事做不到？',o:['在 Event Structure 用','建立 Local Variable','接到 Case','接到 Loop Condition'],a:1,ex:'Latch 不能有 Local Variable。'},
 {topic:T.loop,q:'For Loop 的 N 接 5，自動索引輸入一個空陣列，迴圈執行幾次？',o:['5','0','1','錯誤'],a:1,ex:'取最小：空陣列 = 0。'},
 {topic:T.loop,q:'For Loop 執行 0 次，迴圈內的 DBL 從 Last Value 通道輸出，值為？',o:['NaN','0','上次的值','錯誤'],a:1,ex:'沒執行時輸出型別的預設值。'},
 {topic:T.loop,q:'While Loop 的 Loop Condition 接一個在迴圈「外面」的 Stop 按鈕（Switch 動作），一開始是 False，Run 後按下 Stop 會？',o:['迴圈停止','迴圈永遠不停（按鈕只在迴圈開始前讀一次）','VI 斷掉','停兩次'],a:1,ex:'迴圈外的端子只讀一次，要放在迴圈裡。'},
 {topic:T.loop,q:'Wait Until Next ms Multiple 接 100，第一圈的等待時間？',o:['一定 100 ms','0 到 100 ms 之間，不固定','0','200 ms'],a:1,ex:'等到下一個 100 ms 的倍數，所以第一圈時間不固定。'},
 {topic:T.loop,q:'Indexing 輸出通道與 Concatenating 輸出通道的差別（每圈產生 3 個元素的 1D 陣列，跑 4 圈）？',o:['都輸出 4×3 的 2D','Indexing 輸出 4×3 的 2D；Concatenating 輸出 12 個元素的 1D','都輸出 12 個元素','Indexing 輸出最後一圈'],a:1,ex:'Concatenating 把每圈的陣列接起來。'},
 {topic:T.st,q:'Case Structure 的 Selector 接一個 DBL 2.7，會執行哪一頁？',o:['2','3','Default','VI 斷掉'],a:1,ex:'浮點數會捨入成整數（3）。'},
 {topic:T.st,q:'Case 輸出通道的「Use Default If Unwired」的意思？',o:['所有頁都要接','沒接的頁輸出該型別的預設值','輸出上一次的值','刪除通道'],a:1,ex:'方便但可能藏住忘記接線的錯誤。'},
 {topic:T.st,q:'程式用 Property Node 的 Value 寫一個數字控制項，Event Structure 裡這個控制項的 Value Change 頁會執行嗎？',o:['會','不會','會執行兩次','只有 Timeout 頁會'],a:1,ex:'要觸發請用 Value (Signaling)。'},
 {topic:T.st,q:'Event Structure 的 Timeout 接 0，沒有事件時？',o:['永遠等','立刻執行 Timeout 頁','錯誤','等 1 秒'],a:1,ex:'0 = 不等待。'},
 {topic:T.st,q:'哪一個是 Filter 事件？',o:['Value Change','Mouse Down','Panel Close?','Timeout'],a:2,ex:'名稱有問號、紅色箭頭的是 Filter 事件，可丟棄。'},
 {topic:T.st,q:'Stacked Sequence 各頁之間傳資料用？',o:['直接拉線','Sequence Local','Shift Register','Tunnel'],a:1,ex:'Flat Sequence 直接拉線；Stacked 用 Sequence Local。'},
 {topic:T.arr,q:'2D 陣列 3 列 × 4 行，Array Size 的輸出？',o:['12','[3, 4]','[4, 3]','3'],a:1,ex:'多維陣列輸出每一維的大小。'},
 {topic:T.arr,q:'Index Array 接一個 2D 陣列，只接 row 索引 1，輸出？',o:['第 1 列（1D 陣列）','單一元素','錯誤','第 1 行'],a:0,ex:'只接一個索引時取出整列（或整行）。'},
 {topic:T.arr,q:'Build Array 輸入一個 1D 陣列 [1, 2] 和一個純量 3，輸出？',o:['[[1, 2], 3]','[1, 2, 3]','錯誤','[3, 1, 2]'],a:1,ex:'純量自動接到陣列後面。'},
 {topic:T.arr,q:'Delete From Array 從 [10, 20, 30, 40] 的 index 1 刪 2 個，第一個輸出？',o:['[10, 40]','[20, 30]','[10, 20]','[30, 40]'],a:0,ex:'刪掉 20、30；第二個輸出是刪掉的 [20, 30]。'},
 {topic:T.arr,q:'Cluster 有元素 A（標籤）、B、C，但 Cluster Order 是 C、A、B。Unbundle 的第一個輸出是？',o:['A','B','C','依位置'],a:2,ex:'照 Cluster Order。'},
 {topic:T.arr,q:'Replace Array Subset 用超出範圍的索引，結果？',o:['陣列變長','陣列不變','錯誤','清空'],a:1,ex:'Replace 不會改變大小，超出範圍不做事。'},
 {topic:T.file,q:'Scan From String 輸入 "T=25.5C"，格式 "T=%fC"，輸出？',o:['25','25.5','錯誤','"25.5"'],a:1,ex:'格式和文字相符時取出 25.5。'},
 {topic:T.file,q:'Format Into String 用 "%05.1f" 格式化 3.14159，輸出？',o:['3.1','003.1','03.14','3.14159'],a:1,ex:'總寬 5、補 0、小數 1 位：003.1。'},
 {topic:T.file,q:'Write to Text File 的 file 輸入沒接（沒有路徑也沒有 refnum），執行時？',o:['錯誤','跳出對話框讓使用者選檔','寫到桌面','什麼都不做'],a:1,ex:'高階檔案函式沒給路徑會開對話框。'},
 {topic:T.file,q:'要記錄大量量測資料並附上每個通道的單位、取樣率等資訊，NI 推薦的格式？',o:['CSV','TDMS','INI','Datalog'],a:1,ex:'TDMS 有 File/Group/Channel 三層屬性。'},
 {topic:T.file,q:'用 Open/Create/Replace File 開檔，寫完後沒有 Close File，可能的問題？',o:['沒問題','檔案被佔用、資料可能沒寫入磁碟、資源洩漏','VI 斷掉','檔案被刪除'],a:1,ex:'refnum 用完一定要關。'},
 {topic:T.file,q:'Configuration File VIs 存的檔案格式？',o:['XML','INI：[Section] 下 key=value','Binary','TDMS'],a:1,ex:'Open Config Data → Read/Write Key → Close Config Data。'},
 {topic:T.mod,q:'SubVI 輸出端子可以設成 Required 嗎？',o:['可以','不可以，輸出只能 Recommended 或 Optional','只有 Boolean 可以','只有在 Polymorphic VI 可以'],a:1,ex:'Required 只適用於輸入。'},
 {topic:T.mod,q:'框選一段方塊圖後，哪個指令能直接把它變成 SubVI？',o:['Edit ▸ Create SubVI','File ▸ Save As','Tools ▸ Profile','Ctrl+B'],a:0,ex:'LabVIEW 會自動建立控制項、指示器和 Connector。'},
 {topic:T.mod,q:'Preallocated clone reentrant 的 SubVI 放在主 VI 的三個位置，記憶體中有幾份？',o:['1','3','依 CPU 數量','0'],a:1,ex:'每個呼叫位置一份。'},
 {topic:T.mod,q:'Express VI 右鍵 Open Front Panel 之後？',o:['變成一般 SubVI，不能再回到設定對話框','可以隨時切回','VI 斷掉','變成 Polymorphic VI'],a:0,ex:'轉換不可逆。'},
 {topic:T.com,q:'Local Variable 和直接用端子相比，主要缺點？',o:['比較慢且會複製資料，並可能造成 race condition','不能讀','不能寫','只能用在 SubVI'],a:0,ex:'打破資料流。'},
 {topic:T.com,q:'Functional Global Variable 的 SubVI 必須設定成？',o:['Preallocated clone','Shared clone','Non-reentrant','Run when opened'],a:2,ex:'只有一份、一次一個呼叫者。'},
 {topic:T.com,q:'Notifier 的 Wait on Notification，同時有三個迴圈在等，Send Notification 一次，幾個迴圈會收到？',o:['1','3','0','隨機一個'],a:1,ex:'Notifier 廣播給所有等待者。'},
 {topic:T.com,q:'Queue 的 Dequeue Element timeout 接 -1，佇列空的時候？',o:['立刻回 timed out','永遠等到有元素或佇列被釋放','錯誤','回傳預設值'],a:1,ex:'-1 = 永遠等。'},
 {topic:T.com,q:'Release Queue 後，另一個迴圈正在等 Dequeue，會？',o:['繼續等','立刻回傳錯誤','回傳最後一個元素','LabVIEW 當機'],a:1,ex:'常用來讓 Consumer 迴圈結束（本課程第 16 課）。'},
 {topic:T.com,q:'Property Node 的 Value 屬性和 Local Variable 都能寫值，哪一個比較快？',o:['Property Node','Local Variable','一樣','都不行'],a:1,ex:'Property Node 要切換到 UI 執行緒，比較慢。'},
 {topic:T.com,q:'要讓一個 SubVI 改變主 VI 某個控制項的 Visible 屬性，要傳什麼進 SubVI？',o:['控制項的值','Control Reference','Global Variable','VI 路徑'],a:1,ex:'在 SubVI 用 Property Node 接 reference。'},
 {topic:T.dp,q:'需求：測試流程「初始化 → 量測 → 判斷合格 → 不合格時重測 → 結束」，最適合？',o:['Producer/Consumer','State Machine','Master/Slave','FGV'],a:1,ex:'有步驟、會依條件跳轉。'},
 {topic:T.dp,q:'Producer/Consumer 中，Producer 產生資料比 Consumer 處理快很多、而且一直持續，會發生什麼？',o:['資料遺失','Queue 越來越長，吃掉記憶體','程式變快','Consumer 自動加速'],a:1,ex:'可設 max queue size 或加快 Consumer。'},
 {topic:T.dp,q:'哪一種模式「每次只保留最新資料」，適合一個迴圈驅動多個迴圈？',o:['Producer/Consumer（Queue）','Master/Slave（Notifier）','State Machine','QMH'],a:1,ex:'Notifier。'},
 {topic:T.err,q:'error out 為 status True、code -1073807339（VISA 逾時），後面接著錯誤線的 VISA Write 會？',o:['照樣寫','不執行，把錯誤傳下去','清除錯誤後執行','跳出對話框'],a:1,ex:'一般函式 error in 有錯就不執行。'},
 {topic:T.err,q:'Merge Errors 的輸入都沒有錯誤，但第二個輸入有警告，輸出？',o:['無錯誤無警告','那個警告','錯誤','第一個輸入'],a:1,ex:'沒有錯誤時傳出第一個警告。'},
 {topic:T.ui,q:'Waveform Chart 一次接一個 1D 陣列 [1, 2, 3]，會？',o:['畫三條曲線','把三個點依序加到同一條曲線','錯誤','只畫最後一個'],a:1,ex:'陣列 = 同一條曲線的多個點；要多條曲線用 Cluster。'},
 {topic:T.ui,q:'Waveform Graph 接 Cluster (x0 = 10, dx = 0.5, Y = [1, 2, 3])，第三個點的 X 值？',o:['3','11','2','10.5'],a:1,ex:'x = x0 + i·dx = 10 + 2×0.5 = 11。'},
 {topic:T.ui,q:'XY Graph 要畫一條曲線，最基本的輸入？',o:['1D 陣列','Cluster (X 陣列, Y 陣列)','Waveform','純量'],a:1,ex:'X、Y 各一個陣列包成 Cluster。'},
 {topic:T.hw,q:'DAQmx Read 要讀 Continuous 擷取的資料，迴圈每次讀「取樣率的 1/10 點」，代表迴圈約多久跑一圈？',o:['10 ms','100 ms','1 s','不一定'],a:1,ex:'例如 1 kHz、每次 100 點 = 每 100 ms 一圈。'},
 {topic:T.hw,q:'DAQmx 的 Task 用完沒有 Clear Task，可能的問題？',o:['沒問題','資源沒釋放，下次可能無法使用同一個裝置','資料變多','VI 斷掉'],a:1,ex:'一定要 Clear（或至少 Stop 再 Clear）。'},
 {topic:T.hw,q:'NI MAX 的 Test Panel 用途？',o:['寫程式','不寫程式直接測試裝置與接線','建置 exe','管理授權'],a:1,ex:'先在 MAX 確認硬體正常再寫程式。'},
 {topic:T.hw,q:'序列埠儀器回應的資料總是缺最後一段，最可能的原因？',o:['取樣率太低','終止字元或 byte count 設定錯誤','用了 Differential','沒有 DAQmx'],a:1,ex:'VISA Read 遇到終止字元或讀滿 byte count 就結束。'},
 {topic:T.hw,q:'VISA 資源名稱 "ASRL1::INSTR" 是？',o:['GPIB 位址 1','序列埠 COM1','USB 裝置','網路儀器'],a:1,ex:'ASRL = Asynchronous Serial。'}
];
BANK.push(...(C.CLAD_EXTRA||[]));
C.CLAD_BANK=BANK;

/* ======================================================================
   CX 模擬考 + 考前速查表
   ====================================================================== */
L.push({id:'CX',order:120,no:'CX',part:PART,title:'CLAD 模擬考與考前速查表',mins:75,
goals:[['模擬考','從 '+BANK.length+' 題題庫隨機抽 40 題、60 分鐘、70% 及格。交卷後顯示答案、解說和要複習的課。'],['建議','兩次以上考到 85% 再去報名。'],['速查表','考前一天看下面的表就好。']],
check:'模擬考兩次以上 ≥ 85%。',
body:[
C.h3('考','q','模擬考'),
{exam:{bank:BANK,n:40,minutes:60,pass:70}},
note('作答技巧','① 看圖題先找「迴圈跑幾次」「Case 走哪一頁」，再看通道種類。② 選項有「不一定」「平行」時，想想有沒有資料相依。③ 時間平均每題 1.5 分鐘，不會的先跳過。④ 刪去法：「一定」「永遠」的選項常是錯的，但 While 至少跑一次、Divide 一定輸出浮點這類是真的「一定」。'),
note('關於題庫','題庫共 '+BANK.length+' 題，全部是依 NI 官方 CLAD 考試主題與常見題型（看方塊圖算結果、選正確敘述、選最適合的架構）自己編寫的原創題。真正的考題受 NI 保密協議保護，網路上號稱「考古題／真題」的洩題站內容不保證正確，也可能讓證照被取消，不要依賴。NI 官網有免費的官方 CLAD Sample Exam（範例考卷），考前一定要做一份，熟悉英文題目的樣子。'),
C.h3('台','x','在台灣考 CLAD 要注意的事'),
C.table(['項目','重點'],[
 ['報名','透過 <b>Pearson VUE</b> 報名：先建立 Pearson VUE 帳號，搜尋 NI（NI 現已併入 Emerson，頁面可能寫 NI – Emerson Test &amp; Measurement），選 CLAD。可選<b>考場應試</b>或 <b>OnVUE 線上監考</b>（在家考）。價格、場次以報名頁顯示為準（舊資料約 129 美元）。'],
 ['學生優惠','先問老師或系辦：學校有時有 NI 學術合作、校園考試場次或考試券（voucher），會比自己報名便宜。'],
 ['考試形式','約 40 題選擇題、1 小時、70% 及格（以報名頁公告為準）。<b>考試時沒有 LabVIEW 可以用</b>，全部是看題目和方塊圖截圖作答，所以要練到「看圖就知道結果」。'],
 ['語言','題目以<b>英文</b>為主，報名時看清楚有沒有中文版可選。本課程題目是中文，考前一定要熟悉下面的英文術語和題目句型。'],
 ['證件（最重要）','Pearson VUE 要求有照片、簽名、<b>英文姓名</b>的政府證件，而且姓名要和報名時填的英文名<b>完全一致</b>。台灣身分證沒有英文姓名，通常要帶<b>護照</b>。報名時英文名照護照拼法填，考前再到 Pearson VUE 台灣網站確認證件規定。'],
 ['OnVUE 在家考','要有視訊鏡頭、麥克風、穩定網路、獨立安靜的房間、桌面淨空、只能一個螢幕；考前先跑 Pearson 的系統測試，提早約 30 分鐘報到（拍證件、拍房間）。學校或公司網路常擋監考軟體，建議在家考。考試中不能離開鏡頭、不能出聲唸題。'],
 ['考場應試','提早 15～30 分鐘到，手機、包包放置物櫃，考場會給可擦寫的筆記板。'],
 ['版本','報名時選 LabVIEW 20xx（不要選已停產的 NXG）。本課程以 LabVIEW 2018 為準，考試內容在各版本之間差異很小。'],
 ['效期','CLAD 有效期約 2 年（以官方規定為準），到期前可以重考 CLAD 或直接考 CLD 來延續。']
]),
C.h3('英','x','考題常見英文：術語'),
C.table(['英文','中文／意思','英文','中文／意思'],[
 ['Front Panel / Block Diagram','前面板／方塊圖','Control / Indicator / Constant','控制項／指示器／常數'],
 ['Terminal / Node / Wire','端子／節點／連線','Broken Run arrow','斷掉的執行箭頭'],
 ['Shift Register / Feedback Node','移位暫存器／回饋節點','Tunnel / Auto-indexing','通道／自動索引'],
 ['Iteration terminal (i) / Count terminal (N)','迴圈計數／次數端子','Conditional terminal','條件端子（停止條件）'],
 ['Coercion dot','強制轉型點','Representation','數值表示法（I32、DBL…）'],
 ['Type Def / Strict Type Def','型別定義／嚴格型別定義','Polymorphic','多型（自動適應型別）'],
 ['Reentrant / Non-reentrant','可重入／不可重入','Connector pane / Icon','接線端子圖／圖示'],
 ['Race condition','競爭條件','Functional Global Variable','功能型全域變數（FGV）'],
 ['Queue / Notifier / Semaphore','佇列／通知器／號誌','Event Structure / Event case','事件結構／事件頁'],
 ['Property Node / Invoke Node','屬性節點／方法節點','Control reference','控制項參照'],
 ['Error cluster / Merge Errors','錯誤叢集／合併錯誤','Probe / Breakpoint','探針／中斷點'],
 ['Highlight Execution','顯示執行動畫','Step Into / Over / Out','單步進入／跳過／跳出'],
 ['Waveform Chart / Graph / XY Graph','波形圖表／波形圖／XY 圖','Finite / Continuous samples','有限／連續取樣'],
 ['Termination character','終止字元','Mechanical action (Latch / Switch)','機械動作（閂鎖／開關）']
]),
C.h3('句','x','考題常見英文：句型'),
C.table(['英文題目常這樣寫','意思'],[
 ['What is the value of <i>Result</i> after the VI executes?','VI 執行完後 Result 的值是多少？（看圖算結果）'],
 ['Which of the following statements is TRUE / FALSE?','下列哪一項敘述「正確」／「錯誤」？（注意 FALSE 題，最容易看錯）'],
 ['Which of the following best describes …?','下列哪一項最能描述……？'],
 ['Which design pattern is most appropriate for …?','哪一種設計模式最適合……？'],
 ['How many times does the loop execute?','迴圈執行幾次？'],
 ['Which node executes first?','哪一個節點先執行？（沒有資料相依時答案常是「無法確定」）'],
 ['Which change will fix the broken VI?','怎麼改才能修好斷掉的 VI？'],
 ['… resulting in the least memory usage / the fastest execution','……記憶體用最少／執行最快的做法']
]),
tip('考前一週的安排','① 每天考一次本頁模擬考，錯的主題用「依主題練習」補強。② 做 NI 官方 Sample Exam（英文），把不認識的單字整理到上面的表。③ 考前一天只看速查表和英文術語表，早點睡。'),
C.h3('查','r','考前速查表'),
C.table(['主題','一定要記的'],[
 ['資料流','所有輸入到齊才執行；沒有線相連 = 平行、順序不保證'],
 ['數值','浮點轉整數五取偶、超出範圍限制在最大值；整數運算溢位繞回；Divide 輸出浮點；整數除以 0 用 Q&R → IQ 0、R = x；NaN ≠ NaN'],
 ['預設型別','控制項 DBL、常數 I32'],
 ['For Loop','次數 = min(N, 各陣列長度)；0 次 → Last Value 輸出預設值、Shift Register 輸出初始值、Indexing 輸出空陣列'],
 ['While Loop','至少 1 次；條件在圈尾檢查；停止按鈕要放在迴圈裡'],
 ['Shift Register','不初始化 = 記住上次執行（FGV）；可堆疊拿前 n 圈'],
 ['Case','Default；字串分大小寫；浮點捨入；Use Default If Unwired'],
 ['Event','只有使用者操作或 Value (Signaling) 會觸發 Value Change；Latch 端子放事件頁裡；Timeout 預設 -1；Filter 事件有「?」可丟棄；事件頁要短'],
 ['陣列','Index 超出範圍 → 預設值；陣列＋陣列取短；Search 找不到 -1；Array To Cluster 預設 9 個；沒有陣列的陣列'],
 ['Cluster','Cluster Order 決定 Bundle/Unbundle 順序'],
 ['機械動作','6 種；Latch 不能 Local Variable'],
 ['自訂控制項','Control / Type Def（型別同步）/ Strict Type Def（外觀也同步）'],
 ['SubVI','Required 不接 → 斷；Recommended 不接 → 用預設值；輸出不能 Required；4-2-2-4'],
 ['Reentrancy','預設 Non-reentrant（一份、排隊）；Preallocated 每個呼叫點一份；Shared 池子'],
 ['迴圈間通訊','Local/Global → race；FGV 安全；Queue 不掉資料；Notifier 只留最新、一對多；Semaphore 限制存取'],
 ['Property Node','由上往下；Disabled 0/1/2；Value 比 Local 慢、不觸發事件'],
 ['設計模式','State Machine（Enum + Shift Register + Case）；Producer/Consumer（Queue）；Master/Slave（Notifier）；QMH'],
 ['錯誤','status F + code ≠ 0 = 警告；沒接 error out 才有自動錯誤處理；Merge Errors 回第一個錯誤；Close/Release 有錯也會執行；自訂碼 5000～9999、-8999～-8000'],
 ['檔案','迴圈外開、迴圈內寫、迴圈外關；Text/Binary/TDMS/INI 的取捨；exe 裡 Current VI\'s Path 要 Strip 兩次'],
 ['Chart / Graph','Chart 保留歷史 1024 點、Strip/Scope/Sweep；Graph 整張重畫；XY 要 Cluster(X, Y)；Chart 多曲線用 Bundle'],
 ['DAQmx','Create Channel → Timing → Start → Read → Stop → Clear；-200279 = 讀太慢；Nyquist 2 倍；MAX 模擬裝置'],
 ['儀器','VISA 資源名稱：GPIB0::n::INSTR、ASRLn::INSTR、TCPIP0::…；*IDN?；Instrument Driver（IDNet）'],
 ['除錯','Highlight、Probe、Conditional Probe、Breakpoint、Step Into/Over/Out、Retain Wire Values、Diagram Disable']
]),
tip('下一步','考過 CLAD 後是 <b>CLD</b>（Certified LabVIEW Developer）：4 小時實作考，給一份需求，要寫出完整的程式（通常是 State Machine 或 QMH 架構的機台控制）。本課程的雙龍門專案就是很好的 CLD 練習題型。')
]});
})();
