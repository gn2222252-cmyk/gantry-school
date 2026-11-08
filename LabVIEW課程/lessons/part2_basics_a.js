/* 第二部分 A：資料流、資料型別、While Loop、Shift Register（第 2～5 課） */
(function(){
const L=window.LESSONS,fn=C.fn,ctl=C.ctl,qd=C.qd,wt=C.wt;

/* ======================================================================
   第 2 課：資料流
   ====================================================================== */
const addr={name:'L02_Address.vi',view:'split',ratio:1.5,
 fp:{w:300,h:250,items:[
  {id:'d',k:'num',ctl:true,label:'D Number',x:20,y:20,w:110,v:100},
  {id:'n',k:'num',ctl:true,label:'Words',x:20,y:140,w:110,v:2},
  {id:'a',k:'num',label:'Address',x:170,y:20,w:110},
  {id:'b',k:'num',label:'Bytes',x:170,y:140,w:110}]},
 bd:{w:470,h:250,nodes:[
  {id:'d',k:'ctl',t:'dbl',label:'D Number',x:30,y:40},
  {id:'n',k:'ctl',t:'dbl',label:'Words',x:30,y:170},
  {id:'c2',k:'const',t:'dbl',v:2,x:96,y:112},
  {id:'mul',k:'fn',fn:'Multiply',x:150,y:43},
  {id:'mul2',k:'fn',fn:'Multiply',x:150,y:173},
  {id:'c4',k:'const',t:'dbl',v:4096,x:196,y:92},
  {id:'add',k:'fn',fn:'Add',x:270,y:53},
  {id:'a',k:'ind',t:'dbl',label:'Address',x:380,y:57},
  {id:'b',k:'ind',t:'dbl',label:'Bytes',x:380,y:177}],
 wires:[
  {id:'w1',from:'d',to:'mul.x',t:'dbl'},
  {id:'w2',from:'c2',to:'mul.y',t:'dbl',mx:132},
  {id:'w3',from:'n',to:'mul2.x',t:'dbl'},
  {id:'w4',from:'c2',to:'mul2.y',t:'dbl',mx:132},
  {id:'w5',from:'mul.out',to:'add.x',t:'dbl'},
  {id:'w6',from:'c4',to:'add.y',t:'dbl',mx:250},
  {id:'w7',from:'add.out',to:'a',t:'dbl'},
  {id:'w8',from:'mul2.out',to:'b',t:'dbl'}]},
 sim:{live:true,step(i){const m=i.d*2,a=m+4096,b=i.n*2;return {out:{a,b},vals:{d:i.d,n:i.n,c2:2,c4:4096,'mul.out':m,'add.out':a,'mul2.out':b}};}}
};
L.push({id:'L02',order:2,no:'2',part:'LabVIEW 基礎',title:'資料流：節點什麼時候執行',mins:40,files:['練習\\L02_Address.vi'],
goals:[['學會','資料流規則、常數、線的分岔、Highlight Execution。'],['做出','把 D 編號換算成 FX 協定位址：位址 = 4096 + 2 × D。'],['用在專案','第 9 課組封包時，位址就是這樣算的。']],
check:'D Number = 100 時 Address = 4296；Words = 2 時 Bytes = 4。',
body:[
C.h3('懂','','LabVIEW 不是「由上往下」執行'),
`<p>文字程式（Python、C）是一行一行往下執行。LabVIEW 沒有「行」，它只看一條規則：</p>
<div class="note"><b>資料流規則</b>一個節點（函式、SubVI）<b>要等所有輸入都收到資料才會執行</b>；執行完，才把結果同時送到所有輸出線上。</div>
<p>所以順序是由「線」決定的，不是由位置決定。兩條互相沒有線連接的路徑，LabVIEW 會<b>同時（平行）</b>執行，誰先誰後不一定。</p>
<p>為什麼要算位址？FX 編程協定不認得「D100」這種名字，只認得記憶體位址。D0 在 <code>1000h</code>（十進位 4096），每個 D 佔 2 個位元組，所以：</p>
<p style="text-align:center;font-size:18px"><b>位址 = 4096 + 2 × D</b>　　例：D100 → 4096 + 200 = 4296（= <code>10C8h</code>）</p>`,
C.h3('做','b','跟著做：L02_Address.vi'),
{steps:{title:'D 編號 → FX 位址（兩條平行的資料路徑）',lv:addr,steps:[
 {t:'前面板：兩個 Control、兩個 Indicator',view:'fp',add:['d','n','a','b'],h:`<p>開新 VI，存成 <code>練習\\L02_Address.vi</code>。放：</p><ul><li>${ctl('Modern','Numeric','Numeric Control')} 兩個，標籤 <code>D Number</code>、<code>Words</code></li><li>${ctl('Modern','Numeric','Numeric Indicator')} 兩個，標籤 <code>Address</code>、<code>Bytes</code></li></ul>`},
 {t:'方塊圖：排好端子，放兩個 Multiply',view:'bd',add:['mul','mul2'],h:`<p><kbd>Ctrl</kbd>+<kbd>E</kbd> 到方塊圖，把 Control 端子排左邊、Indicator 排右邊。</p><p>放兩個 ${fn('Programming','Numeric','Multiply')} ${qd('Multiply')}。</p>`},
 {t:'建立常數 2：在端子上按右鍵',view:'bd',add:['c2','w2'],h:`<p>滑鼠移到上面那個 Multiply 的 <code>y</code> 輸入（左下），<b>按右鍵 ▸ Create ▸ Constant</b>。LabVIEW 會自動產生一個型別正確、而且已經接好線的常數，輸入 <code>2</code>。</p><p class="qd">用「在端子上 Create Constant」比從選盤拉常數好：型別一定對。</p>`},
 {t:'線可以分岔：同一個常數接兩個地方',view:'bd',add:['w4'],h:`<p>從常數 2 的<b>輸出端</b>再拉一條線到下面 Multiply 的 <code>y</code>。一個輸出可以接到很多輸入，這叫<b>分岔（branch）</b>，每個目的地拿到的是同一份資料的複本。</p><div class="warn"><b>反過來不行</b>兩個輸出接到同一個輸入會斷線：LabVIEW 不知道要聽誰的。</div>`},
 {t:'接 D Number 和 Words',view:'bd',add:['w1','w3'],h:wt([['D Number','上面 Multiply 的 x'],['Words','下面 Multiply 的 x']])},
 {t:'放 Add 和常數 4096',view:'bd',add:['add','c4','w5','w6'],h:`<p>放 ${fn('Programming','Numeric','Add')}。在 Add 的 <code>y</code> 上右鍵 ▸ Create ▸ Constant，輸入 <code>4096</code>。</p>${wt([['上面 Multiply 的 x*y','Add 的 x'],['常數 4096','Add 的 y','（Create Constant 已經自動接好）']])}`},
 {t:'接到 Indicator，執行',view:'split',add:['w7','w8'],h:`${wt([['Add 的 x+y','Address'],['下面 Multiply 的 x*y','Bytes']])}<p>D Number 輸入 100、Words 輸入 2，Run。Address = 4296、Bytes = 4。</p><p>👉 <b>開燈泡（Highlight Execution）再 Run</b>：注意常數和兩個 Control 是同時出發的，上下兩條路徑也同時在跑。Add 會「等」到上面的 Multiply 算完才動。</p>`}
]}},
C.h3('懂','','Highlight Execution 和 Probe：看資料流的兩個工具'),
C.table(['工具','在哪裡','做什麼'],[
 ['Highlight Execution（燈泡）','方塊圖工具列','慢動作執行，線上會有小球流動，經過的地方會顯示值。除錯時最直觀，但會讓程式變很慢。'],
 ['Probe 探針','在線上按右鍵 ▸ Probe','在線上放一個小視窗，即時顯示那條線最新的值，不會拖慢程式。'],
 ['Retain Wire Values','方塊圖工具列（燈泡右邊）','執行完以後，滑到線上還能看到最後一次的值。']
]),
`<div class="tip"><b>習慣養成</b>程式結果不對時，不要猜。從輸入端開始，一條一條線放 Probe，找出「第一個值不對的地方」，錯就在它前面那個節點。</div>`,
C.h3('測','q','小測驗'),
{quiz:[
 {q:'上面的 VI 裡，Add 什麼時候執行？',o:['程式一開始就執行','等 Multiply 的結果和常數 4096 都到了才執行','因為它在中間，所以第二個執行'],a:1,ex:'資料流規則：所有輸入都到齊才執行。位置在哪裡不重要。'},
 {q:'「D Number → Multiply」和「Words → Multiply」這兩條路，誰先跑？',o:['上面先，因為在上面','下面先','不一定，LabVIEW 可以同時執行'],a:2,ex:'沒有線相連的路徑是平行的，LabVIEW 不保證順序。需要順序時要用線（例如錯誤線）把它們串起來，第 11 課會講。'},
 {q:'D200 的 FX 位址是多少？',o:['4296','4496（1190h）','200'],a:1,ex:'4096 + 2 × 200 = 4496 = 1190h。第 13 課讀 D200 時會用到這個數字。'}
]}
]});

/* ======================================================================
   第 3 課：資料型別與線的顏色
   ====================================================================== */
const gallery={name:'型別一覽',view:'bd',
 bd:{w:640,h:330,nodes:[
  {id:'a',k:'const',t:'dbl',v:'3.14',x:40,y:20},{id:'ai',k:'ind',t:'dbl',label:'DBL 小數（預設）',x:300,y:20},
  {id:'b',k:'const',t:'u16',v:'100',x:40,y:62},{id:'bi',k:'ind',t:'u16',label:'U16 整數（PLC 的 D）',x:300,y:62},
  {id:'c',k:'const',t:'bool',v:true,x:40,y:104},{id:'ci',k:'ind',t:'bool',label:'Boolean（燈、按鈕）',x:300,y:104},
  {id:'d',k:'const',t:'str',v:'D0100',x:40,y:146},{id:'di',k:'ind',t:'str',label:'String 字串（封包）',x:300,y:146},
  {id:'e',k:'ctl',t:'u16[]',label:'',x:40,y:190},{id:'ei',k:'ind',t:'u16[]',label:'U16 陣列（一次讀很多個 D）',x:300,y:190},
  {id:'f',k:'ctl',t:'bool[]',label:'',x:40,y:230},{id:'fi',k:'ind',t:'bool[]',label:'Boolean 陣列（16 個 X 燈）',x:300,y:230},
  {id:'g',k:'ctl',t:'err',label:'',x:40,y:268},{id:'gi',k:'ind',t:'err',label:'Error Cluster 錯誤線',x:300,y:268},
  {id:'h',k:'ctl',t:'visa',label:'',x:40,y:304},{id:'hi',k:'ind',t:'visa',label:'VISA 資源（通訊埠）',x:300,y:304}],
 wires:'abcdefgh'.split('').map((x,i)=>({id:'w'+x,from:x,to:x+'i',t:['dbl','u16','bool','str','u16[]','bool[]','err','visa'][i]}))}
};
const u16={name:'L03_Overflow.vi',view:'split',
 fp:{w:330,h:200,items:[
  {id:'v',k:'num',ctl:true,label:'Value (U16)',rep:'U16',x:20,y:20,w:110,v:65535},
  {id:'r',k:'num',label:'Value + 1 (U16)',x:180,y:20,w:120},
  {id:'s',k:'num',ctl:true,label:'Value (I16)',rep:'I16',x:20,y:110,w:110,v:32767},
  {id:'t',k:'num',label:'Value + 1 (I16)',x:180,y:110,w:120}]},
 bd:{w:360,h:200,nodes:[
  {id:'v',k:'ctl',t:'u16',label:'Value (U16)',x:30,y:30},{id:'inc',k:'fn',fn:'Increment',x:150,y:26},{id:'r',k:'ind',t:'u16',label:'Value + 1 (U16)',x:260,y:30},
  {id:'s',k:'ctl',t:'i16',label:'Value (I16)',x:30,y:120},{id:'inc2',k:'fn',fn:'Increment',x:150,y:116},{id:'t',k:'ind',t:'i16',label:'Value + 1 (I16)',x:260,y:120}],
 wires:[{id:'w1',from:'v',to:'inc',t:'u16'},{id:'w2',from:'inc.out',to:'r',t:'u16'},{id:'w3',from:'s',to:'inc2',t:'i16'},{id:'w4',from:'inc2.out',to:'t',t:'i16'}]},
 sim:{live:true,step(i){const r=(i.v+1)&0xFFFF;let t=i.s+1;if(t>32767)t=-32768;return {out:{r,t},vals:{v:i.v,s:i.s,'inc.out':r,'inc2.out':t}};}}
};
const coerce={name:'強制轉換點',view:'bd',
 bd:{w:420,h:120,nodes:[
  {id:'d',k:'ctl',t:'u16',label:'D Number (U16)',x:20,y:30},{id:'c',k:'const',t:'dbl',v:'4096',x:80,y:80},
  {id:'add',k:'fn',fn:'Add',x:190,y:40},{id:'a',k:'ind',t:'dbl',label:'Address（變成 DBL 了）',x:300,y:44}],
 wires:[{id:'w1',from:'d',to:'add.x',t:'u16',coerce:true},{id:'w2',from:'c',to:'add.y',t:'dbl'},{id:'w3',from:'add.out',to:'a',t:'dbl'}]}
};
L.push({id:'L03',order:3,no:'3',part:'LabVIEW 基礎',title:'資料型別：線的顏色會說話',mins:40,files:['練習\\L02_Address.vi（改成 U16）','練習\\L03_Overflow.vi'],
goals:[['學會','數字的表示法（Representation）、線色、強制轉換點、十六進位顯示。'],['做出','把上一課的位址計算改成 U16，並用十六進位顯示 10C8。'],['用在專案','PLC 的 D 是 16 位元，整個專案的 D 值一律用 U16。']],
check:'D Number = 100 時，Address 以十六進位顯示 10C8，方塊圖上沒有紅色小點。',
body:[
C.h3('懂','','看線的顏色就知道是什麼資料'),
`<p>LabVIEW 每種資料型別有固定的顏色和粗細。<b>細線是單一值，粗線是陣列，雙線是叢集（Cluster）</b>。學會看線色，看別人的方塊圖會快很多。</p>`,
{lv:gallery,cap:'本專案會用到的型別。把滑鼠移到端子上可以看說明。'},
C.table(['型別','線色','在雙龍門專案的用途'],[
 ['DBL（雙精度小數）','橘','LabVIEW 數字預設型別。專案裡很少用，因為 PLC 沒有小數。'],
 ['U16（無號 16 位元整數，0～65535）','藍','<b>所有 D 暫存器</b>：步序、計數、異常碼、命令字。'],
 ['I32（有號 32 位元整數）','藍','迴圈的 i、陣列索引、字串長度。'],
 ['Boolean','綠','燈號、按鈕、X/Y 每一個點。'],
 ['String','粉紅','FX 封包就是一串字元。'],
 ['Error Cluster','黃褐雙線','把通訊函式串起來，記錄有沒有出錯（第 11 課）。'],
 ['VISA Resource Name','紫','代表一個開好的通訊埠（第 12 課）。']
]),
C.h3('懂','','Representation：同樣是數字，格子大小不一樣'),
`<p>數字控制項預設是 DBL。要改：在前面板物件或方塊圖端子上 <b>右鍵 ▸ Representation ▸ U16</b>。端子上的字會從 <code>DBL</code> 變 <code>U16</code>，線從橘變藍。</p>
<p>整數有範圍。U16 最大 65535，再加 1 會<b>繞回 0</b>；I16 最大 32767，再加 1 會變成 -32768。PLC 的 D 暫存器其實是 I16（有號），但狀態字、命令字我們當作 U16 來看比較直觀，位元 15 也不會變成負號。下面可以試試：</p>`,
{lv:u16,cap:'改數字就會重算（live）。U16 的 65535 + 1 = 0，I16 的 32767 + 1 = -32768。PLC 的心跳 D240 每秒加 1，就是因為這樣才限制在 1～32767 循環（第 5 課）。'},
C.h3('懂','','紅色小點：強制轉換（Coercion Dot）'),
`<p>型別不同的線接在一起時，LabVIEW 會自動轉換，並在輸入端畫一個<b>紅色小點</b>提醒你。</p>`,
{lv:coerce,cap:'U16 接到 DBL 常數的 Add，LabVIEW 把 U16 轉成 DBL，結果也變成 DBL。小點代表「這裡偷偷轉了型別」。'},
`<div class="warn"><b>看到紅點要處理</b>它不一定錯，但常常是型別沒規劃好。這個例子的解法：把常數 4096 也改成 U16（常數上右鍵 ▸ Representation ▸ U16）。</div>`,
C.h3('做','b','動手改：L02_Address.vi 全部換成 U16'),
{todo:[
 '打開 <code>L02_Address.vi</code>，另存新檔為 <code>L03_Address.vi</code>（File ▸ Save As ▸ Copy ▸ Substitute copy for original）。',
 '前面板 D Number、Words：右鍵 ▸ Representation ▸ <b>U16</b>。',
 '方塊圖兩個常數（2 和 4096）：右鍵 ▸ Representation ▸ <b>U16</b>。',
 '確認方塊圖上<b>沒有紅點</b>、所有線都是藍色。Indicator 的型別會自動跟著變（如果沒有，也一樣改成 U16）。',
 '前面板 Address 上右鍵 ▸ <b>Display Format…</b> ▸ Type 選 <b>Hexadecimal</b>，Minimum field width 填 4，勾 Pad with zeros。',
 '再右鍵 ▸ Visible Items ▸ <b>Radix</b>，數字前面會出現小小的 <code>x</code>，表示這是十六進位。',
 'D Number = 100，Run：Address 顯示 <b>10C8</b>。D Number = 200：<b>1190</b>。',
 '另外照上面的圖做 <code>L03_Overflow.vi</code>，自己驗證 65535 + 1 = 0。'
]},
C.h3('測','q','小測驗'),
{quiz:[
 {q:'方塊圖上一條粗的藍線代表什麼？',o:['一個 DBL','整數陣列','字串'],a:1,ex:'藍色 = 整數，粗 = 陣列。讀 D200～D229 回來的資料就是粗藍線。'},
 {q:'D 暫存器的值在 LabVIEW 用哪個表示法最適合？',o:['DBL','U16','Boolean'],a:1,ex:'D 是 16 位元。用 U16 不會有小數，也和 PLC 一樣是 16 位元寬。'},
 {q:'Add 的輸入端出現紅色小點表示？',o:['這條線斷了','LabVIEW 自動轉換了型別','程式執行中'],a:1,ex:'Coercion Dot：型別不一致，被自動轉換。'}
]}
]});

/* ======================================================================
   第 4 課：While Loop
   ====================================================================== */
const blink={name:'L04_Blink.vi',view:'split',ratio:1.4,
 fp:{w:280,h:230,items:[
  {id:'led',k:'led',label:'Blink',x:30,y:24},
  {id:'it',k:'num',label:'Iterations',x:30,y:90,w:100},
  {id:'stop',k:'btn',label:'stop',text:'STOP',x:30,y:160,stop:true}]},
 bd:{w:500,h:290,structs:[{id:'wl',k:'while',x:50,y:30,w:420,h:240}],
  nodes:[
  {id:'iter',k:'iter',s:'wl'},
  {id:'k500',k:'const',t:'i32',v:500,x:120,y:62},
  {id:'wait',k:'fn',fn:'Wait (ms)',x:190,y:55},
  {id:'c2',k:'const',t:'i32',v:2,x:110,y:170},
  {id:'qr',k:'fn',fn:'Quotient & Remainder',x:170,y:140},
  {id:'eq',k:'fn',fn:'Equal To 0?',x:250,y:135},
  {id:'led',k:'ind',t:'bool',label:'Blink',x:340,y:139},
  {id:'it',k:'ind',t:'i32',label:'Iterations',x:340,y:200},
  {id:'stop',k:'ctl',t:'bool',label:'stop',x:360,y:236},
  {id:'cond',k:'stop',s:'wl'}],
  wires:[
  {id:'w1',from:'k500',to:'wait',t:'i32'},
  {id:'w2',from:'iter',to:'qr.x',t:'i32',mx:130},
  {id:'w3',from:'c2',to:'qr.y',t:'i32',mx:150},
  {id:'w4',from:'qr.R',to:'eq',t:'i32'},
  {id:'w5',from:'eq.out',to:'led',t:'bool'},
  {id:'w6',from:'iter',to:'it',t:'i32',mx:300},
  {id:'w7',from:'stop',to:'cond',t:'bool'}]},
 sim:{period:300,step(inp,st,ctx){const i=ctx.i;const r=i%2;return {out:{led:r===0,it:i},vals:{iter:i,k500:500,c2:2,'qr.R':r,'eq.out':r===0,stop:!!inp.stop},stop:!!inp.stop,msg:inp.stop?'按了 STOP：這一圈跑完後迴圈結束':'迴圈第 '+i+' 圈（網頁加快成 0.3 秒一圈）'};},doneMsg:'迴圈結束，VI 停止'}
};
L.push({id:'L04',order:4,no:'4',part:'LabVIEW 基礎',title:'While Loop：讓程式一直跑',mins:45,files:['練習\\L04_Blink.vi'],
goals:[['學會','While Loop、Iteration 端子、Loop Condition、Wait (ms)、Stop 按鈕的機械動作。'],['做出','每 0.5 秒閃一次的燈，按 STOP 才停。'],['用在專案','GT_Main 的 UI 迴圈、通訊迴圈都是 While Loop。']],
check:'Run 後燈每 0.5 秒換一次狀態、Iterations 一直加，按 STOP 後程式停止（工具列 Run 箭頭恢復白色）。',
body:[
C.h3('懂','','While Loop 的三個零件'),
`<p>上位機要一直讀 PLC、一直等按鈕，所以程式必須「重複執行直到使用者結束」。這就是 <b>While Loop</b>：</p>
${C.table(['零件','位置','意思'],[
 ['迴圈框','灰色粗框','框裡面的程式每一圈執行一次'],
 ['<b>i</b> Iteration 端子','左下角（藍色）','目前是第幾圈，<b>從 0 開始</b>，型別 I32'],
 ['Loop Condition 端子','右下角（紅色停止標誌）','預設 <b>Stop if True</b>：每圈結束時檢查，收到 True 就停']
])}
<div class="warn"><b>一定要放 Wait (ms)</b>沒有等待的迴圈會用盡一顆 CPU 全速空轉，電腦變很慢。顯示畫面用 50～100 ms，讀 PLC 用 100～200 ms 就夠了。</div>`,
C.h3('做','b','跟著做：L04_Blink.vi'),
{steps:{title:'閃爍燈：While Loop + Wait + 餘數',lv:blink,steps:[
 {t:'放 While Loop',view:'bd',add:['wl','iter','cond'],h:`<p>開新 VI 存成 <code>練習\\L04_Blink.vi</code>。方塊圖右鍵 ▸ ${fn('Programming','Structures','While Loop')} ${qd('While Loop')}。</p><p>游標會變成一個小框框圖示：<b>在空白處按住左鍵拖出一個長方形</b>再放開，迴圈就畫好了。之後可以拖邊框調大小。</p><p>現在 Run 箭頭是斷的：因為 Loop Condition 還沒接線。</p>`},
 {t:'在 Loop Condition 上建立 Stop 按鈕',view:'split',add:['stop','w7'],h:`<p>滑鼠移到右下角紅色的 Loop Condition，<b>右鍵 ▸ Create Control</b>。方塊圖多一個 <code>stop</code> 端子（綠色 TF，已接好），前面板多一個 <b>STOP</b> 按鈕。</p><p>這個按鈕的機械動作預設是 <b>Latch When Released</b>：按一下送出一次 True，被讀到之後自己彈回 False。停迴圈的按鈕都用這種。</p>`},
 {t:'放 Wait (ms)，等 500 ms',view:'bd',add:['wait','k500','w1'],h:`<p>${fn('Programming','Timing','Wait (ms)')} ${qd('Wait')} 放在<b>迴圈裡面</b>。在它的左邊輸入上右鍵 ▸ Create ▸ Constant，輸入 <code>500</code>。</p><p>Wait 和其他程式平行執行，所以這一圈至少花 500 ms。</p>`},
 {t:'用 i 算出「奇數圈／偶數圈」',view:'bd',add:['qr','c2','w2','w3','eq','w4'],h:`<p>放 ${fn('Programming','Numeric','Quotient & Remainder')} ${qd('Quotient')}。它有兩個輸出：<code>R</code>（餘數，上）和 <code>IQ</code>（商，下）。</p><p>${fn('Programming','Comparison','Equal To 0?')} ${qd('Equal To 0')} 放在右邊。</p>${wt([['i（迴圈左下角）','Quotient & Remainder 的 x'],['常數 2（在 y 上 Create Constant）','Quotient & Remainder 的 y'],['Quotient & Remainder 的 R','Equal To 0? 的 x']])}<p>i 除以 2 的餘數只會是 0、1、0、1…，所以 Equal To 0? 會 True、False 輪流。</p>`},
 {t:'接到燈和 Iterations',view:'split',add:['led','w5','it','w6'],h:`<p>在 Equal To 0? 的輸出上 <b>右鍵 ▸ Create Indicator</b>，改名 <code>Blink</code>（前面板會出現一個圓形 LED）。</p><p>在 i 上右鍵 ▸ Create Indicator，改名 <code>Iterations</code>。</p><p class="qd">Create Indicator 會把 Indicator 放在目前的位置（迴圈裡面），這正是我們要的：每一圈都更新。</p>`},
 {t:'Run，按 STOP 結束',view:'split',add:[],h:`<p>Run。燈每 0.5 秒變一次，Iterations 一直加。按前面板的 <b>STOP</b>，迴圈跑完這一圈就結束，Run 箭頭變回白色。</p><p>👉 在下面的模擬上試試，也可以開燈泡看一圈裡資料怎麼流（網頁版加快成 0.3 秒一圈）。</p>`}
]}},
C.h3('懂','','為什麼不要用 Abort（紅色圓形鈕）結束程式'),
`<p>工具列的 <b>Abort Execution</b> 會立刻砍掉程式，迴圈後面的程式<b>完全不會執行</b>。之後我們的迴圈後面會有「寫 D240 = 0、關閉通訊埠」，用 Abort 結束的話 PLC 不知道 HMI 離線、COM 埠也沒關，下次可能打不開。</p>
<div class="tip"><b>規則</b>每個有迴圈的 VI 都要有自己的停止按鈕（或 Exit 按鈕），Abort 只在程式卡死時用。</div>`,
C.h3('懂','','按鈕的六種機械動作'),
`<p>按鈕上右鍵 ▸ <b>Mechanical Action</b> 可以選。本專案只用三種：</p>
${C.table(['機械動作','行為','專案用在'],[
 ['Latch When Released','放開時送一次 True，被程式讀到後自動彈回','STOP、Exit、Start、Home、Reset、Write 參數'],
 ['Switch When Pressed','按一下 ON、再按一下 OFF','吸盤、輸送帶切換'],
 ['Switch Until Released','按住 ON，放開 OFF','手動點動：左右龍門前進後退、氣缸上下']
])}`,
C.h3('測','q','小測驗'),
{quiz:[
 {q:'迴圈第一圈時，i 是多少？',o:['0','1','不一定'],a:0,ex:'i 從 0 開始。'},
 {q:'Wait (ms) 放在迴圈外面會怎樣？',o:['每圈還是等 500 ms','只在迴圈開始前等一次，迴圈本身全速空轉','程式斷線'],a:1,ex:'迴圈外的東西只執行一次。Wait 要放在迴圈裡才會每圈都等。'},
 {q:'左龍門「往前」點動按鈕應該用哪種機械動作？',o:['Latch When Released','Switch When Pressed','Switch Until Released'],a:2,ex:'點動要「按住才動、放開就停」。'}
]}
]});

/* ======================================================================
   第 5 課：Shift Register
   ====================================================================== */
const beat={name:'L05_Beat.vi',view:'split',ratio:1.5,
 fp:{w:260,h:200,items:[
  {id:'beat',k:'num',label:'Beat',x:30,y:24,w:100},
  {id:'start',k:'num',ctl:true,label:'Start From',rep:'U16',x:30,y:84,w:100,v:32765},
  {id:'stop',k:'btn',label:'stop',text:'STOP',x:30,y:150,stop:true}]},
 bd:{w:560,h:250,structs:[{id:'wl',k:'while',x:110,y:30,w:410,h:200}],
  nodes:[
  {id:'start',k:'ctl',t:'u16',label:'Start From',x:20,y:82},
  {id:'sr',k:'sr',t:'u16',s:'wl',y:92},
  {id:'inc',k:'fn',fn:'Increment',x:170,y:78},
  {id:'max',k:'const',t:'u16',v:32767,x:180,y:130},
  {id:'gt',k:'fn',fn:'Greater?',x:250,y:110},
  {id:'one',k:'const',t:'u16',v:1,x:280,y:62},
  {id:'sel',k:'fn',fn:'Select',x:340,y:76},
  {id:'beat',k:'ind',t:'u16',label:'Beat',x:420,y:150},
  {id:'k200',k:'const',t:'i32',v:200,x:150,y:180},{id:'wait',k:'fn',fn:'Wait (ms)',x:210,y:172},
  {id:'stop',k:'ctl',t:'bool',label:'stop',x:420,y:196},
  {id:'cond',k:'stop',s:'wl'}],
  wires:[
  {id:'w0',from:'start',to:'sr.init',t:'u16'},
  {id:'w1',from:'sr.L',to:'inc',t:'u16'},
  {id:'w2',from:'inc.out',to:'gt.x',t:'u16',mx:225},
  {id:'w3',from:'max',to:'gt.y',t:'u16',mx:234},
  {id:'w4',from:'one',to:'sel.t',t:'u16',mx:325},
  {id:'w5',from:'gt.out',to:'sel.s',t:'bool',mx:318},
  {id:'w6',from:'inc.out',to:'sel.f',t:'u16',pts:[[215,92],[215,101],[340,101]]},
  {id:'w7',from:'sel.out',to:'sr.R',t:'u16'},
  {id:'w8',from:'sel.out',to:'beat',t:'u16',mx:395},
  {id:'w9',from:'k200',to:'wait',t:'i32'},
  {id:'w10',from:'stop',to:'cond',t:'bool'}],back:['sel>sr']},
 sim:{period:300,init(S){return {v:null};},step(inp,st,ctx){if(st.v===null)st.v=inp.start;const prev=st.v;let n=(prev+1)&0xFFFF;const over=n>32767;const out=over?1:n;st.v=out;
   return {out:{beat:out},vals:{start:inp.start,'sr.L':prev,'inc.out':n,max:32767,'gt.out':over,one:1,'sel.out':out,k200:200,stop:!!inp.stop},stop:!!inp.stop,msg:`上一圈 ${prev} → 這一圈 ${out}`+(over?'（超過 32767，回到 1）':'')};}}
};
const edge={name:'L05_Edge.vi',view:'split',ratio:1.5,
 fp:{w:260,h:220,items:[
  {id:'btn',k:'btn',label:'Start Switch',mech:'switch',lit:true,x:30,y:24,showLabel:false},
  {id:'pulse',k:'led',label:'Rising Edge',x:30,y:80},
  {id:'cnt',k:'num',label:'Edge Count',x:130,y:80,w:90},
  {id:'stop',k:'btn',label:'stop',text:'STOP',x:30,y:160,stop:true}]},
 bd:{w:560,h:250,structs:[{id:'wl',k:'while',x:70,y:30,w:450,h:200}],
  nodes:[
  {id:'f',k:'const',t:'bool',v:false,x:20,y:52},
  {id:'sr',k:'sr',t:'bool',s:'wl',y:61},
  {id:'btn',k:'ctl',t:'bool',label:'Start Switch',x:110,y:110},
  {id:'not',k:'fn',fn:'Not',x:150,y:47},
  {id:'and',k:'fn',fn:'And',x:230,y:90},
  {id:'pulse',k:'ind',t:'bool',label:'Rising Edge',x:310,y:94},
  {id:'z',k:'const',t:'u16',v:0,x:20,y:166},
  {id:'sr2',k:'sr',t:'u16',s:'wl',y:175},
  {id:'sel',k:'fn',fn:'Select',x:330,y:150},
  {id:'inc',k:'fn',fn:'Increment',x:150,y:143},
  {id:'cnt',k:'ind',t:'u16',label:'Edge Count',x:420,y:108},
  {id:'stop',k:'ctl',t:'bool',label:'stop',x:420,y:196},{id:'cond',k:'stop',s:'wl'}],
  wires:[
  {id:'w0',from:'f',to:'sr.init',t:'bool'},
  {id:'w1',from:'sr.L',to:'not',t:'bool'},
  {id:'w2',from:'not.out',to:'and.x',t:'bool'},
  {id:'w3',from:'btn',to:'and.y',t:'bool'},
  {id:'w4',from:'btn',to:'sr.R',t:'bool',pts:[[196,120],[196,38],[480,38],[480,61]]},
  {id:'w5',from:'and.out',to:'pulse',t:'bool'},
  {id:'w6',from:'z',to:'sr2.init',t:'u16'},
  {id:'w7',from:'sr2.L',to:'inc',t:'u16',pts:[[120,175],[120,157]]},
  {id:'w8',from:'inc.out',to:'sel.t',t:'u16'},
  {id:'w9',from:'sr2.L',to:'sel.f',t:'u16'},
  {id:'w10',from:'and.out',to:'sel.s',t:'bool',mx:290},
  {id:'w11',from:'sel.out',to:'sr2.R',t:'u16',mx:400},
  {id:'w12',from:'sel.out',to:'cnt',t:'u16',mx:390},
  {id:'w13',from:'stop',to:'cond',t:'bool'}],back:['and>sr','sel>sr2']},
 sim:{period:300,init(){return {prev:false,c:0};},step(inp,st){const b=!!inp.btn;const e=b&&!st.prev;const prev=st.prev;st.prev=b;const old=st.c;if(e)st.c++;
   return {out:{pulse:e,cnt:st.c},vals:{f:false,'sr.L':prev,'not.out':!prev,btn:b,'and.out':e,z:0,'sr2.L':old,'inc.out':old+1,'sel.out':st.c,stop:!!inp.stop},stop:!!inp.stop,msg:e?'上升邊緣！只亮這一圈':(b?'按鈕一直是 ON，但不是「剛按下」':'按鈕 OFF')};}}
};
L.push({id:'L05',order:5,no:'5',part:'LabVIEW 基礎',title:'Shift Register：記住上一圈',mins:50,files:['練習\\L05_Beat.vi','練習\\L05_Edge.vi'],
goals:[['學會','Shift Register 存值、初始化、Select、上升邊緣偵測。'],['做出','① 1～32767 循環的心跳計數器；② 偵測按鈕「剛按下」的瞬間。'],['用在專案','D240 心跳就是 ①；手動點動「有變化才送」就是 ② 的想法。']],
check:'Beat 從 32765 開始跑，經過 32767 後回到 1；Edge Count 只在按鈕從 OFF 變 ON 時加 1。',
body:[
C.h3('懂','','迴圈每一圈都是全新的，怎麼記住上一圈？'),
`<p>迴圈裡的線每一圈都重新開始。如果要「上一圈的值」（例如計數器、比較按鈕前後狀態），就要用 <b>Shift Register</b>：</p>
<ul><li>迴圈<b>右邊</b>的方塊（▲）：這一圈結束時把值存進去。</li><li>迴圈<b>左邊</b>的方塊（▼）：下一圈開始時把存的值拿出來。</li><li>左邊方塊<b>外面</b>接的值是初始值，只在第一圈用。</li></ul>
<div class="warn"><b>一定要初始化</b>左邊沒接初始值的話，Shift Register 會記住「上次執行 VI 結束時」的值。第二次按 Run 會接著上次的數字跑，很難除錯。</div>`,
C.h3('做','b','跟著做 ①：L05_Beat.vi 心跳計數器'),
`<p>PLC 用 D240 判斷 HMI 還在不在：LabVIEW 每秒把它加 1，3 秒沒變就算斷線。<b>0 保留給「沒有 HMI」</b>，所以值要在 1～32767 之間循環。這裡用 0.2 秒一圈示範。</p>`,
{steps:{title:'Beat = 上一圈 + 1，超過 32767 回到 1',lv:beat,steps:[
 {t:'While Loop + STOP + Wait',view:'bd',add:['wl','cond','stop','w10','wait','k200','w9'],h:`<p>和上一課一樣：While Loop、Loop Condition 上 Create Control、迴圈內 Wait (ms) 接常數 <code>200</code>。存成 <code>練習\\L05_Beat.vi</code>。</p>`},
 {t:'加 Shift Register',view:'bd',add:['sr'],h:`<p>在迴圈<b>左邊或右邊框線上按右鍵 ▸ Add Shift Register</b>。兩邊會同時出現一對小方塊。</p>`},
 {t:'初始值：Start From',view:'split',add:['start','w0'],h:`<p>在左邊方塊的<b>外側</b>右鍵 ▸ Create ▸ Control，改名 <code>Start From</code>，表示法改 <b>U16</b>，預設值改成 <code>32765</code>（輸入後右鍵 ▸ Data Operations ▸ Make Current Value Default）。</p><p class="qd">一般程式這裡接常數 0 或 1 就好，用 Control 是為了讓你快速看到 32767 → 1。</p>`},
 {t:'加 1，再判斷有沒有超過 32767',view:'bd',add:['inc','w1','gt','w2','max','w3'],h:`<p>${fn('Programming','Numeric','Increment')} ${qd('Increment')}、${fn('Programming','Comparison','Greater?')} ${qd('Greater?')}。</p>${wt([['左邊 Shift Register（▼）','Increment 的 x'],['Increment 的 x+1','Greater? 的 x'],['常數 32767（U16）','Greater? 的 y']])}`},
 {t:'Select：超過就選 1，不然選 x+1',view:'bd',add:['sel','one','w4','w5','w6'],h:`<p>${fn('Programming','Comparison','Select')} ${qd('Select')}：三個輸入 <code>t</code>（上）、<code>s</code>（中，判斷）、<code>f</code>（下）。<b>s 是 True 就輸出 t，False 就輸出 f</b>。它是最簡單的「如果…就…否則…」。</p>${wt([['常數 1（U16）','Select 的 t'],['Greater? 的 x > y?','Select 的 s'],['Increment 的 x+1','Select 的 f','（同一條線分岔過去）']])}`},
 {t:'存回 Shift Register、顯示',view:'split',add:['w7','beat','w8'],h:`${wt([['Select 的輸出','右邊 Shift Register（▲）'],['Select 的輸出','Beat Indicator（Create Indicator）']])}<p>Run：Beat 32766、32767、<b>1</b>、2、3…。在下面模擬試試，開燈泡看 Shift Register 的值怎麼繞一圈回來。</p>`}
]}},
C.h3('做','b','跟著做 ②：L05_Edge.vi 上升邊緣'),
`<p>「按鈕是 ON」和「按鈕<b>剛剛</b>被按下」不一樣。偵測「剛剛按下」叫<b>上升邊緣（Rising Edge）</b>：</p>
<p style="text-align:center;font-size:17px"><b>上升邊緣 = 這一圈是 ON　AND　上一圈是 OFF</b></p>
<p>這和 PLC 的 <code>LDP</code>（上升沿脈衝）是同一件事。</p>`,
{steps:{title:'只在按下的那一圈亮',lv:edge,steps:[
 {t:'迴圈、STOP、Shift Register（Boolean）',view:'bd',add:['wl','cond','stop','w13','sr','f','w0'],h:`<p>While Loop + STOP，加一個 Shift Register。左邊外側右鍵 ▸ Create ▸ Constant，會產生 Boolean 常數，點一下讓它是 <b>F</b>（False）。</p><p class="qd">Shift Register 的型別由接進去的資料決定，接了 F 就是 Boolean（綠色）。</p>`},
 {t:'放按鈕，存進 Shift Register',view:'split',add:['btn','w4'],h:`<p>前面板放 ${ctl('Modern','Boolean','Push Button')}，改名 <code>Start Switch</code>，機械動作改 <b>Switch When Pressed</b>（方便觀察）。</p><p>方塊圖把它的端子拉進迴圈，接到<b>右邊</b> Shift Register。這樣下一圈左邊拿出來的就是「上一圈的按鈕狀態」。</p>`},
 {t:'這一圈 ON AND 上一圈 NOT',view:'bd',add:['not','w1','and','w2','w3','pulse','w5'],h:`<p>${fn('Programming','Boolean','Not')}、${fn('Programming','Boolean','And')}。</p>${wt([['左邊 Shift Register','Not 的 x'],['Not 的 .not. x','And 的 x'],['Start Switch','And 的 y'],['And 的 x .and. y','Rising Edge（Create Indicator）']])}`},
 {t:'計算邊緣次數（第二個 Shift Register）',view:'split',add:['sr2','z','w6','inc','w7','sel','w8','w9','w10','w11','cnt','w12'],h:`<p>再加一個 Shift Register，初始值 U16 常數 <code>0</code>。用 Select：有邊緣就選「舊值 + 1」，沒有就選「舊值」。</p>${wt([['左邊 Shift Register 2','Increment 的 x，並分岔到 Select 的 f'],['Increment 的 x+1','Select 的 t'],['And 的輸出（邊緣）','Select 的 s'],['Select 的輸出','右邊 Shift Register 2 和 Edge Count']])}<p>Run，按住按鈕不放：Rising Edge 只亮一下，Edge Count 只加 1。</p>`}
]}},
`<div class="tip"><b>Feedback Node</b>如果你把 Shift Register 的輸出直接接回同一個迴圈的輸入，LabVIEW 有時會自動放一個 <b>Feedback Node</b>（箭頭小方塊），它和 Shift Register 功能一樣。本課程統一用 Shift Register，比較好看懂。</div>`,
C.h3('測','q','小測驗'),
{quiz:[
 {q:'Shift Register 左邊沒有接初始值，第二次 Run 時會？',o:['從 0 開始','從上次結束時的值繼續','程式斷線'],a:1,ex:'未初始化的 Shift Register 會保留上次執行的值。這是 LabVIEW 新手最常見的 bug 之一。'},
 {q:'Select 的 s 是 False 時輸出？',o:['t 的值','f 的值','0'],a:1,ex:'s = True 選 t（上），s = False 選 f（下）。'},
 {q:'為什麼心跳不能從 32767 加到 32768？',o:['LabVIEW 不允許','PLC 的 D 是有號 16 位元，32768 會變成 -32768；而且 0 代表沒有 HMI','因為太大會當機'],a:1,ex:'PLC 程式判斷 D240 > 0 才算有 HMI，所以讓它停在 1～32767。'}
]}
]});
})();
