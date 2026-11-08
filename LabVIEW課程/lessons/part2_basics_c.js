/* 第二部分 C：字串與 FX 封包、SubVI、錯誤處理（第 9～11 課） */
(function(){
const L=window.LESSONS,fn=C.fn,ctl=C.ctl,qd=C.qd,wt=C.wt,FX=C.FX;

/* 封包拆解器：輸入 D、字數或寫入值，畫出每個字元 */
function frameLab(d,mode){
  d.innerHTML=`<div class="fig"><div style="display:flex;gap:14px;flex-wrap:wrap;align-items:end">
   <label>動作 <select class="m"><option value="r">讀 D（命令 '0'）</option><option value="w">寫 D（命令 '1'）</option></select></label>
   <label>D 編號 <input class="d" type="number" value="100" min="0" max="7999" style="width:80px"></label>
   <label class="lw">字數 <input class="n" type="number" value="1" min="1" max="32" style="width:60px"></label>
   <label class="lv" style="display:none">寫入值 <input class="v" type="number" value="4" min="0" max="65535" style="width:80px"></label></div>
   <div class="out" style="margin-top:10px"></div></div>`;
  const $=s=>d.querySelector(s);
  if(mode==='w')$('.m').value='w';
  function upd(){
    const w=$('.m').value==='w';$('.lw').style.display=w?'none':'';$('.lv').style.display=w?'':'none';
    const D=+$('.d').value||0,n=Math.max(1,Math.min(32,+$('.n').value||1)),v=(+$('.v').value||0)&0xFFFF;
    const a=FX.hex(FX.addr(D),4),nn=FX.hex(w?2:2*n,2),data=w?FX.swap4(v):'';
    const body=(w?'1':'0')+a+nn+data+'\x03',ss=FX.sum(body);
    const parts=[['STX','02h','ctl'],[w?'1':'0','命令',''],...[...a].map((c,i)=>[c,i?'':'位址','adr']),...[...nn].map((c,i)=>[c,i?'':'位元組數','len']),...[...data].map((c,i)=>[c,i?'':'資料','dat']),['ETX','03h','ctl'],...[...ss].map((c,i)=>[c,i?'':'校驗','sum'])];
    let sum=0;const steps=[...body].map(c=>{sum+=c.charCodeAt(0);return (c==='\x03'?'ETX':"'"+c+"'")+'='+c.charCodeAt(0).toString(16).toUpperCase();});
    let reply='';
    if(w) reply='PLC 回 <b>ACK</b>（06h）。寫錯位址或校驗錯回 <b>NAK</b>（15h）。';
    else{const ex=Array.from({length:n},(_,i)=>[1234,0x0B54,20,40][i%4]);const r=FX.reply(ex);
      reply=`假設 D${D}～D${D+n-1} = ${ex.join('、')}，PLC 回：`+C.frameHTML([['STX','02h','ctl'],...[...r.slice(1,-3)].map((c,i)=>[c,i%4===0?'D'+(D+i/4):'','dat']),['ETX','03h','ctl'],...[...r.slice(-2)].map(c=>[c,'','sum'])])+`共 <b>${r.length}</b> 個字元 = 4 × ${n} + 4。每個字 4 個字元，<b>低位元組在前</b>：1234 = 04D2h → 傳 <code>D204</code>。`;}
    $('.out').innerHTML=`<b>送出的封包（${body.length+3} 個字元）</b>`+C.frameHTML(parts)+
      `<p style="font-size:14px">位址 = 1000h + 2 × ${D} = <b>${a}h</b>　｜　位元組數 = ${w?'1 個字 × 2 = 02':n+' 個字 × 2 = '+nn+'h'}${w?`　｜　資料 ${v} = ${FX.hex(v,4)}h → 低位元組在前 <b>${data}</b>`:''}</p>
      <p style="font-size:13px;color:#5c6577">校驗：${steps.join(' + ')} = ${sum.toString(16).toUpperCase()}h，取低 8 位 → <b>${ss}</b></p><p style="font-size:14px">${reply}</p>`;
  }
  d.querySelectorAll('input,select').forEach(e=>e.addEventListener('input',upd));upd();
}
C.frameLab=frameLab;

/* ======================================================================
   第 9 課：字串與 FX 封包
   ====================================================================== */
const frameVI={name:'L09_Frame.vi',view:'bd',
 fp:{w:400,h:200,items:[
  {id:'d',k:'num',ctl:true,label:'D',rep:'U16',x:20,y:20,w:90,v:100},
  {id:'n',k:'num',ctl:true,label:'Words',rep:'U16',x:20,y:80,w:90,v:1},
  {id:'body',k:'str',label:'Body',x:150,y:20,w:220},
  {id:'ss',k:'str',label:'SS',x:150,y:80,w:60},
  {id:'fr',k:'str',label:'Frame',x:150,y:140,w:230,codes:true}]},
 bd:{w:900,h:270,nodes:[
  {id:'d',k:'ctl',t:'u16',label:'D',x:20,y:40},
  {id:'n',k:'ctl',t:'u16',label:'Words',x:20,y:150},
  {id:'k2',k:'const',t:'u16',v:2,x:62,y:100},
  {id:'mul',k:'fn',fn:'Multiply',x:110,y:36},
  {id:'k4',k:'const',t:'u16',v:4096,x:120,y:84},
  {id:'add',k:'fn',fn:'Add',x:180,y:46},
  {id:'mul2',k:'fn',fn:'Multiply',x:110,y:146},
  {id:'kf',k:'const',t:'str',v:'0%04X%02X',x:150,y:8},
  {id:'fmt',k:'fn',fn:'Format Into String',ins:['format string','input 1','input 2'],x:250,y:40,h:48},
  {id:'body',k:'ind',t:'str',label:'Body',x:340,y:4},
  {id:'ketx',k:'const',t:'str',v:'03',hex:true,x:300,y:110,label:'ETX (Hex Display)'},
  {id:'cat',k:'fn',fn:'Concatenate Strings',ins:['string 1','string 2'],x:380,y:52},
  {id:'sba',k:'fn',fn:'String To Byte Array',x:450,y:130},
  {id:'sum',k:'fn',fn:'Add Array Elements',x:540,y:130},
  {id:'kw',k:'const',t:'i32',v:2,x:560,y:190},
  {id:'hex',k:'fn',fn:'Number To Hexadecimal String',x:620,y:130},
  {id:'ss',k:'ind',t:'str',label:'SS',x:700,y:190},
  {id:'kstx',k:'const',t:'str',v:'02',hex:true,x:620,y:20,label:'STX'},
  {id:'cat2',k:'fn',fn:'Concatenate Strings',ins:['string 1','string 2','string 3'],x:730,y:40,h:48},
  {id:'fr',k:'ind',t:'str',label:'Frame',x:820,y:58}],
 wires:[
  {id:'w1',from:'d',to:'mul.x',t:'u16'},{id:'w2',from:'k2',to:'mul.y',t:'u16',mx:95},{id:'w3',from:'k2',to:'mul2.y',t:'u16',mx:95},{id:'w4',from:'n',to:'mul2.x',t:'u16'},
  {id:'w5',from:'mul.out',to:'add.x',t:'u16'},{id:'w6',from:'k4',to:'add.y',t:'u16',mx:165},
  {id:'w7',from:'kf',to:'fmt.format string',t:'str',mx:230},{id:'w8',from:'add.out',to:'fmt.input 1',t:'u16',mx:225},{id:'w9',from:'mul2.out',to:'fmt.input 2',t:'u16',mx:235},
  {id:'w10',from:'fmt.resulting string',to:'body',t:'str',mx:318},{id:'w11',from:'fmt.resulting string',to:'cat.string 1',t:'str',mx:318},{id:'w12',from:'ketx',to:'cat.string 2',t:'str',mx:360},
  {id:'w13',from:'cat.concatenated string',to:'sba',t:'str',mx:432},{id:'w14',from:'sba.unsigned byte array',to:'sum',t:'u8[]'},
  {id:'w15',from:'sum.sum',to:'hex.number',t:'u8'},{id:'w16',from:'kw',to:'hex.width',t:'i32',mx:605},{id:'w17',from:'hex.hex integer string',to:'ss',t:'str',mx:684},
  {id:'w18',from:'kstx',to:'cat2.string 1',t:'str',mx:700},{id:'w19',from:'cat.concatenated string',to:'cat2.string 2',t:'str',mx:432},{id:'w20',from:'hex.hex integer string',to:'cat2.string 3',t:'str',mx:700},
  {id:'w21',from:'cat2.concatenated string',to:'fr',t:'str'}]},
 sim:{live:true,step(i){const a=4096+2*i.d,b=2*i.n;const body='0'+FX.hex(a,4)+FX.hex(b,2);const be=body+'\x03';const bytes=[...be].map(c=>c.charCodeAt(0));const s=bytes.reduce((x,y)=>x+y,0)&255;const ss=FX.hex(s,2);
  return {out:{body,ss,fr:'\x02'+be+ss},vals:{d:i.d,n:i.n,k2:2,k4:4096,'mul.out':2*i.d,'add.out':a,'mul2.out':b,kf:'0%04X%02X','fmt.resulting string':body,ketx:'\x03','cat.concatenated string':be,'sba.unsigned byte array':bytes,'sum.sum':s,kw:2,'hex.hex integer string':ss,kstx:'\x02','cat2.concatenated string':'\x02'+be+ss}};}}
};
L.push({id:'L09',order:9,no:'9',part:'LabVIEW 基礎',title:'字串：親手組出 FX 封包',mins:60,files:['練習\\L09_Frame.vi'],
goals:[['學會','Format Into String、十六進位字串、Hex Display 常數、Concatenate、String To Byte Array、校驗和。'],['做出','輸入 D 和字數，產生「讀 D」的完整封包。'],['用在專案','第 10 課把它變成 FX_ReadFrame.vi，第 13 課送給 PLC。']],
check:'D = 100、Words = 1 時，Frame 是 &lt;STX&gt;010C802&lt;ETX&gt;71（共 11 個字元）。',
body:[
C.h3('懂','','FX 編程協定：整個封包都是文字'),
`<p>PLC 和 LabVIEW 之間傳的是一串 ASCII 字元。除了頭尾兩個控制字元 <b>STX</b>（02h）、<b>ETX</b>（03h），中間的位址、長度、資料、校驗全部寫成<b>十六進位文字</b>。所以只要會處理字串，就能自己寫驅動。</p>
${C.table(['動作','送出','PLC 回應'],[
 ['讀 D','STX　<b>0</b>　位址(4)　位元組數(2)　ETX　校驗(2)','STX　資料(4 × 字數)　ETX　校驗(2)'],
 ['寫 1 個 D','STX　<b>1</b>　位址(4)　02　資料(4)　ETX　校驗(2)','ACK（06h），錯誤回 NAK（15h）']
])}
<p>下面這個拆解器可以隨便改數字，看封包每個字元怎麼來的：</p>`,
{fn:d=>frameLab(d,'r')},
`<div class="note"><b>三個規則記起來</b>① 位址 = 1000h + 2 × D（第 2 課算過）。② 位元組數 = 字數 × 2。③ 校驗 = STX 之後到 ETX（含 ETX）每個字元的 ASCII 碼加起來，取最低 8 位元，寫成 2 個十六進位字元。</div>`,
C.h3('懂','','會用到的字串函式'),
C.table(['函式','選盤','在這課做什麼'],[
 ['Format Into String',fn('Programming','String','Format Into String'),'用格式字串 <code>0%04X%02X</code> 一次產生「0 + 4 位十六進位位址 + 2 位十六進位長度」'],
 ['Concatenate Strings',fn('Programming','String','Concatenate Strings'),'把好幾段字串接起來，往下拉可以增加輸入'],
 ['String To Byte Array',fn('Programming','String','String/Array/Path Conversion','String To Byte Array'),'字串變成 U8 陣列（每個字元的 ASCII 碼）'],
 ['Add Array Elements',fn('Programming','Numeric','Add Array Elements'),'把陣列全部加起來。輸入是 U8 時結果也是 U8，超過 255 自動繞回，剛好就是「取低 8 位」'],
 ['Number To Hexadecimal String',fn('Programming','String','Number/String Conversion','Number To Hexadecimal String'),'數字變十六進位文字；width 接 2 會補 0，例如 7 → "07"']
]),
`<h4>格式字串 %04X 是什麼意思</h4>
${C.table(['寫法','意思','例子'],[['%X','十六進位大寫','4296 → 10C8'],['%04X','至少 4 位，不足補 0','200 → 00C8'],['%02X','至少 2 位，不足補 0','2 → 02'],['%d','十進位','4296 → 4296']])}
<h4>STX、ETX 這種看不見的字元怎麼打</h4>
<p>放一個 String Constant，在上面<b>右鍵 ▸ Hex Display</b>，再輸入 <code>02</code>（STX）或 <code>03</code>（ETX）。常數會以十六進位顯示，裡面其實只有 1 個字元。也可以用 <b>'\\' Codes Display</b> 打 <code>\\02</code>。</p>`,
C.h3('做','b','跟著做：L09_Frame.vi'),
{steps:{title:'讀 D 的封包產生器',lv:frameVI,steps:[
 {t:'前面板',view:'fp',add:['d','n','body','ss','fr'],h:`<p>存成 <code>練習\\L09_Frame.vi</code>。兩個 U16 Control：<code>D</code>、<code>Words</code>。三個 String Indicator：<code>Body</code>、<code>SS</code>、<code>Frame</code>。</p><p>Frame 上右鍵 ▸ <b>'\\' Codes Display</b>，看不見的 STX/ETX 才會顯示成 \\02、\\03。</p>`},
 {t:'算位址與位元組數（第 2、3 課的內容）',view:'bd',add:['k2','mul','k4','add','mul2','w1','w2','w3','w4','w5','w6'],h:`<p>和 L03_Address 一樣，全部用 U16：位址 = D × 2 + 4096，位元組數 = Words × 2。可以直接從 L03_Address.vi 複製過來（框選 → <kbd>Ctrl</kbd>+<kbd>C</kbd> → <kbd>Ctrl</kbd>+<kbd>V</kbd>）。</p>`},
 {t:'Format Into String 產生 Body',view:'bd',add:['kf','fmt','w7','w8','w9','body','w10'],h:`<p>${fn('Programming','String','Format Into String')} ${qd('Format Into String')}，<b>往下拉成兩個 input</b>。在 format string 上右鍵 ▸ Create ▸ Constant，打 <code>0%04X%02X</code>。</p>${wt([['Add 的輸出（位址）','Format Into String 的 input 1'],['下面 Multiply 的輸出（位元組數）','Format Into String 的 input 2'],['resulting string','Body（Create Indicator）']])}<p>D = 100、Words = 1 時 Body = <code>010C802</code>。</p>`},
 {t:'接上 ETX',view:'bd',add:['ketx','cat','w11','w12'],h:`<p>String Constant → 右鍵 Hex Display → 打 <code>03</code>。${fn('Programming','String','Concatenate Strings')} 接 Body 和 ETX，得到「Body + ETX」，這就是要算校驗的範圍。</p>`},
 {t:'算校驗 SS',view:'bd',add:['sba','w13','sum','w14','hex','kw','w15','w16','ss','w17'],h:`${wt([['Concatenate 的輸出','String To Byte Array'],['String To Byte Array','Add Array Elements','U8 陣列，加總自動取低 8 位'],['Add Array Elements 的 sum','Number To Hexadecimal String 的 number'],['常數 2','Number To Hexadecimal String 的 width'],['hex integer string','SS（Create Indicator）']])}<p>D100 的 SS 應該是 <code>71</code>。</p>`},
 {t:'組成完整 Frame',view:'bd',add:['kstx','cat2','w18','w19','w20','fr','w21'],h:`<p>再一個 Concatenate Strings，拉成 3 個輸入：<b>STX</b>（Hex Display 打 02）、Body+ETX、SS。輸出接 Frame。</p><p>Run：Frame 顯示 <code>\\02010C802\\0371</code>。和上面拆解器的結果比一比。</p><p class="qd">網頁上按方塊圖工具列的「123」可以顯示每條線的值；切到「前面板」可以改 D 和 Words 再按 Run。</p>`}
]}},
C.real('FX_ReadFrame','這是第 10 課整理成 SubVI 之後的樣子：校驗那一段已經換成 FX_Sum.vi（中間那個小圖示）。其餘和你剛做的 L09_Frame.vi 一樣。'),
`<div class="tip"><b>寫入封包</b>寫入只多一段資料：格式字串改成 <code>1%04X02%04X</code>，第二個 input 接「<b>Swap Bytes</b> 之後的值」。${fn('Programming','Numeric','Data Manipulation','Swap Bytes')} 會把 U16 的高低位元組對調：4 = 0004h → 0400h → 文字 <code>0400</code>，剛好符合「低位元組在前」。下一課會做成 FX_WriteFrame.vi。</div>`,
{fn:d=>frameLab(d,'w')},
C.h3('測','q','小測驗'),
{quiz:[
 {q:'讀 D200 開始 30 個字，位元組數欄位是？',o:['30','3C','1E'],a:1,ex:'30 × 2 = 60 = 3Ch。'},
 {q:'為什麼 Add Array Elements 的輸入要是 U8 陣列？',o:['U8 加總超過 255 會自動繞回，等於取低 8 位','U8 比較快','規定'],a:0,ex:'校驗只要低 8 位。如果用 I32 加總，就要再 AND FFh。'},
 {q:'寫 D106 = 1（Start），資料欄位是？',o:['0001','0100','1'],a:1,ex:'0001h 的低位元組 01 在前、高位元組 00 在後 → "0100"。'}
]}
]});

/* ======================================================================
   第 10 課：SubVI
   ====================================================================== */
const caller={name:'L10_UseFrame.vi',view:'bd',
 bd:{w:640,h:170,nodes:[
  {id:'d',k:'const',t:'u16',v:200,x:30,y:40},{id:'n',k:'const',t:'u16',v:30,x:40,y:70},
  {id:'rf',k:'sub',name:'FX_ReadFrame.vi',top:'FX',icon:['READ','FRAME'],ins:['D','Words'],outs:['Frame'],x:120,y:34,tip:'輸入 D、字數，輸出讀取封包'},
  {id:'o1',k:'ind',t:'str',label:'Read Frame',x:240,y:46},
  {id:'d2',k:'const',t:'u16',v:106,x:340,y:40},{id:'v2',k:'const',t:'u16',v:1,x:350,y:70},
  {id:'wf',k:'sub',name:'FX_WriteFrame.vi',top:'FX',icon:['WRITE','FRAME'],ins:['D','Value'],outs:['Frame'],x:420,y:34,tip:'輸入 D、值，輸出寫入封包'},
  {id:'o2',k:'ind',t:'str',label:'Write Frame',x:540,y:46}],
 wires:[{id:'w1',from:'d',to:'rf.D',t:'u16'},{id:'w2',from:'n',to:'rf.Words',t:'u16',mx:100},{id:'w3',from:'rf.Frame',to:'o1',t:'str'},
  {id:'w4',from:'d2',to:'wf.D',t:'u16'},{id:'w5',from:'v2',to:'wf.Value',t:'u16',mx:400},{id:'w6',from:'wf.Frame',to:'o2',t:'str'}]},
 sim:{live:true,step(){const a=FX.readFrame(200,30),b=FX.writeFrame(106,1);return {vals:{'rf.Frame':a,'wf.Frame':b,d:200,n:30,d2:106,v2:1}};}}
};
function connectorSVG(d){
  d.innerHTML=`<div class="fig"><svg viewBox="0 0 760 230" width="100%" style="max-width:760px" font-family="Tahoma,Microsoft JhengHei UI,sans-serif" font-size="12">
  <text x="10" y="18" font-weight="700">前面板右上角</text>
  <rect x="20" y="30" width="64" height="64" fill="#fff" stroke="#222"/><rect x="21" y="31" width="62" height="16" fill="#2f6fd0"/><text x="52" y="43" fill="#fff" text-anchor="middle" font-size="10" font-weight="700">FX</text><text x="52" y="64" text-anchor="middle" font-size="10">READ</text><text x="52" y="78" text-anchor="middle" font-size="10">FRAME</text>
  <text x="52" y="110" text-anchor="middle">Icon 圖示</text>
  <g transform="translate(110,30)"><rect width="64" height="64" fill="#fff" stroke="#222"/>
   <line x1="16" y1="0" x2="16" y2="64" stroke="#222"/><line x1="48" y1="0" x2="48" y2="64" stroke="#222"/><line x1="0" y1="16" x2="16" y2="16" stroke="#222"/><line x1="0" y1="32" x2="16" y2="32" stroke="#222"/><line x1="0" y1="48" x2="16" y2="48" stroke="#222"/>
   <line x1="48" y1="16" x2="64" y2="16" stroke="#222"/><line x1="48" y1="32" x2="64" y2="32" stroke="#222"/><line x1="48" y1="48" x2="64" y2="48" stroke="#222"/><line x1="16" y1="32" x2="48" y2="32" stroke="#222"/>
   <rect x="1" y="1" width="15" height="15" fill="#1652c9"/><rect x="1" y="17" width="15" height="15" fill="#1652c9"/><rect x="49" y="1" width="15" height="15" fill="#e0359e"/>
   <rect x="1" y="49" width="15" height="15" fill="#a08400"/><rect x="49" y="49" width="15" height="15" fill="#a08400"/></g>
  <text x="142" y="110" text-anchor="middle">Connector Pane（4-2-2-4）</text>
  <g transform="translate(280,26)">
   <text x="0" y="14">每一格 = 一個輸入或輸出端子。</text>
   <text x="0" y="36"><tspan fill="#1652c9" font-weight="700">■</tspan> 左上兩格：D、Words（輸入放左邊）</text>
   <text x="0" y="58"><tspan fill="#e0359e" font-weight="700">■</tspan> 右上一格：Frame（輸出放右邊）</text>
   <text x="0" y="80"><tspan fill="#a08400" font-weight="700">■</tspan> 左下：error in　右下：error out（NI 的慣例，所有 VI 都這樣放）</text>
   <text x="0" y="102" fill="#555">白色格子 = 還沒用的端子，留著以後擴充。</text>
  </g>
  <g transform="translate(20,140)"><text x="0" y="14" font-weight="700">接法：</text>
   <text x="0" y="36">① 滑鼠移到 connector pane 的一格（游標變線軸）點一下 → ② 點前面板的 Control 或 Indicator → 格子變成那個型別的顏色。</text>
   <text x="0" y="58">③ 全部接完後，在格子上右鍵 ▸ This Connection Is ▸ <tspan font-weight="700">Required</tspan>，呼叫的人沒接線就不能執行（必要的輸入建議設 Required）。</text></g>
  </svg></div>`;
}
L.push({id:'L10',order:10,no:'10',part:'LabVIEW 基礎',title:'SubVI：自己做函式',mins:55,files:['FX_Sum.vi','FX_ReadFrame.vi','FX_WriteFrame.vi','GT_AlarmText.vi（加上接線端）','GT_StepText.vi（加上接線端）'],
goals:[['學會','Icon、Connector Pane、端子配置慣例、Required、在別的 VI 裡呼叫。'],['做出','FX 封包三個 SubVI，以及把第 6 課的兩個 VI 變成可呼叫的 SubVI。'],['用在專案','驅動、解析、文字轉換全部是 SubVI，主程式才會乾淨。']],
check:'L10_UseFrame.vi 呼叫 FX_ReadFrame(200, 30) 得到 &lt;STX&gt;011903C&lt;ETX&gt;74，FX_WriteFrame(106, 1) 得到 &lt;STX&gt;110D4020100&lt;ETX&gt;30（和拆解器一致）。',
body:[
C.h3('懂','','任何 VI 都可以當成別人的函式'),
`<p>LabVIEW 沒有「函式」這個關鍵字：<b>任何 VI 只要設定好 Connector Pane，就能被拖到別的 VI 方塊圖裡呼叫</b>，這時它叫 <b>SubVI</b>。前面板的 Control 變成輸入、Indicator 變成輸出。</p>`,
{fn:connectorSVG},
C.h3('做','b','跟著做 ①：FX_Sum.vi（校驗）'),
{todo:[
 '開新 VI，存成 <code>我的雙龍門\\FX_Sum.vi</code>。前面板：String Control <code>Body</code>、String Indicator <code>SS</code>。',
 '從 L09_Frame.vi 複製校驗那一段（String To Byte Array → Add Array Elements → Number To Hexadecimal String + 常數 2）貼過來接好。',
 '前面板右上角的 connector pane（2018 預設顯示在 icon 左邊；看不到就在 icon 上右鍵 ▸ Show Connector）：右鍵 ▸ <b>Patterns</b> 選 <b>4-2-2-4</b>（4 × 2 × 2 × 4 格那個，通常是預設）。',
 '左上第一格 → 點 Body；右上第一格 → 點 SS。',
 '雙擊 icon 開 Icon Editor：用 Text 工具在上方打 <code>FX</code>、中間打 <code>SUM</code>，OK。',
 '存檔。測試：Body 輸入 <code>010C802</code> 加上 ETX（Body 控制項也改 \'\\\' Codes Display，打 <code>010C802\\03</code>），SS 應為 <code>71</code>。'
]},
C.h3('做','b','跟著做 ②：FX_ReadFrame.vi 與 FX_WriteFrame.vi'),
{todo:[
 '把 L09_Frame.vi <b>另存</b>為 <code>我的雙龍門\\FX_ReadFrame.vi</code>。刪掉 Body、SS 兩個 Indicator（測試用的）。',
 '把方塊圖上校驗那一段框選起來刪掉，改成從方塊圖右鍵 ▸ <b>Select a VI…</b> 選 FX_Sum.vi 放進來：Body+ETX 接 FX_Sum 的 Body，FX_Sum 的 SS 接到最後的 Concatenate。這就是「呼叫自己寫的 SubVI」。',
 'Connector：左上兩格接 <code>D</code>、<code>Words</code>，右上一格接 <code>Frame</code>。Icon 打 <code>FX</code> / <code>READ</code>。',
 '另存一份為 <code>FX_WriteFrame.vi</code>：Words 改名 <code>Value</code>；格式字串改 <code>1%04X02%04X</code>；Value 先經過 <b>Swap Bytes</b> 再接 input 2（位元組數固定 02 寫在格式字串裡，不用再乘 2）。Icon 打 <code>FX</code> / <code>WRITE</code>。',
 '開 <code>GT_AlarmText.vi</code>、<code>GT_StepText.vi</code>：connector 左上接輸入（Alarm Code / Step），右上接輸出（文字）。Icon 打 <code>GT</code> / <code>ALM</code>、<code>GT</code> / <code>STEP</code>。'
]},
`<p>做好後在新 VI 裡呼叫看看（方塊圖右鍵 ▸ Select a VI…，或直接從檔案總管把 .vi 拖進方塊圖）：</p>`,
{lv:caller,cap:'呼叫端看到的只是一個個圖示。按 Ctrl+H 再指到 SubVI，Context Help 會列出你接好的端子名稱。雙擊 SubVI 可以打開它的前面板。'},
C.real('FX_Sum'),C.real('FX_WriteFrame','Value 先經過 Swap Bytes（左下那個小方塊）再進 Format Into String，格式字串是 1%04X02%04X。'),
C.table(['好習慣','原因'],[
 ['輸入放左、輸出放右，error in/out 放左下右下','所有 NI 的函式都這樣，別人一看就懂'],
 ['VI 名稱加前綴：FX_ 是通訊、GT_ 是雙龍門專用','檔案多了才找得到，也避免和別的專案撞名'],
 ['Icon 寫 2～3 行短字','方塊圖上一眼就認得'],
 ['SubVI 不要有 While Loop 一直跑（除非是故意的）','呼叫端要等 SubVI 結束才拿到輸出，SubVI 不結束呼叫端就卡住']
]),
C.h3('測','q','小測驗'),
{quiz:[
 {q:'做好的 VI 放進另一個 VI 卻沒有端子可以接，最可能的原因？',o:['沒有設定 Connector Pane','沒有存檔','Icon 沒畫'],a:0,ex:'Connector Pane 決定哪些 Control/Indicator 是對外的端子。'},
 {q:'NI 慣例 error out 放在 connector 的哪裡？',o:['左上','右下','正中間'],a:1,ex:'error in 左下、error out 右下，錯誤線才會一直線穿過所有 VI。'},
 {q:'SubVI 裡面有一個沒有停止條件的 While Loop，呼叫它的 VI 會？',o:['正常','卡在那裡等 SubVI 結束','自動平行執行'],a:1,ex:'資料流規則：SubVI 執行完才會有輸出。'}
]}
]});

/* ======================================================================
   第 11 課：錯誤處理
   ====================================================================== */
const errCase={name:'錯誤處理的標準樣子',view:'bd',
 bd:{w:620,h:200,structs:[{id:'cs',k:'case',x:150,y:30,w:300,h:140,frames:['No Error','Error'],cur:0}],
  nodes:[
  {id:'ei',k:'ctl',t:'err',label:'error in (no error)',x:20,y:140},{id:'sel',k:'sel',t:'err',s:'cs',y:150},
  {id:'x',k:'ctl',t:'str',label:'RX',x:20,y:60},{id:'tx',k:'tunnel',t:'str',s:'cs',side:'l',y:70},
  {id:'work',k:'label',text:'真正要做的事\n（例如檢查回應、解析資料）',x:200,y:56,w:180,h:40,f:'cs:No Error'},
  {id:'pass',k:'label',text:'什麼都不做，\n錯誤原封不動傳下去',x:200,y:56,w:180,h:40,f:'cs:Error'},
  {id:'to',k:'tunnel',t:'err',s:'cs',side:'r',y:150},{id:'eo',k:'ind',t:'err',label:'error out',x:520,y:140},
  {id:'td',k:'tunnel',t:'str',s:'cs',side:'r',y:70},{id:'dd',k:'ind',t:'str',label:'Data',x:520,y:60}],
  wires:[{id:'w1',from:'ei',to:'sel',t:'err'},{id:'w2',from:'x',to:'tx.o',t:'str'},
   {id:'w3',from:'sel',to:'to.i',t:'err',noval:true,pts:[[300,150]],f:'cs:Error'},
   {id:'w4',from:'to.o',to:'eo',t:'err'},{id:'w5',from:'td.o',to:'dd',t:'str'}]}
};
L.push({id:'L11',order:11,no:'11',part:'LabVIEW 基礎',title:'錯誤處理：Error Cluster 與錯誤線',mins:50,files:['FX_Check.vi'],
goals:[['學會','Error Cluster、錯誤線串順序、Error Case、自訂錯誤碼、Simple Error Handler。'],['做出','FX_Check.vi：檢查 PLC 回應的 STX 和校驗，錯了就產生錯誤。'],['用在專案','通訊一出錯，後面的函式自動跳過，主程式才知道要重連。']],
check:'FX_Check 輸入正確回應 &lt;STX&gt;D204&lt;ETX&gt;DD 時 Data = D204、沒有錯誤；把最後一個字元改掉就輸出錯誤 5001。',
body:[
C.h3('懂','','Error Cluster：三個欄位'),
C.table(['欄位','型別','意思'],[['status','Boolean','True = 有錯誤'],['code','I32','錯誤碼。0 = 沒事；負數多半是 NI 的錯誤；5000～9999 留給使用者自訂'],['source','String','哪個 VI 出的錯、補充說明']]),
`<p>幾乎所有 I/O 函式（VISA、檔案、佇列）都有 <b>error in</b>（左下）和 <b>error out</b>（右下）。它們內部都是這樣寫的：<b>error in 有錯誤就什麼都不做，直接把錯誤傳出去</b>。</p>
<p>所以把錯誤線一路串起來有兩個效果：</p>
<ol><li><b>決定執行順序</b>：Open → Write → Read → Close 用錯誤線串起來，就一定照這個順序（資料流：要等前一個的 error out）。</li><li><b>出錯自動跳過</b>：Write 失敗了，Read 收到錯誤就不讀，錯誤一路傳到最後由一個地方顯示。</li></ol>`,
C.h3('懂','','自己的 SubVI 也要照這個規矩'),
`<p>把 error in 接到 Case Structure 的 Selector，Case 會自動變成 <b>No Error</b> 和 <b>Error</b> 兩頁（框會變成綠色／紅色邊）。工作寫在 No Error 頁；Error 頁只把錯誤接出去。</p>`,
{lv:errCase,cap:'點 Case 上面的 ◀ ▶ 看兩頁。Error 頁裡錯誤線直接從 Selector 接到輸出通道。'},
C.h3('做','b','跟著做：FX_Check.vi'),
`<p>PLC 的讀取回應是 <code>STX + 資料 + ETX + 校驗</code>。這個 VI 檢查兩件事：第一個字元是不是 STX、校驗對不對。對的話輸出中間的資料。</p>`,
C.table(['項目','怎麼算（n = String Length(RX)）'],[
 ['算校驗的範圍（資料 + ETX）','String Subset(RX, offset 1, length n − 3)'],
 ['收到的校驗','String Subset(RX, offset n − 2, length 2)'],
 ['第一個字元','String Subset(RX, offset 0, length 1)，和 STX 常數（Hex Display 02）比 Equal?'],
 ['資料','String Subset(RX, offset 1, length n − 4)']
]),
{todo:[
 '開新 VI 存 <code>我的雙龍門\\FX_Check.vi</code>。前面板：String Control <code>RX</code>（\'\\\' Codes Display）、String Indicator <code>Data</code>、' + ctl('Modern','Array, Matrix & Cluster','Error In 3D.ctl') + ' 和 <b>Error Out 3D.ctl</b>。',
 '方塊圖放 Case Structure，error in 接 Selector → 出現 No Error / Error 兩頁。',
 'No Error 頁：照上表用 String Length、Subtract、String Subset 切出四段。把「校驗範圍」接到 <b>FX_Sum.vi</b>，SS 和「收到的校驗」用 Equal? 比。第一個字元和 STX 比 Equal?。兩個結果 And → <code>OK</code>。',
 '做一個錯誤常數：在 error out 端子上右鍵 ▸ Create ▸ Constant，點 status 變成 ✗（True），code 打 <code>5001</code>，source 打 <code>FX_Check: bad reply (STX or checksum)</code>。',
 '用 ' + fn('Programming','Comparison','Select') + '：s 接 OK，t 接 error in（沒錯，傳原本的），f 接剛做的錯誤常數 → 接到 error out 通道。資料接 Data 通道。',
 'Error 頁：error in 直接接 error out 通道；Data 通道接一個空字串常數。',
 'Connector：左上 RX；右上 Data；左下 error in；右下 error out。Icon <code>FX</code> / <code>CHECK</code>。',
 '測試：RX 打 <code>\\02D204\\03</code> 加上正確校驗（用上一課拆解器算，或用 FX_Sum 算 <code>D204\\03</code> 的校驗），Data = D204。故意改錯最後一個字元 → error out 顯示 5001。'
]},
C.real('FX_Check','參考答案用另一種等效寫法：不放 Error Case，檢查永遠執行，最後用 Merge Errors 把「error in」和「自己產生的錯誤」合併——error in 有錯時 Merge Errors 會優先傳它。錯誤碼用 Error Cluster From Error Code.vi 產生（Select 選 0 或 5001），效果和錯誤常數 + Select 相同。兩種寫法都可以。'),
C.h3('懂','','錯誤最後交給誰'),
C.table(['函式','選盤','用途'],[
 ['Simple Error Handler.vi',fn('Programming','Dialog & User Interface','Simple Error Handler.vi'),'放在程式最後：有錯誤就跳對話框顯示 code 和 source'],
 ['Merge Errors',fn('Programming','Dialog & User Interface','Merge Errors'),'兩條以上錯誤線合成一條，回報第一個錯誤'],
 ['Clear Errors.vi',fn('Programming','Dialog & User Interface','Clear Errors.vi'),'把錯誤清掉。用在「我知道會錯，也處理好了」的地方，例如斷線重連']
]),
`<div class="warn"><b>不要把錯誤線丟著不接</b>錯誤線沒接到任何地方，LabVIEW 預設會在 VI 結束時跳出「自動錯誤處理」對話框；如果被關掉了，錯誤就默默消失。每條錯誤線都要有去處。</div>`,
C.h3('測','q','小測驗'),
{quiz:[
 {q:'VISA Write 出錯了，後面接著錯誤線的 VISA Read 會？',o:['照樣讀','收到錯誤，直接跳過不讀','當機'],a:1,ex:'所有 NI I/O 函式都遵守「error in 有錯就不做事」。'},
 {q:'自訂錯誤碼建議用哪個範圍？',o:['-1 ～ -100','5000 ～ 9999','0'],a:1,ex:'5000～9999 是 LabVIEW 保留給使用者的範圍。'},
 {q:'Case 的 Selector 接 error 線後，頁面名稱是？',o:['True / False','No Error / Error','0 / 1'],a:1,ex:'Error Case 會自動變成 No Error 和 Error。'}
]}
]});
})();
