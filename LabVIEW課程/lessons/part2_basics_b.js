/* 第二部分 B：Case Structure、Array 與 For Loop、Cluster 與 Type Def（第 6～8 課） */
(function(){
const L=window.LESSONS,fn=C.fn,ctl=C.ctl,qd=C.qd,wt=C.wt;

/* ======================================================================
   第 6 課：Case Structure
   ====================================================================== */
const codes=['0','1','10','11','20','21','30','40','Default'];
const texts={'0':'OK','1':'E-STOP','10':'RIGHT AXIS TIMEOUT','11':'RIGHT CYLINDER TIMEOUT','20':'LEFT AXIS TIMEOUT','21':'LEFT CYLINDER TIMEOUT','30':'HOMING TIMEOUT','40':'HMI LINK LOST','Default':'UNKNOWN CODE'};
const alarmVI={name:'GT_AlarmText.vi',view:'split',ratio:1.6,
 fp:{w:280,h:170,items:[
  {id:'code',k:'num',ctl:true,label:'Alarm Code',rep:'U16',x:20,y:20,w:100,v:10},
  {id:'txt',k:'str',label:'Alarm Text',x:20,y:90,w:230}]},
 bd:{w:560,h:200,structs:[{id:'cs',k:'case',x:150,y:40,w:270,h:130,frames:codes,def:'Default',cur:2}],
  nodes:[
  {id:'code',k:'ctl',t:'u16',label:'Alarm Code',x:20,y:95},
  {id:'sel',k:'sel',t:'u16',s:'cs',y:105},
  ...codes.map(c=>({id:'k'+c,k:'const',t:'str',v:texts[c],x:190,y:96,f:'cs:'+c})),
  {id:'tun',k:'tunnel',t:'str',s:'cs',side:'r',y:105},
  {id:'txt',k:'ind',t:'str',label:'Alarm Text',x:460,y:95}],
  wires:[{id:'w1',from:'code',to:'sel',t:'u16'},
   ...codes.map(c=>({id:'wk'+c,from:'k'+c,to:'tun.i',t:'str',f:'cs:'+c})),
   {id:'w2',from:'tun.o',to:'txt',t:'str'}]},
 sim:{live:true,step(i){const c=String(i.code);const fr=codes.includes(c)?c:'Default';const t=texts[fr];return {out:{txt:t},vals:{code:i.code,'tun.o':t,['k'+fr]:t},frames:{cs:codes.indexOf(fr)}};}}
};
const boolCase={name:'Boolean Case 範例',view:'bd',
 bd:{w:520,h:170,structs:[{id:'cb',k:'case',x:150,y:30,w:220,h:110,frames:['False','True'],cur:1}],
  nodes:[
  {id:'b',k:'ctl',t:'bool',label:'Alarm',x:30,y:76},{id:'sel',k:'sel',t:'bool',s:'cb',y:86},
  {id:'t',k:'const',t:'str',v:'Check machine!',x:200,y:76,f:'cb:True'},{id:'f',k:'const',t:'str',v:'Running normally',x:200,y:76,f:'cb:False'},
  {id:'tun',k:'tunnel',t:'str',s:'cb',side:'r',y:86},{id:'o',k:'ind',t:'str',label:'Message',x:420,y:76}],
  wires:[{id:'w1',from:'b',to:'sel',t:'bool'},{id:'w2',from:'t',to:'tun.i',t:'str',f:'cb:True'},{id:'w3',from:'f',to:'tun.i',t:'str',f:'cb:False'},{id:'w4',from:'tun.o',to:'o',t:'str'}]}
};
L.push({id:'L06',order:6,no:'6',part:'LabVIEW 基礎',title:'Case Structure：異常碼變文字',mins:50,files:['GT_AlarmText.vi','GT_StepText.vi'],
goals:[['學會','Case Structure、Selector 型別、新增／複製 Case、Default、輸出通道。'],['做出','GT_AlarmText.vi（異常碼 → 文字）和 GT_StepText.vi（步序號 → 文字）。'],['用在專案','主畫面的 Alarm Text、三個步序文字框就是這兩個 VI 產生的。']],
check:'Alarm Code 10 顯示 RIGHT AXIS TIMEOUT；99 顯示 UNKNOWN CODE；方塊圖輸出通道是實心的。',
body:[
C.h3('懂','','Case Structure = 好幾頁疊在一起，一次只執行一頁'),
`<p>Case Structure 看起來像一個框，其實裡面有好幾頁（Case），像一疊卡片。框左邊的 <b>?</b>（Selector）接進來的值決定這次執行哪一頁，其他頁完全不執行。</p>
${C.table(['Selector 接什麼','頁面標籤長什麼樣','例子'],[
 ['Boolean','True / False 兩頁','有異常就顯示警告'],
 ['整數','0、1、10、「20..28」、「10, 11」、Default','異常碼、步序號'],
 ['字串','"Start"、"Stop"…','命令名稱'],
 ['Error Cluster','No Error / Error','第 11 課：出錯就不做事']
])}
<p>Boolean Case 長這樣（點上面的 ◀ ▶ 切換頁面，真的 LabVIEW 也是這樣切）：</p>`,
{lv:boolCase},
C.h3('做','b','跟著做：GT_AlarmText.vi'),
`<p>PLC 的異常碼在 D220。表格在 PLC 課程已經定好：</p>
${C.table(['碼','文字','碼','文字'],[['0','OK','21','LEFT CYLINDER TIMEOUT'],['1','E-STOP','30','HOMING TIMEOUT'],['10','RIGHT AXIS TIMEOUT','40','HMI LINK LOST'],['11','RIGHT CYLINDER TIMEOUT','其他','UNKNOWN CODE'],['20','LEFT AXIS TIMEOUT','','']])}`,
{steps:{title:'整數 Selector 的 Case Structure',lv:alarmVI,steps:[
 {t:'前面板',view:'fp',add:['code','txt'],h:`<p>開新 VI，存在 <code>我的雙龍門</code> 資料夾（不是練習資料夾），檔名 <code>GT_AlarmText.vi</code>。這個 VI 之後會變成 SubVI 一直用。</p><ul><li>Numeric Control <code>Alarm Code</code>，Representation 改 <b>U16</b></li><li>${ctl('Modern','String & Path','String Indicator')}，標籤 <code>Alarm Text</code>，拉寬一點</li></ul>`},
 {t:'放 Case Structure，接上 Selector',view:'bd',add:['cs','sel','w1'],frames:{cs:1},h:`<p>${fn('Programming','Structures','Case Structure')} ${qd('Case Structure')}，像 While Loop 一樣拖出一個框。</p><p>把 Alarm Code 接到框左邊的 <b>?</b>。上方的頁籤會從 True/False 變成 <b>0</b> 和 <b>1</b>（整數 Case），其中一頁標著 Default。</p>`},
 {t:'在每一頁放字串常數',view:'bd',add:['k0','k1','tun','wk0','wk1'],frames:{cs:0},h:`<p>切到 <b>0</b> 頁：放 ${fn('Programming','String','String Constant')}，打 <code>OK</code>，拉線到框的<b>右邊框線</b>再到外面，框上會出現一個小方塊——<b>輸出通道（tunnel）</b>。</p><p>切到 <b>1</b> 頁：放字串常數 <code>E-STOP</code>，接到<b>同一個</b>通道。</p><div class="warn"><b>通道要實心</b>只要有一頁沒接，通道會是<b>空心</b>的，Run 箭頭斷掉。每一頁都要接到同一個通道。</div>`},
 {t:'新增其他頁：Add Case After',view:'bd',add:codes.slice(2,8).flatMap(c=>['k'+c,'wk'+c]),frames:{cs:2},h:`<p>在框上方頁籤右鍵 ▸ <b>Add Case After</b>，頁籤直接打 <code>10</code>。重複做出 <code>11</code>、<code>20</code>、<code>21</code>、<code>30</code>、<code>40</code>。</p><p class="qd">技巧：<b>Duplicate Case</b> 會連裡面的常數一起複製，只要改文字和頁籤數字，比 Add Case 快。</p>`},
 {t:'Default 頁：其他所有的值',view:'bd',add:['kDefault','wkDefault'],frames:{cs:8},h:`<p>原本那頁 Default（可能叫「1, Default」）：把頁籤改成只有 <code>Default</code>（再加一頁給 1）。在 Default 頁放 <code>UNKNOWN CODE</code>。</p><p>整數 Case 一定要有 Default，否則 LabVIEW 會要你把所有可能的數字都列出來。</p>`},
 {t:'接到 Indicator，試跑',view:'split',add:['txt','w2'],frames:{cs:2},h:`<p>通道接到 Alarm Text。Alarm Code 打 10、Run：<b>RIGHT AXIS TIMEOUT</b>。打 99：<b>UNKNOWN CODE</b>。</p><p>👉 下面的模擬改數字會自動切到執行的那一頁（真的 LabVIEW 不會自動翻頁，要開 Highlight Execution 才看得出走哪一頁）。</p>`}
]}},
`<div class="warn"><b>Use Default If Unwired 的陷阱</b>在通道上右鍵有一個 <b>Use Default If Unwired</b>：勾了以後沒接的頁會輸出「空值」（字串是空的、數字是 0），通道變成實心，Run 不會斷。看起來方便，但<b>忘了接線也不會報錯</b>。初學階段不要勾，讓 LabVIEW 提醒你。</div>`,
C.h3('練','x','自己做：GT_StepText.vi'),
`<p>照同樣方法做 <code>GT_StepText.vi</code>：輸入 <code>Step</code>（U16），輸出 <code>Step Text</code>（字串）。一個 VI 同時處理右、左、原點三種步序，因為號碼不重複：</p>
${C.table(['Case 頁籤','文字','Case 頁籤','文字'],[
 ['0','Stopped','20 和 40','Wait part'],['10','Outputs off','21 和 41','Down to pick'],['11','Cylinders up','22 和 42','Vacuum on'],['12','Axes to home','23 和 43','Up'],['13','Done','24','To rear'],
 ['Default','Unknown','44','To front'],['','','25 和 45','Down to place'],['','','26 和 46','Vacuum off'],['','','27 和 47','Up'],['','','28 和 48','Back home']])}
<div class="tip"><b>一頁對多個值</b>頁籤打 <code>20, 40</code>（逗號分隔）就是「20 或 40 都走這頁」。打 <code>20..28</code> 是範圍。這樣只要 15 頁左右。</div>`,
C.h3('測','q','小測驗'),
{quiz:[
 {q:'Case 的輸出通道是空心的，代表什麼？',o:['資料是陣列','至少有一頁沒有接到這個通道','程式正在執行'],a:1,ex:'每一頁都要給輸出通道一個值，否則 VI 不能執行。'},
 {q:'Case 頁籤打「21, 41」表示？',o:['21 到 41 全部','21 或 41','21 減 41'],a:1,ex:'逗號是「或」，兩個點「..」才是範圍。'},
 {q:'Alarm Code 是 99 時執行哪一頁？',o:['什麼都不執行','Default','0'],a:1,ex:'沒有列出來的值都走 Default。'}
]}
]});

/* ======================================================================
   第 7 課：Array 與 For Loop
   ====================================================================== */
const xbits={name:'L07_Bits.vi',view:'split',ratio:1.3,
 fp:{w:380,h:280,items:[
  {id:'w',k:'num',ctl:true,label:'D230 (X word)',rep:'U16',hex:4,x:20,y:20,w:110,v:0x0B54},
  {id:'arr',k:'leds',label:'X bits (Boolean array)',names:['[0] X0','[1] X1','[2] X2','[3] X3','[4] X4','[5] X5','[6] X6','[7] X7','[8] X10','[9] X11','[10] X12','[11] X13','[12] X14','[13] X15','[14] X16','[15] X17'],cols:2,x:20,y:76},
  {id:'part',k:'led',label:'Front Belt Part (X4)',x:220,y:20,color:'yel'}]},
 bd:{w:430,h:190,nodes:[
  {id:'w',k:'ctl',t:'u16',label:'D230 (X word)',x:20,y:50},
  {id:'nb',k:'fn',fn:'Number To Boolean Array',x:120,y:44},
  {id:'arr',k:'ind',t:'bool[]',label:'X bits',x:300,y:30},
  {id:'ix',k:'fn',fn:'Index Array',x:240,y:104},
  {id:'k4',k:'const',t:'i32',v:4,x:190,y:130},
  {id:'part',k:'ind',t:'bool',label:'Front Belt Part (X4)',x:330,y:108}],
  wires:[{id:'w1',from:'w',to:'nb',t:'u16'},{id:'w2',from:'nb.Boolean array',to:'arr',t:'bool[]',mx:200},{id:'w3',from:'nb.Boolean array',to:'ix.array',t:'bool[]',mx:200},{id:'w4',from:'k4',to:'ix.index',t:'i32'},{id:'w5',from:'ix.element',to:'part',t:'bool'}]},
 sim:{live:true,step(i){const b=C.bits(i.w,16);return {out:{arr:b,part:b[4]},vals:{w:i.w,'nb.Boolean array':b,k4:4,'ix.element':b[4]}};}}
};
const cmdword={name:'L07_D106.vi',view:'split',ratio:1.4,
 fp:{w:320,h:240,items:[
  ...['Start','Stop','Home','Reset','Clear Counts'].map((n,i)=>({id:'b'+i,k:'btn',label:n,mech:'switch',lit:true,x:20,y:20+i*40})),
  {id:'v',k:'num',label:'D106 Value',x:170,y:20,w:100},
  {id:'vb',k:'str',label:'Binary',x:170,y:80,w:120}]},
 bd:{w:480,h:250,nodes:[
  ...['Start','Stop','Home','Reset','Clear Counts'].map((n,i)=>({id:'b'+i,k:'ctl',t:'bool',label:n,x:30,y:22+i*44})),
  {id:'ba',k:'fn',fn:'Build Array',x:170,y:30,h:190,ins:['element 0','element 1','element 2','element 3','element 4']},
  {id:'bn',k:'fn',fn:'Boolean Array To Number',x:250,y:108},
  {id:'u16',k:'fn',fn:'To Unsigned Word Integer',x:330,y:110},
  {id:'v',k:'ind',t:'u16',label:'D106 Value',x:400,y:114}],
  wires:[...[0,1,2,3,4].map(i=>({id:'wb'+i,from:'b'+i,to:'ba.element '+i,t:'bool'})),
   {id:'w1',from:'ba.appended array',to:'bn',t:'bool[]'},{id:'w2',from:'bn.number',to:'u16',t:'i32'},{id:'w3',from:'u16.out',to:'v',t:'u16'}]},
 sim:{live:true,step(i){const b=[0,1,2,3,4].map(k=>!!i['b'+k]);const v=b.reduce((a,x,k)=>a|(x?1<<k:0),0);return {out:{v,vb:v.toString(2).padStart(5,'0')+'  (位元 4 3 2 1 0)'},vals:{'ba.appended array':b,'bn.number':v,'u16.out':v,b0:b[0],b1:b[1],b2:b[2],b3:b[3],b4:b[4]}};}}
};
const forvi={name:'L07_ForLoop.vi',view:'split',ratio:1.6,
 fp:{w:300,h:200,items:[
  {id:'start',k:'num',ctl:true,label:'Start D',rep:'U16',x:20,y:20,w:90,v:200},
  {id:'n',k:'num',ctl:true,label:'Count',rep:'I32',x:20,y:80,w:90,v:4},
  {id:'arr',k:'arr',label:'Addresses (hex)',n:4,x:20,y:140}]},
 bd:{w:560,h:210,structs:[{id:'fl',k:'for',x:140,y:30,w:300,h:150}],
  nodes:[
  {id:'n',k:'ctl',t:'i32',label:'Count',x:30,y:20},{id:'N',k:'N',s:'fl'},
  {id:'start',k:'ctl',t:'u16',label:'Start D',x:30,y:90},
  {id:'t1',k:'tunnel',t:'u16',s:'fl',side:'l',y:100},
  {id:'iter',k:'iter',s:'fl'},
  {id:'add',k:'fn',fn:'Add',x:190,y:93},
  {id:'k2',k:'const',t:'u16',v:2,x:205,y:60},
  {id:'mul',k:'fn',fn:'Multiply',x:260,y:83},
  {id:'k4',k:'const',t:'u16',v:4096,x:290,y:130},
  {id:'add2',k:'fn',fn:'Add',x:350,y:93},
  {id:'to',k:'tunnel',t:'u16[]',s:'fl',side:'r',y:107,idx:true},
  {id:'arr',k:'ind',t:'u16[]',label:'Addresses',x:480,y:97}],
  wires:[{id:'w0',from:'n',to:'N',t:'i32',pts:[[100,30],[100,47]]},{id:'w1',from:'start',to:'t1.o',t:'u16'},{id:'w2',from:'t1.i',to:'add.x',t:'u16'},{id:'w3',from:'iter',to:'add.y',t:'i32',mx:170,coerce:true},
   {id:'w4',from:'add.out',to:'mul.y',t:'u16',mx:240},{id:'w5',from:'k2',to:'mul.x',t:'u16',mx:240},{id:'w6',from:'mul.out',to:'add2.x',t:'u16'},{id:'w7',from:'k4',to:'add2.y',t:'u16',mx:335},{id:'w8',from:'add2.out',to:'to.i',t:'u16'},{id:'w9',from:'to.o',to:'arr',t:'u16[]'}]},
 sim:{live:true,step(i){const a=[];for(let k=0;k<Math.max(0,Math.min(i.n,32));k++)a.push(((4096+2*(i.start+k))&0xFFFF).toString(16).toUpperCase());return {out:{arr:a},vals:{n:i.n,start:i.start,'to.o':a}};}}
};
L.push({id:'L07',order:7,no:'7',part:'LabVIEW 基礎',title:'Array 與 For Loop：一個字拆成 16 個燈',mins:55,files:['練習\\L07_Bits.vi','練習\\L07_D106.vi','練習\\L07_ForLoop.vi'],
goals:[['學會','陣列控制項、Index Array、Build Array、數字與 Boolean 陣列互轉、For Loop 和自動索引。'],['做出','D230 → 16 顆 X 燈；5 個按鈕 → D106 的值；用 For Loop 算一串位址。'],['用在專案','I/O 監視頁、Start/Stop/Home 命令、讀回資料的解析。']],
check:'D230 = 0B54h 時 X2、X4、X6、X10、X11、X13 亮；按 Home 時 D106 Value = 4。',
body:[
C.h3('懂','','陣列：同型別的資料排成一列，索引從 0 開始'),
`<p>PLC 把 16 個輸入點 X0～X17 打包成一個字 D230（<code>MOV K4X000 D230</code>）。位元 0 是 X0、位元 1 是 X1……注意 FX 的 X 是八進位編號，所以<b>位元 8 是 X10</b>，不是 X8。</p>
<p>LabVIEW 的 ${fn('Programming','Boolean','Number To Boolean Array')} 把數字拆成 Boolean 陣列，<b>索引 0 = 最低位元</b>，剛好對應 X0。</p>`,
C.h3('做','b','跟著做 ①：L07_Bits.vi　D230 拆成 X 燈'),
{steps:{title:'Number To Boolean Array + Index Array',lv:xbits,steps:[
 {t:'前面板：U16 控制項（十六進位顯示）',view:'fp',add:['w'],h:`<p>Numeric Control <code>D230 (X word)</code>，Representation <b>U16</b>，Display Format 改 Hexadecimal（第 3 課）。預設值打 <code>0B54</code>。</p>`},
 {t:'方塊圖：Number To Boolean Array',view:'bd',add:['nb','w1'],h:`<p>${fn('Programming','Boolean','Number To Boolean Array')} ${qd('Number To Boolean')}，把 D230 接進去。</p>`},
 {t:'在輸出上 Create Indicator',view:'split',add:['arr','w2'],h:`<p>在 Number To Boolean Array 的輸出右鍵 ▸ Create Indicator，改名 <code>X bits</code>。前面板出現一個<b>陣列</b>：左邊是索引框，右邊是一顆 LED。</p><p>把陣列框的右下角往下拉，就能一次看到 16 顆。粗綠線 = Boolean 陣列。</p>`},
 {t:'用 Index Array 取出單一個點',view:'split',add:['ix','k4','w3','w4','part','w5'],h:`<p>${fn('Programming','Array','Index Array')} ${qd('Index Array')}：給陣列和索引，拿出那一格。</p>${wt([['Number To Boolean Array 的輸出','Index Array 的 array（分岔）'],['常數 4','Index Array 的 index'],['Index Array 的 element','Front Belt Part (X4)（Create Indicator）']])}<p class="qd">把 Index Array 往下拉長，可以一次取好幾個索引，第 15 課會這樣用。</p>`}
]}},
C.h3('做','b','跟著做 ②：L07_D106.vi　5 個按鈕變成一個命令字'),
`<p>反過來：PLC 的 D106 位元 0～4 = Start、Stop、Home、Reset、Clear Counts。把 5 個按鈕用 ${fn('Programming','Array','Build Array')} 排成陣列，再用 ${fn('Programming','Boolean','Boolean Array To Number')} 變成數字。</p>`,
{lv:cmdword,cap:'按按鈕看 D106 的值：Start = 1、Stop = 2、Home = 4、Reset = 8、Clear Counts = 16。Build Array 第一個輸入（最上面）是索引 0 = 位元 0。'},
{todo:[
 '前面板放 5 個 ${ctl("Modern","Boolean","OK Button")} 或 Push Button，標籤 Start、Stop、Home、Reset、Clear Counts，機械動作先用 Switch When Pressed 方便測試。'.replace('${ctl("Modern","Boolean","OK Button")}','OK Button'),
 '方塊圖放 Build Array，<b>把它的下緣往下拉</b>變成 5 個輸入，由上到下接 Start、Stop、Home、Reset、Clear Counts。',
 'Build Array → Boolean Array To Number → ' + fn('Programming','Numeric','Conversion','To Unsigned Word Integer') + '（輸出是 I32，轉成 U16 才符合 D 的型別）→ Indicator <code>D106 Value</code>。',
 '存成 <code>練習\\L07_D106.vi</code>，按 Home 時應該是 4。'
]},
C.h3('懂','','For Loop：跑固定次數，還會自動組陣列'),
`<p>${fn('Programming','Structures','For Loop')} 和 While Loop 很像，但跑幾次是左上角的 <b>N</b> 決定的。它最強的功能是<b>自動索引（Auto-indexing）</b>：</p>
<ul><li>陣列從外面接進 For Loop：每一圈自動取出一格（N 可以不接，陣列多長就跑幾圈）。</li><li>迴圈裡的值接到右邊框線：通道會變成 <code>[ ]</code> 圖示，跑完後自動組成陣列。</li></ul>
<p>下面的例子：從 Start D 開始，連續算 Count 個 D 的 FX 位址。</p>`,
{lv:forvi,cap:'右邊的 [ ] 通道是自動索引：4 圈的結果自動組成 4 格的陣列（粗藍線）。i 是 I32、Start D 是 U16，所以 Add 上有一個紅點；把 i 先轉 U16 就沒有了。'},
{todo:[
 '照上圖做 <code>練習\\L07_ForLoop.vi</code>：For Loop、N 接 <code>Count</code>（I32），Start D（U16）從左邊接進來。',
 '通道上右鍵看看：<b>從外面接進來的單一值</b>通道是實心方塊（不索引）；<b>往外接的</b>預設是 <code>[ ]</code>（Enable Indexing）。',
 '把結果陣列的顯示格式改成十六進位，Start D = 200、Count = 4：1190、1192、1194、1196。',
 '（想一想）如果右邊通道右鍵改成 <b>Disable Indexing</b>，會輸出什麼？答：只剩最後一圈的值。'
]},
C.h3('測','q','小測驗'),
{quiz:[
 {q:'D230 的 Boolean 陣列索引 9 是哪個輸入？',o:['X9','X11','X10'],a:1,ex:'索引 8 是 X10、9 是 X11（FX 的 X 編號是八進位，沒有 X8、X9）。X11 是右氣缸上限。'},
 {q:'只按下 Stop 和 Reset，D106 是多少？',o:['10','2 + 8 = 10','3'],a:1,ex:'Stop 是位元 1（值 2），Reset 是位元 3（值 8），合起來 10。'},
 {q:'For Loop 右邊的 [ ] 通道代表？',o:['每一圈的值組成陣列輸出','只輸出最後一圈','錯誤'],a:0,ex:'Auto-indexing 輸出通道。'}
]}
]});

/* ======================================================================
   第 8 課：Cluster 與 Type Def
   ====================================================================== */
const items=['Right Step','Left Step','Home Step','Right Count','Left Count','Cycles','Alarm Code','X','Y','Auto Running','Manual Mode','Homed','Alarm','E-Stop','Cycle Stopping','PLC Beat'];
const clu={name:'L08_Cluster.vi',view:'split',ratio:1.3,
 fp:{w:420,h:300,items:[
  {k:'clu',label:'Status (GT_Status.ctl)',x:16,y:26,w:200,h:258},
  ...['Right Step','Left Step','Home Step','Right Count','Left Count','Cycles','Alarm Code'].map((n,i)=>({id:'s'+i,k:'num',ctl:true,label:n,rep:'U16',x:26,y:34+i*34,w:80,v:[22,42,0,5,4,4,0][i]})),
  {k:'text',x:120,y:40,text:'… 還有 X、Y（Boolean 陣列）、\n Auto Running…、PLC Beat',color:'#6b4a2b'},
  {id:'rs',k:'num',label:'Right Step (unbundled)',x:250,y:30,w:90},
  {id:'ac',k:'num',label:'Alarm Code (unbundled)',x:250,y:90,w:90},
  {id:'cmd',k:'str',label:'Cmd cluster',x:250,y:170,w:150,rows:2}]},
 bd:{w:520,h:260,nodes:[
  {id:'st',k:'ctl',t:'clu',label:'Status',x:20,y:60},
  {id:'ub',k:'unbundle',items:['Right Step','Alarm Code'],x:110,y:50},
  {id:'rs',k:'ind',t:'u16',label:'Right Step',x:280,y:42},
  {id:'ac',k:'ind',t:'u16',label:'Alarm Code',x:280,y:92},
  {id:'cc',k:'ctl',t:'clu',label:'GT_Cmd (constant)',x:20,y:180},
  {id:'bb',k:'bundle',items:['D','Value'],x:170,y:160},
  {id:'k106',k:'const',t:'u16',v:106,x:110,y:176},
  {id:'k4',k:'const',t:'u16',v:4,x:120,y:198},
  {id:'cmd',k:'ind',t:'clu',label:'Cmd',x:330,y:180}],
  wires:[{id:'w1',from:'st',to:'ub.input cluster',t:'clu'},{id:'w2',from:'ub.Right Step',to:'rs',t:'u16'},{id:'w3',from:'ub.Alarm Code',to:'ac',t:'u16'},
   {id:'w4',from:'cc',to:'bb.input cluster',t:'clu',pts:[[60,190],[60,150],[213,150]]},{id:'w5',from:'k106',to:'bb.D',t:'u16'},{id:'w6',from:'k4',to:'bb.Value',t:'u16'},{id:'w7',from:'bb.output cluster',to:'cmd',t:'clu'}]},
 sim:{live:true,step(i){return {out:{rs:i.s0,ac:i.s6,cmd:'D = 106\nValue = 4'},vals:{'ub.Right Step':i.s0,'ub.Alarm Code':i.s6,k106:106,k4:4}};}}
};
L.push({id:'L08',order:8,no:'8',part:'LabVIEW 基礎',title:'Cluster 與 Type Def：把狀態打包',mins:50,files:['GT_Status.ctl','GT_Cmd.ctl','練習\\L08_Cluster.vi'],
goals:[['學會','Cluster、Bundle/Unbundle By Name、元素順序、Type Def 自訂型別。'],['做出','GT_Status.ctl（PLC 狀態全部打包）和 GT_Cmd.ctl（一筆命令 = D 位址 + 值）。'],['用在專案','讀回來的 42 個字變成一個 Status；按鈕命令以 GT_Cmd 放進佇列。']],
check:'GT_Status.ctl 有 16 個元素、名稱與課程一致；L08_Cluster.vi 用 Unbundle By Name 取出 Right Step 和 Alarm Code。',
body:[
C.h3('懂','','Cluster：不同型別的資料綁成一捆'),
`<p>陣列是「同型別排一列」，<b>Cluster</b> 是「不同型別綁一捆」，像 C 語言的 struct。雙線就是 Cluster。你已經見過一個：<b>Error Cluster</b>（status 布林、code 數字、source 字串）。</p>
<p>為什麼要打包？主程式要顯示 16 項狀態，如果每項拉一條線，方塊圖會變成義大利麵。打包成一條 Status 線，要用的時候再用名字拿出來。</p>
${C.table(['函式','選盤','用途'],[
 ['Bundle By Name',fn('Programming','Cluster, Class, & Variant','Bundle By Name'),'改 Cluster 裡指定名字的元素（上面要接一個原本的 Cluster 當樣板）'],
 ['Unbundle By Name',fn('Programming','Cluster, Class, & Variant','Unbundle By Name'),'用名字取出元素。往下拉可以一次取好幾個'],
 ['Bundle／Unbundle','同上','用位置取，元素順序一改就錯。<b>本課程一律用 By Name</b>']
])}`,
{lv:clu,cap:'上半：Unbundle By Name 從 Status 取出兩個元素。下半：Bundle By Name 做出一筆命令 {D = 106, Value = 4}（Home）。'},
C.h3('懂','','Type Def：型別只定義一次'),
`<p>Status 會出現在 GT_Parse.vi、GT_Monitor.vi、GT_Main.vi 好幾個地方。如果每個地方各做一個 Cluster，哪天加一個元素就要改好幾處，漏改就斷線。</p>
<p><b>Type Def（型別定義）</b>把 Cluster 存成一個 <code>.ctl</code> 檔，所有用到的地方都連結到它。改 .ctl，全部自動更新。</p>
<div class="note"><b>規則</b>會在 VI 之間傳來傳去的 Cluster，一律做成 Type Def。</div>`,
C.h3('做','b','跟著做：GT_Status.ctl'),
{todo:[
 'LabVIEW 選單 <b>File ▸ New…</b> ▸ <b>Other Files ▸ Custom Control</b>，按 OK。會開一個像前面板的視窗（沒有方塊圖）。',
 '視窗上方工具列的下拉選單（預設 Control）改成 <b>Type Def.</b>。',
 '放 ' + ctl('Modern','Array, Matrix & Cluster','Cluster') + '，拉大，標籤改 <code>Status</code>。',
 '往 Cluster 框裡面放 7 個 Numeric Indicator（都改 <b>U16</b>）：<code>Right Step</code>、<code>Left Step</code>、<code>Home Step</code>、<code>Right Count</code>、<code>Left Count</code>、<code>Cycles</code>、<code>Alarm Code</code>。',
 '放兩個 Boolean 陣列：先放 Array 外框，再丟一顆 Round LED 進去，標籤 <code>X</code>、<code>Y</code>。',
 '放 6 顆 Round LED：<code>Auto Running</code>、<code>Manual Mode</code>、<code>Homed</code>、<code>Alarm</code>、<code>E-Stop</code>、<code>Cycle Stopping</code>，最後一個 U16 數字 <code>PLC Beat</code>。',
 '在 Cluster 框上右鍵 ▸ <b>Reorder Controls In Cluster…</b>，確認順序就是上面的順序（By Name 雖然不靠順序，但順序整齊比較好讀）。',
 '在框上右鍵 ▸ Change to <b>Indicator</b>（Status 是用來顯示的）。另存 <code>我的雙龍門\\GT_Status.ctl</code>。',
 '同樣方法做 <code>GT_Cmd.ctl</code>：Cluster 標籤 <code>Cmd</code>，裡面兩個 U16 Control：<code>D</code>、<code>Value</code>。'
]},
`<div class="tip"><b>怎麼用 .ctl</b>在任何 VI 的前面板：Controls 選盤 ▸ <b>Select a Control…</b> 選 GT_Status.ctl。或把 .ctl 檔從檔案總管拖進前面板。方塊圖上 Type Def 的端子左上角會有一個小黑三角形。要做 Cmd 常數時，在 GT_Cmd 端子上右鍵 ▸ Create ▸ Constant。</div>`,
{todo:[
 '做 <code>練習\\L08_Cluster.vi</code>：前面板放 GT_Status.ctl（右鍵 ▸ Change to Control 才能輸入測試值）。',
 '方塊圖：Status → Unbundle By Name。放下時只有一個元素，點元素名稱可以選；往下拉成兩格，選 Right Step、Alarm Code，各自 Create Indicator。',
 '下面：GT_Cmd 常數 → Bundle By Name（拉成兩格選 D、Value），接 U16 常數 106 和 4，輸出 Create Indicator。',
 'Run，確認兩個 Indicator 的值和 Status 裡的一樣。'
]},
C.h3('測','q','小測驗'),
{quiz:[
 {q:'Status 加了一個新元素，用 Type Def 的好處是？',o:['所有用到 Status 的 VI 自動更新','VI 會跑比較快','不用存檔'],a:0,ex:'Type Def 的意義就是「改一處，全部跟著改」。'},
 {q:'為什麼本課程用 Unbundle By Name 而不是 Unbundle？',o:['By Name 比較快','By Name 用名字取，元素順序改了也不會取錯','Unbundle 不能用在 Type Def'],a:1,ex:'用位置取（Unbundle）在元素順序改變時會默默接錯，很難發現。'},
 {q:'Bundle By Name 上面那個輸入要接什麼？',o:['什麼都不用接','一個同型別的 Cluster 當樣板（例如 GT_Cmd 常數）','錯誤線'],a:1,ex:'Bundle By Name 是「修改」現有 Cluster 的元素，所以要有一個原本的 Cluster。'}
]}
]});
})();
