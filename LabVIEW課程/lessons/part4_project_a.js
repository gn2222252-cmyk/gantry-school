/* 第四部分 A：完整專案（第 15～17 課） */
(function(){
const L=window.LESSONS,fn=C.fn,ctl=C.ctl,qd=C.qd,wt=C.wt,FX=C.FX;

/* ======================================================================
   第 15 課：GT_Parse.vi + GT_Monitor.vi
   ====================================================================== */
const IDX=[0,1,2,10,11,12,20,41,30,31,32];
const NAMES=['Right Step','Left Step','Home Step','Right Count','Left Count','Cycles','Alarm Code','PLC Beat'];
const BITN=['Auto Running','Manual Mode','Homed','Alarm','E-Stop','Cycle Stopping'];
const BUN=[...NAMES,'X','Y',...BITN];
function parseVI(){
  const ixY=20,ixH=240,nodes=[],wires=[];
  nodes.push({id:'w',k:'ctl',t:'u16[]',label:'Words (42)',x:14,y:ixY+Math.round(ixH/13)-10});
  const ins=['array',...IDX.map(i=>'i'+i)],outs=IDX.map(i=>'e'+i);
  nodes.push({id:'ix',k:'fn',fn:'Index Array',ins,outs,x:150,y:ixY,h:ixH,w:34,g:'[i]'});
  wires.push({id:'ww',from:'w',to:'ix.array',t:'u16[]'});
  IDX.forEach((v,k)=>{const y=ixY+Math.round(ixH*(k+2)/13);nodes.push({id:'c'+v,k:'const',t:'i32',v,x:110,y:y-9,w:26});wires.push({id:'wc'+v,from:'c'+v,to:'ix.i'+v,t:'i32'});});
  nodes.push({id:'tc',k:'ctl',t:'clu',label:'GT_Status (constant)',x:500,y:14,w:30});
  nodes.push({id:'bb',k:'bundle',items:BUN,x:540,y:40,w:104});
  wires.push({id:'wt',from:'tc',to:'bb.input cluster',t:'clu',pts:[[592,24]]});
  NAMES.forEach((n,k)=>wires.push({id:'wn'+k,from:'ix.e'+IDX[k],to:'bb.'+n,t:'u16',mx:250+k*6}));
  const ox=ixY;const eY=k=>ixY+Math.round(ixH*(k+1)/12);
  nodes.push({id:'nx',k:'fn',fn:'Number To Boolean Array',x:330,y:eY(8)+20,showName:false});
  nodes.push({id:'ny',k:'fn',fn:'Number To Boolean Array',x:330,y:eY(9)+48,showName:false});
  nodes.push({id:'ns',k:'fn',fn:'Number To Boolean Array',x:250,y:eY(10)+70,showName:false});
  nodes.push({id:'ix2',k:'fn',fn:'Index Array',ins:['array'],outs:BITN,x:320,y:eY(10)+50,h:96,w:34,g:'[i]'});
  wires.push({id:'wx1',from:'ix.e30',to:'nx',t:'u16',mx:210},{id:'wy1',from:'ix.e31',to:'ny',t:'u16',mx:220},{id:'ws1',from:'ix.e32',to:'ns',t:'u16',mx:230});
  wires.push({id:'wx2',from:'nx.Boolean array',to:'bb.X',t:'bool[]',mx:470},{id:'wy2',from:'ny.Boolean array',to:'bb.Y',t:'bool[]',mx:480},{id:'ws2',from:'ns.Boolean array',to:'ix2.array',t:'bool[]'});
  BITN.forEach((n,k)=>wires.push({id:'wb'+k,from:'ix2.'+n,to:'bb.'+n,t:'bool',mx:400+k*10}));
  nodes.push({id:'st',k:'ind',t:'clu',label:'Status',x:690,y:150});
  wires.push({id:'wo',from:'bb.output cluster',to:'st',t:'clu'});
  return {w:760,h:420,nodes,wires};
}
const parse={name:'GT_Parse.vi',view:'bd',bd:parseVI(),
 sim:{step(){const g=C.Gantry();g.d[106]=4;for(let k=0;k<12;k++)g.tick();const w=g.words(200,42);const v={w};IDX.forEach(i=>v['ix.e'+i]=w[i]);return {vals:v};}}};

function statusItems(x,y){ // 前面板上的 Status Cluster 顯示
  return [{k:'clu',label:'Status',x,y,w:350,h:262},
   ...NAMES.map((n,k)=>({id:'s_'+k,k:'num',label:n,x:x+10+(k%2)*170,y:y+8+Math.floor(k/2)*42,w:80})),
   ...BITN.map((n,k)=>({id:'b_'+k,k:'led',label:n,x:x+10+(k%3)*112,y:y+180+Math.floor(k/3)*0,color:k>=3&&k<5?'red':(k===5?'yel':null)}))];
}
const monitor={name:'GT_Monitor.vi',view:'split',ratio:1.5,
 fp:{w:390,h:420,items:[
  {id:'res',k:'visa',label:'PLC Port',x:16,y:10,w:240,v:'TCPIP0::127.0.0.1::5551::SOCKET',options:['TCPIP0::127.0.0.1::5551::SOCKET','COM3']},
  ...statusItems(16,80),
  {id:'rtxt',k:'str',label:'Right Step Text',x:16,y:356,w:150},
  {id:'stop',k:'btn',label:'stop',text:'STOP',x:300,y:16,stop:true},
  {id:'simH',k:'btn',label:'（軟 PLC 上的）原點',x:200,y:370},{id:'simS',k:'btn',label:'啟動',x:330,y:370},
  {id:'simP',k:'btn',label:'放工件',x:200,y:400,showLabel:false,text:'放工件'}]},
 bd:{w:900,h:300,structs:[{id:'wl',k:'while',x:170,y:20,w:620,h:260}],
  nodes:[
  {id:'res',k:'ctl',t:'visa',label:'PLC Port',x:14,y:44},{id:'kf',k:'const',t:'bool',v:false,x:30,y:84},
  {id:'open',k:'sub',name:'FX_Open.vi',top:'FX',icon:['OPEN'],ins:['Resource','Serial (COM)?'],outs:['VISA out'],err:true,x:80,y:40},
  {id:'srv',k:'sr',t:'visa',s:'wl',y:60},{id:'sre',k:'sr',t:'err',s:'wl',y:110},
  {id:'k200',k:'const',t:'u16',v:200,x:200,y:84},{id:'k30',k:'const',t:'u16',v:30,x:210,y:104},
  {id:'r1',k:'sub',name:'FX_ReadD.vi',top:'FX',icon:['READ D'],ins:['VISA in','D','Count'],outs:['VISA out','Words'],err:true,x:260,y:50},
  {id:'k230',k:'const',t:'u16',v:230,x:330,y:150},{id:'k12',k:'const',t:'u16',v:12,x:340,y:170},
  {id:'r2',k:'sub',name:'FX_ReadD.vi',top:'FX',icon:['READ D'],ins:['VISA in','D','Count'],outs:['VISA out','Words'],err:true,x:390,y:50},
  {id:'ba',k:'fn',fn:'Build Array',ins:['array 1','array 2'],x:470,y:150,name:'Build Array（Concatenate Inputs）'},
  {id:'gp',k:'sub',name:'GT_Parse.vi',top:'GT',icon:['PARSE'],ins:['Words'],outs:['Status'],x:560,y:140,color:'#0b8a5f'},
  {id:'st',k:'ind',t:'clu',label:'Status',x:660,y:120},
  {id:'ub',k:'unbundle',items:['Right Step'],x:640,y:190,w:80},
  {id:'stx',k:'sub',name:'GT_StepText.vi',top:'GT',icon:['STEP'],ins:['Step'],outs:['Step Text'],x:640,y:222,color:'#0b8a5f',w:40,h:40},
  {id:'rt',k:'ind',t:'str',label:'Right Step Text',x:700,y:236},
  {id:'k2',k:'const',t:'i32',v:200,x:200,y:240},{id:'wait',k:'fn',fn:'Wait (ms)',x:250,y:232,showName:false},
  {id:'stop',k:'ctl',t:'bool',label:'stop',x:600,y:150,w:30},{id:'or',k:'fn',fn:'Or',x:700,y:20,showName:false},
  {id:'cond',k:'stop',s:'wl'},
  {id:'cl',k:'fn',fn:'VISA Close',x:810,y:60,showName:false},{id:'seh',k:'fn',fn:'Simple Error Handler',x:840,y:130,showName:false}],
  wires:[{id:'w1',from:'res',to:'open.Resource',t:'visa'},{id:'w2',from:'kf',to:'open.Serial (COM)?',t:'bool'},
   {id:'w3',from:'open.VISA out',to:'srv.init',t:'visa'},{id:'w4',from:'open.error out',to:'sre.init',t:'err',mx:150},
   {id:'w5',from:'srv.L',to:'r1.VISA in',t:'visa'},{id:'w6',from:'k200',to:'r1.D',t:'u16',mx:245},{id:'w7',from:'k30',to:'r1.Count',t:'u16',mx:250},{id:'w8',from:'sre.L',to:'r1.error in',t:'err',mx:240},
   {id:'w9',from:'r1.VISA out',to:'r2.VISA in',t:'visa'},{id:'w10',from:'k230',to:'r2.D',t:'u16',mx:375},{id:'w11',from:'k12',to:'r2.Count',t:'u16',mx:380},{id:'w12',from:'r1.error out',to:'r2.error in',t:'err'},
   {id:'w13',from:'r1.Words',to:'ba.array 1',t:'u16[]',mx:320,pts:[[320,77],[320,140],[450,140],[450,161]]},{id:'w14',from:'r2.Words',to:'ba.array 2',t:'u16[]',mx:455},
   {id:'w15',from:'ba.appended array',to:'gp.Words',t:'u16[]'},{id:'w16',from:'gp.Status',to:'st',t:'clu',mx:630},{id:'w17',from:'gp.Status',to:'ub.input cluster',t:'clu',mx:625},
   {id:'w18',from:'ub.Right Step',to:'stx.Step',t:'u16',pts:[[724,204],[724,218],[632,218],[632,242]]},{id:'w19',from:'stx.Step Text',to:'rt',t:'str',mx:690},
   {id:'w20',from:'r2.VISA out',to:'srv.R',t:'visa'},{id:'w21',from:'r2.error out',to:'sre.R',t:'err',mx:500},
   {id:'w22',from:'k2',to:'wait',t:'i32'},
   {id:'w23',from:'stop',to:'or.y',t:'bool',mx:680},{id:'w24',from:'r2.error out',to:'or.x',t:'err',pts:[[470,27]],coerce:true},
   {id:'w25',from:'or.out',to:'cond',t:'bool',pts:[[770,34],[770,258]]},
   {id:'w26',from:'srv.out',to:'cl',t:'visa'},{id:'w27',from:'sre.out',to:'seh',t:'err',mx:830}]},
 sim:{period:200,init(){return {g:C.Gantry()};},step(i,st){const g=st.g;if(i.simH)g.write(106,4);if(i.simS)g.write(106,1);if(i.simP)g.parts.front++;g.tick();
   const w=g.words(200,42),sw=w[32];const out={rtxt:C.STEP[w[0]]||'Unknown'};[0,1,2,10,11,12,20,41].forEach((ix,k)=>out['s_'+k]=w[ix]);BITN.forEach((n,k)=>out['b_'+k]=!!(sw>>k&1));
   return {out,stop:!!i.stop,vals:{'r1.Words':w.slice(0,30),'r2.Words':w.slice(30),'ba.appended array':w,'ub.Right Step':w[0],'stx.Step Text':out.rtxt},msg:'每 200 ms 讀兩次、更新一次'};}}
};
L.push({id:'L15',order:15,no:'15',part:'完整專案',title:'GT_Parse 與 GT_Monitor：第一個看得到機台的程式',mins:70,files:['GT_Parse.vi','GT_Monitor.vi'],
goals:[['學會','展開的 Index Array、Bundle By Name 填 Type Def、Build Array 串接、錯誤停止迴圈。'],['做出','GT_Parse.vi（42 個字 → Status）和 GT_Monitor.vi（一直讀 PLC 並顯示）。'],['用在專案','GT_Main 的通訊迴圈就是 GT_Monitor 再加上「寫命令」。']],
check:'GT_Monitor.vi 開著，在軟 PLC 按「原點」：Home Step 跑 10～13、Homed 亮；放工件再按「啟動」：Auto Running 亮、Right Step Text 跟著變。按 STOP 程式正常結束。',
body:[
C.h3('懂','','42 個字，哪一格是什麼'),
`<p>通訊迴圈每次讀 D200 起 30 個 + D230 起 12 個，接起來是 42 個 U16。<b>陣列索引 = D 編號 − 200</b>：</p>
${C.table(['索引','D','Status 元素','索引','D','Status 元素'],[
 ['0','D200','Right Step','20','D220','Alarm Code'],['1','D201','Left Step','30','D230','X（拆成 16 個 Boolean）'],['2','D202','Home Step','31','D231','Y（拆成 16 個 Boolean）'],
 ['10','D210','Right Count','32','D232','位元 0～5 → Auto Running、Manual Mode、Homed、Alarm、E-Stop、Cycle Stopping'],['11','D211','Left Count','41','D241','PLC Beat'],['12','D212','Cycles','','','']])}`,
C.h3('做','b','跟著做 ①：GT_Parse.vi'),
{lv:parse,cap:'Index Array 往下拉長成 11 個輸出，每個 index 接常數。D232 拆成 Boolean 陣列後，再用一個 Index Array <b>不接 index</b>：沒接的 index 會自動依序取 0、1、2…，剛好取出位元 0～5。最後 Bundle By Name 全部填進 GT_Status。'},
{todo:[
 '開新 VI 存 <code>我的雙龍門\\GT_Parse.vi</code>。前面板：U16 陣列 Control <code>Words</code>；Select a Control… 選 <b>GT_Status.ctl</b>（它本來就是 Indicator）。',
 '方塊圖：Index Array 拉成 11 格，index 接常數 0、1、2、10、11、12、20、41、30、31、32。',
 '在 Status 端子上右鍵 ▸ Create ▸ <b>Constant</b>，得到一個 GT_Status 常數，接到 Bundle By Name 上面的 input cluster。',
 'Bundle By Name 拉成 16 格，逐格點名稱選元素，照上圖接好。',
 'D230、D231 → Number To Boolean Array → X、Y。D232 → Number To Boolean Array → Index Array（拉成 6 格，不接 index）→ 6 個燈。',
 'Bundle 的輸出接 Status。Connector：左上 Words，右上 Status。Icon <code>GT</code>/<code>PARSE</code>。'
]},
C.h3('做','b','跟著做 ②：GT_Monitor.vi'),
{lv:monitor,cap:'網頁模擬：Run → 按「（軟 PLC 上的）原點」看 Home Step 和 Homed → 按「放工件」再按「啟動」。迴圈的停止條件是「STOP 被按」或「通訊出錯」。'},
{todo:[
 '開新 VI 存 <code>我的雙龍門\\GT_Monitor.vi</code>。前面板：VISA Resource Name <code>PLC Port</code>（預設 TCP 那串）；GT_Status.ctl；String Indicator <code>Right Step Text</code>；STOP 按鈕。',
 '迴圈外：FX_Open。迴圈加兩個 Shift Register：一個放 VISA 線，一個放錯誤線。',
 '迴圈裡：FX_ReadD（200, 30）→ FX_ReadD（230, 12），紫色線和錯誤線串起來，回到右邊的 Shift Register。',
 '' + fn('Programming','Array','Build Array') + '：拉成兩格，兩個輸入都接陣列，然後<b>在 Build Array 上右鍵 ▸ Concatenate Inputs</b>。不勾的話會變成 2D 陣列！',
 'Build Array → GT_Parse → Status。Unbundle By Name 取 Right Step → GT_StepText → Right Step Text。',
 '停止條件：錯誤線接 Unbundle By Name 取出 <code>status</code>，和 STOP 一起接 ' + fn('Programming','Boolean','Or') + '，Or 接 Loop Condition。（錯誤線也可以直接接 Loop Condition，但這裡要和 STOP 合併，所以先取出 status。）',
 'Wait (ms) 200。迴圈外：VISA Close → Simple Error Handler。',
 '開軟 PLC，Run。在軟 PLC 視窗按「原點（M102）」、「前輸送帶放工件」、「啟動（M100）」，看你的面板。'
]},
C.real('GT_Parse','參考答案用位置式的 Bundle（右邊那一長條）代替 Bundle By Name，因為腳本無法選 By Name 的元素名稱；效果一樣。課文的 By Name 寫法比較好讀，照課文寫。'),C.real('GT_Monitor'),
`<div class="tip"><b>里程碑</b>GT_Monitor.vi 已經是一個完整、可交付的「監看程式」：開機、連線、一直讀、出錯會停、按 STOP 會關埠。接下來把「寫命令」加進來，就是完整的上位機。</div>`,
C.h3('測','q','小測驗'),
{quiz:[
 {q:'Build Array 兩個 1D 陣列沒有勾 Concatenate Inputs，結果是？',o:['42 個元素的 1D 陣列','2 × 30 的 2D 陣列','錯誤'],a:1,ex:'沒勾時 Build Array 會把兩個陣列當成兩列，組成 2D（短的補 0）。線會變成雙粗線。'},
 {q:'Alarm Code 在 42 個字的第幾格？',o:['20','220','2'],a:0,ex:'D220 − 200 = 20。'},
 {q:'Index Array 拉長後，index 都不接，輸出是？',o:['全部是第 0 格','依序第 0、1、2… 格','錯誤'],a:1,ex:'沒接的 index 自動接續上一個 + 1。'}
]}
]});

/* ======================================================================
   第 16 課：雙迴圈與 Queue
   ====================================================================== */
const pc={name:'GT_Main.vi（第一版：雙迴圈骨架）',view:'bd',
 bd:{w:960,h:560,structs:[
   {id:'ui',k:'while',x:190,y:30,w:560,h:200,name:'UI 迴圈（Producer）：讀按鈕 → 放進佇列'},
   {id:'cu',k:'case',x:330,y:60,w:240,h:110,frames:['False','True'],cur:1},
   {id:'cm',k:'while',x:190,y:280,w:620,h:250,name:'通訊迴圈（Consumer）：取命令 → 寫 PLC → 讀狀態'},
   {id:'cc',k:'case',x:330,y:300,w:210,h:110,frames:['True','False'],cur:1}],
  nodes:[
  {id:'tc',k:'ctl',t:'clu',label:'GT_Cmd 常數',x:14,y:150,w:30},
  {id:'oq',k:'fn',fn:'Obtain Queue',x:70,y:150,ins:['element data type','error in'],outs:['queue out','error out'],h:44},
  {id:'res',k:'ctl',t:'visa',label:'PLC Port',x:14,y:330},
  {id:'open',k:'sub',name:'FX_Open.vi',top:'FX',icon:['OPEN'],ins:['Resource'],outs:['VISA out'],err:true,x:80,y:320},
  {id:'tq',k:'tunnel',t:'queue',s:'ui',side:'l',y:160},
  {id:'home',k:'ctl',t:'bool',label:'Home',x:230,y:105},{id:'sel',k:'sel',t:'bool',s:'cu',y:115},
  {id:'tq2',k:'tunnel',t:'queue',s:'cu',side:'l',y:150},
  {id:'k106',k:'const',t:'u16',v:106,x:360,y:76,f:'cu:True'},{id:'k4',k:'const',t:'u16',v:4,x:370,y:98,f:'cu:True'},
  {id:'bb',k:'bundle',items:['D','Value'],x:410,y:70,w:60,f:'cu:True'},
  {id:'ccst',k:'const',t:'clu',v:'GT_Cmd',x:390,y:40,f:'cu:True',w:46},
  {id:'enq',k:'fn',fn:'Enqueue Element',x:500,y:90,ins:['queue','element'],outs:['queue out'],h:44,f:'cu:True'},
  {id:'k50',k:'const',t:'i32',v:50,x:600,y:80},{id:'w50',k:'fn',fn:'Wait (ms)',x:640,y:72,showName:false},
  {id:'exit',k:'ctl',t:'bool',label:'Exit',x:640,y:180},{id:'c1',k:'stop',s:'ui'},
  {id:'tqo',k:'tunnel',t:'queue',s:'ui',side:'r',y:160},
  {id:'rq',k:'fn',fn:'Release Queue',x:790,y:150,ins:['queue'],outs:['error out'],h:32},
  {id:'tq3',k:'tunnel',t:'queue',s:'cm',side:'l',y:320},
  {id:'srv',k:'sr',t:'visa',s:'cm',y:450},
  {id:'k100',k:'const',t:'i32',v:100,x:210,y:340},
  {id:'dq',k:'fn',fn:'Dequeue Element',x:250,y:300,ins:['queue','timeout in ms'],outs:['element','timed out?','error out'],h:56},
  {id:'sel2',k:'sel',t:'bool',s:'cc',y:330},
  {id:'tce',k:'tunnel',t:'clu',s:'cc',side:'l',y:315},{id:'tcv',k:'tunnel',t:'visa',s:'cc',side:'l',y:390},
  {id:'ub',k:'unbundle',items:['D','Value'],x:360,y:322,w:56,f:'cc:False'},
  {id:'wd',k:'sub',name:'FX_WriteD.vi',top:'FX',icon:['WRITE D'],ins:['VISA in','D','Value'],outs:['VISA out'],x:450,y:340,f:'cc:False'},
  {id:'tco',k:'tunnel',t:'visa',s:'cc',side:'r',y:390},
  {id:'rd',k:'sub',name:'GT_Monitor 那段讀取',top:'FX',icon:['READ×2','PARSE'],ins:['VISA in'],outs:['VISA out','Status'],x:590,y:360,w:56,h:56},
  {id:'st',k:'ind',t:'clu',label:'Status',x:700,y:330},
  {id:'c2',k:'stop',s:'cm'},
  {id:'cl',k:'fn',fn:'VISA Close',x:840,y:440,showName:false},{id:'seh',k:'fn',fn:'Simple Error Handler',x:900,y:440,showName:false}],
  wires:[
  {id:'w1',from:'tc',to:'oq.element data type',t:'clu'},{id:'w2',from:'oq.queue out',to:'tq.o',t:'queue'},
  {id:'w3',from:'oq.queue out',to:'tq3.o',t:'queue',pts:[[150,161],[150,320]]},
  {id:'w4',from:'res',to:'open.Resource',t:'visa'},{id:'w5',from:'open.VISA out',to:'srv.init',t:'visa',pts:[[160,343],[160,450]]},
  {id:'w6',from:'home',to:'sel',t:'bool'},{id:'w7',from:'tq.i',to:'tq2.o',t:'queue'},
  {id:'w8',from:'ccst',to:'bb.input cluster',t:'clu',pts:[[440,49]]},{id:'w9',from:'k106',to:'bb.D',t:'u16'},{id:'w10',from:'k4',to:'bb.Value',t:'u16'},
  {id:'w11',from:'tq2.i',to:'enq.queue',t:'queue',f:'cu:True',mx:480},{id:'w12',from:'bb.output cluster',to:'enq.element',t:'clu',f:'cu:True'},
  {id:'w13',from:'k50',to:'w50',t:'i32'},{id:'w14',from:'exit',to:'c1',t:'bool'},
  {id:'w15',from:'tq.i',to:'tqo.i',t:'queue',pts:[[300,160],[300,215],[720,215],[720,160]]},
  {id:'w16',from:'tqo.o',to:'rq.queue',t:'queue',mx:775},
  {id:'w17',from:'tq3.i',to:'dq.queue',t:'queue',mx:230},{id:'w18',from:'k100',to:'dq.timeout in ms',t:'i32',mx:240},
  {id:'w19',from:'dq.timed out?',to:'sel2',t:'bool',mx:310},{id:'w20',from:'dq.element',to:'tce.o',t:'clu',mx:310},
  {id:'w21',from:'tce.i',to:'ub.input cluster',t:'clu',f:'cc:False',mx:350},{id:'w22',from:'ub.D',to:'wd.D',t:'u16',f:'cc:False'},{id:'w23',from:'ub.Value',to:'wd.Value',t:'u16',f:'cc:False'},
  {id:'w24',from:'srv.L',to:'tcv.o',t:'visa',mx:300},{id:'w25',from:'tcv.i',to:'wd.VISA in',t:'visa',f:'cc:False',mx:430},{id:'w26',from:'wd.VISA out',to:'tco.i',t:'visa',f:'cc:False'},
  {id:'w26t',from:'tcv.i',to:'tco.i',t:'visa',f:'cc:True'},
  {id:'w27',from:'tco.o',to:'rd.VISA in',t:'visa'},{id:'w28',from:'rd.Status',to:'st',t:'clu',mx:680},{id:'w29',from:'rd.VISA out',to:'srv.R',t:'visa',mx:760},
  {id:'w30',from:'dq.error out',to:'c2',t:'err',pts:[[320,346],[320,500],[760,500],[760,508]]},
  {id:'w31',from:'srv.out',to:'cl',t:'visa'},{id:'w32',from:'cl.error out',to:'seh',t:'err'}]}
};
L.push({id:'L16',order:16,no:'16',part:'完整專案',title:'雙迴圈與 Queue：按鈕和通訊分開跑',mins:70,files:['GT_Main.vi（第一版）'],
goals:[['學會','Producer/Consumer 架構、Obtain/Enqueue/Dequeue/Release Queue、佇列逾時、用佇列失效結束迴圈。'],['做出','GT_Main.vi 第一版：UI 迴圈按 Home 送命令、通訊迴圈寫命令並讀狀態。'],['用在專案','這就是完成品的骨架，後面幾課都是往這兩個迴圈裡加東西。']],
check:'GT_Main 第一版：按 Home 軟 PLC 會回原點、Status 會更新；按 Exit 兩個迴圈都停、程式正常結束，沒有錯誤對話框。',
body:[
C.h3('懂','','為什麼一個迴圈不夠'),
`<p>GT_Monitor 只有一個迴圈，每 200 ms 讀一次。如果把按鈕也放進去：</p>
<ul><li>按鈕反應要等通訊做完，最慢 200 ms 以上才有反應。</li><li>通訊卡住（逾時 2 秒），整個畫面也跟著卡住。</li><li>想加「寫參數、心跳、點動」，全部塞在一圈裡，很快就看不懂。</li></ul>
<p>工業上的標準做法是 <b>Producer/Consumer（生產者／消費者）</b>：</p>
${C.table(['迴圈','做什麼','速度'],[['UI 迴圈（Producer）','看按鈕，有事就把「命令」放進佇列','50 ms，反應快'],['通訊迴圈（Consumer）','從佇列拿命令寫給 PLC；沒有命令時就讀狀態','約 100～200 ms，唯一碰 VISA 的地方']])}
<div class="note"><b>Queue 佇列</b>就像一條輸送帶：UI 迴圈把命令一個個放上去（Enqueue），通訊迴圈從另一頭一個個拿（Dequeue）。<b>先放先拿、一個都不會掉</b>。兩個迴圈不用等對方。</div>`,
C.table(['函式','選盤','重點'],[
 ['Obtain Queue',fn('Programming','Synchronization','Queue Operations','Obtain Queue'),'迴圈外建立佇列。<b>element data type</b> 接 GT_Cmd 常數，佇列就只能放 GT_Cmd'],
 ['Enqueue Element','同上','把一筆命令放進去'],
 ['Dequeue Element','同上','拿一筆。<b>timeout in ms 接 100</b>：100 ms 內沒有命令就回 timed out? = True，不會一直卡著等'],
 ['Release Queue','同上','銷毀佇列。之後還在等這個佇列的 Dequeue 會<b>立刻回傳錯誤</b>——我們就用這個讓通訊迴圈結束']
]),
C.h3('看','r','GT_Main 第一版的方塊圖'),
{lv:pc,cap:'上面是 UI 迴圈，下面是通訊迴圈，中間用一條青色的佇列線連接。點兩個 Case 的 ◀ ▶ 看另一頁：UI 的 False 頁和通訊的 True 頁（逾時）都只是把線穿過去。'},
C.h3('做','b','跟著做：GT_Main.vi 第一版'),
{todo:[
 '開新 VI 存 <code>我的雙龍門\\GT_Main.vi</code>。前面板：PLC Port（VISA）、Home 按鈕（Latch When Released）、Exit 按鈕（Latch When Released）、GT_Status.ctl。',
 '左邊初始化：GT_Cmd 常數（前面板沒有 GT_Cmd 的話，從 Select a VI 放 GT_Cmd.ctl 也行，或在 Bundle 上建立）→ Obtain Queue 的 element data type。FX_Open。',
 '<b>UI 迴圈</b>：佇列線從左邊進來。Home 接 Case；True 頁：GT_Cmd 常數 → Bundle By Name（D = 106、Value = 4）→ Enqueue Element。False 頁佇列線穿過。Wait 50 ms。Exit 接 Loop Condition。',
 'UI 迴圈右邊把佇列線接出來 → <b>Release Queue</b>。這保證「UI 迴圈結束之後才釋放佇列」。',
 '<b>通訊迴圈</b>：佇列線分岔從左邊進來；VISA 線用 Shift Register。Dequeue Element，timeout 接 100。',
 'timed out? 接 Case。<b>False 頁</b>（有命令）：Unbundle By Name 取 D、Value → FX_WriteD。<b>True 頁</b>：VISA 線穿過。',
 'Case 之後：把 GT_Monitor 迴圈裡那一段（兩個 FX_ReadD、Build Array、GT_Parse）複製過來 → Status。',
 '<b>停止條件</b>：Dequeue 的 error out 直接接到 Loop Condition（錯誤線可以直接接）。佇列被釋放時這裡會出錯，迴圈就停了。',
 '迴圈外：VISA Close → Simple Error Handler。（Dequeue 那個「佇列已釋放」的錯誤不要接進 Simple Error Handler，否則每次結束都會跳出 1122 錯誤。）',
 '開軟 PLC，Run → 按 Home → 按 Exit。'
]},
`<div class="warn"><b>通訊迴圈不要放 Wait (ms)</b>Dequeue 的 100 ms timeout 本身就是等待：沒有命令時剛好每 100 ms 讀一次狀態，有命令時立刻處理。再加 Wait 只會讓命令變慢。</div>`,
C.h3('懂','','結束順序（很重要）'),
`<ol><li>按 Exit → UI 迴圈這圈結束。</li><li>Release Queue 執行（它在等 UI 迴圈的佇列線）。</li><li>通訊迴圈的 Dequeue 立刻回傳錯誤 → Loop Condition 收到 → 通訊迴圈結束。</li><li>VISA Close 關埠（它在等通訊迴圈的 VISA 線）。</li></ol>
<p>整個順序完全靠<b>資料流（線）</b>決定，不需要任何「等一下」。第 19 課會在第 3、4 步之間加上「寫 D240 = 0 告訴 PLC：HMI 下線了」。</p>`,
C.h3('測','q','小測驗'),
{quiz:[
 {q:'Release Queue 為什麼要接 UI 迴圈「出來」的佇列線，而不是 Obtain Queue 直接出來的線？',o:['看起來比較整齊','資料流：要等 UI 迴圈結束才會執行；接 Obtain 的線會在一開始就釋放','沒差'],a:1,ex:'接 Obtain 那條線的話，Release Queue 一開始就有資料，馬上執行，佇列直接沒了。'},
 {q:'Dequeue Element 的 timeout 接 -1 會怎樣？',o:['一直等到有命令，沒人按按鈕就永遠不讀狀態','每 1 ms 讀一次','錯誤'],a:0,ex:'-1 = 永遠等待。我們要的是「沒命令也要定時讀狀態」，所以接 100。'},
 {q:'為什麼只有通訊迴圈碰 VISA？',o:['VISA 不能平行使用','兩個迴圈同時讀寫同一個埠，封包會交錯混在一起','規定'],a:1,ex:'一問一答的協定，同一時間只能有一組封包在線上。'}
]}
]});

/* ======================================================================
   第 17 課：按鈕命令
   ====================================================================== */
const pulseVI={name:'UI 迴圈：D106 脈衝命令',view:'split',ratio:1.7,
 fp:{w:240,h:250,items:[...['Start','Stop','Home','Reset','Clear Counts'].map((n,i)=>({id:'b'+i,k:'btn',label:n,x:20,y:16+i*40})),{id:'q',k:'str',label:'佇列裡的命令',x:130,y:16,w:100,rows:9}]},
 bd:{w:720,h:250,structs:[{id:'cs',k:'case',x:400,y:40,w:200,h:150,frames:['False','True'],cur:1}],
  nodes:[...['Start','Stop','Home','Reset','Clear Counts'].map((n,i)=>({id:'b'+i,k:'ctl',t:'bool',label:n,x:20,y:20+i*44})),
  {id:'ba',k:'fn',fn:'Build Array',x:130,y:28,h:190,ins:['element 0','element 1','element 2','element 3','element 4']},
  {id:'bn',k:'fn',fn:'Boolean Array To Number',x:200,y:108,showName:false},{id:'u',k:'fn',fn:'To Unsigned Word Integer',x:270,y:110,showName:false},
  {id:'ne',k:'fn',fn:'Not Equal To 0?',x:340,y:140},{id:'sel',k:'sel',t:'bool',s:'cs',y:154},
  {id:'tv',k:'tunnel',t:'u16',s:'cs',side:'l',y:124},
  {id:'k106',k:'const',t:'u16',v:106,x:430,y:70,f:'cs:True'},
  {id:'bb',k:'bundle',items:['D','Value'],x:480,y:70,w:60,f:'cs:True'},
  {id:'enq',k:'fn',fn:'Enqueue Element',x:560,y:80,ins:['queue','element'],outs:['queue out'],h:44,f:'cs:True',showName:false}],
  wires:[...[0,1,2,3,4].map(i=>({id:'wb'+i,from:'b'+i,to:'ba.element '+i,t:'bool'})),{id:'w1',from:'ba.appended array',to:'bn',t:'bool[]'},{id:'w2',from:'bn.number',to:'u',t:'i32'},
   {id:'w3',from:'u.out',to:'ne',t:'u16',mx:320},{id:'w4',from:'ne.out',to:'sel',t:'bool'},{id:'w5',from:'u.out',to:'tv.o',t:'u16'},
   {id:'w6',from:'k106',to:'bb.D',t:'u16'},{id:'w7',from:'tv.i',to:'bb.Value',t:'u16',f:'cs:True',mx:450},{id:'w8',from:'bb.output cluster',to:'enq.element',t:'clu',f:'cs:True'}]},
 sim:{period:150,init(){return {q:[]};},step(i,st){let v=0;[0,1,2,3,4].forEach(k=>{if(i['b'+k])v|=1<<k;});if(v)st.q.push('{D 106, Value '+v+'}');
   return {out:{q:st.q.slice(-9).join('\n')},frames:{cs:v?1:0},vals:{'u.out':v,'ne.out':v!==0,'bn.number':v},msg:v?'放進佇列：D106 = '+v:'沒有按鈕：Case 走 False，什麼都不送'};}}
};
const jogVI={name:'UI 迴圈：D107 點動（有變化才送）',view:'split',ratio:1.7,
 fp:{w:250,h:270,items:[...['L Forward','L Rearward','L Down','L Up'].map((n,i)=>({id:'j'+i,k:'btn',label:n,mech:'hold',x:16,y:16+i*40})),{id:'j4',k:'btn',label:'L Vacuum',mech:'switch',lit:true,x:16,y:176},
  {id:'d107',k:'num',label:'D107 (hex)',hex:4,x:140,y:16,w:90},{id:'q',k:'str',label:'佇列裡的命令',x:140,y:76,w:100,rows:9}]},
 bd:{w:760,h:290,structs:[{id:'cs',k:'case',x:480,y:60,w:200,h:130,frames:['False','True'],cur:1}],
  nodes:[{id:'jarr',k:'label',text:'16 個輸入依位元順序：\nM110 L Forward … M114 L Vacuum\nM115～M119 補 F 常數\nM120 R Forward … M125 Conveyors',x:10,y:20,w:200,h:64},
  {id:'ba',k:'fn',fn:'Build Array',x:220,y:20,h:200,ins:['×16 個 Boolean'],g:'[+]\n×16'},
  {id:'bn',k:'fn',fn:'Boolean Array To Number',x:280,y:104,showName:false},{id:'u',k:'fn',fn:'To Unsigned Word Integer',x:340,y:106,showName:false},
  {id:'z',k:'const',t:'u16',v:0,x:20,y:240},{id:'sr',k:'label',text:'Shift Register（上一次送出的 D107）',x:60,y:236,w:230,h:22},
  {id:'last',k:'ctl',t:'u16',label:'上一次 (Shift Register 左)',x:340,y:180},
  {id:'ne',k:'fn',fn:'Not Equal?',x:410,y:140},{id:'sel',k:'sel',t:'bool',s:'cs',y:154},
  {id:'tv',k:'tunnel',t:'u16',s:'cs',side:'l',y:120},
  {id:'k107',k:'const',t:'u16',v:107,x:510,y:84,f:'cs:True'},{id:'bb',k:'bundle',items:['D','Value'],x:560,y:84,w:60,f:'cs:True'},
  {id:'enq',k:'fn',fn:'Enqueue Element',x:640,y:90,ins:['queue','element'],outs:['queue out'],h:44,f:'cs:True',showName:false},
  {id:'now',k:'ind',t:'u16',label:'存回 Shift Register 右',x:690,y:220}],
  wires:[{id:'w1',from:'ba.appended array',to:'bn',t:'bool[]'},{id:'w2',from:'bn.number',to:'u',t:'i32'},{id:'w3',from:'u.out',to:'ne.x',t:'u16',mx:390},{id:'w4',from:'last',to:'ne.y',t:'u16',mx:395},
   {id:'w5',from:'ne.out',to:'sel',t:'bool'},{id:'w6',from:'u.out',to:'tv.o',t:'u16'},{id:'w7',from:'k107',to:'bb.D',t:'u16'},{id:'w8',from:'tv.i',to:'bb.Value',t:'u16',f:'cs:True',mx:530},{id:'w9',from:'bb.output cluster',to:'enq.element',t:'clu',f:'cs:True'},
   {id:'w10',from:'u.out',to:'now',t:'u16',pts:[[380,120],[380,230]]}]},
 sim:{period:150,init(){return {q:[],last:0};},step(i,st){let v=0;[0,1,2,3,4].forEach(k=>{if(i['j'+k])v|=1<<k;});const ch=v!==st.last;if(ch){st.q.push('{D 107, Value '+v.toString(16).toUpperCase().padStart(4,'0')+'h}');}const prev=st.last;st.last=v;
   return {out:{d107:v,q:st.q.slice(-9).join('\n')},frames:{cs:ch?1:0},vals:{'u.out':v,last:prev,'ne.out':ch,now:v},msg:ch?'值變了 → 送一次':'值沒變 → 不送（按住不放也只送一次）'};}}
};
L.push({id:'L17',order:17,no:'17',part:'完整專案',title:'按鈕命令：D106 脈衝、D107 點動、參數',mins:70,files:['GT_Main.vi（加入全部命令）'],
goals:[['學會','把一群按鈕變成命令字、只在變化時送出、For Loop 一次送多筆、In Range and Coerce 限制範圍。'],['做出','完成品全部的命令：Start/Stop/Home/Reset/Clear、11 個手動點動、4 個參數。'],['用在專案','UI 迴圈完成。']],
check:'按住 L Forward：D107 送一次 0001h，放開送一次 0000h；Start/Stop/Home/Reset/Clear 都能在軟 PLC 看到效果；參數 Write 後軟 PLC 的 D100～D103 改變。',
body:[
C.h3('懂','','三種命令，三種送法'),
C.table(['命令','按鈕機械動作','什麼時候送','寫入'],[
 ['Start、Stop、Home、Reset、Clear Counts','Latch When Released','有按就送一次','D106 = 位元組合（PLC 收到會自己清 0）'],
 ['點動 L/R Forward、Rearward、Down、Up','Switch Until Released（按住）','<b>值有變化才送</b>：按下送一次、放開送一次','D107 = 16 位元組合'],
 ['吸盤、輸送帶','Switch When Pressed（切換）','同上（它們也在 D107 裡）','D107'],
 ['參數','Write 按鈕（Latch）','按 Write 時送 4 筆','D100～D103']
]),
C.h3('做','b','① D106：五個 Latch 按鈕'),
{lv:pulseVI,cap:'按任何一個按鈕：Build Array → Boolean Array To Number 得到命令字，不是 0 才放進佇列。Latch 按鈕被讀一次就彈回，所以下一圈自動變回 0，不會重複送。'},
{todo:[
 '把 GT_Main 原本的 Home 按鈕那段，改成上圖：5 個 Latch 按鈕（順序：Start、Stop、Home、Reset、Clear Counts = 位元 0～4）。',
 'Build Array（5 格）→ Boolean Array To Number → To Unsigned Word Integer → Not Equal To 0? → Case。',
 'True 頁：Bundle By Name（D = 106、Value = 命令字）→ Enqueue。'
]},
C.h3('做','b','② D107：點動「有變化才送」'),
`<p>點動是「按住才動」，按住時 PLC 的 D107 要一直是 1。如果每 50 ms 都送一次，佇列會塞滿、通訊忙不完。所以用第 5 課的技巧：<b>Shift Register 記住上次送出的值，不一樣才送</b>。</p>
${C.table(['D107 位元','M','按鈕','D107 位元','M','按鈕'],[
 ['0','M110','L Forward','10','M120','R Forward'],['1','M111','L Rearward','11','M121','R Rearward'],['2','M112','L Down','12','M122','R Down'],['3','M113','L Up','13','M123','R Up'],['4','M114','L Vacuum（切換）','14','M124','R Vacuum（切換）'],['5～9','M115～M119','（沒用，接 F 常數）','15','M125','Conveyors（切換）']])}
<div class="warn"><b>M 是十進位編號</b>M110～M125 是連續 16 個（M110…M119, M120…M125），所以 R Forward 是位元 10，不是位元 8。這和 X/Y 的八進位不一樣。</div>`,
{lv:jogVI,cap:'網頁模擬只放了左邊 5 個按鈕。按住 L Forward：只送一次 0001h；放開：再送一次 0000h。'},
{todo:[
 'Manual 用的 11 個按鈕：點動 8 個設 <b>Switch Until Released</b>，L Vacuum、R Vacuum、Conveyors 設 <b>Switch When Pressed</b>。',
 'Build Array 拉成 16 格，照上表順序接；位元 5～9 接 Boolean 常數 F。',
 'Boolean Array To Number → To Unsigned Word Integer → 和 Shift Register（初始值 U16 的 0）比 <b>Not Equal?</b> → Case True：Bundle（107, 值）→ Enqueue。',
 '目前的值接回右邊 Shift Register。'
]},
`<div class="why"><b>斷線時的保護</b>PLC 那邊也有保護：手動模式無效或 HMI 心跳停了，PLC 會自己把 D107 清 0，所以就算 LabVIEW 當掉、放開的命令沒送到，馬達也不會一直轉。上位機和 PLC 兩邊都要有保護。</div>`,
C.h3('做','b','③ 參數：按 Write 送 4 筆'),
C.table(['控制項','D','範圍','預設'],[['Vacuum Time (0.1 s)','D100','1～100','5'],['Release Time (0.1 s)','D101','1～100','5'],['Step Timeout (0.1 s)','D102','10～600','50'],['Target Cycles (0 = no limit)','D103','0～32767','0']]),
{todo:[
 '4 個 U16 Numeric Control（照上表命名、設預設值）和一個 <code>Write</code> 按鈕（Latch）。',
 'Write 接 Case。True 頁：4 個值各自經過 ' + fn('Programming','Comparison','In Range and Coerce') + '（upper/lower limit 照上表），把超出範圍的值夾回來。',
 'Build Array 組成 4 格陣列 → <b>For Loop</b>（自動索引，跑 4 圈）：D = 100 + i（i 要轉 U16）、Value = 這一格 → Bundle → Enqueue。',
 '這樣 4 筆命令會依序進佇列，通訊迴圈一筆一筆寫。'
]},
C.h3('做','b','④ Manual Allowed 燈'),
`<p>點動只在 PLC 允許時有效（手動模式、沒有自動運轉、沒有異常）。在通訊迴圈用 Status 算出 <code>Manual Allowed = Manual Mode AND (NOT Auto Running) AND (NOT Alarm)</code>，接到 Manual 頁的燈，讓操作員知道現在按有沒有用。真正的互鎖還是在 PLC。</p>`,
C.h3('測','q','小測驗'),
{quiz:[
 {q:'按住 R Down 不放 3 秒，佇列收到幾筆 D107 命令？',o:['60 筆','1 筆','0 筆'],a:1,ex:'值只在按下的瞬間改變一次。放開時再一筆。'},
 {q:'Conveyors 是 D107 的第幾位元？',o:['8','15','11'],a:1,ex:'M125 − M110 = 15。'},
 {q:'參數輸入 999 的 Step Timeout，In Range and Coerce（10～600）會輸出？',o:['999','600','0'],a:1,ex:'超過上限就夾在上限。'}
]}
]});
})();
