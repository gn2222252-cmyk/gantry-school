/* 第一部分：起步（第 0、1 課）＋ 全課程共用的雙龍門假 PLC 與完成品面板 */
(function(){
const L=window.LESSONS,pal=C.pal,fn=C.fn,ctl=C.ctl,qd=C.qd,wt=C.wt;

/* ===== 課程內示範用的「假 PLC」：照 GANTRY_8Y 同步版的 D 暫存器規則 ===== */
C.Gantry=function(){
  const g={d:new Array(260).fill(0),parts:{front:1,rear:0},t:0,auto:false,homed:false,manual:false,alarm:0,stopReq:false,
           step:0,home:0,cnt:0,rc:0,lc:0,beat:0,hb:0,hbLast:-1,hbAge:0,estop:false};
  g.write=(dn,v)=>{g.d[dn]=v&0xFFFF;};
  g.tick=()=>{ // 每次約 200 ms
    const d=g.d;g.t++;
    // D106 脈衝命令
    const c=d[106];if(c){d[106]=0;
      if(c&8){g.alarm=0;}                                      // Reset
      if(c&4&&!g.auto&&!g.alarm){g.home=10;g.homed=false;}      // Home
      if(c&1&&g.homed&&!g.alarm&&!g.manual&&!g.auto){g.auto=true;g.stopReq=false;g.step=20;} // Start
      if(c&2&&g.auto){g.stopReq=true;}                          // Stop
      if(c&16){g.rc=g.lc=g.cnt=0;}}
    if(g.estop){g.alarm=1;g.auto=false;g.step=0;g.home=0;}
    // 原點復歸
    if(g.home){if(g.t%3===0){g.home++;if(g.home>13){g.home=0;g.homed=true;}}}
    // 自動步序（同步版：左步序＝右步序＋20）
    if(g.auto&&g.t%3===0){
      if(g.step===20){if(g.parts.front>0||g.parts.rear>0){g.carryR=g.parts.front>0;g.carryL=g.parts.rear>0;g.step=21;}else if(g.stopReq){g.auto=false;g.step=0;}}
      else if(g.step===22){if(g.carryR)g.parts.front--;if(g.carryL)g.parts.rear--;g.step++;}
      else if(g.step===26){if(g.carryR){g.parts.rear++;g.rc++;}if(g.carryL){g.lc++;g.parts.front++;}g.step++;}
      else if(g.step===28){g.step=20;if(g.stopReq){g.auto=false;g.step=0;}}
      else if(g.step>20) g.step++;
    }
    // 心跳：D240 3 秒沒變 → 只在手動模式報 40
    if(d[240]!==g.hbLast){g.hbLast=d[240];g.hbAge=0;}else g.hbAge++;
    if(g.manual&&d[240]>0&&g.hbAge>15&&!g.alarm) g.alarm=40;
    // 寫回狀態字
    const s=g.step;d[200]=s;d[201]=s?s+20:0;d[202]=g.home;d[210]=g.rc;d[211]=g.lc;d[212]=Math.min(g.rc,g.lc);d[220]=g.alarm;
    const front=[20,21,22,23,28].includes(s)||!g.auto, rear=[24,25,26,27].includes(s)&&g.auto;
    const down=[21,22,25,26].includes(s);
    let x=0;if(front)x|=1<<1; if(rear)x|=1;      // 左龍門：在後側取料
    if(front)x|=1<<2; if(rear)x|=1<<3;           // 右龍門：前側取料
    if(g.parts.front>0)x|=1<<4; if(g.parts.rear>0)x|=1<<5;
    x|=down?(1<<7)|(1<<10):(1<<6)|(1<<9);
    if(!g.manual)x|=1<<8; if(!g.estop)x|=1<<11;
    d[230]=x;
    let y=0;if(down){y|=1<<4|1<<3;y|=1<<8;}else y|=1<<3|1<<9; if([22,23,24,25].includes(s))y|=1<<5|1<<10;
    if(s===24){y|=1<<1|1<<7;} if(s===28){y|=1<<0|1<<6;} if(g.auto&&s===20)y|=1<<2;
    d[231]=y;
    d[232]=(g.auto?1:0)|(g.manual?2:0)|(g.homed?4:0)|(g.alarm?8:0)|(g.estop?16:0)|(g.stopReq?32:0);
    d[241]=(d[241]%32767)+1;
  };
  g.words=(start,n)=>g.d.slice(start,start+n);
  return g;
};

/* 步序、異常文字（和 GT_StepText.vi、GT_AlarmText.vi 的 Case 相同） */
C.STEP={0:'Stopped',10:'Outputs off',11:'Cylinders up',12:'Axes to home',13:'Done',20:'Wait part',21:'Down to pick',22:'Vacuum on',23:'Up',24:'To rear',25:'Down to place',26:'Vacuum off',27:'Up',28:'Back home',
  40:'Wait part',41:'Down to pick',42:'Vacuum on',43:'Up',44:'To front',45:'Down to place',46:'Vacuum off',47:'Up',48:'Back home'};
C.ALARM={0:'OK',1:'E-STOP',10:'RIGHT AXIS TIMEOUT',11:'RIGHT CYLINDER TIMEOUT',20:'LEFT AXIS TIMEOUT',21:'LEFT CYLINDER TIMEOUT',30:'HOMING TIMEOUT',40:'HMI LINK LOST'};
C.XN=['X0 L front','X1 L rear','X2 R front','X3 R rear','X4 Front belt end','X5 Rear belt end','X6 L cyl up','X7 L cyl down','X10 Mode auto','X11 R cyl up','X12 R cyl down','X13 E-stop OK'];
C.YN=['Y0 L forward','Y1 L rearward','Y2 Conveyors','Y3 R cyl up','Y4 R cyl down','Y5 Vacuum','Y6 R rearward','Y7 R forward','L down (BY0)','L up (BY1)','L vacuum'];
const bits=(w,n)=>Array.from({length:n},(_,i)=>!!(w>>i&1));
C.bits=bits;

/* ===== 完成品 GT_Main.vi 的前面板（第 0 課預覽、第 18 課對照） ===== */
C.mainPanel=function(){
  const P='tab:Main',M='tab:Manual',PA='tab:Parameters',IO='tab:IO Monitor',AL='tab:Alarm Log';
  const st=s=>s._st||{};
  const headY=(right)=>s=>{const k=st(s).step||0;const rear=[24,25,26,27].includes(k);const front=!rear;const atFront=right?front:!front;return atFront?150:0;};
  return {w:900,h:520,items:[
    {id:'port',k:'visa',label:'PLC Port',x:16,y:10,w:230,v:'TCPIP0::127.0.0.1::5551::SOCKET',options:['TCPIP0::127.0.0.1::5551::SOCKET','COM3','COM4']},
    {id:'conn',k:'led',label:'PLC Connected',x:270,y:10},
    {id:'exit',k:'btn',label:'Exit',text:'Exit',x:800,y:22,stop:true},
    {id:'tab',k:'tab',x:12,y:84,w:876,h:424,pages:['Main','Manual','Parameters','IO Monitor','Alarm Log']},
    // Main：機台圖
    {k:'deco',tab:P,x:30,y:100,w:520,h:250,fill:'#f7f7f2',border:'1px solid #888'},
    {k:'deco',tab:P,x:60,y:120,w:460,h:22,fill:'#555',r:3},{k:'text',tab:P,x:200,y:123,text:'←  Rear belt 後輸送帶',color:'#fff'},
    {k:'deco',tab:P,x:60,y:300,w:460,h:22,fill:'#555',r:3},{k:'text',tab:P,x:200,y:303,text:'Front belt 前輸送帶  →',color:'#fff'},
    {k:'deco',tab:P,x:126,y:116,w:8,h:219,fill:'#9aa'},{k:'deco',tab:P,x:446,y:116,w:8,h:219,fill:'#9aa'},
    {k:'deco',tab:P,x:108,y:142,w:44,h:30,fill:'#2f6fd0',r:4,dy:headY(false)},{k:'text',tab:P,x:107,y:101,text:'L gantry',size:11},
    {k:'deco',tab:P,x:428,y:142,w:44,h:30,fill:'#d0532f',r:4,dy:headY(true)},{k:'text',tab:P,x:425,y:101,text:'R gantry',size:11},
    {k:'deco',tab:P,x:480,y:303,w:16,h:16,fill:s=>(st(s).pf>0?'#f2b600':'transparent'),border:'none',r:8},
    {k:'deco',tab:P,x:80,y:123,w:16,h:16,fill:s=>(st(s).pr>0?'#f2b600':'transparent'),border:'none',r:8},
    {id:'lstep',k:'str',label:'Left Step',tab:P,x:40,y:360,w:150},
    {id:'hstep',k:'str',label:'Home Step',tab:P,x:205,y:360,w:150},
    {id:'rstep',k:'str',label:'Right Step',tab:P,x:370,y:360,w:150},
    {id:'auto',k:'led',label:'Auto Running',tab:P,x:580,y:104},{id:'man',k:'led',label:'Manual Mode',tab:P,x:580,y:150},
    {id:'homed',k:'led',label:'Homed',tab:P,x:580,y:196},{id:'cstop',k:'led',label:'Cycle Stopping',tab:P,x:580,y:242,color:'yel'},
    {id:'alarm',k:'led',label:'Alarm',tab:P,x:580,y:288,color:'red'},{id:'estop',k:'led',label:'E-Stop',tab:P,x:580,y:334,color:'red'},
    {id:'rc',k:'num',label:'Right Count',tab:P,x:710,y:104,w:90},{id:'lc',k:'num',label:'Left Count',tab:P,x:710,y:152,w:90},
    {id:'cyc',k:'num',label:'Cycles',tab:P,x:710,y:200,w:90},{id:'acode',k:'num',label:'Alarm Code',tab:P,x:710,y:248,w:90},
    {id:'atext',k:'str',label:'Alarm Text',tab:P,x:710,y:296,w:160},
    {id:'start',k:'btn',label:'Start',x:40,y:440,tab:P},{id:'stop',k:'btn',label:'Stop',x:120,y:440,tab:P},
    {id:'home',k:'btn',label:'Home',x:200,y:440,tab:P},{id:'reset',k:'btn',label:'Reset',x:280,y:440,tab:P},{id:'clear',k:'btn',label:'Clear Counts',x:360,y:440,tab:P},
    {k:'text',tab:P,x:470,y:446,text:'← latch 按鈕：按一下送一次 D106',color:'#555'},
    // Manual
    {id:'allow',k:'led',label:'Manual Allowed',tab:M,x:30,y:104},
    {k:'text',tab:M,x:150,y:110,text:'按住才動（Switch Until Released）；吸盤、輸送帶按一下切換',color:'#555'},
    ...['L Forward','L Rearward','L Down','L Up'].map((n,i)=>({id:'j'+i,k:'btn',label:n,mech:'hold',tab:M,x:40,y:160+i*44})),
    {id:'j4',k:'btn',label:'L Vacuum',mech:'switch',lit:true,tab:M,x:40,y:340},
    ...['R Forward','R Rearward','R Down','R Up'].map((n,i)=>({id:'j'+(10+i),k:'btn',label:n,mech:'hold',tab:M,x:220,y:160+i*44})),
    {id:'j14',k:'btn',label:'R Vacuum',mech:'switch',lit:true,tab:M,x:220,y:340},
    {id:'j15',k:'btn',label:'Conveyors',mech:'switch',lit:true,tab:M,x:400,y:160},
    {id:'d107',k:'num',label:'D107 (hex)',hex:4,tab:M,x:400,y:230,w:90},
    // Parameters
    {id:'p0',k:'num',ctl:true,label:'Vacuum Time (0.1 s)  D100',rep:'U16',v:5,tab:PA,x:40,y:110,w:180},
    {id:'p1',k:'num',ctl:true,label:'Release Time (0.1 s)  D101',rep:'U16',v:5,tab:PA,x:40,y:160,w:180},
    {id:'p2',k:'num',ctl:true,label:'Step Timeout (0.1 s)  D102',rep:'U16',v:50,tab:PA,x:40,y:210,w:180},
    {id:'p3',k:'num',ctl:true,label:'Target Cycles (0 = no limit)  D103',rep:'U16',v:0,tab:PA,x:40,y:260,w:180},
    {id:'pw',k:'btn',label:'Write',tab:PA,x:40,y:316},
    // IO
    {id:'xs',k:'leds',label:'X (D230)',names:C.XN,cols:2,tab:IO,x:40,y:104},
    {id:'ys',k:'leds',label:'Y (D231)',names:C.YN,cols:2,tab:IO,x:420,y:104},
    // Alarm log
    {id:'log',k:'table',label:'Alarm History',cols:['Time','Code','Text'],rows:8,tab:AL,x:40,y:104},
    {k:'text',tab:AL,x:40,y:330,text:'每次異常碼改變就加一列，也寫進 logs\\yyyy-mm-dd.csv',color:'#555'}
  ]};
};
/* 用假 PLC 讓完成品面板動起來 */
C.mainSim=function(){
  return {period:200,
    init(S){const g=C.Gantry();S.state._st={};return {g,lastJ:-1,lastA:0,log:[]};},
    step(inp,st,ctx){
      const g=st.g,S=ctx.S;
      if(inp.exit) return {stop:true,out:{conn:false},msg:'Exit：寫 D240 = 0、關閉通訊、結束'};
      let c=0;['start','stop','home','reset','clear'].forEach((k,i)=>{if(inp[k])c|=1<<i;});
      if(c)g.write(106,c);
      let j=0;[0,1,2,3,4].forEach(i=>{if(inp['j'+i])j|=1<<i;});[10,11,12,13,14,15].forEach(i=>{if(inp['j'+i])j|=1<<i;});
      if(j!==st.lastJ){g.write(107,j);st.lastJ=j;}
      if(inp.pw){[0,1,2,3].forEach(i=>g.write(100+i,inp['p'+i]));}
      if(ctx.i%5===0)g.write(240,(ctx.i/5)%32767+1);
      g.tick();
      const w=g.words(200,42),sw=w[32];
      const code=w[20];
      if(code!==st.lastA){if(code)st.log.push([new Date().toLocaleTimeString(),String(code),C.ALARM[code]||'?']);st.lastA=code;}
      S.state._st={step:w[0],pf:g.parts.front,pr:g.parts.rear};
      if(ctx.i%25===12&&g.parts.front+g.parts.rear<2)g.parts.front++;
      return {out:{conn:true,rstep:w[0]+' '+(C.STEP[w[0]]||''),lstep:w[1]+' '+(C.STEP[w[1]]||''),hstep:w[2]+' '+(C.STEP[w[2]]||'Idle'),
        rc:w[10],lc:w[11],cyc:w[12],acode:code,atext:C.ALARM[code]||'?',auto:!!(sw&1),man:!!(sw&2),homed:!!(sw&4),alarm:!!(sw&8),estop:!!(sw&16),cstop:!!(sw&32),
        allow:!!(sw&2)&&!(sw&1)&&!(sw&8),d107:j,xs:bits(w[30],12),ys:bits(w[31],11),log:st.log.slice()},
        msg:'模擬執行中：先按 Home，再按 Start'};
    }};
};

/* ======================================================================
   第 0 課
   ====================================================================== */
L.push({id:'L00',order:0,no:'0',part:'起步',title:'你要做出什麼：課程地圖',mins:20,
goals:[['這堂課的目標','先看完成品，知道每一課在替它做哪一塊。'],['需要的東西','LabVIEW 2018 以上（英文版也行）、Python 3、這個資料夾裡的軟 PLC。不需要實體 PLC。'],['學完整套後','你能從空白 VI 開始，自己寫出雙龍門上位機 GT_Main.vi，接軟 PLC 或實機 FX3S 都能用。']],
body:[
C.h3('看','r','完成品長這樣（可以按）'),
`<p>下面是你在第 21 課結束時會親手完成的 <b>GT_Main.vi</b> 前面板。這裡用網頁模擬，按鈕都能按：按工具列的 <b>Run</b>（白色箭頭），再按 <b>Home</b>，等 Homed 亮，接著按 <b>Start</b>。切換上面的分頁看看手動、參數、I/O、異常紀錄。</p>`,
{lv:{name:'GT_Main.vi（完成品預覽）',fp:C.mainPanel(),sim:C.mainSim(),view:'fp',hint:'這是網頁模擬，不是真的 LabVIEW'},cap:'機台圖的龍門位置、計數、步序都由「PLC 回傳的 D 暫存器」決定，LabVIEW 只負責顯示和送命令。'},
`<div class="note"><b>重點</b>機台的動作邏輯（步序、互鎖、急停）全部在 PLC 裡。LabVIEW 上位機只做三件事：<b>讀狀態來顯示</b>、<b>把按鈕變成命令寫給 PLC</b>、<b>記錄</b>。所以就算 LabVIEW 當掉，機台也不會失控。</div>`,
C.h3('懂','','整個系統怎麼連'),
{fn:d=>{d.innerHTML=`<div class="fig"><svg viewBox="0 0 980 300" width="100%" style="max-width:980px" font-family="Microsoft JhengHei UI,sans-serif">
<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="#445"/></marker></defs>
<rect x="10" y="40" width="300" height="220" rx="12" fill="#eef4ff" stroke="#7aa2e8"/><text x="24" y="66" font-size="17" font-weight="700">LabVIEW：GT_Main.vi</text>
<rect x="30" y="84" width="120" height="70" rx="8" fill="#fff" stroke="#7aa2e8"/><text x="90" y="112" text-anchor="middle" font-size="14">UI 迴圈</text><text x="90" y="132" text-anchor="middle" font-size="12" fill="#556">讀按鈕 → 命令</text>
<rect x="170" y="84" width="120" height="70" rx="8" fill="#fff" stroke="#7aa2e8"/><text x="230" y="112" text-anchor="middle" font-size="14">通訊迴圈</text><text x="230" y="132" text-anchor="middle" font-size="12" fill="#556">寫命令、讀狀態</text>
<path d="M150,119H168" stroke="#007b7b" stroke-width="3" marker-end="url(#ar)"/><text x="138" y="176" font-size="12" fill="#007b7b">Queue 命令佇列</text>
<rect x="30" y="196" width="260" height="48" rx="8" fill="#fff" stroke="#7aa2e8"/><text x="160" y="225" text-anchor="middle" font-size="13">FX_ReadD / FX_WriteD（你寫的驅動）</text>
<rect x="400" y="90" width="170" height="120" rx="10" fill="#f6f0ff" stroke="#a78bdb"/><text x="485" y="120" text-anchor="middle" font-size="15" font-weight="700">傳輸</text>
<text x="485" y="146" text-anchor="middle" font-size="12">在家：TCP 127.0.0.1:5551</text><text x="485" y="166" text-anchor="middle" font-size="12">實機：RS-422 COM</text><text x="485" y="188" text-anchor="middle" font-size="12">9600 7E1、FX 編程協定</text>
<path d="M310,200H398" stroke="#6b3fa0" stroke-width="3" marker-end="url(#ar)"/><path d="M398,120H312" stroke="#6b3fa0" stroke-width="3" marker-end="url(#ar)"/>
<rect x="660" y="40" width="300" height="220" rx="12" fill="#effaf2" stroke="#6cc08a"/><text x="674" y="66" font-size="17" font-weight="700">PLC（FX3S 或軟 PLC）</text>
<text x="680" y="98" font-size="13">寫進來：D100～D103 參數</text><text x="680" y="120" font-size="13">　　　　D106 脈衝命令（Start…）</text><text x="680" y="142" font-size="13">　　　　D107 點動命令</text><text x="680" y="164" font-size="13">　　　　D240 HMI 心跳</text>
<text x="680" y="196" font-size="13">讀回去：D200～D241 步序、計數、</text><text x="680" y="218" font-size="13">　　　　異常碼、X/Y 狀態字</text>
<path d="M570,150H658" stroke="#6b3fa0" stroke-width="3" marker-end="url(#ar)"/>
</svg><div class="cap">LabVIEW 只讀寫 D 暫存器，PLC 程式再把 D106、D107 轉成 M 命令。這個分工在 PLC 課程已經做好了，LabVIEW 這邊照表讀寫就好。</div></div>`;}},
C.h3('路','b','學習路線：每一課都是完成品的一塊'),
C.table(['階段','課','你會做出的檔案','在完成品裡的用途'],[
 ['起步','0～1','L01_Total.vi','認識 LabVIEW 視窗、第一個 VI'],
 ['基礎','2～11','練習 VI ＋ <code>GT_StepText.vi</code>、<code>GT_AlarmText.vi</code>、<code>GT_Status.ctl</code>、<code>FX_ReadFrame.vi</code>、<code>FX_WriteFrame.vi</code>','步序文字、異常文字、狀態資料結構、封包產生器'],
 ['通訊','12～14','<code>FX_Open.vi</code>、<code>FX_ReadD.vi</code>、<code>FX_WriteD.vi</code>','真的和軟 PLC 對話：讀 D、寫 D'],
 ['專案','15～21','<code>GT_Parse.vi</code>、<code>GT_Monitor.vi</code>、<code>GT_Log.vi</code>、<code>GT_Main.vi</code>','監看畫面 → 雙迴圈 → 命令 → 分頁面板 → 心跳與結束 → 紀錄 → 整合測試']
]),
`<div class="tip"><b>上課方法</b>每一課都有「跟著做」的步驟播放器：上面是說明（含選盤路徑和接線表），下面是那一步做完應該長什麼樣。<b>請一定要開真的 LabVIEW 照做</b>，網頁上的圖只是讓你對照。每一步做完再按「下一步」。</div>`,
C.h3('備','x','開工前準備'),
{todo:[
 '在桌面建立資料夾 <code>我的雙龍門</code>，裡面再建 <code>練習</code> 子資料夾。之後所有 VI 都存在這裡，<b>檔名、控制項名稱照課程寫的英文</b>，後面的課才對得上。',
 '確認能開 LabVIEW。學校 LabVIEW 2018 英文版完全可以用；課程裡的選單名稱都用英文寫。',
 'LabVIEW 要有 <b>NI-VISA</b>（安裝 LabVIEW 時通常一起裝；在 Functions ▸ Instrument I/O 裡看得到 VISA 就有）。第 12 課才用到。',
 '確認軟 PLC 能跑：在 <code>實作環境</code> 資料夾開 PowerShell，執行 <code>python .\\softplc\\softplc.py --no-board</code>，出現模擬器視窗就好，先關掉。',
 '（建議）LabVIEW 選單 <b>Tools ▸ Options ▸ Block Diagram</b>，取消勾選 <b>Place front panel terminals as icons</b>。方塊圖端子會變成小方塊，和本課程的圖一樣，也比較省空間。'
]},
`<div class="warn"><b>注意</b>本課程的 VI 面板文字一律用英文。LabVIEW 用系統編碼存中文，學校英文版電腦打開會變亂碼。中文說明放在課程網頁裡就好。</div>`,
C.h3('測','q','小測驗'),
{quiz:[
 {q:'雙龍門的「步序」（現在走到哪一步）是誰決定的？',o:['LabVIEW 的 While Loop','PLC 的步進梯形圖','Python 模擬器的畫面'],a:1,ex:'步序在 PLC（S20～S28）。LabVIEW 只是把 D200 讀回來顯示。'},
 {q:'按 Start 時，LabVIEW 實際做的事是？',o:['直接把 Y 輸出打開','寫 D106 = 1，PLC 再轉成 M100','寫 X 輸入'],a:1,ex:'LabVIEW 只寫 D。PLC 程式「LD> D106 K0 → MOV D106 K2M100」把它轉成 M 命令，並自己清回 0。'}
]}
]});

/* ======================================================================
   第 1 課：LabVIEW 環境與第一個 VI
   ====================================================================== */
const total={name:'L01_Total.vi',view:'split',
 fp:{w:330,h:200,items:[
  {id:'r',k:'num',ctl:true,label:'Right Count',x:20,y:20,w:110,v:12},
  {id:'l',k:'num',ctl:true,label:'Left Count',x:20,y:80,w:110,v:9},
  {id:'t',k:'num',label:'Total',x:190,y:50,w:100}]},
 bd:{w:420,h:200,nodes:[
  {id:'r',k:'ctl',t:'dbl',label:'Right Count',x:30,y:40},
  {id:'l',k:'ctl',t:'dbl',label:'Left Count',x:30,y:120},
  {id:'add',k:'fn',fn:'Add',x:180,y:72},
  {id:'t',k:'ind',t:'dbl',label:'Total',x:320,y:76}],
  wires:[{id:'w1',from:'r',to:'add.x',t:'dbl',mx:150},{id:'w2',from:'l',to:'add.y',t:'dbl',mx:150},{id:'w3',from:'add.out',to:'t',t:'dbl'}]},
 sim:{live:true,step(i){const t=i.r+i.l;return {out:{t},vals:{r:i.r,l:i.l,'add.out':t}};}}
};
L.push({id:'L01',order:1,no:'1',part:'起步',title:'認識 LabVIEW，寫第一個 VI',mins:45,files:['練習\\L01_Total.vi'],
goals:[['學會','前面板／方塊圖、選盤、Quick Drop、接線、執行、存檔。'],['做出','右龍門計數＋左龍門計數＝總數的小程式。'],['為什麼','完成品的每個數字顯示都是「端子 → 運算 → 顯示」這個模式。']],
check:'L01_Total.vi 執行後，Right Count 12、Left Count 9，Total 顯示 21。',
body:[
C.h3('懂','','一個 VI = 兩個視窗'),
`<p>LabVIEW 的程式叫 <b>VI</b>（Virtual Instrument，副檔名 <code>.vi</code>）。每個 VI 有兩個視窗：</p>
<div class="cols"><div class="fig"><b>前面板 Front Panel</b>（灰底）<br>使用者看到的畫面。放 <b>Control</b>（輸入：數字框、按鈕）和 <b>Indicator</b>（顯示：數字顯示、燈號）。</div>
<div class="fig"><b>方塊圖 Block Diagram</b>（白底）<br>程式本體。前面板每個物件在這裡都有一個<b>端子</b>，用<b>線</b>把端子和函式接起來。</div></div>`,
C.table(['快捷鍵','作用','什麼時候用'],[
 ['<kbd>Ctrl</kbd>+<kbd>E</kbd>','切換前面板／方塊圖','最常用，找不到另一個視窗就按它'],
 ['<kbd>Ctrl</kbd>+<kbd>T</kbd>','兩個視窗左右並排','邊放控制項邊看方塊圖'],
 ['<kbd>Ctrl</kbd>+<kbd>Space</kbd>','Quick Drop：打名字直接放函式','找不到選盤位置時'],
 ['<kbd>Ctrl</kbd>+<kbd>H</kbd>','Context Help：滑鼠指到的東西的說明','不知道函式端子是什麼時'],
 ['<kbd>Ctrl</kbd>+<kbd>R</kbd>','Run 執行','—'],
 ['<kbd>Ctrl</kbd>+<kbd>B</kbd>','刪掉所有斷線','接錯線、出現黑色虛線 ✕ 時'],
 ['<kbd>Ctrl</kbd>+<kbd>U</kbd>','Clean Up Diagram 自動排版','圖亂掉時（大 VI 慎用）'],
 ['<kbd>Ctrl</kbd>+<kbd>S</kbd>','存檔','—']
]),
`<h4>選盤（Palette）</h4><p>在<b>前面板空白處按右鍵</b>會跳出 <b>Controls</b> 選盤（放控制項）；在<b>方塊圖空白處按右鍵</b>會跳出 <b>Functions</b> 選盤（放函式）。左上角的圖釘可以把選盤釘住。本課程寫位置時用這種格式：</p>
<p>${fn('Programming','Numeric','Add')}　表示 Functions 選盤 → Programming → Numeric → Add。</p>
<p>更快的方法是 <b>Quick Drop</b>：在方塊圖按 <kbd>Ctrl</kbd>+<kbd>Space</kbd>，打 <code>Add</code>，按 Enter，再點一下放下。前面板也能用（打 <code>Numeric Control</code>）。</p>
<h4>滑鼠游標會自己換工具</h4>
${C.table(['游標樣子','時機','能做什麼'],[['箭頭','指在物件上','選取、拖曳、調大小'],['線軸（像捲線）','指在端子上','點一下開始接線，再點目的端子'],['手指','指在控制項上（執行時）','操作數值、按按鈕'],['I 字','雙擊文字','改標籤、改常數']])}
`,
C.h3('做','b','跟著做：L01_Total.vi'),
{steps:{title:'第一個 VI：Total = Right Count + Left Count',lv:total,steps:[
 {t:'開新 VI 並存檔',view:'fp',add:[],h:`<p>LabVIEW 選單 <b>File ▸ New VI</b>（或 <kbd>Ctrl</kbd>+<kbd>N</kbd>）。會出現一個灰色前面板和一個白色方塊圖。</p><p>先存檔：<kbd>Ctrl</kbd>+<kbd>S</kbd>，存到 <code>我的雙龍門\\練習\\L01_Total.vi</code>。先存檔的好處：之後 LabVIEW 才知道這個 VI 在哪個資料夾。</p>`},
 {t:'放第一個 Control：Right Count',view:'fp',add:['r'],h:`<p>前面板空白處按右鍵 → ${ctl('Modern','Numeric','Numeric Control')} ${qd('Numeric Control')}，點一下放下。</p><p>放下後標籤會反白，直接打 <code>Right Count</code>，按 <kbd>Enter</kbd>（或點旁邊空白處）。</p><p class="qd">小數字框左邊有上下箭頭，是 Control（可以輸入）的特徵。</p>`},
 {t:'放第二個 Control：Left Count',view:'fp',add:['l'],h:`<p>同樣放一個 ${ctl('Modern','Numeric','Numeric Control')}，標籤 <code>Left Count</code>。</p><p class="qd">技巧：選取 Right Count，按住 <kbd>Ctrl</kbd> 拖曳可以複製一個，再改標籤。</p>`},
 {t:'放 Indicator：Total',view:'fp',add:['t'],h:`<p>${ctl('Modern','Numeric','Numeric Indicator')} ${qd('Numeric Indicator')}，標籤 <code>Total</code>。</p><p>Indicator 沒有上下箭頭、底色比較灰，代表「只能看、不能輸入」。</p>`},
 {t:'切到方塊圖：端子已經在了',view:'split',add:[],h:`<p>按 <kbd>Ctrl</kbd>+<kbd>T</kbd> 並排。方塊圖已經自動出現三個端子：</p><ul><li><b>Control 端子</b>：外框粗，小箭頭在<b>右邊</b>（資料從這裡流出去）。</li><li><b>Indicator 端子</b>：外框細，小箭頭在<b>左邊</b>（資料流進來）。</li></ul><p>如果你看到的是大圖示：在端子上按右鍵，取消 <b>View As Icon</b>。端子裡的 <code>DBL</code> 是資料型別（下一課講），先不用管。</p><p>把三個端子排成左邊兩個、右邊一個，像下面的圖。</p>`},
 {t:'放 Add 函式',view:'bd',add:['add'],h:`<p>方塊圖空白處按右鍵 → ${fn('Programming','Numeric','Add')} ${qd('Add')}，放在中間。</p><p>Add 是黃色三角形，左邊兩個輸入（<code>x</code>、<code>y</code>），右邊一個輸出（<code>x+y</code>）。按 <kbd>Ctrl</kbd>+<kbd>H</kbd> 再把滑鼠移到 Add 上，Context Help 會顯示端子名稱。</p>`},
 {t:'接線',view:'bd',add:['w1','w2','w3'],h:`<p>滑鼠移到 Right Count 端子右邊的小箭頭，游標變成線軸 → 點一下 → 移到 Add 的 <code>x</code>（上面那個輸入）→ 再點一下。其他兩條同樣接法：</p>${wt([['Right Count 端子','Add 的 x（上）'],['Left Count 端子','Add 的 y（下）'],['Add 的 x+y（右）','Total 端子']])}<p>接好後線是<b>橘色</b>（DBL 數字）。如果出現<b>黑色虛線加紅色 ✕</b> 表示接錯，按 <kbd>Ctrl</kbd>+<kbd>B</kbd> 清掉重接。</p>`},
 {t:'執行',view:'split',add:[],h:`<p>回到前面板，Right Count 打 <code>12</code>、Left Count 打 <code>9</code>，按 <b>Run</b>（工具列白色箭頭，或 <kbd>Ctrl</kbd>+<kbd>R</kbd>）。Total 顯示 <b>21</b>。</p><p>👉 在下面的網頁模擬上也可以直接改數字、按 Run。再按方塊圖工具列的<b>燈泡</b>（Highlight Execution）後按 Run，會看到資料像小球一樣沿著線流動——真的 LabVIEW 也有同一顆燈泡。</p><p>最後 <kbd>Ctrl</kbd>+<kbd>S</kbd> 存檔。</p>`}
]}},
`<div class="why"><b>為什麼按一次 Run 只算一次？</b>這個 VI 沒有迴圈，資料從左流到右就結束了。工具列旁邊的 <b>Run Continuously</b>（兩個箭頭繞圈）會一直重複執行，但那只是測試用。真正的程式會用 While Loop（第 4 課）。</div>`,
C.h3('錯','x','常見問題'),
C.table(['症狀','原因','怎麼做'],[
 ['Run 箭頭變成<b>斷掉的灰色箭頭</b>','程式有錯（例如 Add 少一條線）','點斷掉的箭頭，跳出 Error List，雙擊錯誤會帶你到出錯的位置'],
 ['線是黑色虛線，中間紅色 ✕','型別不合或兩個輸出接在一起','<kbd>Ctrl</kbd>+<kbd>B</kbd> 刪掉斷線再重接'],
 ['找不到方塊圖','視窗被蓋住了','<kbd>Ctrl</kbd>+<kbd>E</kbd>，或選單 Window ▸ Show Block Diagram'],
 ['放錯成 Indicator（沒有上下箭頭，不能輸入）','選盤點錯','在物件上按右鍵 ▸ <b>Change to Control</b>']
]),
C.h3('測','q','小測驗'),
{quiz:[
 {q:'方塊圖上，哪一個是 Control 端子？',o:['外框細、小箭頭在左邊','外框粗、小箭頭在右邊','黃色三角形'],a:1,ex:'Control 是資料的來源，箭頭朝外（右）。Indicator 是終點，箭頭朝內。'},
 {q:'不知道 Add 的上下兩個輸入叫什麼名字，最快的方法是？',o:['上網搜尋','按 Ctrl+H 開 Context Help，再把滑鼠移到 Add 上','把 Add 刪掉重放'],a:1,ex:'Context Help 是 LabVIEW 最重要的工具之一，每個函式的端子名稱、型別都在裡面。'},
 {q:'想放 Numeric Control，但不知道它在選盤哪裡，可以？',o:['按 Ctrl+Space 打 Numeric Control','只能一個一個資料夾找','用 Ctrl+B'],a:0,ex:'Quick Drop（Ctrl+Space）前面板和方塊圖都能用。'}
]}
]});
})();
