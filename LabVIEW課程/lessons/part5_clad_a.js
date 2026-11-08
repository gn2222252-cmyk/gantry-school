/* 第五部分 A：CLAD 證照（C1～C4）：考試、環境與除錯、資料型別、迴圈與時間、結構 */
(function(){
const L=window.LESSONS,fn=C.fn,ctl=C.ctl,qd=C.qd,wt=C.wt;
const PR=['Functions','Programming'];
Object.assign(LV.F,{
 'Wait Until Next ms Multiple':{g:'⌚▤',ins:['millisecond multiple'],outs:['millisecond timer value'],col:'#e8f0ff',pal:[...PR,'Timing','Wait Until Next ms Multiple']},
 'Elapsed Time':{g:'⏲Δ',ins:['Reset'],outs:['Elapsed Time (s)','Time has Elapsed'],w:46,col:'#dfe8ff',pal:[...PR,'Timing','Elapsed Time (Express VI)']},
 'Random Number (0-1)':{g:'🎲',ins:[],outs:['number (0 to 1)'],pal:[...PR,'Numeric','Random Number (0-1)']},
 'Round To Nearest':{p:'⌊⌉',a:1,pal:[...PR,'Numeric','Round To Nearest']},
 'Not A Number/Path/Refnum?':{p:'NaN?',a:1,pal:[...PR,'Comparison','Not A Number/Path/Refnum?']},
 'Search 1D Array':{g:'[?]',ins:['1D array','element','start index'],outs:['index of element'],pal:[...PR,'Array','Search 1D Array']},
 'Sort 1D Array':{g:'[↑]',ins:['array'],outs:['sorted array'],pal:[...PR,'Array','Sort 1D Array']},
 'Reverse 1D Array':{g:'[⇄]',ins:['array'],outs:['reversed array'],pal:[...PR,'Array','Reverse 1D Array']},
 'Array Max & Min':{g:'[⇕]',ins:['array'],outs:['max value','max index','min value','min index'],h:58,pal:[...PR,'Array','Array Max & Min']},
 'Delete From Array':{g:'[✕]',ins:['n-dim array','length','index'],outs:['array w/ subset deleted','deleted portion'],pal:[...PR,'Array','Delete From Array']},
 'Cluster To Array':{g:'▦→[]',ins:['cluster'],outs:['array'],w:46,pal:[...PR,'Cluster, Class, & Variant','Cluster To Array']},
 'Array To Cluster':{g:'[]→▦',ins:['array'],outs:['cluster'],w:46,pal:[...PR,'Cluster, Class, & Variant','Array To Cluster']},
 'Bundle':{g:'▦+',ins:['cluster','element 0','element 1'],outs:['output cluster'],pal:[...PR,'Cluster, Class, & Variant','Bundle']},
 'Unbundle':{g:'▦−',ins:['cluster'],outs:['element 0','element 1'],pal:[...PR,'Cluster, Class, & Variant','Unbundle']},
 'Match Pattern':{g:'.*',ins:['string','regular expression','offset'],outs:['before substring','match substring','after substring','offset past match'],h:58,pal:[...PR,'String','Match Pattern']},
 'Search and Replace String':{g:'a→b',ins:['input string','search string','replace string'],outs:['result string'],w:46,pal:[...PR,'String','Search and Replace String']},
 'Open/Create/Replace File':{g:'📄+',ins:['file path','operation','error in'],outs:['refnum out','error out'],w:44,h:44,col:'#e6f3ea',pal:[...PR,'File I/O','Open/Create/Replace File']},
 'Write to Text File':{g:'📄✎',ins:['file','text','error in'],outs:['refnum out','error out'],w:44,h:44,col:'#e6f3ea',pal:[...PR,'File I/O','Write to Text File']},
 'Read from Text File':{g:'📄👁',ins:['file','count','error in'],outs:['refnum out','text','error out'],w:44,h:44,col:'#e6f3ea',pal:[...PR,'File I/O','Read from Text File']},
 'Close File':{g:'📄✕',ins:['refnum','error in'],outs:['error out'],w:44,h:44,col:'#e6f3ea',pal:[...PR,'File I/O','Close File']},
 'Write to Binary File':{g:'0101✎',ins:['file','data','error in'],outs:['refnum out','error out'],w:44,h:44,col:'#e6f3ea',pal:[...PR,'File I/O','Write to Binary File']},
 'TDMS Open':{g:'TDMS\nOPEN',ins:['file path','operation','error in'],outs:['tdms file out','error out'],w:44,h:44,col:'#e6f3ea',pal:[...PR,'File I/O','TDM Streaming','TDMS Open']},
 'TDMS Write':{g:'TDMS\nW',ins:['tdms file','group name in','channel name(s)','data','error in'],outs:['tdms file out','error out'],w:44,h:66,col:'#e6f3ea',pal:[...PR,'File I/O','TDM Streaming','TDMS Write']},
 'TDMS Close':{g:'TDMS\nCLOSE',ins:['tdms file','error in'],outs:['error out'],w:44,h:44,col:'#e6f3ea',pal:[...PR,'File I/O','TDM Streaming','TDMS Close']},
 'Obtain Notifier':{g:'N+',ins:['element data type','error in'],outs:['notifier out','error out'],w:40,h:44,col:'#fbe9f3',pal:[...PR,'Synchronization','Notifier Operations','Obtain Notifier']},
 'Send Notification':{g:'N←',ins:['notifier','notification','error in'],outs:['notifier out','error out'],w:40,h:44,col:'#fbe9f3',pal:[...PR,'Synchronization','Notifier Operations','Send Notification']},
 'Wait on Notification':{g:'N⧗',ins:['notifier','timeout in ms','error in'],outs:['notifier out','notification','timed out?','error out'],w:40,h:56,col:'#fbe9f3',pal:[...PR,'Synchronization','Notifier Operations','Wait on Notification']},
 'DAQmx Create Virtual Channel':{g:'DAQmx\nCH',ins:['physical channels','min value','max value','error in'],outs:['task out','error out'],w:48,h:56,col:'#e3f1ff',pal:['Functions','Measurement I/O','NI-DAQmx','DAQmx Create Virtual Channel.vi']},
 'DAQmx Timing':{g:'DAQmx\n⏱',ins:['task/channels in','rate','sample mode','samples per channel','error in'],outs:['task out','error out'],w:48,h:66,col:'#e3f1ff',pal:['Functions','Measurement I/O','NI-DAQmx','DAQmx Timing.vi']},
 'DAQmx Start Task':{g:'DAQmx\n▶',ins:['task/channels in','error in'],outs:['task out','error out'],w:48,h:44,col:'#e3f1ff',pal:['Functions','Measurement I/O','NI-DAQmx','DAQmx Start Task.vi']},
 'DAQmx Read':{g:'DAQmx\nR',ins:['task/channels in','number of samples per channel','error in'],outs:['task out','data','error out'],w:48,h:56,col:'#e3f1ff',pal:['Functions','Measurement I/O','NI-DAQmx','DAQmx Read.vi']},
 'DAQmx Stop Task':{g:'DAQmx\n■',ins:['task/channels in','error in'],outs:['task out','error out'],w:48,h:44,col:'#e3f1ff',pal:['Functions','Measurement I/O','NI-DAQmx','DAQmx Stop Task.vi']},
 'DAQmx Clear Task':{g:'DAQmx\n✕',ins:['task/channels in','error in'],outs:['error out'],w:48,h:44,col:'#e3f1ff',pal:['Functions','Measurement I/O','NI-DAQmx','DAQmx Clear Task.vi']}
});

const PART='CLAD 證照';
const tip=(t,b)=>`<div class="tip"><b>${t}</b>${b}</div>`;
const warn=(t,b)=>`<div class="warn"><b>${t}</b>${b}</div>`;
const note=(t,b)=>`<div class="note"><b>${t}</b>${b}</div>`;
C.clad={tip,warn,note,PART};

/* ======================================================================
   C1 考試說明、環境、專案、除錯
   ====================================================================== */
L.push({id:'C01',order:101,no:'C1',part:PART,title:'CLAD 是什麼、怎麼準備；環境、專案與除錯工具',mins:60,
goals:[['這一部分的目標','把雙龍門專案沒碰到、但 CLAD 會考的知識點補齊，最後用模擬考檢查。'],['學會','考試形式、LabVIEW Project、VI Properties、所有除錯工具。'],['讀法','每一課先看重點表，再做「看圖說答案」題。答錯的題目解說要讀懂，CLAD 很多題目就是那些陷阱。']],
check:'這課的小測驗全對，並且能說出 Step Into / Step Over / Step Out 的差別。',
body:[
C.h3('懂','','CLAD 考什麼'),
`<p><b>CLAD（Certified LabVIEW Associate Developer）</b>是 NI 的入門證照，證明你看得懂、寫得出基本的 LabVIEW 程式。考試是選擇題，很多題目是「看一張方塊圖，問執行後某個 Indicator 的值」。</p>
${C.table(['項目','內容（以 NI 公布的資訊為準，報名前請上 NI 官網確認最新規定）'],[
 ['形式','線上或考場電腦作答，選擇題，不能開 LabVIEW'],
 ['題數與時間','傳統上是 40 題、60 分鐘；及格約 70%'],
 ['範圍','LabVIEW Core 1、Core 2 的內容：環境、資料型別、結構、模組化、檔案 I/O、迴圈間通訊、設計模式、錯誤處理、DAQ 與儀器控制'],
 ['效期','通常兩年，可以考 CLD 或重考延續']
])}`,
C.table(['CLAD 主題','本課程哪裡學'],[
 ['LabVIEW 環境、專案、除錯','第 1、2 課；本課 C1'],['資料型別與強制轉換','第 3 課；C2'],['迴圈、Shift Register、時間','第 4、5 課；C3'],
 ['Case、Sequence、Event、Formula Node','第 6 課；C4'],['陣列、Cluster','第 7、8 課；C5'],['字串、檔案 I/O','第 9、20 課；C6'],
 ['SubVI、Reentrancy、Polymorphic、Express VI','第 10 課；C7'],['Local/Global、FGV、Queue、Notifier、Property Node','第 16 課；C8'],
 ['設計模式（State Machine、Producer/Consumer…）','第 16 課；C9'],['錯誤處理','第 11、19 課；C10'],['Chart、Graph、UI','第 18 課；C11'],['DAQmx、儀器控制','第 12 課；C12'],
 ['模擬考','CX']
]),
tip('準備方法','每課的「看圖說答案」一定要先自己算，再看答案。CLAD 的陷阱通常是：迴圈跑幾次、空陣列、Shift Register 有沒有初始化、型別轉換怎麼捨入、事件什麼時候觸發、Local Variable 的競爭狀況。'),
C.h3('懂','','LabVIEW Project（.lvproj）'),
`<p>實際專案不會只有一個 VI。<b>File ▸ Create Project</b> 建立 .lvproj，Project Explorer 視窗管理所有檔案：</p>
${C.table(['項目','意思'],[
 ['My Computer','這台電腦上的程式（target）。有 cRIO、RT 主機時會多出其他 target'],
 ['Dependencies','LabVIEW 自動找出、被你的 VI 用到的檔案（vi.lib 裡的、別的資料夾的）'],
 ['Build Specifications','建置規格：Application（.exe）、Installer、Source Distribution、Zip、Shared Library（.dll）'],
 ['Virtual Folder','只存在專案裡的分類資料夾，硬碟上不存在'],
 ['Auto-populating Folder','和硬碟上資料夾同步，硬碟增減檔案會自動反映'],
 ['Files 頁籤','看硬碟上真實位置']
])}
${note('VI 只能在一個 Project 的一個 target 下開啟同名的一份','LabVIEW 記憶體中同名 VI 只能有一個（同一個 application instance 內）。這是為什麼不同專案的同名 VI 會互相干擾，好習慣是加前綴（像本課程的 FX_、GT_）。')}`,
C.h3('懂','','VI Properties（File ▸ VI Properties，Ctrl+I）'),
C.table(['分類','常考的設定'],[
 ['Documentation','VI description：會出現在 Context Help；Help tag'],
 ['Window Appearance','視窗標題、是否顯示工具列、Abort 按鈕；Dialog 樣式'],
 ['Execution','Reentrancy（Non-reentrant / Shared clone / Preallocated clone）、Run when opened、Priority、Enable automatic error handling'],
 ['Protection','Unlocked、Locked（no password）、Password-protected'],
 ['Editor Options','對齊格線、控制項樣式']
]),
C.h3('懂','','除錯工具：每一個都可能考'),
C.table(['工具','怎麼用','重點'],[
 ['Broken Run 箭頭 / Error List','點斷掉的箭頭','列出錯誤和警告；勾 Show Warnings 才看得到警告'],
 ['Highlight Execution','工具列燈泡','資料流動畫，速度很慢'],
 ['Probe','線上右鍵 ▸ Probe（或用 Probe 工具）','顯示線上最新的值；可用 Conditional Probe（條件成立才暫停）'],
 ['Breakpoint','右鍵 ▸ Set Breakpoint（紅框）','執行到這裡暫停；可設在節點、線、整個方塊圖'],
 ['Step Into','暫停時按','進入下一個節點；如果是 SubVI 就打開它一步一步走'],
 ['Step Over','暫停時按','執行下一個節點，SubVI 整個跑完不進去'],
 ['Step Out','暫停時按','把目前這個 SubVI／結構跑完，回到上一層'],
 ['Retain Wire Values','工具列','執行完後還能 Probe 到最後一次的值'],
 ['Suspend when Called','SubVI 的 VI Properties ▸ Execution','SubVI 被呼叫時暫停，可以改輸入再跑'],
 ['Diagram Disable Structure','Programming ▸ Structures','暫時讓一段程式不執行（像註解掉），只有 Enabled 頁會編譯']
]),
warn('常見陷阱','Highlight Execution 會改變時序：本來會發生的競爭狀況（race condition），開了燈泡可能就不會出現。除錯時要知道這一點。'),
C.h3('測','q','小測驗'),
{quiz:[
 {q:'程式停在 Breakpoint，下一個節點是一個 SubVI。想讓 SubVI 整個執行完、但不要進去看，應該按？',o:['Step Into','Step Over','Step Out','Abort'],a:1,ex:'Step Over 執行完整個節點；Step Into 會打開 SubVI 單步執行；Step Out 是把目前所在的這層跑完。'},
 {q:'Project Explorer 裡哪一種資料夾會和硬碟上的資料夾內容自動同步？',o:['Virtual Folder','Auto-populating Folder','Dependencies','Build Specifications'],a:1,ex:'Virtual Folder 只存在專案裡；Auto-populating Folder 跟硬碟同步。'},
 {q:'想讓 VI 的說明文字在使用者按 Ctrl+H 時出現在 Context Help，要寫在哪裡？',o:['VI Properties ▸ Documentation ▸ VI description','前面板的 Free Label','方塊圖的註解','VI 的檔名'],a:0,ex:'VI description 會顯示在 Context Help；控制項的說明則寫在 Description and Tip。'},
 {q:'要產生可以在沒裝 LabVIEW 開發環境的電腦上執行的 .exe，要在專案的哪裡建立？',o:['Dependencies','Build Specifications ▸ Application (EXE)','VI Properties ▸ Execution','Tools ▸ Options'],a:1,ex:'需要 Application Builder，目標電腦要裝對應版本的 LabVIEW Run-Time Engine。'},
 {q:'下列哪一個工具可以在「線上的值符合某條件時」才暫停程式？',o:['Generic Probe','Conditional Probe','Highlight Execution','Retain Wire Values'],a:1,ex:'Conditional Probe 可設定條件（例如值 > 100）才暫停，類似條件中斷點。'},
 {q:'Error List 預設不會列出哪一種項目？',o:['斷線錯誤','警告（Warnings），除非勾選 Show Warnings','缺少的 SubVI','型別錯誤'],a:1,ex:'警告不會讓 VI 不能執行，所以預設隱藏。'},
 {q:'想暫時讓方塊圖上一段程式不執行來除錯，最適合用？',o:['把線刪掉','Diagram Disable Structure','Case Structure 接 True 常數','Flat Sequence'],a:1,ex:'Diagram Disable Structure 的 Disabled 頁不會編譯也不會執行，最乾淨。'}
]}
]});

/* ======================================================================
   C2 資料型別深入
   ====================================================================== */
const roundFig={view:'split',name:'捨入與溢位',ratio:1.2,
 fp:{w:300,h:210,items:[
  {id:'x',k:'num',ctl:true,label:'x (DBL)',x:16,y:16,w:90,v:2.5,inc:0.5},
  {id:'r',k:'num',label:'To Long Integer (I32)',x:140,y:16,w:120},
  {id:'u',k:'num',ctl:true,label:'u (U8)',rep:'U8',x:16,y:90,w:90,v:250},
  {id:'u2',k:'num',label:'u + 10 (U8)',x:140,y:90,w:120},
  {id:'d',k:'num',label:'7 ÷ 2 (Divide, I32 輸入)',x:16,y:160,w:120},
  {id:'q',k:'str',label:'Quotient & Remainder 7, 2',x:150,y:160,w:130}]},
 bd:{w:430,h:210,nodes:[
  {id:'x',k:'ctl',t:'dbl',label:'x (DBL)',x:20,y:20},{id:'cv',k:'fn',fn:'To Long Integer',x:140,y:16},{id:'r',k:'ind',t:'i32',label:'To Long Integer',x:240,y:20},
  {id:'u',k:'ctl',t:'u8',label:'u (U8)',x:20,y:80},{id:'k10',k:'const',t:'u8',v:10,x:90,y:110},{id:'add',k:'fn',fn:'Add',x:140,y:76},{id:'u2',k:'ind',t:'u8',label:'u + 10',x:240,y:80},
  {id:'k7',k:'const',t:'i32',v:7,x:20,y:150},{id:'k2',k:'const',t:'i32',v:2,x:20,y:175},{id:'dv',k:'fn',fn:'Divide',x:140,y:148},{id:'d',k:'ind',t:'dbl',label:'7 ÷ 2',x:240,y:152}],
  wires:[{id:'w1',from:'x',to:'cv',t:'dbl'},{id:'w2',from:'cv.out',to:'r',t:'i32'},{id:'w3',from:'u',to:'add.x',t:'u8'},{id:'w4',from:'k10',to:'add.y',t:'u8'},{id:'w5',from:'add.out',to:'u2',t:'u8'},
   {id:'w6',from:'k7',to:'dv.x',t:'i32',coerce:true},{id:'w7',from:'k2',to:'dv.y',t:'i32',coerce:true},{id:'w8',from:'dv.out',to:'d',t:'dbl'}]},
 sim:{live:true,step(i){const x=i.x;let r=Math.round(x);if(Math.abs(x%1)===0.5)r=2*Math.round(x/2);const u2=(i.u+10)&255;return {out:{r,u2,d:3.5,q:'IQ = 3, R = 1'},vals:{x,'cv.out':r,u:i.u,k10:10,'add.out':u2,k7:7,k2:2,'dv.out':3.5}};}}
};
L.push({id:'C02',order:102,no:'C2',part:PART,title:'資料型別深入：捨入、溢位、Enum/Ring、Waveform、Timestamp',mins:60,
goals:[['學會','數值表示法與轉換規則、特殊值（Inf、NaN）、Enum 與 Ring、Type Def 三種、Waveform、Timestamp、Dynamic Data、字串顯示模式、機械動作。'],['考試重點','「這個 Indicator 會顯示什麼」：捨入到偶數、整數溢位繞回、Divide 輸出 DBL、NaN 不等於自己。']],
check:'不用電腦能算出 To Long Integer(2.5)、U8 的 250+10、整數 7 ÷ 0 用 Quotient & Remainder 的結果。',
body:[
C.h3('懂','','數值：最常考的六條規則'),
C.table(['規則','例子','結果'],[
 ['浮點轉整數：<b>四捨六入、五取偶</b>（round half to even）','To Long Integer(2.5)、(3.5)、(-2.5)','2、4、-2'],
 ['整數運算溢位會<b>繞回</b>','U8：250 + 10','4（260 − 256）'],
 ['<b>Divide</b> 的輸出永遠是浮點數','I32 7 ÷ 2','3.5（DBL）'],
 ['Quotient & Remainder 整數除以 0','7 和 0','IQ = 0，R = 7（不會出錯）'],
 ['浮點除以 0','1.0 ÷ 0、0.0 ÷ 0','+Inf、NaN'],
 ['NaN 和任何值比較都是 False，包含自己','NaN = NaN','False；要用 Not A Number/Path/Refnum? 判斷']
]),
{lv:roundFig,cap:'改 x 試試 2.5、3.5、4.5（都取偶數）；把 u 改成 255 看溢位。'},
C.table(['型別','位元','範圍'],[['I8 / U8','8','-128～127 / 0～255'],['I16 / U16','16','-32768～32767 / 0～65535'],['I32 / U32','32','約 ±21 億 / 0～約 42.9 億'],['I64 / U64','64','—'],['SGL','32','單精度，約 7 位有效數字'],['DBL','64','雙精度，約 15 位有效數字（LabVIEW 預設）'],['EXT','80/128','延伸精度'],['CXT/CDB/CSG','—','複數']]),
note('預設型別','從 Controls 選盤放的 Numeric Control 是 <b>DBL</b>；從 Functions 選盤放的 Numeric Constant 是 <b>I32</b>（打成 2.5 才變 DBL）。不同型別相加時，結果是比較大／比較精確的那個型別（紅色強制轉換點出現在被轉換的那一端）。'),
C.h3('懂','','Enum 與 Ring'),
C.table(['','Enum（Programming ▸ Numeric ▸ Enum Constant／Controls ▸ Ring & Enum ▸ Enum）','Ring'],[
 ['值','只能 0、1、2…連續','可以自訂任意值（例如 10、20、99）'],
 ['項目文字','<b>是資料型別的一部分</b>：線上帶著文字，接到 Case 時頁籤顯示文字','不是型別的一部分，只是顯示用'],
 ['用在 Case Structure','頁籤顯示「Init」「Run」…，打錯字會斷線，很安全','頁籤只顯示數字'],
 ['常見用途','State Machine 的狀態（一定做成 Type Def）','對應硬體代碼的選單']
]),
C.h3('懂','','三種自訂控制項（.ctl）'),
C.table(['種類','改了 .ctl 之後','用途'],[
 ['Control','不連動，各用各的','只是把常用外觀存起來'],
 ['Type Def','<b>資料型別</b>連動更新，外觀不連動','Cluster、Enum 的標準做法（第 8 課）'],
 ['Strict Type Def','資料型別<b>和外觀</b>（顏色、大小、Ring 文字）都連動','需要所有地方長得一模一樣時']
]),
C.h3('懂','','其他型別'),
C.table(['型別','長什麼樣','重點'],[
 ['Waveform','Cluster：<b>t0</b>（開始時間 Timestamp）、<b>dt</b>（間隔秒數）、<b>Y</b>（DBL 陣列），可附 attributes','DAQmx Read、Graph 常用；Get Waveform Components 拆開'],
 ['Timestamp','128 位元，從 1904-01-01 00:00 UTC 起算的秒數','Get Date/Time In Seconds 取現在時間'],
 ['Dynamic Data','深藍色粗線，Express VI 的輸出','可直接接 Graph；要做數值運算用 Convert from Dynamic Data'],
 ['Path','青綠色線','用 Build Path、Strip Path 組路徑，不要用字串硬接，跨平台才不會錯'],
 ['Variant','紫色系','任何型別都能包進去，用 Variant To Data 取出（需要給型別）'],
 ['Refnum','參考（VISA、檔案、佇列、控制項 reference）','代表一個開著的資源，用完要 Close / Release']
]),
C.h3('懂','','字串顯示模式與 Boolean 機械動作'),
C.table(['字串顯示（右鍵）','顯示 "AB" + 換行'],[['Normal Display','AB（換行看不到）'],["'\\' Codes Display",'AB\\n'],['Password Display','***'],['Hex Display','4142 0A']]),
C.table(['機械動作','行為','注意'],[
 ['Switch When Pressed','按下就切換','—'],['Switch When Released','放開才切換','—'],['Switch Until Released','按住 ON、放開 OFF','—'],
 ['Latch When Pressed','按下送 True，被讀一次後自動回 False','<b>Latch 不能用 Local Variable</b>（VI 會斷）'],['Latch When Released','放開時送 True，被讀後回 False','STOP 按鈕的預設'],['Latch Until Released','按下送 True，放開或被讀後回 False','—']
]),
C.h3('測','q','看圖說答案'),
{quiz:[
 {q:'To Long Integer 輸入 -2.5，輸出是？',o:['-3','-2','-2.5','2'],a:1,ex:'五取偶：-2.5 的兩個候選 -2、-3 中，-2 是偶數。'},
 {q:'U8 控制項值是 200，加上 U8 常數 100，結果顯示？',o:['300','255','44','錯誤'],a:2,ex:'整數溢位繞回：300 − 256 = 44。不會停在 255（停在上限只發生在浮點轉整數的轉換）。'},
 {q:'Divide 的兩個輸入都是 I32 的 9 和 2，輸出是？',o:['4（I32）','4.5（DBL）','4.5（I32）','1'],a:1,ex:'Divide 一律輸出浮點；要整數商用 Quotient & Remainder。'},
 {q:'Quotient & Remainder 輸入 x = 10（I32）、y = 0，輸出？',o:['IQ = 0、R = 10','IQ = Inf、R = NaN','執行時錯誤','IQ = 10、R = 0'],a:0,ex:'整數除以 0 時，floor(x/y) = 0、x − y*floor(x/y) = x。'},
 {q:'Equal? 的兩個輸入都接 0/0 算出來的值，輸出？',o:['True','False','NaN','錯誤'],a:1,ex:'NaN 和任何值（包括 NaN）比都是 False，判斷要用 Not A Number/Path/Refnum?。'},
 {q:'State Machine 的狀態最適合用什麼型別？',o:['字串','Ring','Type Def 的 Enum','DBL'],a:2,ex:'Enum 的文字是型別的一部分，Case 頁籤顯示狀態名稱；做成 Type Def 後新增狀態所有地方一起更新。'},
 {q:'改了 Strict Type Def 的顏色，用到它的前面板控制項會？',o:['不變','顏色也跟著更新','只有資料型別更新','VI 斷掉'],a:1,ex:'Strict Type Def 連外觀都同步；一般 Type Def 只同步資料型別。'},
 {q:'Waveform 資料型別包含哪三個主要元素？',o:['x0、dx、Y','t0、dt、Y','start、stop、data','time、value、unit'],a:1,ex:'t0 是 Timestamp，dt 是秒，Y 是 DBL 陣列。（Waveform Graph 用的 Cluster 寫法是 x0、dx、Y。）'},
 {q:'從 Functions 選盤放一個 Numeric Constant，不改任何設定，它的表示法是？',o:['DBL','I32','U8','I16'],a:1,ex:'常數預設 I32；控制項預設 DBL。'},
 {q:'哪一種機械動作的 Boolean 不能建立 Local Variable？',o:['Switch When Pressed','Switch Until Released','Latch When Released','全部都可以'],a:2,ex:'Latch 類的按鈕「被讀一次就重設」，和 Local Variable 會衝突，LabVIEW 直接禁止（VI 斷掉）。'}
]}
]});

/* ======================================================================
   C3 迴圈與時間：看圖算次數
   ====================================================================== */
const figN10={name:'題 1',bd:{w:470,h:170,structs:[{id:'fl',k:'for',x:140,y:30,w:220,h:120}],nodes:[
  {id:'cn',k:'const',t:'i32',v:10,x:70,y:29},{id:'N',k:'N',s:'fl'},
  {id:'a',k:'ctl',t:'i32[]',label:'Array = [1, 2, 3]',x:20,y:90},{id:'ti',k:'tunnel',t:'i32[]',s:'fl',side:'l',y:100,idx:true},
  {id:'iter',k:'iter',s:'fl'},{id:'to',k:'tunnel',t:'i32',s:'fl',side:'r',y:130},{id:'o',k:'ind',t:'i32',label:'Output',x:400,y:120}],
 wires:[{id:'w1',from:'cn',to:'N',t:'i32'},{id:'w2',from:'a',to:'ti.o',t:'i32[]'},{id:'w3',from:'iter',to:'to.i',t:'i32'},{id:'w4',from:'to.o',to:'o',t:'i32'}]}};
const figN0={name:'題 2',bd:{w:470,h:170,structs:[{id:'fl',k:'for',x:140,y:30,w:220,h:120}],nodes:[
  {id:'cn',k:'const',t:'i32',v:0,x:80,y:29},{id:'N',k:'N',s:'fl'},
  {id:'k5',k:'const',t:'i32',v:5,x:70,y:71},{id:'sr',k:'sr',t:'i32',s:'fl',y:80},
  {id:'inc',k:'fn',fn:'Increment',x:220,y:66},{id:'o',k:'ind',t:'i32',label:'Result',x:400,y:70}],
 wires:[{id:'w1',from:'cn',to:'N',t:'i32'},{id:'w2',from:'k5',to:'sr.init',t:'i32'},{id:'w3',from:'sr.L',to:'inc',t:'i32'},{id:'w4',from:'inc.out',to:'sr.R',t:'i32'},{id:'w5',from:'sr.out',to:'o',t:'i32'}]}};
const figWhile={name:'題 3',bd:{w:470,h:190,structs:[{id:'wl',k:'while',x:60,y:20,w:300,h:150}],nodes:[
  {id:'iter',k:'iter',s:'wl'},{id:'k3',k:'const',t:'i32',v:3,x:150,y:100},{id:'ge',k:'fn',fn:'Greater Or Equal?',x:220,y:110},{id:'cond',k:'stop',s:'wl'},
  {id:'to',k:'tunnel',t:'i32[]',s:'wl',side:'r',y:60,idx:true},{id:'o',k:'ind',t:'i32[]',label:'Array Out',x:400,y:50}],
 wires:[{id:'w1',from:'iter',to:'ge.x',t:'i32',mx:120},{id:'w2',from:'k3',to:'ge.y',t:'i32',mx:205},{id:'w3',from:'ge.out',to:'cond',t:'bool'},{id:'w4',from:'iter',to:'to.i',t:'i32',pts:[[100,159],[100,66]]},{id:'w5',from:'to.o',to:'o',t:'i32[]'}]}};
const figTwo={name:'題 4',bd:{w:500,h:170,structs:[{id:'fl',k:'for',x:150,y:20,w:220,h:130}],nodes:[
  {id:'cn',k:'const',t:'i32',v:7,x:90,y:19},{id:'N',k:'N',s:'fl'},
  {id:'a',k:'ctl',t:'dbl[]',label:'A（5 個元素）',x:20,y:60},{id:'b',k:'ctl',t:'dbl[]',label:'B（3 個元素）',x:20,y:110},
  {id:'ta',k:'tunnel',t:'dbl[]',s:'fl',side:'l',y:70,idx:true},{id:'tb',k:'tunnel',t:'dbl[]',s:'fl',side:'l',y:120,idx:true},
  {id:'add',k:'fn',fn:'Add',x:240,y:80},{id:'to',k:'tunnel',t:'dbl[]',s:'fl',side:'r',y:94,idx:true},{id:'o',k:'ind',t:'dbl[]',label:'Sum',x:420,y:84}],
 wires:[{id:'w0',from:'cn',to:'N',t:'i32'},{id:'w1',from:'a',to:'ta.o',t:'dbl[]'},{id:'w2',from:'b',to:'tb.o',t:'dbl[]'},{id:'w3',from:'ta.i',to:'add.x',t:'dbl'},{id:'w4',from:'tb.i',to:'add.y',t:'dbl'},{id:'w5',from:'add.out',to:'to.i',t:'dbl'},{id:'w6',from:'to.o',to:'o',t:'dbl[]'}]}};
const figUninit={name:'題 5',bd:{w:470,h:170,structs:[{id:'fl',k:'for',x:140,y:30,w:220,h:120}],nodes:[
  {id:'cn',k:'const',t:'i32',v:3,x:80,y:29},{id:'N',k:'N',s:'fl'},{id:'sr',k:'sr',t:'i32',s:'fl',y:80},
  {id:'inc',k:'fn',fn:'Increment',x:220,y:66},{id:'o',k:'ind',t:'i32',label:'Count',x:400,y:70}],
 wires:[{id:'w1',from:'cn',to:'N',t:'i32'},{id:'w3',from:'sr.L',to:'inc',t:'i32'},{id:'w4',from:'inc.out',to:'sr.R',t:'i32'},{id:'w5',from:'sr.out',to:'o',t:'i32'}]}};
const figCond={name:'題 6',bd:{w:500,h:180,structs:[{id:'fl',k:'for',x:130,y:20,w:250,h:140}],nodes:[
  {id:'a',k:'ctl',t:'i32[]',label:'Data = [3, 8, 1, 9, 4]',x:10,y:50},{id:'ta',k:'tunnel',t:'i32[]',s:'fl',side:'l',y:60,idx:true},
  {id:'k5',k:'const',t:'i32',v:5,x:170,y:90},{id:'gt',k:'fn',fn:'Greater?',x:230,y:70},
  {id:'to',k:'tunnel',t:'i32[]',s:'fl',side:'r',y:60,mode:'cond'},{id:'o',k:'ind',t:'i32[]',label:'Out',x:420,y:50}],
 wires:[{id:'w1',from:'a',to:'ta.o',t:'i32[]'},{id:'w2',from:'ta.i',to:'gt.x',t:'i32',mx:200},{id:'w3',from:'k5',to:'gt.y',t:'i32',mx:215},{id:'w4',from:'ta.i',to:'to.i',t:'i32'},{id:'w5',from:'gt.out',to:'to.c',t:'bool',pts:[[300,84],[300,86]]},{id:'w6',from:'to.o',to:'o',t:'i32[]'}]}};
const figFB={name:'Feedback Node 範例',bd:{w:480,h:170,structs:[{id:'wl',k:'while',x:60,y:20,w:330,h:130}],nodes:[
  {id:'fb',k:'fb',t:'i32',x:120,y:56},{id:'k0',k:'const',t:'i32',v:0,x:108,y:110},
  {id:'inc',k:'fn',fn:'Increment',x:200,y:53},{id:'o',k:'ind',t:'i32',label:'Count',x:290,y:57},{id:'cond',k:'stop',s:'wl'},{id:'st',k:'ctl',t:'bool',label:'stop',x:280,y:116}],
 wires:[{id:'w1',from:'fb.out',to:'inc',t:'i32'},{id:'w2',from:'inc.out',to:'o',t:'i32'},{id:'w3',from:'inc.out',to:'fb.in',t:'i32',pts:[[260,67],[260,40],[100,40],[100,67]]},{id:'w4',from:'k0',to:'fb.init',t:'i32',pts:[[134,119]]},{id:'w5',from:'st',to:'cond',t:'bool'}]}};
L.push({id:'C03',order:103,no:'C3',part:PART,title:'迴圈與時間：跑幾次、輸出什麼',mins:70,
goals:[['學會','For/While 的次數規則、空陣列、四種輸出通道、條件終端、Shift Register 堆疊與未初始化、Feedback Node、所有 Timing 函式。'],['考試重點','CLAD 最愛考的「看圖算答案」：先找迴圈會跑幾次，再看每個通道輸出的是最後一個值還是陣列。']],
check:'六題看圖題自己算對五題以上。',
body:[
C.h3('懂','','迴圈跑幾次'),
C.table(['情況','次數'],[
 ['For Loop，只接 N','N 次；N ≤ 0 時 <b>0 次</b>'],
 ['For Loop，接自動索引的陣列（N 不接）','陣列長度'],
 ['For Loop，N 和陣列都接，或兩個陣列','<b>取最小的那個</b>'],
 ['For Loop 加條件終端（右鍵 ▸ Conditional Terminal）','最多 N 次，條件成立提早結束'],
 ['While Loop','<b>至少 1 次</b>（條件在每圈結束才檢查）']
]),
C.table(['輸出通道模式（通道右鍵 ▸ Tunnel Mode）','輸出'],[
 ['Last Value','最後一圈的值；<b>For Loop 跑 0 次時輸出該型別的預設值</b>（0、空字串、False）'],
 ['Indexing','每一圈的值組成陣列（For Loop 預設）；跑 0 次就是空陣列'],
 ['Concatenating','每一圈的陣列接成一個長陣列（不會變 2D）'],
 ['Conditional','加一個 ? 端子，條件為 True 的那圈才放進陣列']
]),
note('Shift Register 跑 0 次時','輸出就是初始值（直接穿過）。這和 Last Value 通道輸出「預設值」不一樣，常被拿來考。'),
C.h3('測','q','看圖說答案（先自己算）'),
{quiz:[
 {q:'題 1：N 接 10，陣列 [1, 2, 3] 自動索引進迴圈，i 從右邊的 Last Value 通道出來。Output = ？',lv:figN10,o:['9','2','3','10'],a:1,ex:'次數取最小：陣列只有 3 個 → 跑 3 圈，i = 0、1、2，最後一圈 i = 2。'},
 {q:'題 2：N 接 0，Shift Register 初始值 5，裡面加 1。Result = ？',lv:figN0,o:['0','5','6','預設值 0'],a:1,ex:'跑 0 次，Shift Register 輸出初始值 5。'},
 {q:'題 3：While Loop 在 i ≥ 3 時停止，i 用自動索引通道輸出。Array Out = ？',lv:figWhile,o:['[0, 1, 2]','[0, 1, 2, 3]','[1, 2, 3]','[3]'],a:1,ex:'i = 3 那一圈也會執行完（條件在圈尾檢查），所以共 4 圈，陣列 [0, 1, 2, 3]。'},
 {q:'題 4：N = 7，A 有 5 個元素、B 有 3 個，都自動索引。Sum 有幾個元素？',lv:figTwo,o:['7','5','3','8'],a:2,ex:'三個限制取最小：3。'},
 {q:'題 5：Shift Register 沒有初始化，N = 3。VI 剛打開第一次 Run，Count = 3。<b>不關 VI 再按一次 Run</b>，Count = ？',lv:figUninit,o:['3','6','0','4'],a:1,ex:'未初始化的 Shift Register 保留上次的值（只要 VI 還在記憶體裡）：3 + 3 = 6。這就是 FGV（第 C8 課）的原理。'},
 {q:'題 6：Conditional 通道只在 x > 5 時收集。Out = ？',lv:figCond,o:['[3, 8, 1, 9, 4]','[8, 9]','[True, False…]','[3, 1, 4]'],a:1,ex:'只有 8、9 大於 5。'},
 {q:'For Loop 輸入一個空陣列（自動索引），N 不接，迴圈內有一個 I32 從 Last Value 通道輸出，輸出是？',o:['空陣列','0（I32 的預設值）','錯誤','上一次執行的值'],a:1,ex:'跑 0 次，Last Value 通道輸出預設值。'},
 {q:'While Loop 停止條件端子改成 Continue if True，接一個 False 常數，迴圈跑幾次？',o:['0','1','無限','2'],a:1,ex:'Continue if True 接 False = 第一圈結束就停；While 至少跑 1 次。'}
]},
C.h3('懂','','Shift Register 進階與 Feedback Node'),
`<ul><li><b>堆疊的 Shift Register</b>：左邊方塊往下拉（右鍵 ▸ Add Element），可以拿到前 1、前 2、前 3 圈的值，常用來做移動平均。</li>
<li><b>Feedback Node</b>：和 Shift Register 功能相同的另一種畫法；初始值接在下面的菱形（Initializer terminal）。在迴圈裡把輸出接回自己的輸入時 LabVIEW 會自動插入。</li>
<li>Shift Register 可以放任何型別（陣列、Cluster、refnum…）。</li></ul>`,
{lv:figFB,cap:'Feedback Node：上一圈 Increment 的結果下一圈從左邊出來。初始值 0。'},
C.h3('懂','','時間函式'),
C.table(['函式','行為','注意'],[
 ['Wait (ms)','等「至少」指定毫秒，和迴圈其他程式平行','迴圈週期 = max(Wait, 其他程式的時間)'],
 ['Wait Until Next ms Multiple','等到時鐘是指定值的倍數（例如每 100 ms 的整點）','<b>第一圈的等待時間不固定</b>；適合讓多個迴圈同步'],
 ['Tick Count (ms)','毫秒計數器的現在值','值本身沒意義，要兩次相減；約 49.7 天繞回一次（U32）'],
 ['Elapsed Time（Express VI）','從開始或 Reset 後經過幾秒；到時間輸出 Time has Elapsed','不會讓迴圈等待'],
 ['Get Date/Time In Seconds','現在的 Timestamp','—'],
 ['Format Date/Time String','Timestamp → 文字（%Y-%m-%d %H:%M:%S）','—'],
 ['Timed Loop','Real-Time／FPGA 常用，可指定週期和優先權','Windows 上也能用，CLAD 只需知道用途']
]),
C.h3('測','q','小測驗'),
{quiz:[
 {q:'While Loop 裡有 Wait (ms) 100，另外一段程式每圈要 150 ms，迴圈週期大約？',o:['100 ms','150 ms','250 ms','50 ms'],a:1,ex:'Wait 和其他程式平行執行，週期是兩者中比較長的。'},
 {q:'想讓兩個平行的迴圈都對齊每 50 ms 的整點執行，用？',o:['Wait (ms)','Wait Until Next ms Multiple','Tick Count','Elapsed Time'],a:1,ex:'Wait Until Next ms Multiple 對齊時鐘的倍數。'},
 {q:'Tick Count (ms) 單獨讀一次的值代表？',o:['今天的時間','電腦開機後的時間（沒有絕對意義）','VI 執行了多久','1970 年起的毫秒'],a:1,ex:'只能拿來相減算經過時間。'},
 {q:'要在 Shift Register 拿到「前 2 圈」的值，怎麼做？',o:['再放一個迴圈','左邊方塊右鍵 Add Element','用 Local Variable','做不到'],a:1,ex:'堆疊 Shift Register。'},
 {q:'Feedback Node 和 Shift Register 的差別？',o:['Feedback Node 不能初始化','功能相同，只是畫法不同','Feedback Node 只能放在 For Loop','Shift Register 不能放陣列'],a:1,ex:'兩者可以互相轉換（右鍵 ▸ Replace with…）。'}
]}
]});

/* ======================================================================
   C4 結構：Case 進階、Sequence、Event、Formula Node
   ====================================================================== */
const evFig={name:'事件驅動的 UI 迴圈',bd:{w:640,h:280,structs:[{id:'wl',k:'while',x:40,y:20,w:560,h:240},{id:'ev',k:'event',x:110,y:50,w:420,h:180,frames:['Timeout','"Start": Value Change','"Stop": Value Change'],cur:2}],nodes:[
  {id:'k',k:'const',t:'i32',v:100,x:56,y:52},{id:'tmo',k:'tmo',s:'ev'},
  {id:'evd',k:'evd',s:'ev',items:['Source','Type','Time','CtlRef','OldVal','NewVal'],w:62},
  {id:'stop',k:'ctl',t:'bool',label:'Stop（Latch）',x:260,y:120,f:'ev:"Stop": Value Change'},
  {id:'to',k:'tunnel',t:'bool',s:'ev',side:'r',y:140},
  {id:'start',k:'ctl',t:'bool',label:'Start（Latch）',x:260,y:120,f:'ev:"Start": Value Change'},
  {id:'f1',k:'const',t:'bool',v:false,x:400,y:131,f:'ev:"Start": Value Change'},
  {id:'f0',k:'const',t:'bool',v:false,x:400,y:131,f:'ev:Timeout'},
  {id:'lab',k:'label',text:'送命令給\n通訊迴圈…',x:200,y:150,w:90,h:34,f:'ev:"Start": Value Change'},
  {id:'cond',k:'stop',s:'wl'}],
 wires:[{id:'w1',from:'k',to:'tmo',t:'i32'},{id:'w2',from:'stop',to:'to.i',t:'bool',f:'ev:"Stop": Value Change'},{id:'w3',from:'f1',to:'to.i',t:'bool',f:'ev:"Start": Value Change'},{id:'w4',from:'f0',to:'to.i',t:'bool',f:'ev:Timeout'},{id:'w5',from:'to.o',to:'cond',t:'bool'}]}};
const seqFig={name:'Flat Sequence 量時間',bd:{w:560,h:150,structs:[{id:'sq',k:'seq',x:30,y:30,w:480,h:100,fw:[140,200,140]}],nodes:[
  {id:'t1',k:'fn',fn:'Tick Count (ms)',x:60,y:62,showName:false},{id:'lab',k:'label',text:'要量時間的程式',x:200,y:62,w:120,h:24},
  {id:'t2',k:'fn',fn:'Tick Count (ms)',x:380,y:50,showName:false},{id:'sub',k:'fn',fn:'Subtract',x:440,y:70,showName:false},{id:'o',k:'ind',t:'u32',label:'ms',x:520,y:74}],
 wires:[{id:'w1',from:'t1.millisecond timer value',to:'sub.y',t:'u32',pts:[[110,78],[110,118],[425,118],[425,91]]},{id:'w2',from:'t2.millisecond timer value',to:'sub.x',t:'u32'},{id:'w3',from:'sub.out',to:'o',t:'u32'}]}};
const fmFig={name:'Formula Node',bd:{w:460,h:150,structs:[{id:'fm',k:'formula',x:120,y:30,w:220,h:90,text:'y = a*x*x + b;\nif (y > 100) y = 100;'}],nodes:[
  {id:'x',k:'ctl',t:'dbl',label:'x',x:20,y:50},{id:'a',k:'ctl',t:'dbl',label:'a',x:20,y:90},
  {id:'tx',k:'tunnel',t:'dbl',s:'fm',side:'l',y:60},{id:'ta',k:'tunnel',t:'dbl',s:'fm',side:'l',y:100},
  {id:'ty',k:'tunnel',t:'dbl',s:'fm',side:'r',y:75},{id:'y',k:'ind',t:'dbl',label:'y',x:390,y:65}],
 wires:[{id:'w1',from:'x',to:'tx.o',t:'dbl'},{id:'w2',from:'a',to:'ta.o',t:'dbl'},{id:'w3',from:'ty.o',to:'y',t:'dbl'}]}};
L.push({id:'C04',order:104,no:'C4',part:PART,title:'結構：Case 進階、Sequence、Event Structure、Formula Node',mins:70,
goals:[['學會','Case 的所有 Selector 型別與規則、Flat/Stacked Sequence、Event Structure 的觸發規則與陷阱、Formula Node、Disable 結構。'],['考試重點','Event：程式改值不會觸發 Value Change、Latch 按鈕端子要放在自己的事件頁裡、Timeout 預設 -1、Filter 與 Notify 事件的差別。']],
check:'能說出三種「不會觸發 Value Change 事件」的改值方式和一種會觸發的方式。',
body:[
C.h3('懂','','Case Structure 規則總整理'),
C.table(['Selector 型別','規則'],[
 ['Boolean','True / False 兩頁'],
 ['整數','可用範圍 <code>1..5</code>、<code>..0</code>（0 以下）、<code>10..</code>；逗號分隔多個值；沒列完要有 Default'],
 ['浮點數','可以接，但會<b>捨入成整數</b>（出現強制轉換點）'],
 ['字串','預設<b>區分大小寫</b>（右鍵可改 Case Insensitive Match）；也可用範圍 "a".."c"'],
 ['Enum','頁籤顯示項目文字；每個項目都有頁就不需要 Default'],
 ['Error Cluster','No Error / Error 兩頁，依 status 判斷']
]),
`<p>輸出通道：每一頁都要接，否則通道空心、VI 斷；或通道右鍵 <b>Use Default If Unwired</b>（沒接的頁輸出預設值）。</p>`,
C.h3('懂','','Sequence Structure'),
`<p>LabVIEW 靠資料流決定順序，但有時兩段程式之間沒有線、又必須先後執行（例如量一段程式的時間）。<b>Flat Sequence</b> 由左到右一格一格執行，資料從格子邊界傳到下一格；舊式的 <b>Stacked Sequence</b> 像 Case 一樣疊起來，用 Sequence Local 傳資料（不易讀，不建議）。</p>`,
{lv:seqFig,cap:'第一格取時間 → 第二格執行 → 第三格再取時間相減。'},
warn('不要濫用 Sequence','能用錯誤線決定順序就用錯誤線。Sequence 會讓整格都等前一格全部結束，也會擋住平行執行。'),
C.h3('懂','','Event Structure：使用者做了什麼才執行'),
`<p>${fn('Programming','Structures','Event Structure')} 等待事件發生（例如按鈕值改變、滑鼠點擊、關閉視窗），發生才執行對應的頁，<b>不用一直輪詢</b>。通常放在 While Loop 裡（每圈處理一個事件）。</p>`,
{lv:evFig,cap:'點上方 ◀ ▶ 看三個事件頁。注意 Stop 按鈕的端子放在「"Stop": Value Change」頁裡面；左上角的沙漏是 Timeout（這裡 100 ms），左邊是 Event Data Node。'},
C.table(['規則','說明'],[
 ['Value Change 只由「使用者操作」觸發','用 Local Variable、Indicator 端子、Property Node 的 <b>Value</b> 寫值<b>不會</b>觸發；用 <b>Value (Signaling)</b> 屬性寫值<b>會</b>觸發'],
 ['Latch 按鈕','端子要放在自己的 Value Change 頁裡，事件執行時讀到它才會重設；放在外面按鈕會一直卡在 True'],
 ['Timeout','左上角沙漏，<b>預設 -1 = 永遠等</b>；接 100 表示 100 ms 沒事件就執行 Timeout 頁'],
 ['事件會排隊','VI 執行後（靜態註冊）發生的事件都會排隊，即使 Event Structure 還沒開始等，也不會遺失'],
 ['鎖住前面板','預設「Lock front panel until the event case completes」：事件頁跑完前畫面不能操作。所以<b>事件頁要短</b>，長工作丟給別的迴圈（Producer/Consumer）'],
 ['Notify 事件（綠色箭頭）','事件發生後通知你，例如 Value Change、Mouse Down'],
 ['Filter 事件（紅色箭頭，名稱有 ?）','在 LabVIEW 處理之前先問你，可以修改或丟棄，例如 <b>Panel Close?</b>（可攔下關閉視窗）'],
 ['一個迴圈一個 Event Structure','同一個事件不要讓兩個 Event Structure 處理；不要把 Event Structure 放在不會執行到的地方，否則事件排隊會讓畫面卡住']
]),
C.h3('懂','','Formula Node 與 Disable 結構'),
`<p><b>Formula Node</b> 用類似 C 的語法寫算式，輸入／輸出變數在框邊上建立（右鍵 Add Input / Add Output），每行以分號結束。複雜數學式比一堆三角形好讀。</p>`,
{lv:fmFig},
C.table(['結構','用途'],[['Diagram Disable Structure','Disabled 頁不編譯不執行，除錯用'],['Conditional Disable Structure','依條件（例如目標平台 Windows / RT）選擇編譯哪一頁'],['Timed Structures','RT 或需要精確週期時用'],['In Place Element Structure','原地修改陣列／Cluster 元素，省記憶體（進階）']]),
C.h3('測','q','小測驗'),
{quiz:[
 {q:'用 Local Variable 把一個數字控制項改成 5，這個控制項的 Value Change 事件會？',o:['觸發','不會觸發','觸發兩次','VI 斷掉'],a:1,ex:'只有使用者操作或 Value (Signaling) 屬性會觸發。'},
 {q:'想用程式改值並觸發 Value Change 事件，要用？',o:['Local Variable','Property Node 的 Value','Property Node 的 Value (Signaling)','Global Variable'],a:2,ex:'Value (Signaling) 是專門用來觸發事件的。'},
 {q:'Latch When Released 的 Stop 按鈕，端子放在 Event Structure 外面（迴圈裡），按下後會？',o:['正常','按鈕一直維持 True，可能重複觸發或卡住','VI 斷掉','事件不會觸發'],a:1,ex:'Latch 要被讀到才會重設；事件頁裡讀它最安全。'},
 {q:'Event Structure 的 Timeout 端子沒接，沒有任何事件時？',o:['每 100 ms 執行 Timeout','永遠等待，不執行任何頁','立刻執行 Timeout','錯誤'],a:1,ex:'預設 -1，永遠等。'},
 {q:'想在使用者按視窗右上角 X 時先詢問、必要時取消關閉，要用哪個事件？',o:['Panel Close（Notify）','Panel Close?（Filter）','Value Change','Mouse Down'],a:1,ex:'Filter 事件可以把 Discard? 設 True 取消動作。'},
 {q:'Case Structure 的 Selector 接一個字串，頁籤是 "Start"。輸入 "start" 會執行哪一頁？',o:['"Start" 頁','Default 頁','錯誤','兩頁都執行'],a:1,ex:'預設區分大小寫。'},
 {q:'整數 Case 的頁籤寫 "..0" 代表？',o:['0','0 以下所有整數','0 到無限大','語法錯誤'],a:1,ex:'..0 = 小於等於 0；10.. = 大於等於 10。'},
 {q:'事件頁裡放了一個要跑 5 秒的運算，使用者這 5 秒內點其他按鈕會？',o:['馬上反應','畫面被鎖住，事件排隊，5 秒後才處理','事件遺失','VI 停止'],a:1,ex:'預設鎖住前面板；長工作應交給 Consumer 迴圈。'},
 {q:'Flat Sequence 第一格和第二格之間的資料怎麼傳？',o:['Sequence Local','直接拉線穿過格子邊界','Local Variable','不能傳'],a:1,ex:'Flat Sequence 直接拉線；Stacked Sequence 才用 Sequence Local。'},
 {q:'Formula Node 裡每一行敘述要用什麼結尾？',o:['句點','分號','換行就好','冒號'],a:1,ex:'和 C 語言一樣用分號。'}
]}
]});
})();
