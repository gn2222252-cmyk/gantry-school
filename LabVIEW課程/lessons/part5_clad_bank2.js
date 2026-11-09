/* 第五部分：CLAD 題庫擴充（原創題，依官方考試主題與常見題型撰寫；不是洩題） */
(function(){
const T={env:'C1 環境與除錯',dt:'C2 資料型別',loop:'C3 迴圈與時間',st:'C4 結構',arr:'C5 陣列與 Cluster',file:'C6 字串與檔案',mod:'C7 模組化',com:'C8 迴圈間通訊',dp:'C9 設計模式',err:'C10 錯誤處理',ui:'C11 圖表與 UI',hw:'C12 DAQmx 與儀器',df:'第 2 課 資料流'};
const code=s=>'<pre>'+s+'</pre>';

/* ---------- 看圖題 ---------- */
const forStop={bd:{w:500,h:180,structs:[{id:'fl',k:'for',x:130,y:24,w:260,h:136}],nodes:[
  {id:'cn',k:'const',t:'i32',v:10,x:70,y:23},{id:'N',k:'N',s:'fl'},{id:'iter',k:'iter',s:'fl'},
  {id:'k3',k:'const',t:'i32',v:3,x:210,y:84},{id:'eq',k:'fn',fn:'Equal?',x:280,y:94},{id:'cond',k:'stop',s:'fl'},
  {id:'to',k:'tunnel',t:'i32',s:'fl',side:'r',y:50,idx:true},{id:'o',k:'ind',t:'i32[]',label:'Array',x:420,y:40}],
 wires:[{id:'w1',from:'cn',to:'N',t:'i32'},{id:'w2',from:'iter',to:'eq.x',t:'i32',mx:180},{id:'w3',from:'k3',to:'eq.y',t:'i32',mx:265},{id:'w4',from:'eq.out',to:'cond',t:'bool'},
  {id:'w5',from:'iter',to:'to.i',t:'i32',pts:[[170,149],[170,56]]},{id:'w6',from:'to.o',to:'o',t:'i32[]'}]}};
const srSum={bd:{w:500,h:170,structs:[{id:'fl',k:'for',x:150,y:30,w:220,h:120}],nodes:[
  {id:'arr',k:'const',t:'i32[]',v:'[2, 4, 6]',x:20,y:91},{id:'ti',k:'tunnel',t:'i32',s:'fl',side:'l',y:100,idx:true},
  {id:'k0',k:'const',t:'i32',v:0,x:90,y:61},{id:'sr',k:'sr',t:'i32',s:'fl',y:70},
  {id:'add',k:'fn',fn:'Add',x:240,y:63},{id:'o',k:'ind',t:'i32',label:'Total',x:410,y:60}],
 wires:[{id:'w1',from:'arr',to:'ti.o',t:'i32[]'},{id:'w2',from:'k0',to:'sr.init',t:'i32'},{id:'w3',from:'sr.L',to:'add.x',t:'i32'},{id:'w4',from:'ti.i',to:'add.y',t:'i32',mx:220},{id:'w5',from:'add.out',to:'sr.R',t:'i32'},{id:'w6',from:'sr.out',to:'o',t:'i32'}]}};

const BANK2=[
/* ===== 程式碼閱讀（考試最常見的題型） ===== */
 {topic:T.loop,q:'For Loop 的 N = 10，加了 Conditional Terminal，在 i = 3 時停止，i 從 Indexing 通道輸出。Array = ？',lv:forStop,o:['[0, 1, 2, 3]','[0, 1, 2]','[0, 1, 2, …, 9]','[3]'],a:0,ex:'i = 3 那一圈也會執行完，條件在圈尾才檢查，共 4 圈。'},
 {topic:T.loop,q:'Shift Register 初始值 0，每圈加上自動索引進來的元素。Total = ？',lv:srSum,o:['12','6','0','[2, 6, 12]'],a:0,ex:'0 + 2 + 4 + 6 = 12；Shift Register 的右端點輸出最後一圈的值。'},
 {topic:T.loop,q:'For Loop：N 沒接，左邊自動索引輸入 [1, 2, 3, 4, 5]，另一個自動索引輸入 [10, 20]。迴圈執行幾次？',o:['2','5','7','VI 斷掉'],a:0,ex:'多個自動索引陣列取最短的長度。'},
 {topic:T.loop,q:'While Loop 裡 Shift Register 沒有初始化，Total 每圈 +1，迴圈跑 3 圈停止。VI 連續執行兩次（不關閉 VI），第二次結束時 Total = ？',o:['6','3','0','錯誤'],a:0,ex:'未初始化的 Shift Register 保留上一次執行的值：第一次 3，第二次 6。'},
 {topic:T.loop,q:'For Loop N = 3，迴圈裡把 i 接到 Indexing 輸出，再接一個 Last Value 輸出。兩個輸出分別是？',o:['[0, 1, 2] 和 2','[1, 2, 3] 和 3','[0, 1, 2] 和 3','[0, 1, 2, 3] 和 3'],a:0,ex:'i 從 0 開始；Last Value 是最後一圈的值。'},
 {topic:T.loop,q:'For Loop N = 0。左邊 Shift Register 初始值 5。迴圈結束後右邊 Shift Register 輸出？',o:['5','0','預設值 NaN','VI 斷掉'],a:0,ex:'迴圈沒執行，Shift Register 直接輸出初始值。'},
 {topic:T.loop,q:'For Loop 輸出用 Conditional 通道：i 接資料，條件接「i 是偶數」。N = 6，輸出？',o:['[0, 2, 4]','[1, 3, 5]','[0, 1, 2, 3, 4, 5]','[2, 4, 6]'],a:0,ex:'Conditional 通道只收條件為 True 那幾圈的值。'},
 {topic:T.loop,q:'2D 陣列 2 列 × 3 行自動索引進 For Loop，每一圈拿到什麼？',o:['一列（3 個元素的 1D 陣列），共 2 圈','一行（2 個元素），共 3 圈','單一元素，共 6 圈','整個 2D 陣列，1 圈'],a:0,ex:'自動索引取最外層的維度（列）。要逐元素就再包一層 For Loop。'},
 {topic:T.loop,q:'Shift Register 左邊往下拉成 3 個元素（堆疊），第 5 圈（i = 4）開始時，第三個元素存的是哪一圈的結果？',o:['i = 1','i = 3','i = 2','i = 0'],a:0,ex:'第 1 個是上一圈（i = 3），第 2 個是 i = 2，第 3 個是 i = 1。'},
 {topic:T.loop,q:'While Loop 的 Loop Condition 設為 Continue if True，接一個 False 常數。迴圈執行幾次？',o:['1','0','無限','錯誤'],a:0,ex:'While Loop 至少執行一次，圈尾讀到 False 就停止。'},
 {topic:T.loop,q:'While Loop 跑了很久，Iteration Terminal 到 2,147,483,647 之後會？',o:['停在 2,147,483,647 不再增加','繞回 -2,147,483,648','繞回 0','VI 出錯停止'],a:0,ex:'i 為 I32，到最大值後就停住（迴圈本身照跑）。'},
 {topic:T.df,q:'Numeric 控制項 A 分支到兩個地方：一個進 SubVI 1、一個進 SubVI 2；SubVI 1 的輸出接到 SubVI 2 的另一個輸入。執行順序？',o:['SubVI 1 一定先執行','SubVI 2 一定先執行','不一定','同時'],a:0,ex:'SubVI 2 要等到所有輸入都到齊，包括 SubVI 1 的輸出。'},
 {topic:T.df,q:'一個 VI 裡有兩個沒有任何連線的 While Loop，各有自己的 Wait (ms)。它們會？',o:['平行執行','上面的先跑完再跑下面的','左邊的先跑','只跑一個'],a:0,ex:'沒有資料相依就平行執行。'},
 {topic:T.df,q:'下列哪一個敘述描述「資料流」最正確？',o:['節點在所有必要的輸入都收到資料後才執行，執行完才送出輸出','節點依方塊圖由左到右執行','節點依建立的順序執行','節點依由上到下的位置執行'],a:0,ex:'位置不影響執行順序，只有線（資料相依）會。'},
 {topic:T.st,q:'Case Structure 的 Selector 是字串，頁籤有 "Start"、"Stop"、Default。輸入 "start"（小寫）會執行哪一頁？',o:['Default','"Start"','"Stop"','VI 斷掉'],a:0,ex:'字串比對預設分大小寫。可右鍵開 Case Insensitive Match。'},
 {topic:T.st,q:'Case 的頁籤寫 "..0"，代表？',o:['所有小於等於 0 的值','只有 0','0 以上','錯誤語法'],a:0,ex:'"..0" 表示 ≤ 0；"10.." 表示 ≥ 10；"3..5" 表示 3、4、5。'},
 {topic:T.st,q:'Case Selector 接 Enum，而且每一個項目都有自己的頁。這時 Default 頁？',o:['可以不需要','一定要有','不能存在','只能放在最後'],a:0,ex:'所有值都被涵蓋時可以不需要 Default（加了也可以）。'},
 {topic:T.st,q:'error cluster 接到 Case Structure 的 Selector，頁籤會變成？',o:['Error 和 No Error','True 和 False','0 和 Default','每個錯誤碼一頁'],a:0,ex:'看的是 status；外框會變成紅色/綠色。'},
 {topic:T.st,q:'Case 有 3 頁，輸出通道只有 2 頁有接線，另一頁沒接，也沒有勾 Use Default If Unwired。結果？',o:['Run 箭頭斷掉，通道是空心的','輸出 0','輸出上一次的值','只有那一頁不執行'],a:0,ex:'所有頁都要接，或改用 Use Default If Unwired。'},
 {topic:T.st,q:'Flat Sequence 有兩頁，第一頁放一個 1 秒的 Wait，第二頁讀 Tick Count。和沒有 Sequence 相比，主要差別？',o:['保證讀 Tick Count 時已經等了 1 秒','沒有差別','Tick Count 會先執行','程式變快'],a:0,ex:'Sequence 用來強制順序；更好的做法是用 error 線串起來。'},
 {topic:T.st,q:'Formula Node 內寫 y = x * x + 1，x 為輸入 3。y = ？還有什麼一定要注意？',o:['10；每一行要以分號結尾','10；不用分號','9；要宣告 int','錯誤；Formula Node 不能用乘號'],a:0,ex:'Formula Node 是 C 語法，每一行都要分號。'},
 {topic:T.st,q:'Event Structure 放在 While Loop 裡，程式正在執行某個很久的事件頁時，使用者按了另一個按鈕。這個事件會？',o:['排隊，等目前的事件頁做完後處理','直接遺失','中斷目前的事件頁','產生錯誤'],a:0,ex:'事件會進入事件佇列；預設也會鎖住前面板直到事件頁完成。'},
 {topic:T.st,q:'Value Change 事件的 Event Data Node 中，可以取得什麼？',o:['OldVal 和 NewVal','只有 NewVal','只有控制項的 label','錯誤訊息'],a:0,ex:'還有 CtlRef、Time、Source 等。'},
 {topic:T.st,q:'一個 Stop 按鈕（Latch When Released）想同時用在 Event Structure 的 Value Change 事件，端子應該放在哪裡？',o:['放在那個事件頁裡面','放在迴圈外面','放在 Timeout 頁','用 Local Variable 讀'],a:0,ex:'Latch 要被讀取才會彈回，所以放在它自己的事件頁中讀。'},
 {topic:T.st,q:'兩個 Event Structure 放在同一個迴圈，處理同一個控制項的事件，會？',o:['不建議，可能造成程式卡住','比較快','LabVIEW 不允許','事件被處理兩次而且很安全'],a:0,ex:'一個迴圈只放一個 Event Structure。'},

/* ===== 資料型別 ===== */
 {topic:T.dt,q:'U8 的 200 加上 U8 的 100，結果？',o:['44','300','255','-56'],a:0,ex:'整數運算溢位會繞回：300 - 256 = 44。'},
 {topic:T.dt,q:'I32 的 7 除以 I32 的 2（用 Divide 函式），輸出？',o:['3.5（DBL）','3（I32）','4','錯誤'],a:0,ex:'Divide 一定輸出浮點。要整數商用 Quotient & Remainder。'},
 {topic:T.dt,q:'Quotient & Remainder：x = 17，y = 5，輸出？',o:['IQ = 3，R = 2','IQ = 3.4，R = 0','IQ = 2，R = 3','IQ = 3，R = 0.4'],a:0,ex:'17 = 5 × 3 + 2。'},
 {topic:T.dt,q:'I32 接到 DBL 的輸入端時，端子上出現一個紅點（新版是橘點）代表？',o:['Coercion Dot：資料被自動轉型，可能多佔記憶體','錯誤','斷點','Probe'],a:0,ex:'不會斷掉，但要知道有轉型。'},
 {topic:T.dt,q:'Add 函式一邊接 I32、一邊接 DBL，輸出型別？',o:['DBL','I32','依先接的那一邊','錯誤'],a:0,ex:'自動轉成範圍較大的型別。'},
 {topic:T.dt,q:'Decimal String To Number 輸入 "12abc"，輸出？',o:['12','0','錯誤','NaN'],a:0,ex:'讀到第一個非數字字元就停止；offset past number = 2。'},
 {topic:T.dt,q:'Decimal String To Number 輸入 "abc"，default 沒接，輸出？',o:['0','NaN','錯誤','-1'],a:0,ex:'無法轉換時輸出 default（預設 0）。'},
 {topic:T.dt,q:'NaN 接到 Equal? 和另一個 NaN 比較，結果？',o:['False','True','錯誤','NaN'],a:0,ex:'NaN 不等於任何值，包括自己。要判斷用 Not A Number/Path/Refnum?。'},
 {topic:T.dt,q:'Boolean To (0,1) 輸入 True，輸出？',o:['1（I16）','1（DBL）','-1','True'],a:0,ex:'輸出 I16 的 0 或 1。'},
 {topic:T.dt,q:'Enum 預設的數值表示法（Representation）？',o:['U16','I32','U8','DBL'],a:0,ex:'Enum 和 Ring 預設都是 U16，可以改 U8 或 U32。'},
 {topic:T.dt,q:'用 Equal? 比較兩個 1D 陣列 [1, 2, 3] 和 [1, 5, 3]，預設輸出？',o:['[True, False, True]','False','True','錯誤'],a:0,ex:'預設 Compare Elements；右鍵改 Compare Aggregates 才會輸出單一 Boolean。'},
 {topic:T.dt,q:'Waveform 資料型別包含哪些元素？',o:['t0、dt、Y（和 attributes）','X、Y','Rate、Samples','Time、Value、Unit'],a:0,ex:'t0 是開始時間（Timestamp），dt 是取樣間隔，Y 是資料陣列。'},
 {topic:T.dt,q:'Path 和 String 比，最大的好處？',o:['自動使用該作業系統的路徑格式','比較快','可以存數字','不用 Build Path'],a:0,ex:'用 Build Path / Strip Path 處理，不要自己串 "\\"。'},
 {topic:T.dt,q:'Variant To Data 函式，type 輸入要接什麼？',o:['想轉成的資料型別（例如一個常數）','字串 "I32"','Enum','不用接'],a:0,ex:'type 只看型別，不看值。'},
 {topic:T.dt,q:'To Long Integer（I32）輸入 DBL 2.5，輸出？',o:['2','3','2.5','錯誤'],a:0,ex:'轉整數用 round half to even：2.5 → 2，3.5 → 4。'},
 {topic:T.dt,q:'哪一種數值表示法最適合存放 0～255 的感測器原始位元組？',o:['U8','I8','DBL','I64'],a:0,ex:'無號 8 位元。'},

/* ===== 陣列與 Cluster ===== */
 {topic:T.arr,q:'Initialize Array：element = 0，dimension size = 5，輸出？',o:['[0, 0, 0, 0, 0]','[0, 1, 2, 3, 4]','[5]','空陣列'],a:0,ex:'建立固定長度、全部相同值的陣列。'},
 {topic:T.arr,q:'Array Subset：[1, 2, 3, 4, 5]，index = 1，length = 3，輸出？',o:['[2, 3, 4]','[1, 2, 3]','[2, 3]','[3, 4, 5]'],a:0,ex:'從 index 1 開始取 3 個。'},
 {topic:T.arr,q:'[1, 2, 3] 加上純量 10（Add 函式），輸出？',o:['[11, 12, 13]','[1, 2, 3, 10]','16','錯誤'],a:0,ex:'數值函式是多型的：陣列 + 純量 = 每個元素都加。'},
 {topic:T.arr,q:'[1, 2, 3] 加上 [10, 20]（Add 函式），輸出？',o:['[11, 22]','[11, 22, 3]','[11, 22, 13]','錯誤'],a:0,ex:'兩個陣列運算取較短的長度。'},
 {topic:T.arr,q:'Index Array：[5, 6, 7]，index = 5，輸出？',o:['0（預設值）','7','錯誤','5'],a:0,ex:'超出範圍輸出型別的預設值，不會產生錯誤。'},
 {topic:T.arr,q:'Build Array（沒勾 Concatenate Inputs）輸入兩個 1D 陣列 [1, 2, 3] 和 [4, 5]，輸出？',o:['2D 陣列 [[1, 2, 3], [4, 5, 0]]','[1, 2, 3, 4, 5]','錯誤','[[1, 2], [4, 5]]'],a:0,ex:'變成 2D；長度不同時短的補預設值。勾 Concatenate 才會接成 1D。'},
 {topic:T.arr,q:'Array Max & Min 輸入 [3, 9, 1, 9]，max index 輸出？',o:['1','3','9','[1, 3]'],a:0,ex:'有相同最大值時回傳第一個。'},
 {topic:T.arr,q:'Search 1D Array 在 [4, 8, 15] 中找 16，index of element = ？',o:['-1','0','3','錯誤'],a:0,ex:'找不到回傳 -1。'},
 {topic:T.arr,q:'Sort 1D Array 輸入 [3, 1, 2]，輸出？',o:['[1, 2, 3]','[3, 2, 1]','[3, 1, 2]','[2, 1, 3]'],a:0,ex:'只會遞增排序；要遞減再接 Reverse 1D Array。'},
 {topic:T.arr,q:'LabVIEW 可以建立「陣列的陣列」嗎（例如每個元素是 1D 陣列的 1D 陣列）？',o:['不行，要用 2D 陣列或「Cluster 陣列（Cluster 內放陣列）」','可以','只有字串陣列可以','只有在 Formula Node 可以'],a:0,ex:'陣列元素不能是陣列。'},
 {topic:T.arr,q:'Bundle By Name 和 Bundle 最大的差別？',o:['Bundle By Name 必須接一個輸入 Cluster，只修改指定元素','Bundle By Name 不需要輸入 Cluster','Bundle By Name 只能放數字','沒有差別'],a:0,ex:'Bundle By Name 用名稱找元素，不受 Cluster Order 影響。'},
 {topic:T.arr,q:'Cluster 裡面可以同時放控制項和指示器嗎？',o:['不行，整個 Cluster 只能都是控制項或都是指示器','可以','只有 Boolean 可以','只有在 SubVI 可以'],a:0,ex:'Cluster 的方向是一起的。'},
 {topic:T.arr,q:'Cluster To Array 的限制？',o:['Cluster 裡所有元素必須是相同型別','元素不能超過 9 個','只能有數字','不能有 Boolean'],a:0,ex:'Array To Cluster 預設產生 9 個元素，可右鍵改。'},
 {topic:T.arr,q:'標準 error cluster 的三個元素依序是？',o:['status（Boolean）、code（I32）、source（String）','code、message、time','status、code、time','error、warning、source'],a:0,ex:'所有錯誤處理都靠這三個元素。'},
 {topic:T.arr,q:'Insert Into Array：[1, 2, 3] 在 index 1 插入 9，輸出？',o:['[1, 9, 2, 3]','[9, 1, 2, 3]','[1, 9, 3]','[1, 2, 9, 3]'],a:0,ex:'插入後原元素往後移。'},
 {topic:T.arr,q:'Transpose 2D Array 輸入 2 × 3 的陣列，輸出？',o:['3 × 2','2 × 3','6 個元素的 1D','錯誤'],a:0,ex:'列和行互換。'},

/* ===== 字串與檔案 ===== */
 {topic:T.file,q:'String Length 輸入 "AB\\r\\n"（在 \\ Codes Display 下顯示，實際是 A、B、CR、LF），輸出？',o:['4','6','2','5'],a:0,ex:'CR 和 LF 各算一個字元。'},
 {topic:T.file,q:'Concatenate Strings 輸入 "Gan"、"try"、""，輸出？',o:['"Gantry"','"Gan try"','"Gan,try"','錯誤'],a:0,ex:'直接接起來，不會加空白。'},
 {topic:T.file,q:'Spreadsheet String To Array 預設的分隔字元？',o:['Tab','逗號','空白','分號'],a:0,ex:'CSV 要自己接 "," 到 delimiter。'},
 {topic:T.file,q:'Write Delimited Spreadsheet.vi（舊版叫 Write To Spreadsheet File）預設分隔字元？',o:['Tab（\\t）','逗號','空白','換行'],a:0,ex:'要產生 CSV 就把 delimiter 設成 ","。'},
 {topic:T.file,q:'Write to Binary File 預設的位元組順序（byte order）？',o:['Big-endian','Little-endian','依 CPU','ASCII'],a:0,ex:'LabVIEW 預設 big-endian；給 C 程式讀時常要改 little-endian。'},
 {topic:T.file,q:'Write to Binary File 寫一個陣列時，「prepend array or string size?」預設 True 的結果？',o:['檔案開頭多存一個 I32 的陣列長度','檔案變成文字','寫入失敗','只寫長度'],a:0,ex:'讀取時要用相同設定才能讀對。'},
 {topic:T.file,q:'下列哪一種檔案「人類可直接用記事本閱讀」，但檔案較大、讀寫較慢？',o:['Text（ASCII）檔','Binary 檔','TDMS 檔','Datalog 檔'],a:0,ex:'Binary 最小最快但需要知道資料型別才能讀。'},
 {topic:T.file,q:'迴圈裡每圈都用 Write to Text File（只接路徑，不接 refnum），問題是？',o:['每圈都會開檔、寫入、關檔，很慢，而且會覆寫','完全沒問題','檔案一定損壞','VI 斷掉'],a:0,ex:'正確做法：迴圈外 Open，迴圈內用 refnum 寫，迴圈外 Close。'},
 {topic:T.file,q:'Current VI\'s Path 回傳 C:\\Data\\Test.vi，接 Strip Path 一次後再 Build Path 加 "log.txt"，結果？',o:['C:\\Data\\log.txt','C:\\log.txt','C:\\Data\\Test.vi\\log.txt','log.txt'],a:0,ex:'Strip Path 去掉檔名得到資料夾。'},
 {topic:T.file,q:'TDMS 檔案的三層結構？',o:['File → Group → Channel','Folder → File → Row','Task → Channel → Sample','Sheet → Column → Cell'],a:0,ex:'每一層都可以加屬性（Properties）。'},
 {topic:T.file,q:'Match Pattern 用 regular expression "[0-9]+" 搜尋 "ID=A45B"，match substring = ？',o:['"45"','"4"','"A45B"','""'],a:0,ex:'+ 表示一個以上。'},
 {topic:T.file,q:'Format Into String 格式 "%d-%s"，輸入 7 和 "OK"，輸出？',o:['"7-OK"','"7OK"','"%d-%s"','錯誤'],a:0,ex:'%d 整數、%s 字串、%f 浮點、%x 十六進位。'},
 {topic:T.file,q:'Number To Hexadecimal String 輸入 255，width 4，輸出？',o:['"00FF"','"FF"','"0255"','"ff00"'],a:0,ex:'寬度不足補 0。'},
 {topic:T.file,q:'Open/Create/Replace File 的 operation 選 "open"，但檔案不存在，會？',o:['回傳錯誤','自動建立','跳出對話框','寫到暫存檔'],a:0,ex:'要自動建立請選 "open or create" 或 "replace or create"。'},

/* ===== 模組化 ===== */
 {topic:T.mod,q:'SubVI 的 error in/error out 照慣例放在 Connector Pane 的哪裡？',o:['左下和右下','左上和右上','中間','任意位置'],a:0,ex:'輸入在左、輸出在右；參考類（refnum）在上、error 在下。'},
 {topic:T.mod,q:'SubVI 的輸入端子設定為 Recommended，呼叫時沒接線，會？',o:['可以執行，用控制項的預設值','Run 箭頭斷掉','執行時錯誤','輸入 0 而且跳警告'],a:0,ex:'Required 沒接才會斷掉。'},
 {topic:T.mod,q:'在 VI Properties ▸ Documentation 寫的 VI Description 會出現在哪裡？',o:['滑鼠停在 SubVI 上時的 Context Help 視窗','前面板標題','Error List','不會顯示'],a:0,ex:'寫好說明讓別人知道怎麼用。'},
 {topic:T.mod,q:'Polymorphic VI 是什麼？',o:['把多個相同 Connector 樣式的 VI 包在一起，依接線型別自動選用其中一個','可以同時開兩個前面板的 VI','只能跑在 Real-Time 的 VI','加密過的 VI'],a:0,ex:'例如 DAQmx Read 就是 Polymorphic VI。'},
 {topic:T.mod,q:'SubVI 要能「呼叫自己」（遞迴），需要什麼設定？',o:['Shared clone reentrant','Non-reentrant','Preallocated clone','Run when opened'],a:0,ex:'遞迴需要 Shared clone 可重入設定。'},
 {topic:T.mod,q:'把一個控制項存成 Type Def 之後修改 .ctl（例如加一個 Enum 項目）並存檔，使用它的 VI 會？',o:['自動更新成新的型別','不會變','全部斷掉','需要一個一個手動換'],a:0,ex:'這就是 Type Def 的用途：改一處、處處更新。'},
 {topic:T.mod,q:'LabVIEW Project（.lvproj）檔案本身存了什麼？',o:['對檔案的參照和建置設定（不是 VI 本身）','所有 VI 的程式碼','只有前面板','編譯好的 exe'],a:0,ex:'把 VI 從 Project 移除不會刪除硬碟上的檔案。'},
 {topic:T.mod,q:'Project Explorer 的 Dependencies 資料夾是？',o:['LabVIEW 自動列出專案中 VI 用到、但沒加入專案的檔案','要手動加入的檔案','建置出來的檔案','垃圾桶'],a:0,ex:'不能直接把檔案拖進 Dependencies。'},
 {topic:T.mod,q:'SubVI 圖示（Icon）建議的做法？',o:['用簡單圖形和短文字說明功能，同一組 VI 用相同顏色橫幅','保留預設圖示','只寫 VI 名稱全文','空白'],a:0,ex:'好的圖示讓方塊圖容易閱讀。'},
 {topic:T.mod,q:'VI Server 的 Open VI Reference ＋ Invoke Node（Run VI）可以做什麼？',o:['在程式中動態載入並執行另一個 VI','只能開前面板','只能讀檔','建置 exe'],a:0,ex:'常用於外掛式架構、背景執行。'},
 {topic:T.mod,q:'SubVI 的 VI Properties 勾 "Show front panel when called"，效果？',o:['SubVI 被呼叫時跳出它的前面板，可當成對話框使用','SubVI 不會執行','主 VI 前面板隱藏','SubVI 執行變快'],a:0,ex:'通常同時勾 "Close afterwards if originally closed"。'},

/* ===== 迴圈間通訊 ===== */
 {topic:T.com,q:'Race condition（競爭條件）是指？',o:['結果取決於兩段平行程式碼執行的先後，而先後不固定','程式跑太快','迴圈跑太多圈','CPU 過熱'],a:0,ex:'多個迴圈用 Local/Global Variable 寫同一個值時常發生。'},
 {topic:T.com,q:'Global Variable 存在哪裡？',o:['一個只有前面板、沒有方塊圖的特殊 VI 檔','記憶體中的隱藏檔','Project 檔','INI 檔'],a:0,ex:'可以跨 VI 共用，但一樣有 race condition 風險。'},
 {topic:T.com,q:'Enqueue Element at Opposite End 的作用？',o:['把元素放到佇列最前面，下一次 Dequeue 先拿到','清除佇列','放到最後','只看不拿'],a:0,ex:'常用來送緊急指令（例如 Stop）。'},
 {topic:T.com,q:'Obtain Queue 的 max queue size = 5，佇列已滿，Enqueue Element 的 timeout = -1，會？',o:['等到有空間為止','丟掉最舊的','回傳錯誤','覆寫最新的'],a:0,ex:'要丟最舊的請用 Lossy Enqueue Element。'},
 {topic:T.com,q:'Preview Queue Element 和 Dequeue Element 的差別？',o:['Preview 只看不移除','Preview 會移除兩個','Preview 拿最後一個','沒有差別'],a:0,ex:'Flush Queue 會一次拿出全部並清空。'},
 {topic:T.com,q:'Channel Wire 的 Stream 通道最接近哪一種傳統做法？',o:['Queue（不掉資料、有順序）','Notifier','Local Variable','Global Variable'],a:0,ex:'Tag 通道只保留最新值，像 Notifier/變數；Messenger 用於訊息架構。'},
 {topic:T.com,q:'Semaphore 的用途？',o:['限制同一時間能存取某資源（例如序列埠）的程式碼數量','傳資料','畫圖','記錄錯誤'],a:0,ex:'Acquire → 使用資源 → Release。'},
 {topic:T.com,q:'User Event 可以用來？',o:['讓程式（例如另一個迴圈）觸發 Event Structure 處理自訂事件','讓使用者自己寫事件','只能接滑鼠事件','取代 Case Structure'],a:0,ex:'Create User Event → Register For Events → Generate User Event。'},
 {topic:T.com,q:'Functional Global Variable（FGV）通常怎麼建構？',o:['While Loop 只跑一次＋未初始化的 Shift Register＋Case（依動作 Enum 決定 Get/Set）','一個 Global Variable','一個 Queue','一個 Property Node'],a:0,ex:'Non-reentrant 保證一次只有一個呼叫者，避免 race condition。'},
 {topic:T.com,q:'兩個平行迴圈都用 Local Variable 讀寫同一個 Count：每次讀出 → 加 1 → 寫回。可能發生？',o:['有些加 1 被覆蓋掉，最後 Count 比預期小','永遠正確','VI 斷掉','Count 變成負數'],a:0,ex:'讀-改-寫不是原子操作，這就是 race condition；改用 FGV 或 Semaphore。'},

/* ===== 設計模式 ===== */
 {topic:T.dp,q:'State Machine 的「下一個狀態」通常存在哪裡？',o:['While Loop 的 Shift Register（Enum Type Def）','Global Variable','前面板控制項','檔案'],a:0,ex:'每個狀態頁決定下一個狀態，寫回 Shift Register。'},
 {topic:T.dp,q:'為什麼 State Machine 的狀態 Enum 要做成 Type Def？',o:['增加或改名狀態時，所有用到的常數會一起更新','執行比較快','不用 Shift Register','可以接到 Graph'],a:0,ex:'否則每個 Enum 常數都要手動改。'},
 {topic:T.dp,q:'Producer/Consumer（Events）中，Producer 迴圈通常放什麼？',o:['Event Structure，把使用者操作轉成訊息放進 Queue','DAQmx Read','只有 Wait','Formula Node'],a:0,ex:'UI 反應快，費時工作交給 Consumer。'},
 {topic:T.dp,q:'「初始化 → 迴圈中處理 → 結束時關閉資源」這個最基本的結構叫？',o:['General VI framework（Simple/General VI）','Master/Slave','QMH','Actor'],a:0,ex:'例如：開檔 → 迴圈寫入 → 關檔。'},
 {topic:T.dp,q:'用 While Loop 每 1 ms 檢查按鈕值（polling）和改用 Event Structure 比，Event 的好處？',o:['不用一直輪詢，CPU 用量低，也不會漏掉按鍵','程式碼比較長','只能在 Windows 用','比較耗記憶體'],a:0,ex:'事件驅動是 UI 處理的首選。'},
 {topic:T.dp,q:'Queued Message Handler（QMH）的訊息通常包含？',o:['訊息名稱（字串或 Enum）＋資料（Variant）','只有數字','只有錯誤','VI 路徑'],a:0,ex:'訊息放進 Queue，處理迴圈用 Case 依訊息分派。'},
 {topic:T.dp,q:'哪個情況「不」適合用 State Machine？',o:['兩個需要不同速度、同時執行的工作（例如 1 kHz 擷取和慢速寫檔）','有步驟、依條件跳轉的流程','需要依使用者選擇切換畫面','測試流程'],a:0,ex:'不同速率的工作要用多迴圈架構（Producer/Consumer）。'},

/* ===== 錯誤處理 ===== */
 {topic:T.err,q:'VI 裡有一個函式的 error out 沒接線，而且 VI 開著 Automatic Error Handling，發生錯誤時？',o:['執行暫停並跳出錯誤對話框','靜靜忽略','VI 斷掉','寫進檔案'],a:0,ex:'只要 error out 有接線（即使只接到 indicator）就不會自動處理。'},
 {topic:T.err,q:'Simple Error Handler.vi 的主要功能？',o:['有錯誤時顯示對話框告訴使用者','清除所有錯誤','產生錯誤','記錄到檔案'],a:0,ex:'常放在程式最後面。'},
 {topic:T.err,q:'Clear Errors.vi 的用途？',o:['把錯誤清掉，讓後面的程式照常執行','顯示錯誤','停止 VI','關閉檔案'],a:0,ex:'只在「已經處理過、確定可以忽略」時使用。'},
 {topic:T.err,q:'在 While Loop 中處理儀器通訊，發生錯誤時要停止迴圈，最常見的寫法？',o:['把 error cluster 的 status 和 Stop 按鈕 OR 起來接 Loop Condition','用 Global Variable','不用管','把錯誤線接到 i'],a:0,ex:'error 線可直接接到 Loop Condition（自動取 status）。'},
 {topic:T.err,q:'error 線穿過 While Loop 時，用 Shift Register 而不用一般通道的好處？',o:['前一圈的錯誤會傳到下一圈，不會被吃掉','比較快','不用接線','可以清除錯誤'],a:0,ex:'一般通道每圈都拿到迴圈外的原始值。'},
 {topic:T.err,q:'error cluster 中 status = False、code = 0，代表？',o:['沒有錯誤也沒有警告','錯誤','警告','程式結束'],a:0,ex:'status F 且 code ≠ 0 是警告。'},
 {topic:T.err,q:'要查某個錯誤碼的意思，在 LabVIEW 中可以用？',o:['Help ▸ Explain Error','File ▸ Properties','Tools ▸ Options','Ctrl+B'],a:0,ex:'也可以在 error indicator 上右鍵 Explain Error。'},
 {topic:T.err,q:'Close File 的 error in 已經有錯誤，Close File 會？',o:['照樣關閉檔案，並把錯誤傳下去','不執行','清除錯誤','跳出對話框'],a:0,ex:'Close/Release 類函式有錯也會執行，避免資源洩漏。'},

/* ===== 環境與除錯 ===== */
 {topic:T.env,q:'切換前面板和方塊圖的快捷鍵？',o:['Ctrl+E','Ctrl+B','Ctrl+H','Ctrl+T'],a:0,ex:'Ctrl+H Context Help、Ctrl+B 移除斷線、Ctrl+T 並排、Ctrl+U 整理方塊圖。'},
 {topic:T.env,q:'Ctrl+B 的功能？',o:['移除所有斷掉的線','編譯','加斷點','開 Context Help'],a:0,ex:'Remove Broken Wires。'},
 {topic:T.env,q:'Quick Drop 的預設快捷鍵？',o:['Ctrl+Space','Ctrl+Q','Ctrl+D','Shift+Space'],a:0,ex:'輸入函式名稱直接放置。'},
 {topic:T.env,q:'在線上放 Breakpoint，程式會在什麼時候暫停？',o:['資料通過這條線之後','VI 開始時','VI 結束時','永遠不會'],a:0,ex:'放在節點上則在該節點執行前暫停。'},
 {topic:T.env,q:'Conditional Probe 的用途？',o:['線上的值符合條件（例如 > 100）時才暫停','讓 Probe 變快','只顯示 Boolean','清除錯誤'],a:0,ex:'適合迴圈跑很多圈才出錯的情況。'},
 {topic:T.env,q:'Diagram Disable Structure 中 Disabled 頁的程式碼？',o:['不會執行，也不會被編譯（壞掉也不影響 Run）','會執行但不顯示','只執行一次','會慢速執行'],a:0,ex:'用來暫時停用一段程式除錯。'},
 {topic:T.env,q:'Run 箭頭正常，但 Error List 有黃色三角形（Warning），VI 能執行嗎？',o:['可以','不行','只能單步執行','要先存檔'],a:0,ex:'Warning 只是提醒（例如物件重疊、隱藏的控制項）。'},
 {topic:T.env,q:'開啟 Highlight Execution 會？',o:['顯示資料流動畫，但執行變很慢','讓程式變快','只顯示錯誤','關閉 Probe'],a:0,ex:'計時相關的錯誤在 Highlight 下可能不會出現。'},
 {topic:T.env,q:'想找出哪個 SubVI 最耗時間，用哪個工具？',o:['Tools ▸ Profile ▸ Performance and Memory','Error List','Context Help','Find and Replace'],a:0,ex:'會列出每個 VI 的執行時間和次數。'},
 {topic:T.env,q:'右鍵控制項 ▸ Data Operations ▸ Make Current Value Default，效果？',o:['存檔後，目前的值成為這個控制項的預設值','清除值','鎖定值不能改','變成常數'],a:0,ex:'SubVI 輸入沒接線時就會用這個預設值。'},
 {topic:T.env,q:'把建好的程式給沒有 LabVIEW 的電腦執行，那台電腦需要安裝？',o:['LabVIEW Run-Time Engine（相同版本與位元數）','LabVIEW 完整版','什麼都不用','Visual Studio'],a:0,ex:'若用到 DAQmx、VISA，也要裝對應驅動。'},

/* ===== 圖表與 UI ===== */
 {topic:T.ui,q:'Property Node 的 Disabled 屬性設為 2，效果？',o:['停用而且變灰','啟用','停用但外觀不變','隱藏'],a:0,ex:'0 = Enabled、1 = Disabled、2 = Disabled and Grayed Out。'},
 {topic:T.ui,q:'Waveform Chart 的 Update Mode 有哪三種？',o:['Strip Chart、Scope Chart、Sweep Chart','Line、Bar、Point','Auto、Manual、Fixed','Fast、Normal、Slow'],a:0,ex:'Strip 連續捲動；Scope 畫滿清除重來；Sweep 有一條掃描線。'},
 {topic:T.ui,q:'Waveform Graph 接一個 2D 陣列（3 列 × 100 行），預設會畫出？',o:['3 條曲線，每條 100 點','100 條曲線','1 條 300 點的曲線','錯誤'],a:0,ex:'每一列是一條曲線；可右鍵 Transpose Array 互換。'},
 {topic:T.ui,q:'Waveform Chart 預設的 Chart History Length？',o:['1024 點','100 點','無限','10000 點'],a:0,ex:'可右鍵 Chart History Length 修改。'},
 {topic:T.ui,q:'要清除 Waveform Chart 的歷史資料，程式中可以？',o:['寫一個空陣列到 History Data 屬性','把 Chart 設成 0','關閉 VI','用 Clear Errors'],a:0,ex:'或在執行時右鍵 Data Operations ▸ Clear Chart。'},
 {topic:T.ui,q:'Key Focus 屬性設為 True 的效果？',o:['讓這個控制項取得鍵盤焦點，使用者可直接輸入','讓它閃爍','讓它變大','隱藏其他控制項'],a:0,ex:'常用於表單輸入流程。'},
 {topic:T.ui,q:'Invoke Node 的 Reinitialize to Default 方法可以？',o:['把控制項的值恢復成預設值','重新開機','重新編譯','刪除控制項'],a:0,ex:'Property Node 讀寫屬性；Invoke Node 執行方法。'},
 {topic:T.ui,q:'Panel Close? 事件中把 Discard? 設為 True，效果？',o:['取消關閉視窗（視窗不會被關掉）','強制關閉','重新開啟','結束 LabVIEW'],a:0,ex:'用來在關閉前先做存檔、停止迴圈。'},
 {topic:T.ui,q:'Tab Control 的值（Value）是什麼型別？',o:['Enum（目前選中的頁）','Boolean','字串','Cluster'],a:0,ex:'可接 Case Structure 依頁籤做事。'},

/* ===== DAQmx 與儀器 ===== */
 {topic:T.hw,q:'要量測 1 kHz 的正弦波而不失真（不發生 aliasing），取樣率至少要？',o:['大於 2 kHz','1 kHz','500 Hz','100 Hz'],a:0,ex:'Nyquist：大於訊號最高頻率的 2 倍；要看清波形通常取 5～10 倍。'},
 {topic:T.hw,q:'Differential（差動）接法相較於 RSE 的優點？',o:['抑制共模雜訊，量測較準，但佔用兩個輸入','可以接更多通道','不需要接地','速度比較快'],a:0,ex:'長導線、雜訊大的環境用 Differential。'},
 {topic:T.hw,q:'16 位元 ADC、量測範圍 ±10 V，最小可分辨電壓約？',o:['0.305 mV','1.22 mV','0.153 mV','10 mV'],a:0,ex:'20 V ÷ 65536 ≈ 0.305 mV。'},
 {topic:T.hw,q:'DAQmx Timing 的 sample mode 選 Finite Samples，代表？',o:['擷取指定點數後就停止','一直擷取','只擷取一點','不擷取'],a:0,ex:'Continuous Samples 才會連續擷取，要在迴圈中 Read。'},
 {topic:T.hw,q:'DAQmx 錯誤 -200279 的常見原因？',o:['程式讀得太慢，緩衝區被覆蓋','裝置沒接','取樣率太低','通道名稱錯誤'],a:0,ex:'每次多讀一點、迴圈不要做費時工作（交給 Consumer）。'},
 {topic:T.hw,q:'序列埠通訊失敗，第一件要檢查的設定？',o:['Baud rate、data bits、parity、stop bits、flow control 是否和儀器一致','螢幕解析度','取樣率','DAQmx 版本'],a:0,ex:'雙方設定必須完全相同。'},
 {topic:T.hw,q:'VISA Configure Serial Port 預設的終止字元（termination char）？',o:['0xA（換行 \\n）','0xD（\\r）','0x0','沒有'],a:0,ex:'預設 enable termination char = True；儀器用 \\r 結尾要改成 0xD。'},
 {topic:T.hw,q:'向 SCPI 儀器查詢身分的標準指令？',o:['*IDN?','*RST','ID?','HELLO'],a:0,ex:'*RST 是重置，*CLS 清除狀態。'},
 {topic:T.hw,q:'Instrument Driver（儀器驅動程式）通常的使用順序？',o:['Initialize → Configure → Read/Measure → Close','Read → Initialize → Close','Close → Initialize','只要 Read'],a:0,ex:'可以從 Instrument Driver Network（IDNet）下載。'},
 {topic:T.hw,q:'VISA 的主要好處？',o:['同一套函式可以控制 GPIB、序列埠、USB、Ethernet 儀器','只能用在 NI 的儀器','可以做 DAQ','不需要驅動程式'],a:0,ex:'換介面時只要改資源名稱。'},
 {topic:T.hw,q:'沒有實體 DAQ 卡也想練習 DAQmx 程式，可以？',o:['在 NI MAX 建立模擬裝置（Simulated Device）','不可能','用 Global Variable','改用 VISA'],a:0,ex:'模擬裝置會產生模擬波形。'},
 {topic:T.hw,q:'DAQ Assistant（Express VI）和 DAQmx 底層函式比，主要缺點？',o:['彈性較低，不易控制效能和進階設定','不能讀資料','比較難設定','不能在迴圈中用'],a:0,ex:'快速原型用 DAQ Assistant；正式程式用 DAQmx 函式。'}
];
C.CLAD_EXTRA=BANK2;
})();
