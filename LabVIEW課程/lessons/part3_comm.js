/* 第三部分：和 PLC 通訊（第 12～14 課） */
(function(){
const L=window.LESSONS,fn=C.fn,ctl=C.ctl,qd=C.qd,wt=C.wt,FX=C.FX;
const RES='TCPIP0::127.0.0.1::5551::SOCKET';
const ERR_OPEN={status:true,code:-1073807343,source:'VISA Open in FX_Open.vi（例：軟 PLC 沒開，連不上 5551 埠）'};
const ERR_TMO={status:true,code:-1073807339,source:'VISA Read（逾時：PLC 沒有回應）'};

/* ======================================================================
   第 12 課：VISA 與軟 PLC 連線
   ====================================================================== */
const openVI={name:'FX_Open.vi',view:'bd',
 bd:{w:620,h:250,structs:[{id:'cs',k:'case',x:160,y:30,w:320,h:190,frames:['False','True'],cur:0}],
  nodes:[
  {id:'res',k:'ctl',t:'visa',label:'Resource',x:20,y:60},
  {id:'ser',k:'ctl',t:'bool',label:'Serial (COM)?',x:20,y:120},{id:'sel',k:'sel',t:'bool',s:'cs',y:130},
  {id:'ei',k:'ctl',t:'err',label:'error in',x:20,y:190},
  {id:'tr',k:'tunnel',t:'visa',s:'cs',side:'l',y:70},{id:'te',k:'tunnel',t:'err',s:'cs',side:'l',y:200},
  {id:'op',k:'fn',fn:'VISA Open',x:270,y:80,f:'cs:False',ins:['VISA resource name','error in'],outs:['VISA resource name out','error out'],h:120},
  {id:'cfg',k:'fn',fn:'VISA Configure Serial Port',x:300,y:56,f:'cs:True',ins:['VISA resource name','baud rate','data bits','parity','stop bits','enable termination char','error in'],h:150},
  {id:'k1',k:'const',t:'u32',v:9600,x:220,y:80,f:'cs:True'},{id:'k2',k:'const',t:'u16',v:7,x:240,y:102,f:'cs:True'},
  {id:'k3',k:'const',t:'enum',v:'Even ▾',x:212,y:124,f:'cs:True'},{id:'k4',k:'const',t:'enum',v:'1.0 ▾',x:222,y:146,f:'cs:True'},{id:'k5',k:'const',t:'bool',v:false,x:250,y:168,f:'cs:True'},
  {id:'to',k:'tunnel',t:'visa',s:'cs',side:'r',y:70},{id:'toe',k:'tunnel',t:'err',s:'cs',side:'r',y:200},
  {id:'ro',k:'ind',t:'visa',label:'VISA out',x:540,y:60},{id:'eo',k:'ind',t:'err',label:'error out',x:540,y:190}],
  wires:[{id:'w1',from:'res',to:'tr.o',t:'visa'},{id:'w2',from:'ser',to:'sel',t:'bool'},{id:'w3',from:'ei',to:'te.o',t:'err'},
   {id:'f1',from:'tr.i',to:'op.VISA resource name',t:'visa',f:'cs:False',mx:240},{id:'f2',from:'te.i',to:'op.error in',t:'err',f:'cs:False',mx:240},
   {id:'f3',from:'op.VISA resource name out',to:'to.i',t:'visa',f:'cs:False',mx:420},{id:'f4',from:'op.error out',to:'toe.i',t:'err',f:'cs:False',mx:420},
   {id:'t1',from:'tr.i',to:'cfg.VISA resource name',t:'visa',f:'cs:True',mx:200},{id:'t0',from:'te.i',to:'cfg.error in',t:'err',f:'cs:True',mx:190},
   {id:'tk1',from:'k1',to:'cfg.baud rate',t:'u32',f:'cs:True'},{id:'tk2',from:'k2',to:'cfg.data bits',t:'u16',f:'cs:True'},{id:'tk3',from:'k3',to:'cfg.parity',t:'enum',f:'cs:True'},{id:'tk4',from:'k4',to:'cfg.stop bits',t:'enum',f:'cs:True'},{id:'tk5',from:'k5',to:'cfg.enable termination char',t:'bool',f:'cs:True'},
   {id:'t3',from:'cfg.VISA resource name out',to:'to.i',t:'visa',f:'cs:True',mx:420},{id:'t4',from:'cfg.error out',to:'toe.i',t:'err',f:'cs:True',mx:420},
   {id:'w4',from:'to.o',to:'ro',t:'visa'},{id:'w5',from:'toe.o',to:'eo',t:'err'}]}
};
const ping={name:'L12_Ping.vi',view:'split',ratio:1.7,
 fp:{w:300,h:270,items:[
  {id:'res',k:'visa',label:'Resource',x:16,y:16,w:250,v:RES,options:[RES,'COM3','COM4']},
  {id:'plc',k:'btn',label:'（網頁模擬用）軟 PLC 開著',mech:'switch',lit:true,x:16,y:66,v:true,showLabel:true},
  {id:'ok',k:'led',label:'PLC Answered',x:16,y:128},
  {id:'err',k:'err',label:'error out',x:120,y:120}]},
 bd:{w:760,h:200,nodes:[
  {id:'res',k:'ctl',t:'visa',label:'Resource',x:20,y:40},{id:'f',k:'const',t:'bool',v:false,x:40,y:80},
  {id:'open',k:'sub',name:'FX_Open.vi',top:'FX',icon:['OPEN'],ins:['Resource','Serial (COM)?'],outs:['VISA out'],err:true,x:90,y:36},
  {id:'enq',k:'const',t:'str',v:'05',hex:true,x:170,y:8,label:'ENQ'},
  {id:'wr',k:'fn',fn:'VISA Write',x:220,y:34},
  {id:'k1',k:'const',t:'i32',v:1,x:290,y:8},
  {id:'rd',k:'fn',fn:'VISA Read',x:330,y:34},
  {id:'ack',k:'const',t:'str',v:'06',hex:true,x:400,y:110,label:'ACK'},
  {id:'eq',k:'fn',fn:'Equal?',x:450,y:80},{id:'ok',k:'ind',t:'bool',label:'PLC Answered',x:520,y:84},
  {id:'cl',k:'fn',fn:'VISA Close',x:520,y:140},
  {id:'seh',k:'fn',fn:'Simple Error Handler',x:620,y:140},
  {id:'err',k:'ind',t:'err',label:'error out',x:690,y:100}],
  wires:[{id:'w1',from:'res',to:'open.Resource',t:'visa'},{id:'w2',from:'f',to:'open.Serial (COM)?',t:'bool'},
   {id:'w3',from:'open.VISA out',to:'wr.VISA resource name',t:'visa'},{id:'w4',from:'open.error out',to:'wr.error in',t:'err',mx:180},
   {id:'w5',from:'enq',to:'wr.write buffer',t:'str',mx:205},
   {id:'w6',from:'wr.VISA resource name out',to:'rd.VISA resource name',t:'visa'},{id:'w7',from:'wr.error out',to:'rd.error in',t:'err'},{id:'w8',from:'k1',to:'rd.byte count',t:'i32',mx:315},
   {id:'w9',from:'rd.read buffer',to:'eq.x',t:'str',mx:420},{id:'w10',from:'ack',to:'eq.y',t:'str',mx:435},{id:'w11',from:'eq.out',to:'ok',t:'bool'},
   {id:'w12',from:'rd.VISA resource name out',to:'cl.VISA resource name',t:'visa',mx:490},{id:'w13',from:'rd.error out',to:'cl.error in',t:'err',mx:500},
   {id:'w14',from:'cl.error out',to:'seh',t:'err'},{id:'w15',from:'seh.error out',to:'err',t:'err',mx:675}]},
 sim:{step(i){if(!i.plc)return {out:{ok:false,err:ERR_OPEN},vals:{'open.error out':ERR_OPEN,'wr.error out':ERR_OPEN,'rd.error out':ERR_OPEN,'rd.read buffer':'','eq.out':false,'cl.error out':ERR_OPEN,'seh.error out':ERR_OPEN},msg:'Simple Error Handler 跳出對話框：連不上'};
   const e={status:false,code:0,source:''};return {out:{ok:true,err:e},vals:{res:i.res,f:false,enq:'\x05',k1:1,ack:'\x06','open.VISA out':i.res,'open.error out':e,'wr.error out':e,'rd.read buffer':'\x06','eq.out':true,'rd.error out':e,'cl.error out':e,'seh.error out':e},msg:'PLC 回了 ACK'};}}
};
L.push({id:'L12',order:12,no:'12',part:'和 PLC 通訊',title:'VISA：第一次和軟 PLC 說話',mins:50,files:['FX_Open.vi','練習\\L12_Ping.vi'],
goals:[['學會','VISA 資源名稱、Open/Write/Read/Close、序列埠參數、TCP 模擬。'],['做出','FX_Open.vi 和 L12_Ping.vi：送 ENQ，收到 ACK 燈就亮。'],['用在專案','所有通訊都走這條 VISA 線；在家用 TCP，到工廠改 COM，程式不用改。']],
check:'軟 PLC 開著時 L12_Ping.vi 的 PLC Answered 亮、沒有錯誤；關掉軟 PLC 再跑會跳出錯誤對話框。',
body:[
C.h3('懂','','VISA：一套函式，什麼埠都能用'),
`<p><b>NI-VISA</b> 是 NI 的通訊函式庫。不管是 COM 序列埠、USB、還是網路 TCP，都用同樣的 Open → Write → Read → Close。差別只在<b>資源名稱</b>：</p>
${C.table(['資源名稱','是什麼','什麼時候用'],[
 ['<code>TCPIP0::127.0.0.1::5551::SOCKET</code>','本機 TCP 5551 埠（軟 PLC）','在家練習'],
 ['<code>COM3</code>（或 <code>ASRL3::INSTR</code>）','序列埠 COM3','到工廠接 FX3S 的 RS-422 埠（USB-SC09-FX 轉接線）']
])}
<p>軟 PLC 把 FX 編程協定開在 TCP 5551 埠，收到的封包和實機一樣處理，所以你的驅動在家測好，到工廠只要換資源名稱。</p>
${C.table(['函式','選盤','做什麼'],[
 ['VISA Open',fn('Instrument I/O','VISA','Advanced VISA','VISA Open'),'打開資源，輸出一條紫色的 VISA 線'],
 ['VISA Configure Serial Port',fn('Instrument I/O','Serial','VISA Configure Serial Port'),'設定 COM 的鮑率、資料位元、同位、停止位元（同時也會打開）'],
 ['VISA Write',fn('Instrument I/O','Serial','VISA Write'),'送出字串'],
 ['VISA Read',fn('Instrument I/O','Serial','VISA Read'),'讀 <b>byte count</b> 個位元組；等不到會在逾時（預設 2 秒）後出錯'],
 ['VISA Close',fn('Instrument I/O','Serial','VISA Close'),'關閉。<b>就算前面出錯也會關</b>（它是少數 error in 有錯還會執行的函式）']
])}`,
`<div class="note"><b>FX3S 的序列參數</b>9600 bps、7 資料位、偶同位（Even）、1 停止位，PLC 參數「PLC 系統(2)」不要勾。這組值寫死在 FX_Open 裡。</div>`,
C.h3('做','b','跟著做 ①：FX_Open.vi'),
{lv:openVI,cap:'點 Case 的 ◀ ▶：False 頁用 VISA Open（TCP），True 頁用 VISA Configure Serial Port（COM，9600 7E1）。兩頁的輸出接到同樣的通道。'},
{todo:[
 '開新 VI 存 <code>我的雙龍門\\FX_Open.vi</code>。前面板：' + ctl('Modern','I/O','VISA Resource Name') + ' 標籤 <code>Resource</code>；Push Button <code>Serial (COM)?</code>；error in / error out；在 VISA 線的輸出上 Create Indicator <code>VISA out</code>。',
 'Case Structure，Serial (COM)? 接 Selector。',
 '<b>False 頁</b>：放 VISA Open，接 Resource 和 error in，兩個輸出接到右邊通道。',
 '<b>True 頁</b>：放 VISA Configure Serial Port。在 baud rate、data bits、parity、stop bits、enable termination char 上各自右鍵 ▸ Create ▸ Constant：<code>9600</code>、<code>7</code>、<code>Even</code>、<code>1.0</code>、<code>F</code>（False）。輸出接到<b>同樣的</b>兩個通道。',
 'enable termination char 設 False 的原因：FX 協定不是用換行結尾，我們每次都指定要讀幾個位元組。',
 'Connector：左上 Resource、左上第二格 Serial (COM)?、右上 VISA out、左下 error in、右下 error out。Icon <code>FX</code>/<code>OPEN</code>。'
]},
C.real('FX_Open','只看得到 False 頁（VISA Open）。在 LabVIEW 打開參考答案，點 Case 上的箭頭可以看 True 頁的 VISA Configure Serial Port（9600、7、Even、1.0、終止字元 F）。'),
C.h3('做','b','跟著做 ②：L12_Ping.vi　ENQ → ACK'),
`<p>FX 協定最簡單的對話：送 1 個字元 <b>ENQ</b>（05h），PLC 回 1 個字元 <b>ACK</b>（06h）。這可以確認線路和程式都通了。</p>`,
{lv:ping,cap:'網頁模擬：先按 Run 看成功的樣子，再把「軟 PLC 開著」按掉（變 OFF）再 Run 看失敗時錯誤怎麼一路傳到 Simple Error Handler。'},
{todo:[
 '<b>先開軟 PLC</b>：在 <code>實作環境</code> 資料夾開 PowerShell，執行 <code>python .\\softplc\\softplc.py --no-board</code>。',
 '開新 VI 存 <code>練習\\L12_Ping.vi</code>。前面板 VISA Resource Name <code>Resource</code>，直接在框裡打 <code>TCPIP0::127.0.0.1::5551::SOCKET</code>，右鍵 ▸ Data Operations ▸ Make Current Value Default。',
 '方塊圖：放 FX_Open.vi（Select a VI…），Serial (COM)? 接 F 常數。',
 'VISA Write，write buffer 接 Hex Display 字串常數 <code>05</code>。VISA Read，byte count 接 <code>1</code>。',
 'read buffer 和 Hex Display 常數 <code>06</code> 比 Equal? → Indicator <code>PLC Answered</code>。',
 'VISA Close → Simple Error Handler。<b>紫色線和錯誤線都要一路串起來</b>（參考上圖）。',
 'Run：PLC Answered 亮。關掉軟 PLC 再 Run：跳出錯誤對話框，這是正常的。'
]},
C.h3('錯','x','連不上時怎麼查'),
C.table(['現象','可能原因','怎麼做'],[
 ['VISA Open 錯誤','軟 PLC 沒開、埠號打錯','確認模擬器視窗開著；資源名稱照抄'],
 ['函式選盤找不到 VISA','沒裝 NI-VISA','用 NI Package Manager 安裝 NI-VISA'],
 ['VISA Read 逾時（-1073807339）','PLC 沒回應：封包錯、線沒接、COM 參數不對','先用 Ping 確認；實機檢查 9600 7E1 和轉接線'],
 ['第二次 Run 打不開 COM','上次用 Abort 結束，埠沒關','關掉 LabVIEW 重開；以後用 STOP 按鈕結束']
]),
C.h3('測','q','小測驗'),
{quiz:[
 {q:'在家用軟 PLC、到工廠接 FX3S，程式要改什麼？',o:['整個驅動重寫','只要改 Resource（和 Serial (COM)? 打勾）','不能用同一支程式'],a:1,ex:'VISA 把傳輸方式藏起來了，封包完全一樣。'},
 {q:'VISA Read 的 byte count 設 1，PLC 回了 11 個字元，會讀到什麼？',o:['全部 11 個','只有第 1 個，剩下的留在緩衝區','錯誤'],a:1,ex:'VISA Read 只讀你要的數量，剩下的下次再讀。所以 byte count 一定要算準（下一課）。'},
 {q:'FX3S 序列參數是？',o:['9600、8、None、1','9600、7、Even、1','115200、8、None、1'],a:1,ex:'FX 編程協定固定 9600 7E1。'}
]}
]});

/* ======================================================================
   第 13 課：FX_ReadD.vi
   ====================================================================== */
const readVI={name:'FX_ReadD.vi',view:'bd',
 fp:{w:420,h:300,items:[
  {id:'d',k:'num',ctl:true,label:'D',rep:'U16',x:16,y:16,w:80,v:200},
  {id:'n',k:'num',ctl:true,label:'Count',rep:'U16',x:120,y:16,w:80,v:3},
  {id:'plc',k:'btn',label:'（模擬）軟 PLC 開著',mech:'switch',lit:true,x:230,y:24,v:true},
  {id:'tx',k:'str',label:'TX (debug)',x:16,y:74,w:380},
  {id:'rx',k:'str',label:'RX (debug)',x:16,y:124,w:380},
  {id:'words',k:'arr',label:'Words',n:5,x:16,y:176},
  {id:'err',k:'err',label:'error out',x:16,y:226}]},
 bd:{w:960,h:290,structs:[{id:'fl',k:'for',x:600,y:40,w:250,h:170}],
  nodes:[
  {id:'vi',k:'ctl',t:'visa',label:'VISA in',x:20,y:30},
  {id:'d',k:'ctl',t:'u16',label:'D',x:20,y:96},
  {id:'n',k:'ctl',t:'u16',label:'Count',x:20,y:160},
  {id:'ei',k:'ctl',t:'err',label:'error in',x:20,y:240},
  {id:'rf',k:'sub',name:'FX_ReadFrame.vi',top:'FX',icon:['READ'],ins:['D','Words'],outs:['Frame'],x:110,y:90},
  {id:'wr',k:'fn',fn:'VISA Write',x:240,y:30},
  {id:'k4',k:'const',t:'u16',v:4,x:120,y:196},{id:'mul',k:'fn',fn:'Multiply',x:170,y:170},{id:'add',k:'fn',fn:'Add',x:230,y:180},{id:'k4b',k:'const',t:'u16',v:4,x:180,y:220},
  {id:'rd',k:'fn',fn:'VISA Read',x:340,y:30},
  {id:'ck',k:'sub',name:'FX_Check.vi',top:'FX',icon:['CHECK'],ins:['RX'],outs:['Data'],err:true,x:460,y:60},
  {id:'N',k:'N',s:'fl'},
  {id:'td',k:'tunnel',t:'str',s:'fl',side:'l',y:110},
  {id:'iter',k:'iter',s:'fl'},
  {id:'k4c',k:'const',t:'i32',v:4,x:620,y:136},{id:'mi',k:'fn',fn:'Multiply',x:660,y:150},
  {id:'ss',k:'fn',fn:'String Subset',x:700,y:94},{id:'k4d',k:'const',t:'i32',v:4,x:660,y:68},
  {id:'hx',k:'fn',fn:'Hexadecimal String To Number',x:760,y:90,ins:['string','default']},{id:'k0',k:'const',t:'u16',v:0,x:730,y:150},
  {id:'sw',k:'fn',fn:'Swap Bytes',x:820,y:156,showName:false},
  {id:'to',k:'tunnel',t:'u16[]',s:'fl',side:'r',y:170,idx:true},
  {id:'words',k:'ind',t:'u16[]',label:'Words',x:890,y:160},
  {id:'vo',k:'ind',t:'visa',label:'VISA out',x:890,y:20},{id:'eo',k:'ind',t:'err',label:'error out',x:890,y:240}],
  wires:[
  {id:'w1',from:'d',to:'rf.D',t:'u16'},{id:'w2',from:'n',to:'rf.Words',t:'u16',mx:80},
  {id:'w3',from:'vi',to:'wr.VISA resource name',t:'visa'},{id:'w4',from:'rf.Frame',to:'wr.write buffer',t:'str',mx:200},{id:'w5',from:'ei',to:'wr.error in',t:'err',mx:215},
  {id:'w6',from:'n',to:'mul.x',t:'u16',mx:90},{id:'w7',from:'k4',to:'mul.y',t:'u16',mx:155},{id:'w8',from:'mul.out',to:'add.x',t:'u16'},{id:'w9',from:'k4b',to:'add.y',t:'u16',mx:215},
  {id:'w10',from:'wr.VISA resource name out',to:'rd.VISA resource name',t:'visa'},{id:'w11',from:'wr.error out',to:'rd.error in',t:'err'},{id:'w12',from:'add.out',to:'rd.byte count',t:'u16',mx:310},
  {id:'w13',from:'rd.read buffer',to:'ck.RX',t:'str',mx:420},{id:'w14',from:'rd.error out',to:'ck.error in',t:'err',mx:430},
  {id:'w15',from:'n',to:'N',t:'u16',pts:[[90,170],[90,270],[580,270],[580,57]],coerce:true},
  {id:'w16',from:'ck.Data',to:'td.o',t:'str',mx:560},{id:'w17',from:'td.i',to:'ss.string',t:'str'},
  {id:'w18',from:'iter',to:'mi.x',t:'i32',mx:645},{id:'w19',from:'k4c',to:'mi.y',t:'i32',mx:648},{id:'w20',from:'mi.out',to:'ss.offset',t:'i32',mx:690},{id:'w21',from:'k4d',to:'ss.length',t:'i32',pts:[[690,77],[690,124]]},
  {id:'w22',from:'ss.substring',to:'hx.string',t:'str'},{id:'w23',from:'k0',to:'hx.default',t:'u16',mx:750},{id:'w24',from:'hx.number',to:'sw.x',t:'u16',mx:812},{id:'w25',from:'sw.swapped',to:'to.i',t:'u16'},{id:'w26',from:'to.o',to:'words',t:'u16[]'},
  {id:'w27',from:'rd.VISA resource name out',to:'vo',t:'visa',pts:[[400,41],[400,14],[870,14],[870,30]]},
  {id:'w28',from:'ck.error out',to:'eo',t:'err',pts:[[540,99],[540,250]]}]},
 sim:{init(S){if(!C._g13){C._g13=C.Gantry();C._g13.d[200]=22;C._g13.d[201]=42;C._g13.d[202]=0;C._g13.d[203]=0;C._g13.d[230]=0x0B54;}return {};},
  step(i){const g=C._g13;const n=Math.max(1,Math.min(32,i.n));const tx=FX.readFrame(i.d,n);
   if(!i.plc)return {out:{tx,rx:'',words:[],err:ERR_TMO},vals:{'rf.Frame':tx,'rd.read buffer':'','rd.error out':ERR_TMO,'ck.error out':ERR_TMO,'to.o':[]},msg:'等了 2 秒沒有回應 → 逾時錯誤'};
   const w=g.words(i.d,n);const rx=FX.reply(w);const data=rx.slice(1,-3);const e={status:false,code:0,source:''};
   return {out:{tx,rx,words:w,err:e},vals:{d:i.d,n:i.n,'rf.Frame':tx,'mul.out':4*n,'add.out':4*n+4,'rd.read buffer':rx,'ck.Data':data,'td.i':data,'iter':0,'mi.out':0,'ss.substring':data.slice(0,4),'hx.number':parseInt(data.slice(0,4),16),'sw.swapped':w[0],'to.o':w,'ck.error out':e,'rd.error out':e},msg:`讀到 ${n} 個字`};}}
};
L.push({id:'L13',order:13,no:'13',part:'和 PLC 通訊',title:'FX_ReadD.vi：讀 PLC 的 D 暫存器',mins:60,files:['FX_ReadD.vi','練習\\L13_Test.vi'],
goals:[['學會','組合自己的 SubVI 成驅動、算回應長度、For Loop 切字串、十六進位轉數字。'],['做出','FX_ReadD.vi：給 D 和字數，回傳 U16 陣列。'],['用在專案','通訊迴圈每 200 ms 用它讀 D200～D241。']],
check:'L13_Test.vi 讀 D200 起 3 個字，軟 PLC 待機時是 [0, 0, 0]；在軟 PLC 按原點（或下一課用 LabVIEW 寫 D106 = 4）後，第 3 個值（D202）會出現 10～13。',
body:[
C.h3('懂','','讀取的完整流程'),
`<ol><li>FX_ReadFrame 產生封包（第 10 課）。</li><li>VISA Write 送出。</li><li>VISA Read 讀回應。<b>要讀幾個位元組？</b> STX(1) + 資料(4 × 字數) + ETX(1) + 校驗(2) = <b>4 × 字數 + 4</b>。</li><li>FX_Check 檢查 STX 和校驗，取出資料（第 11 課）。</li><li>For Loop 每 4 個字元切一段 → 十六進位轉數字 → 高低位元組對調 → 自動索引成陣列。</li></ol>
<div class="warn"><b>字數上限 32</b>軟 PLC 和本課程的程式一次最多讀 64 個位元組（32 個字）。D200～D241 共 42 個字，所以要分兩次讀：D200 起 30 個、D230 起 12 個。</div>`,
{lv:readVI,cap:'網頁模擬：前面板改 D、Count 再 Run，看 TX/RX 和 Words（假 PLC：D200 = 22、D201 = 42、D230 = 0B54h）。切到方塊圖看整個驅動。'},
C.h3('懂','','For Loop 裡怎麼把 "D204" 變成 1234'),
C.table(['步驟','函式','以第一個字為例'],[
 ['取第 i 段','String Subset（offset = i × 4，length = 4）','"D204"'],
 ['十六進位文字轉數字',fn('Programming','String','Number/String Conversion','Hexadecimal String To Number')+'；<b>default 接 U16 常數 0</b>，輸出才會是 U16','D204h'],
 ['高低位元組對調','Swap Bytes','04D2h = <b>1234</b>'],
 ['組成陣列','右邊自動索引通道','[1234, …]']
]),
C.h3('做','b','跟著做：FX_ReadD.vi'),
{todo:[
 '開新 VI 存 <code>我的雙龍門\\FX_ReadD.vi</code>。前面板：VISA Resource Name <code>VISA in</code>、U16 <code>D</code>、U16 <code>Count</code>、error in；Indicator：<code>VISA out</code>、U16 陣列 <code>Words</code>、error out。',
 '<b>（建議）</b>多放兩個 String Indicator <code>TX (debug)</code>、<code>RX (debug)</code>，設 \'\\\' Codes Display，把送出、收到的封包接上去。驅動有問題時一看就知道。',
 '照上圖接：FX_ReadFrame → VISA Write → VISA Read（byte count = Count × 4 + 4）→ FX_Check。紫色線和錯誤線一路串。',
 'For Loop：N 接 Count；FX_Check 的 Data 從左邊接進來（<b>單一字串不要自動索引</b>，通道是實心方塊就對了）。',
 '迴圈裡：i × 4 → String Subset 的 offset，length 接 4 → Hexadecimal String To Number（default 接 U16 的 0）→ Swap Bytes → 右邊框線（自動索引）→ Words。',
 'VISA out 接 VISA Read 的 VISA resource name out；error out 接 FX_Check 的 error out。',
 'Connector：左邊 VISA in、D、Count，右邊 VISA out、Words；左下 error in、右下 error out。Icon <code>FX</code>/<code>READ D</code>。'
]},
{todo:[
 '測試 VI <code>練習\\L13_Test.vi</code>：FX_Open（TCP）→ FX_ReadD（D = 200、Count = 3）→ VISA Close → Simple Error Handler，Words 接 Indicator。',
 '軟 PLC 開著，Run：Words = [0, 0, 0]（待機）。',
 '改 D = 230、Count = 12，Run：第 1 個值是 X 狀態字（急停沒按、模式在自動時 X13、X10 會是 1）。用第 7 課的 L07_Bits 想想看是哪些燈。'
]},
C.real('FX_ReadD'),
C.h3('錯','x','常見問題'),
C.table(['症狀','原因'],[
 ['error out 的 status 是綠勾，但 code 是 <b>1073676294</b>','這是<b>警告</b>不是錯誤（正數、status = False）：VISA Read 讀到的位元組數剛好等於你要求的數量。完全正常，不用處理'],
 ['Words 的值是 0 或亂數，沒錯誤','忘了 Swap Bytes；或 Hexadecimal String To Number 的 default 沒接，變成 I32/DBL'],
 ['錯誤 5001','byte count 算錯（少讀或多讀），FX_Check 的 STX 或校驗對不上。看 RX (debug)'],
 ['逾時錯誤','byte count 大於 PLC 實際回的數量（例如 Count 超過 32 PLC 回 NAK，只有 1 個字元）'],
 ['For Loop 只跑 0 次','N 沒接，而且字串通道不會自動索引']
]),
C.h3('測','q','小測驗'),
{quiz:[
 {q:'讀 12 個字，VISA Read 的 byte count 要填？',o:['12','48','52'],a:2,ex:'4 × 12 + 4 = 52。'},
 {q:'回應裡某一段是 "0B00"，代表的值是？',o:['0B00h = 2816','000Bh = 11','0'],a:1,ex:'低位元組在前：0B 是低位元組，00 是高位元組 → 000Bh = 11。'},
 {q:'Hexadecimal String To Number 的 default 為什麼要接 U16 常數？',o:['決定輸出型別','決定進位','沒差'],a:0,ex:'default 的型別決定輸出型別。'}
]}
]});

/* ======================================================================
   第 14 課：FX_WriteD.vi
   ====================================================================== */
const writeVI={name:'FX_WriteD.vi',view:'bd',
 bd:{w:760,h:230,nodes:[
  {id:'vi',k:'ctl',t:'visa',label:'VISA in',x:20,y:30},{id:'d',k:'ctl',t:'u16',label:'D',x:20,y:90},{id:'v',k:'ctl',t:'u16',label:'Value',x:20,y:140},{id:'ei',k:'ctl',t:'err',label:'error in',x:20,y:200},
  {id:'wf',k:'sub',name:'FX_WriteFrame.vi',top:'FX',icon:['WRITE'],ins:['D','Value'],outs:['Frame'],x:110,y:90},
  {id:'wr',k:'fn',fn:'VISA Write',x:240,y:30},{id:'k1',k:'const',t:'i32',v:1,x:310,y:110},
  {id:'rd',k:'fn',fn:'VISA Read',x:340,y:30},
  {id:'ack',k:'const',t:'str',v:'06',hex:true,x:410,y:120,label:'ACK'},{id:'eq',k:'fn',fn:'Equal?',x:460,y:90},
  {id:'ec',k:'ctl',t:'err',label:'5002 FX_WriteD: NAK',x:470,y:190},
  {id:'sel',k:'fn',fn:'Select',x:600,y:110},
  {id:'vo',k:'ind',t:'visa',label:'VISA out',x:680,y:30},{id:'eo',k:'ind',t:'err',label:'error out',x:680,y:116}],
  wires:[{id:'w1',from:'d',to:'wf.D',t:'u16'},{id:'w2',from:'v',to:'wf.Value',t:'u16',mx:80},{id:'w3',from:'vi',to:'wr.VISA resource name',t:'visa'},{id:'w4',from:'wf.Frame',to:'wr.write buffer',t:'str',mx:200},{id:'w5',from:'ei',to:'wr.error in',t:'err',mx:215},
   {id:'w6',from:'wr.VISA resource name out',to:'rd.VISA resource name',t:'visa'},{id:'w7',from:'wr.error out',to:'rd.error in',t:'err'},{id:'w8',from:'k1',to:'rd.byte count',t:'i32',mx:330},
   {id:'w9',from:'rd.read buffer',to:'eq.x',t:'str',mx:430},{id:'w10',from:'ack',to:'eq.y',t:'str',mx:445},
   {id:'w11',from:'eq.out',to:'sel.s',t:'bool',mx:560},{id:'w12',from:'rd.error out',to:'sel.t',t:'err',mx:580},{id:'w13',from:'ec',to:'sel.f',t:'err',mx:580},
   {id:'w14',from:'sel.out',to:'eo',t:'err'},{id:'w15',from:'rd.VISA resource name out',to:'vo',t:'visa'}]}
};
const homeTest={name:'L14_Test.vi',view:'split',ratio:1.6,
 fp:{w:320,h:300,items:[
  {id:'home',k:'btn',label:'Home',x:16,y:16},{id:'start',k:'btn',label:'Start',x:100,y:16},{id:'stopc',k:'btn',label:'Stop',x:184,y:16},
  {id:'rs',k:'num',label:'Right Step (D200)',x:16,y:70,w:100},{id:'hs',k:'num',label:'Home Step (D202)',x:150,y:70,w:100},
  {id:'rc',k:'num',label:'Right Count (D210)',x:16,y:130,w:100},
  {id:'part',k:'btn',label:'（模擬）放工件',mech:'latch',x:150,y:136},
  {id:'stop',k:'btn',label:'stop',text:'STOP',x:16,y:200,stop:true}]},
 bd:{w:760,h:300,structs:[{id:'wl',k:'while',x:120,y:20,w:600,h:260},{id:'cs',k:'case',x:200,y:50,w:250,h:100,frames:['False','True'],cur:1}],
  nodes:[
  {id:'open',k:'sub',name:'FX_Open.vi',top:'FX',icon:['OPEN'],ins:['Resource'],outs:['VISA out'],err:true,x:20,y:60},
  {id:'sr',k:'sr',t:'visa',s:'wl',y:80},
  {id:'home',k:'ctl',t:'bool',label:'Home',x:140,y:180},{id:'sel',k:'sel',t:'bool',s:'cs',y:120},
  {id:'k106',k:'const',t:'u16',v:106,x:250,y:100,f:'cs:True'},{id:'k4',k:'const',t:'u16',v:4,x:260,y:122,f:'cs:True'},
  {id:'wd',k:'sub',name:'FX_WriteD.vi',top:'FX',icon:['WRITE D'],ins:['VISA in','D','Value'],outs:['VISA out'],x:320,y:68,f:'cs:True'},
  {id:'ti',k:'tunnel',t:'visa',s:'cs',side:'l',y:80},{id:'tout',k:'tunnel',t:'visa',s:'cs',side:'r',y:80},
  {id:'k200',k:'const',t:'u16',v:200,x:470,y:120},{id:'k3',k:'const',t:'u16',v:3,x:480,y:140},
  {id:'rd',k:'sub',name:'FX_ReadD.vi',top:'FX',icon:['READ D'],ins:['VISA in','D','Count'],outs:['VISA out','Words'],x:530,y:68},
  {id:'words',k:'ind',t:'u16[]',label:'Words',x:620,y:170},
  {id:'stop',k:'ctl',t:'bool',label:'stop',x:600,y:226},{id:'cond',k:'stop',s:'wl'},
  {id:'close',k:'fn',fn:'VISA Close',x:740,y:70,showName:false}],
  wires:[{id:'w1',from:'open.VISA out',to:'sr.init',t:'visa'},{id:'w2',from:'sr.L',to:'ti.o',t:'visa'},{id:'w3',from:'home',to:'sel',t:'bool',mx:170},
   {id:'w4',from:'ti.i',to:'wd.VISA in',t:'visa',f:'cs:True'},{id:'w5',from:'k106',to:'wd.D',t:'u16',f:'cs:True'},{id:'w6',from:'k4',to:'wd.Value',t:'u16',f:'cs:True',mx:300},{id:'w7',from:'wd.VISA out',to:'tout.i',t:'visa',f:'cs:True'},
   {id:'w7f',from:'ti.i',to:'tout.i',t:'visa',f:'cs:False'},
   {id:'w8',from:'tout.o',to:'rd.VISA in',t:'visa'},{id:'w9',from:'k200',to:'rd.D',t:'u16',mx:515},{id:'w10',from:'k3',to:'rd.Count',t:'u16',mx:520},
   {id:'w11',from:'rd.Words',to:'words',t:'u16[]',mx:600},{id:'w12',from:'rd.VISA out',to:'sr.R',t:'visa'},{id:'w13',from:'stop',to:'cond',t:'bool'},{id:'w14',from:'sr.out',to:'close',t:'visa'}]},
 sim:{period:200,init(){return {g:C.Gantry()};},step(i,st){const g=st.g;let c=0;if(i.home)c|=4;if(i.start)c|=1;if(i.stopc)c|=2;if(c)g.write(106,c);if(i.part)g.parts.front++;g.tick();
   return {out:{rs:g.d[200],hs:g.d[202],rc:g.d[210]},frames:{cs:i.home?1:0},vals:{'rd.Words':[g.d[200],g.d[201],g.d[202]]},stop:!!i.stop,msg:c?'寫 D106 = '+c:'讀 D200～D202'};}}
};
L.push({id:'L14',order:14,no:'14',part:'和 PLC 通訊',title:'FX_WriteD.vi：讓機台動起來',mins:50,files:['FX_WriteD.vi','練習\\L14_Test.vi'],
goals:[['學會','寫入確認（ACK/NAK）、用 Select 產生錯誤、在迴圈裡共用 VISA 線。'],['做出','FX_WriteD.vi，以及一個能按 Home、Start 並看步序的小測試程式。'],['用在專案','所有命令（D106、D107、參數、心跳）都用它寫。']],
check:'L14_Test.vi 按 Home 後 Home Step 跑 10→11→12→13 再回 0；在軟 PLC 放工件、按 Start 後 Right Step 開始跑 20～28、Right Count 增加。',
body:[
C.h3('懂','','寫入：送封包，等一個字元'),
`<p>寫入比讀取簡單：送出 FX_WriteFrame 的封包，PLC 只回 <b>1 個字元</b>：ACK（06h）表示成功，NAK（15h）表示封包或位址錯誤。不是 ACK 就產生自訂錯誤 5002。</p>`,
{lv:writeVI,cap:'Select 的 s 是「收到 ACK」：True 傳原本的錯誤線（通常是無錯誤），False 傳錯誤常數 5002。'},
{todo:[
 '開新 VI 存 <code>我的雙龍門\\FX_WriteD.vi</code>：VISA in、U16 <code>D</code>、U16 <code>Value</code>、error in；VISA out、error out。',
 'FX_WriteFrame → VISA Write → VISA Read（byte count 1）→ 和 ACK 常數（Hex Display 06）比 Equal?。',
 '錯誤常數：status ✗、code <code>5002</code>、source <code>FX_WriteD: PLC answered NAK</code>。用 Select 選。',
 'Connector 和 FX_ReadD 一樣的位置慣例。Icon <code>FX</code>/<code>WRITE D</code>。'
]},
C.real('FX_WriteD','參考答案用 Merge Errors 合併「VISA Read 的錯誤」和「NAK 產生的 5002」：線路逾時時，回報的是 VISA 的逾時錯誤，而不是誤報 NAK。'),
C.h3('懂','','命令表：寫哪個 D、寫多少'),
C.table(['想做的事','寫入','PLC 怎麼處理'],[
 ['Start 自動啟動','D106 = 1','轉成 M100，然後自己把 D106 清成 0'],
 ['Stop 循環停止','D106 = 2','M101：做完這趟才停'],
 ['Home 原點復歸','D106 = 4','M102'],
 ['Reset 異常復歸','D106 = 8','M103'],
 ['Clear Counts','D106 = 16','M104'],
 ['點動','D107 = 位元組合','按住為 1、放開寫 0（第 17 課）'],
 ['參數','D100～D103','吸附時間、釋放時間、逾時、目標次數'],
 ['心跳','D240 = 1～32767 循環','每秒寫一次（第 19 課）']
]),
C.h3('做','b','跟著做：L14_Test.vi　按 Home，看步序'),
`<p>這是第一個「邊寫邊讀」的程式：VISA 線放在 <b>Shift Register</b> 裡繞圈，迴圈每一圈先看 Home 有沒有按（有就寫 D106 = 4），再讀 D200～D202 顯示。</p>`,
{lv:homeTest,cap:'網頁模擬（用假 PLC）：Run → 按 Home 看 Home Step → 按「放工件」→ 按 Start 看 Right Step 和 Right Count。Case 的頁面會跟著 Home 按鈕切換。'},
{todo:[
 '迴圈外：FX_Open（TCP）。VISA 線接到迴圈的 Shift Register（左邊外側）。',
 '迴圈裡：Home 按鈕（Latch When Released）接 Case。True 頁放 FX_WriteD（D = 106、Value = 4），False 頁 VISA 線直接穿過去。',
 'Case 之後：FX_ReadD（D = 200、Count = 3）→ Words Indicator。VISA 線接回右邊 Shift Register。',
 '照樣做 Start（D106 = 1）、Stop（D106 = 2）：可以複製 Case，也可以先用 Build Array 把三個按鈕變成一個 D106 值（第 7 課），值不等於 0 才寫。後者就是第 17 課的做法。',
 '迴圈裡放 Wait (ms) 200；迴圈外：VISA Close → Simple Error Handler。錯誤線也要串（這個測試程式先把錯誤線接到 Shift Register 繞圈即可）。',
 '軟 PLC 開著，Run → 按 Home：Home Step 10、11、12、13、0。在軟 PLC 視窗放一個工件，按 Start：Right Step 跑起來，軟 PLC 的龍門會動。'
]},
`<div class="tip"><b>恭喜</b>到這裡你已經能用自己寫的驅動控制機台了。接下來的專案課，就是把這些零件組成一個好用、穩定、看得懂的上位機。</div>`,
C.h3('測','q','小測驗'),
{quiz:[
 {q:'寫 D106 = 4 之後，再讀 D106 會是多少？',o:['4','0','不一定'],a:1,ex:'PLC 程式收到後馬上 MOV K0 D106。所以 D106 是「脈衝命令」，一直寫 4 也不會重複觸發，要等它被清掉。'},
 {q:'L14_Test 裡 VISA 線為什麼要放在 Shift Register？',o:['讓每一圈用同一個開好的連線，而且最後關的是它','Shift Register 比較快','不放也可以，沒差'],a:0,ex:'也可以用一般通道穿過迴圈，但用 Shift Register 是好習慣：之後斷線重連時，新開的連線才傳得到下一圈（第 19 課）。'},
 {q:'PLC 回 NAK 最可能是？',o:['位址或校驗錯了','PLC 很忙','命令成功'],a:0,ex:'NAK = 封包有問題。看 TX (debug)。'}
]}
]});
})();
