/* 第五部分 B：CLAD 證照（C5～C8）：陣列與 Cluster、字串與檔案 I/O、模組化、迴圈間通訊 */
(function(){
const L=window.LESSONS,fn=C.fn,ctl=C.ctl,qd=C.qd,wt=C.wt;
const {tip,warn,note,PART}=C.clad;

/* ======================================================================
   C5 陣列與 Cluster
   ====================================================================== */
const polyFig={name:'多型（Polymorphism）',view:'split',ratio:1.3,
 fp:{w:300,h:200,items:[
  {id:'a',k:'arr',label:'A = [1, 2, 3, 4]',n:4,x:16,y:16,v:[1,2,3,4]},{id:'b',k:'arr',label:'B = [10, 20]',n:4,x:16,y:76,v:[10,20]},
  {id:'r1',k:'arr',label:'A + 5',n:4,x:16,y:136},{id:'r2',k:'arr',label:'A + B',n:4,x:170,y:136}]},
 bd:{w:430,h:200,nodes:[
  {id:'a',k:'ctl',t:'dbl[]',label:'A',x:20,y:30},{id:'b',k:'ctl',t:'dbl[]',label:'B',x:20,y:130},{id:'k5',k:'const',t:'dbl',v:5,x:110,y:66},
  {id:'add1',k:'fn',fn:'Add',x:170,y:30},{id:'add2',k:'fn',fn:'Add',x:170,y:120},{id:'r1',k:'ind',t:'dbl[]',label:'A + 5',x:300,y:34},{id:'r2',k:'ind',t:'dbl[]',label:'A + B',x:300,y:124}],
 wires:[{id:'w1',from:'a',to:'add1.x',t:'dbl[]'},{id:'w2',from:'k5',to:'add1.y',t:'dbl',mx:150},{id:'w3',from:'a',to:'add2.x',t:'dbl[]',mx:90},{id:'w4',from:'b',to:'add2.y',t:'dbl[]'},{id:'w5',from:'add1.out',to:'r1',t:'dbl[]'},{id:'w6',from:'add2.out',to:'r2',t:'dbl[]'}]},
 sim:{live:true,step(){return {out:{r1:[6,7,8,9],r2:[11,22]},vals:{a:[1,2,3,4],b:[10,20],k5:5,'add1.out':[6,7,8,9],'add2.out':[11,22]}};}}};
const nested={name:'兩層 For Loop 產生 2D 陣列',bd:{w:520,h:200,structs:[{id:'o',k:'for',x:100,y:20,w:300,h:160},{id:'i',k:'for',x:150,y:50,w:180,h:100}],nodes:[
  {id:'k3',k:'const',t:'i32',v:3,x:40,y:19},{id:'N1',k:'N',s:'o'},{id:'k4',k:'const',t:'i32',v:4,x:110,y:52},{id:'N2',k:'N',s:'i'},
  {id:'i2',k:'iter',s:'i'},{id:'t1',k:'tunnel',t:'i32[]',s:'i',side:'r',y:120,idx:true},{id:'t2',k:'tunnel',t:'i32[][]',s:'o',side:'r',y:120,idx:true},{id:'o2',k:'ind',t:'i32[][]',label:'2D',x:440,y:110}],
 wires:[{id:'w1',from:'k3',to:'N1',t:'i32'},{id:'w2',from:'k4',to:'N2',t:'i32',pts:[[150,61],[150,67]]},{id:'w3',from:'i2',to:'t1.i',t:'i32'},{id:'w4',from:'t1.o',to:'t2.i',t:'i32[]'},{id:'w5',from:'t2.o',to:'o2',t:'i32[][]'}]}};
L.push({id:'C05',order:105,no:'C5',part:PART,title:'陣列與 Cluster 函式：多型、2D、預設值',mins:60,
goals:[['學會','全部常用陣列函式、超出範圍的行為、多型運算、2D 陣列、Cluster 順序與轉換。'],['考試重點','Index Array 超出範圍回傳預設值、陣列加陣列取短的、Search 1D Array 找不到回 -1、Bundle 用位置、Cluster 順序。']],
check:'能說出 Index Array 索引 10（陣列只有 3 個）的輸出、[1,2,3,4] + [10,20] 的結果。',
body:[
C.h3('懂','','陣列函式總表'),
C.table(['函式','做什麼','陷阱'],[
 ['Array Size','長度；2D 陣列輸出 [列數, 行數]','—'],
 ['Index Array','取元素；2D 可取一列或一行（只接一個索引）','<b>索引超出範圍 → 預設值</b>（0、空字串），不會出錯'],
 ['Build Array','組陣列；勾 Concatenate Inputs 會把陣列接起來','純量和陣列混接時自動接在後面'],
 ['Array Subset','從 index 起取 length 個','超出範圍只取到尾端'],
 ['Insert Into Array / Delete From Array','插入／刪除','Delete 有兩個輸出：剩下的陣列、刪掉的部分'],
 ['Replace Array Subset','原地換掉元素（陣列大小不變）','索引超出範圍時不換'],
 ['Initialize Array','建立 N 個相同元素的陣列','拉長可以做 2D'],
 ['Search 1D Array','找元素第一次出現的索引','<b>找不到回 -1</b>'],
 ['Sort 1D Array','由小到大排序','要大到小再接 Reverse 1D Array'],
 ['Array Max & Min','最大、最小值和它們的索引','—'],
 ['Add / Multiply Array Elements','全部相加／相乘','整數型別會溢位'],
 ['Transpose 2D Array','行列互換','—']
]),
C.h3('懂','','多型：同一個函式吃純量、陣列、Cluster'),
{lv:polyFig,cap:'陣列 + 純量：每個元素都加。陣列 + 陣列：逐個相加，<b>長度取較短的</b>。'},
C.table(['輸入','Add 的結果'],[['純量 + 純量','純量'],['陣列 + 純量','陣列，每個元素都加'],['陣列 + 陣列','陣列，長度 = 較短者'],['Cluster + Cluster（結構相同）','Cluster，逐元素相加'],['比較函式（Equal? 等）預設','Compare Elements：輸出 Boolean 陣列；右鍵改 Compare Aggregates 才輸出單一 Boolean']]),
C.h3('懂','','2D 陣列'),
{lv:nested,cap:'外層 3 圈、內層 4 圈，兩層都自動索引 → 3 列 × 4 行的 2D 陣列（雙粗線）。'},
`<ul><li>LabVIEW <b>不能有「陣列的陣列」</b>，要用 2D 陣列，或把陣列包進 Cluster 再做成陣列。</li><li>2D 陣列的每一列長度一定相同，短的會補預設值。</li><li>For Loop 自動索引一個 2D 陣列，每圈拿到的是一<b>列</b>（1D）。</li></ul>`,
C.h3('懂','','Cluster'),
C.table(['重點','說明'],[
 ['Cluster Order','元素的順序（前面板 Cluster 右鍵 ▸ Reorder Controls In Cluster）。<b>Bundle、Unbundle、Cluster To Array 都照這個順序</b>，和畫面位置無關'],
 ['Bundle','不接上面的 cluster 輸入時，每個元素都要接'],
 ['By Name','Bundle By Name 一定要接 input cluster；只改指定的元素'],
 ['Cluster To Array','所有元素型別相同才能用'],
 ['Array To Cluster','預設輸出 <b>9 個元素</b>的 Cluster，要右鍵 Cluster Size 改'],
 ['Cluster 混型別','Cluster 可以放不同型別；Cluster 本身的線色是棕色（全數值）或粉紅（含其他型別）']
]),
C.h3('測','q','看圖說答案'),
{quiz:[
 {q:'陣列 [5, 6, 7]，Index Array 索引接 10，輸出？',o:['錯誤','7','0（預設值）','5'],a:2,ex:'超出範圍回傳該型別的預設值，不會產生錯誤。'},
 {q:'[1, 2, 3, 4] + [10, 20] 的結果？',o:['[11, 22, 3, 4]','[11, 22]','[11, 22, 13, 24]','錯誤'],a:1,ex:'長度取較短的。'},
 {q:'Search 1D Array 在 [3, 5, 7] 裡找 4，輸出？',o:['0','-1','3','NaN'],a:1,ex:'找不到回 -1。'},
 {q:'Array To Cluster 輸入 3 個元素的陣列、沒改設定，輸出的 Cluster 有幾個元素？',o:['3','9','1','依陣列長度自動'],a:1,ex:'預設 9，要右鍵 Cluster Size 設定。'},
 {q:'Unbundle 的輸出順序由什麼決定？',o:['元素在前面板上的位置','元素的標籤字母順序','Cluster Order','建立時間'],a:2,ex:'Cluster Order（Reorder Controls In Cluster）。'},
 {q:'外層 For Loop N = 2，內層 N = 5，內層 i 經兩層自動索引輸出，結果是？',o:['10 個元素的 1D 陣列','2 × 5 的 2D 陣列','5 × 2 的 2D 陣列','[4]'],a:1,ex:'外層決定列數，內層決定行數。'},
 {q:'Equal? 比兩個長度相同的陣列，沒有改模式，輸出是？',o:['一個 Boolean','Boolean 陣列','數字','錯誤'],a:1,ex:'預設 Compare Elements；改 Compare Aggregates 才是一個 Boolean。'},
 {q:'要建立「每個元素是一個長度不同的陣列」的資料，LabVIEW 的做法是？',o:['直接做陣列的陣列','2D 陣列一定可以','把陣列包進 Cluster，再做 Cluster 的陣列','做不到'],a:2,ex:'LabVIEW 不允許陣列的陣列；2D 每列長度相同。'},
 {q:'Sort 1D Array 預設排序方向？',o:['由大到小','由小到大','依輸入順序','隨機'],a:1,ex:'要反過來接 Reverse 1D Array。'}
]}
]});

/* ======================================================================
   C6 字串與檔案 I/O
   ====================================================================== */
const fileFig={name:'正確的寫檔迴圈',bd:{w:700,h:200,structs:[{id:'wl',k:'while',x:200,y:20,w:330,h:160}],nodes:[
  {id:'p',k:'ctl',t:'path',label:'File Path',x:10,y:40},{id:'op',k:'const',t:'enum',v:'replace or create ▾',x:20,y:90},
  {id:'oc',k:'fn',fn:'Open/Create/Replace File',x:130,y:40,showName:false},
  {id:'wr',k:'fn',fn:'Write to Text File',x:330,y:40},{id:'data',k:'label',text:'每圈要寫的文字',x:240,y:120,w:100,h:24},
  {id:'cond',k:'stop',s:'wl'},
  {id:'cl',k:'fn',fn:'Close File',x:570,y:40},{id:'seh',k:'fn',fn:'Simple Error Handler',x:640,y:44,showName:false}],
 wires:[{id:'w1',from:'p',to:'oc.file path',t:'path'},{id:'w2',from:'op',to:'oc.operation',t:'enum',mx:110},
  {id:'w3',from:'oc.refnum out',to:'wr.file',t:'clu',noval:true},{id:'w4',from:'oc.error out',to:'wr.error in',t:'err'},
  {id:'w5',from:'wr.refnum out',to:'cl.refnum',t:'clu'},{id:'w6',from:'wr.error out',to:'cl.error in',t:'err'},{id:'w7',from:'cl.error out',to:'seh',t:'err'}]}};
L.push({id:'C06',order:106,no:'C6',part:PART,title:'字串與檔案 I/O：格式、檔案種類、路徑',mins:70,
goals:[['學會','字串函式與格式代碼、高階與低階檔案函式、Text/Binary/TDMS/設定檔的選擇、路徑函式、EXE 裡的路徑。'],['考試重點','迴圈裡反覆開關檔很慢、Open/Create/Replace 的 operation、TDMS 的階層、Format Into String 的格式。']],
check:'能說出「把資料一直寫進檔案」的正確架構：迴圈外開檔、迴圈內寫、迴圈外關檔。',
body:[
C.h3('懂','','字串函式與格式代碼'),
C.table(['函式','做什麼'],[
 ['Concatenate Strings','接起來'],['String Length','字元數'],['String Subset','取一段（offset 從 0 開始）'],
 ['Search and Replace String','找到就換；可勾 replace all'],['Match Pattern','用簡化的正規表示式找，輸出 before／match／after'],
 ['Format Into String','數值 → 文字（格式代碼）'],['Scan From String','文字 → 數值（格式代碼）'],
 ['Number To Decimal / Hexadecimal / Fractional String','數字轉文字'],['Decimal / Fract/Exp String To Number','文字轉數字'],
 ['Spreadsheet String To Array / Array To Spreadsheet String','CSV 文字 ↔ 2D 陣列'],['End of Line、Tab 常數','平台正確的換行（Windows 是 \\r\\n）']
]),
C.table(['格式代碼','意思','12.3456 的結果'],[['%f','浮點，預設 6 位小數','12.345600'],['%.2f','小數 2 位','12.35'],['%d','整數（捨入）','12'],['%e','科學記號','1.234560E+1'],['%x / %X','十六進位（整數）','c / C'],['%s','字串','—'],['%5.1f','總寬 5、小數 1 位','12.3（前面補空白）']]),
C.h3('懂','','檔案 I/O：三個層級'),
C.table(['層級','函式','什麼時候用'],[
 ['高階（一個 VI 包辦開、寫、關）','Write/Read Delimited Spreadsheet、Write/Read Measurement File（Express）','偶爾存一次、簡單'],
 ['中低階（自己開關）','Open/Create/Replace File → Write/Read Text/Binary File → Close File','<b>迴圈裡連續寫入</b>；效率高'],
 ['專用格式','TDMS、Configuration File（.ini）、Datalog','量測資料、設定檔']
]),
{lv:fileFig,cap:'迴圈外開一次檔、迴圈內只寫、迴圈外關檔。檔案 refnum 和錯誤線一路串起來。'},
warn('常考錯誤','把高階的 Write Delimited Spreadsheet 放在快速迴圈裡，每圈都「開檔、寫、關檔」，非常慢。連續記錄要用低階函式。'),
C.table(['Open/Create/Replace File 的 operation','檔案不存在','檔案存在'],[['open','錯誤','打開'],['replace','錯誤','清空後打開'],['create','建立','錯誤'],['open or create','建立','打開（寫入位置在開頭，要附加需設 File Position）'],['replace or create','建立','清空後打開'],['replace or create with confirmation','建立','問使用者']]),
C.h3('懂','','檔案格式怎麼選'),
C.table(['格式','優點','缺點','用途'],[
 ['Text（.txt、.csv）','人看得懂、Excel 能開','檔案大、數字轉文字慢、精度受格式限制','報表、紀錄'],
 ['Binary','最小、最快、完整精度','人看不懂，讀的時候要知道格式','大量原始資料'],
 ['TDMS','快、可附屬性（單位、日期）、Excel 外掛可開','只有 NI 工具最方便','量測資料（NI 推薦）'],
 ['Configuration（.ini）','分 [Section] 和 key=value','只適合少量設定','程式設定'],
 ['Datalog','存任意 LabVIEW 型別','只有 LabVIEW 能讀','—']
]),
note('TDMS 的階層','<b>File → Group → Channel</b>，三層都可以有 Properties（例如檔案的作者、Channel 的單位）。用 TDMS File Viewer 檢視。'),
C.h3('懂','','路徑'),
`<ul><li>用 <b>Build Path</b>、<b>Strip Path</b> 組路徑，不要用字串加 "\\"。</li>
<li><b>Current VI's Path</b> 是這個 VI 的完整路徑；在開發環境 Strip Path 一次就是 VI 所在資料夾。</li>
<li>做成 .exe 後，VI 在 exe 裡面，路徑變成 <code>...\\App.exe\\GT_Main.vi</code>，<b>要 Strip Path 兩次</b>才是 exe 所在資料夾；或改用 Application Directory.vi（開發和 exe 都正確）。</li>
<li>Path 常數沒接、或路徑空白時，高階檔案函式會跳出選檔對話框。</li></ul>`,
C.h3('測','q','小測驗'),
{quiz:[
 {q:'Format Into String 格式 "%.1f"，輸入 3.14159，輸出？',o:['3','3.1','3.14','3.141590'],a:1,ex:'小數 1 位。'},
 {q:'要每 10 ms 寫一筆資料到檔案、持續一小時，最好的做法？',o:['迴圈裡放 Write Delimited Spreadsheet','迴圈外 Open/Create/Replace File，迴圈內 Write，迴圈外 Close','每圈存成新檔','用 Local Variable 存起來最後再寫'],a:1,ex:'避免每圈重複開關檔。'},
 {q:'Open/Create/Replace File 的 operation 設 create，但檔案已存在，結果？',o:['覆蓋','打開','產生錯誤','改名'],a:2,ex:'create 只在檔案不存在時成功。'},
 {q:'TDMS 檔案的資料階層是？',o:['File → Channel → Group','File → Group → Channel','Group → File → Channel','Sheet → Row → Column'],a:1,ex:'三層都可以加 Properties。'},
 {q:'哪種格式檔案最小、讀寫最快，但人看不懂？',o:['Text','Binary','Config','CSV'],a:1,ex:'Binary 直接存記憶體的位元組。'},
 {q:'程式做成 .exe 後，Current VI\'s Path 經過一次 Strip Path 得到的是？',o:['exe 所在資料夾','exe 檔本身的路徑（...\\App.exe）','錯誤','桌面'],a:1,ex:'VI 在 exe 裡面，要再 Strip 一次；或用 Application Directory.vi。'},
 {q:'Scan From String 格式 "%d"，輸入 "Count=12"，結果？',o:['12','錯誤（字串開頭不是數字）','0 但沒有錯誤','"12"'],a:1,ex:'格式要和輸入相符，應用 "Count=%d"。'},
 {q:'程式設定（COM 埠、參數）存成人可以改的檔案，最適合？',o:['Binary','TDMS','Configuration File（.ini）','Datalog'],a:2,ex:'Config File VIs：Open Config Data、Read/Write Key、Close Config Data。'}
]}
]});

/* ======================================================================
   C7 模組化
   ====================================================================== */
L.push({id:'C07',order:107,no:'C7',part:PART,title:'模組化：SubVI 進階、Reentrancy、Polymorphic、Express VI',mins:50,
goals:[['學會','Connector 端子的 Required/Recommended/Optional、未接輸入的預設值、VI Hierarchy、Reentrant 三種設定、Polymorphic VI、Express VI 與 Dynamic Data、Malleable VI。'],['考試重點','未接 Required 端子 VI 會斷；Non-reentrant 的 SubVI 在兩個平行迴圈裡同時呼叫會互相等待。']],
check:'能解釋為什麼 FGV 一定要是 Non-reentrant。',
body:[
C.h3('懂','','Connector Pane 的端子設定'),
C.table(['設定（端子右鍵 ▸ This Connection Is）','Context Help 顯示','沒接線時'],[
 ['Required','<b>粗體</b>','<b>呼叫端 VI 斷掉</b>'],['Recommended（輸入的預設）','一般字體','可以執行，用 SubVI 控制項的<b>預設值</b>'],['Optional','淡色（Context Help 可隱藏）','可以執行，用預設值']
]),
`<ul><li>輸出端子只能是 Recommended 或 Optional，不能 Required。</li><li>SubVI 輸入沒接線時，用的是<b>控制項存檔時的預設值</b>（Make Current Value Default），不是上次的值。</li><li>建議 Connector 樣式 <b>4-2-2-4</b>，error in/out 放左下、右下；多留空格以後擴充不用改呼叫端。</li><li>框選一段程式 ▸ <b>Edit ▸ Create SubVI</b> 可以直接變成 SubVI。</li><li><b>View ▸ VI Hierarchy</b> 看整個呼叫關係；SubVI 右鍵 ▸ Find ▸ Callers 找誰呼叫它。</li></ul>`,
C.h3('懂','','Reentrancy（VI Properties ▸ Execution）'),
C.table(['設定','記憶體中有幾份','平行呼叫時','用途'],[
 ['Non-reentrant（預設）','1 份','<b>一次只能一個呼叫者執行，其他排隊等</b>','FGV（需要共用狀態）、存取共用資源'],
 ['Preallocated clone reentrant','每個呼叫位置一份','同時執行，各自保留自己的 Shift Register 狀態','每個呼叫點要有自己的記憶（例如各自的濾波器）'],
 ['Shared clone reentrant','需要時從池子借','同時執行，狀態不固定','省記憶體的平行運算']
]),
warn('常考陷阱','一個很慢的 Non-reentrant SubVI 被兩個平行迴圈呼叫，兩個迴圈會互相拖慢。改成 reentrant 就能同時跑——但如果它靠 Shift Register 存共用資料（FGV），改了就壞了。'),
C.h3('懂','','Polymorphic、Express、Malleable'),
C.table(['種類','是什麼','重點'],[
 ['Polymorphic VI','一組「實例 VI」包成一個圖示，依接進來的型別自動選（或用下方選擇器手動選）','每個實例的 Connector <b>樣式要一樣</b>；DAQmx Read 就是例子'],
 ['Express VI','藍色大圖示，雙擊開設定對話框','輸出常是 <b>Dynamic Data</b>（深藍）；右鍵 Open Front Panel 可轉成一般 SubVI（不能再轉回）'],
 ['Malleable VI（.vim）','LabVIEW 2017 起：一份程式自動適應多種型別','像 Polymorphic，但只寫一份'],
 ['vi.lib / user.lib','LabVIEW 內建的 VI、自己放的共用函式庫','user.lib 的 VI 會出現在 Functions ▸ User Libraries']
]),
C.h3('測','q','小測驗'),
{quiz:[
 {q:'SubVI 的輸入端子設成 Required，呼叫端沒接線，會？',o:['用預設值執行','呼叫端 VI 斷掉（不能執行）','執行時跳錯誤','自動接一個常數'],a:1,ex:'Required = 必須接。'},
 {q:'SubVI 的 Recommended 輸入沒接線，SubVI 用什麼值？',o:['上一次呼叫的值','0','控制項存檔時的預設值','隨機'],a:2,ex:'預設值是存檔時 Make Current Value Default 的值。'},
 {q:'兩個平行迴圈同時呼叫同一個 Non-reentrant SubVI（每次執行 1 秒），會發生什麼？',o:['同時執行，各花 1 秒','輪流執行，其中一個要等','程式斷掉','只有一個會呼叫成功'],a:1,ex:'Non-reentrant 記憶體中只有一份，一次一個。'},
 {q:'每個呼叫位置都要有自己的 Shift Register 狀態（例如每台機器一個移動平均），要設成？',o:['Non-reentrant','Preallocated clone reentrant','Shared clone reentrant','Run when opened'],a:1,ex:'Preallocated：每個呼叫點一份，狀態不會混。'},
 {q:'Polymorphic VI 的各個實例 VI 有什麼限制？',o:['名稱要一樣','Connector Pane 樣式要相同','只能有一個輸入','要放在 vi.lib'],a:1,ex:'端子位置相同，才能用同一個圖示切換。'},
 {q:'Express VI 的輸出線是深藍色粗線，它是什麼型別？',o:['I32 陣列','Dynamic Data','Waveform','Variant'],a:1,ex:'要做數值運算可用 Convert from Dynamic Data。'},
 {q:'想看整個專案「誰呼叫誰」的樹狀圖，用？',o:['Error List','View ▸ VI Hierarchy','Probe','Context Help'],a:1,ex:'VI Hierarchy 視窗。'}
]}
]});

/* ======================================================================
   C8 迴圈間通訊：Local/Global、FGV、Queue/Notifier、Property Node
   ====================================================================== */
const raceFig={name:'競爭狀況（Race Condition）',bd:{w:620,h:220,structs:[{id:'l1',k:'while',x:20,y:20,w:270,h:180},{id:'l2',k:'while',x:320,y:20,w:270,h:180}],nodes:[
  {id:'r1',k:'local',t:'i32',v:'Count',x:50,y:70},{id:'inc1',k:'fn',fn:'Increment',x:140,y:66,showName:false},{id:'w1l',k:'local',t:'i32',v:'Count',write:true,x:200,y:70},{id:'c1',k:'stop',s:'l1'},
  {id:'r2',k:'local',t:'i32',v:'Count',x:350,y:70},{id:'inc2',k:'fn',fn:'Increment',x:440,y:66,showName:false},{id:'w2l',k:'local',t:'i32',v:'Count',write:true,x:500,y:70},{id:'c2',k:'stop',s:'l2'}],
 wires:[{id:'a1',from:'r1',to:'inc1',t:'i32'},{id:'a2',from:'inc1.out',to:'w1l',t:'i32'},{id:'b1',from:'r2',to:'inc2',t:'i32'},{id:'b2',from:'inc2.out',to:'w2l',t:'i32'}]}};
const fgvFig={name:'FGV（Functional Global Variable）',bd:{w:640,h:260,structs:[{id:'wl',k:'while',x:110,y:20,w:440,h:220},{id:'cs',k:'case',x:180,y:60,w:290,h:130,frames:['Init','Increment','Read'],cur:1}],nodes:[
  {id:'act',k:'ctl',t:'enum',label:'Action (Enum)',x:10,y:110},{id:'sel',k:'sel',t:'enum',s:'cs',y:120},
  {id:'sr',k:'sr',t:'i32',s:'wl',y:100},{id:'inc',k:'fn',fn:'Increment',x:280,y:86,f:'cs:Increment'},
  {id:'k0',k:'const',t:'i32',v:0,x:300,y:91,f:'cs:Init'},{id:'tin',k:'tunnel',t:'i32',s:'cs',side:'l',y:100},{id:'tout',k:'tunnel',t:'i32',s:'cs',side:'r',y:100},
  {id:'o',k:'ind',t:'i32',label:'Count',x:580,y:90},{id:'t',k:'const',t:'bool',v:true,x:480,y:205},{id:'cond',k:'stop',s:'wl'},
  {id:'lab',k:'label',text:'左邊 Shift Register 不初始化！',x:10,y:30,w:170,h:22}],
 wires:[{id:'w1',from:'act',to:'sel',t:'enum'},{id:'w2',from:'sr.L',to:'tin.o',t:'i32'},{id:'w3',from:'tin.i',to:'inc',t:'i32',f:'cs:Increment'},{id:'w4',from:'inc.out',to:'tout.i',t:'i32',f:'cs:Increment'},
  {id:'w5',from:'k0',to:'tout.i',t:'i32',f:'cs:Init'},{id:'w6',from:'tin.i',to:'tout.i',t:'i32',f:'cs:Read'},{id:'w7',from:'tout.o',to:'sr.R',t:'i32'},{id:'w8',from:'tout.o',to:'o',t:'i32',pts:[[500,106],[500,100],[570,100]]},{id:'w9',from:'t',to:'cond',t:'bool'}]}};
const propFig={name:'Property Node',bd:{w:520,h:150,nodes:[
  {id:'al',k:'ctl',t:'bool',label:'Manual Allowed',x:20,y:50},{id:'nt',k:'fn',fn:'Not',x:110,y:46,showName:false},
  {id:'sel',k:'fn',fn:'Select',x:170,y:44,showName:false},{id:'k0',k:'const',t:'i32',v:0,x:120,y:96},{id:'k2',k:'const',t:'i32',v:2,x:120,y:20},
  {id:'pn',k:'prop',cls:'L Forward',items:[{n:'Disabled',w:true},{n:'Visible',w:true},{n:'Value'}],x:270,y:30,w:120}],
 wires:[{id:'w1',from:'al',to:'nt',t:'bool'},{id:'w2',from:'nt.out',to:'sel.s',t:'bool'},{id:'w3',from:'k2',to:'sel.t',t:'i32',mx:160},{id:'w4',from:'k0',to:'sel.f',t:'i32',mx:160},{id:'w5',from:'sel.out',to:'pn.Disabled',t:'i32'}]}};
L.push({id:'C08',order:108,no:'C8',part:PART,title:'迴圈間通訊：Local/Global、FGV、Queue、Notifier、Property Node',mins:80,
goals:[['學會','Local/Global Variable 與競爭狀況、FGV（Action Engine）、Queue／Notifier／Semaphore 的差別、Property Node、Control Reference、Invoke Node。'],['考試重點','「哪個方法會造成 race condition」「要一對多廣播最新值用什麼」「Property Node Disabled 的三個值」。']],
check:'能比較 Queue 和 Notifier，並說出 FGV 為什麼能避免 race condition。',
body:[
C.h3('懂','','Local 與 Global Variable'),
C.table(['','Local Variable','Global Variable'],[
 ['建立','前面板物件右鍵 ▸ Create ▸ Local Variable','File ▸ New ▸ Global Variable（一個只有前面板的特殊 VI）'],
 ['範圍','同一個 VI 裡','所有 VI'],
 ['讀／寫','右鍵 Change To Read / Change To Write','同左'],
 ['缺點','<b>打破資料流</b>：讀寫順序不確定 → 競爭狀況；每個 Local 都複製一份資料','同左，而且更難追'],
 ['適合','初始化前面板、少量 UI 更新','少量、只寫一次的設定']
]),
{lv:raceFig,cap:'兩個迴圈都「讀 Count → 加 1 → 寫 Count」。如果兩邊同時讀到 5，兩邊都寫 6，就少加了一次。這就是 race condition，次數不可預測。'},
C.h3('懂','','FGV：不會競爭的全域資料'),
`<p><b>Functional Global Variable</b>（也叫 Action Engine）是一個 SubVI：裡面有一個<b>只跑一次的 While Loop</b>（停止條件接 True）、一個<b>未初始化的 Shift Register</b>（保留上次的值）、和一個依 Action（Enum）選擇動作的 Case。</p>`,
{lv:fgvFig,cap:'點 Case 的 ◀ ▶ 看 Init、Increment、Read 三頁。因為 SubVI 是 Non-reentrant，同一時間只有一個呼叫者能執行，「讀—改—寫」整個動作不會被打斷。'},
C.table(['FGV 的關鍵','原因'],[['Shift Register 不初始化','才會保留上一次呼叫的值'],['迴圈只跑一次','只是為了用 Shift Register（也可用 For Loop N = 1 或 Feedback Node）'],['Non-reentrant','一次只能一個呼叫者，動作是「原子的」，不會 race'],['把「加 1」寫在 FGV 裡面','如果在外面讀、加、再寫，一樣會 race']]),
C.h3('懂','','同步函式：Queue、Notifier、Semaphore'),
C.table(['','Queue','Notifier','Semaphore'],[
 ['資料','先進先出，<b>一筆都不掉</b>（lossless）','只保留<b>最新一筆</b>（lossy）','不傳資料'],
 ['讀取者','通常一個（Dequeue 會取走）','可以<b>很多個</b>同時等（廣播）','—'],
 ['典型用途','命令、Producer/Consumer','把最新狀態通知多個迴圈','限制同時使用資源的數量（例如一次只能一個迴圈用 COM 埠）'],
 ['主要函式','Obtain、Enqueue、Dequeue、Preview（看不取走）、Flush、Get Queue Status、Release','Obtain、Send Notification、Wait on Notification、Release','Obtain、Acquire、Release Semaphore']
]),
note('其他','<b>Rendezvous</b>：讓多個迴圈都到齊再一起繼續。<b>User Event</b>：用 Event Structure 接收自訂事件。<b>Channel Wire</b>（2016 起）：用線畫出迴圈間通訊。<b>Shared Variable</b>：跨電腦／RT 的網路變數。'),
C.h3('懂','','Property Node、Invoke Node、Control Reference'),
{lv:propFig,cap:'Manual Allowed 為 False 時把 L Forward 設成 Disabled = 2（反灰）。一個 Property Node 可以拉長放多個屬性，<b>由上往下</b>依序執行。'},
C.table(['重點','說明'],[
 ['建立','前面板物件右鍵 ▸ Create ▸ Property Node ▸ 選屬性；預設是讀，右鍵 Change To Write'],
 ['Disabled','<b>0 = Enabled、1 = Disabled（不能按但看起來正常）、2 = Disabled and Grayed Out</b>'],
 ['常用屬性','Visible、Disabled、Value、Value (Signaling)、Caption、Position、Strings[]（Ring/Enum）、Plot Color、X Scale…'],
 ['Value 屬性','比 Local Variable 還慢（要切到 UI 執行緒）；不觸發事件'],
 ['Control Reference','右鍵 ▸ Create ▸ Reference，傳給 SubVI，在 SubVI 裡用 Property Node 改主畫面的控制項'],
 ['Invoke Node','呼叫方法：Reinitialize to Default、Get Image、Front Panel 的 Close…'],
 ['VI Server','用 Open VI Reference 取得其他 VI 的參考，動態呼叫或控制']
]),
C.h3('測','q','小測驗'),
{quiz:[
 {q:'兩個平行迴圈都用 Local Variable 做「讀值、加 1、寫回」，跑完 1000 次後的總數？',o:['一定 2000','可能小於 2000（race condition）','一定 1000','VI 斷掉'],a:1,ex:'讀與寫之間可能被另一個迴圈插隊。'},
 {q:'FGV 的 Shift Register 為什麼不初始化？',o:['忘了','才能在呼叫之間保留值','初始化會讓 VI 斷','讓迴圈跑比較快'],a:1,ex:'未初始化的 Shift Register 保留上次的值。'},
 {q:'要把感測器最新的值同時傳給三個顯示迴圈，舊值可以丟掉，最適合？',o:['Queue','Notifier','Global Variable','Semaphore'],a:1,ex:'Notifier 一對多、只保留最新值。'},
 {q:'命令一筆都不能遺漏，最適合？',o:['Notifier','Queue','Local Variable','Property Node'],a:1,ex:'Queue 是 lossless FIFO。'},
 {q:'Property Node 的 Disabled 寫 2，控制項會？',o:['正常','不能操作，但外觀正常','不能操作，並且反灰','消失'],a:2,ex:'0 Enabled、1 Disabled、2 Disabled and Grayed Out。'},
 {q:'想看 Queue 裡下一筆但不取走，用？',o:['Dequeue Element','Preview Queue Element','Flush Queue','Get Queue Status'],a:1,ex:'Preview 不會移除。'},
 {q:'要在 SubVI 裡改主 VI 前面板控制項的顏色，要傳什麼給 SubVI？',o:['控制項的值','Control Reference','Local Variable','Global Variable'],a:1,ex:'把 reference 傳進去，在 SubVI 用 Property Node。'},
 {q:'一個 Property Node 拉長放了三個屬性，執行順序？',o:['同時','由上往下','由下往上','隨機'],a:1,ex:'由上往下，任何一個出錯後面的不執行。'},
 {q:'限制「同一時間最多一個迴圈能使用 COM 埠」，可以用？',o:['Notifier','Semaphore','Rendezvous','Global Variable'],a:1,ex:'Semaphore 控制同時存取的數量。'},
 {q:'Global Variable 存在哪裡？',o:['主 VI 的方塊圖','一個只有前面板的 global VI 檔','專案檔','記憶體，不存檔'],a:1,ex:'File ▸ New ▸ Global Variable。'}
]}
]});
})();
