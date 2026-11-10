/* 第七部分：檔案 I/O 實作（F1～F5）
   2D 陣列存成 CSV（Array To Spreadsheet String + Open/Create/Replace、Write to Text File、Close File）、
   讀回來、紀錄檔一直往後加、高階與低階函式的選擇。
   參考答案 VI 由 labview_vi/_build/build_fileio.py 在 LabVIEW 2026 建出，test_fileio.py 實際執行並檢查寫出的檔案。 */
(function(){
const L=window.LESSONS,fn=C.fn,ctl=C.ctl,qd=C.qd,wt=C.wt;
const PART='檔案 I/O 實作';
const tip=(t,b)=>`<div class="tip"><b>${t}</b>${b}</div>`;
const warn=(t,b)=>`<div class="warn"><b>${t}</b>${b}</div>`;
const note=(t,b)=>`<div class="note"><b>${t}</b>${b}</div>`;
const dl=n=>`<a href="vi/LV2018/${n}.vi" download>${n}.vi（LabVIEW 2018）</a>　<a href="vi/${n}.vi" download style="font-size:13px">2026 版</a>`;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- LabVIEW 的數字格式（課堂常用的幾種），和 Array To Spreadsheet String 的輸出一致 ---------- */
const SI={'-15':'f','-12':'p','-9':'n','-6':'u','-3':'m','0':'','3':'k','6':'M','9':'G','12':'T'};
function strip(t){return t.indexOf('.')<0?t:t.replace(/0+$/,'').replace(/\.$/,'');}
function fmtNum(v,spec){
  const m=/^%(#)?(?:\.(\d+))?([fepdg])$/.exec(spec.trim());
  if(!m) return null;
  const hash=!!m[1],n=m[2]===undefined?6:+m[2],c=m[3];
  if(c==='d') return String(Math.round(v));
  if(c==='f'){const t=v.toFixed(n);return hash?strip(t):t;}
  if(c==='e'){if(v===0)return hash?'0':(0).toFixed(n)+'E+0';let [a,b]=v.toExponential(n).split('e');if(hash)a=strip(a);return a+'E'+(+b);}
  if(c==='g'){const t=String(+v.toPrecision(n||1));return t;}
  if(v===0) return hash?'0':(0).toFixed(n);
  let e3=Math.floor(Math.log10(Math.abs(v))/3)*3;e3=Math.max(-15,Math.min(12,e3));
  let a=(v/Math.pow(10,e3)).toFixed(n);
  if(Math.abs(+a)>=1000&&e3<12){e3+=3;a=(v/Math.pow(10,e3)).toFixed(n);}
  if(hash)a=strip(a);
  return a+SI[e3];
}
function toText(rows,spec,delim){return rows.map(r=>r.map(v=>fmtNum(v,spec)).join(delim)+'\r\n').join('');}
function shown(t){return esc(t).replace(/\t/g,'<span class="ws">→</span>').replace(/\r\n/g,'<span class="ws">↵</span>\n');}
function parseRows(t){return t.trim().split(/\n+/).map(r=>r.trim().split(/[\s,;]+/).filter(Boolean).map(Number)).filter(r=>r.length&&r.every(x=>!isNaN(x)));}
/* Spreadsheet String To Array 讀一格：%f 只讀到數字結束，字首被丟掉；%p 會把 m、k 這些字首換算回去 */
function scanCell(t,spec){
  const m=/^\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)([fpnumkMGT]?)/.exec(t);
  if(!m) return 0;
  let v=+m[1];
  if(/p$/.test(spec)&&m[2]){const k=Object.keys(SI).find(x=>SI[x]===m[2]);v*=Math.pow(10,+k);}
  if(/d$/.test(spec)) v=Math.trunc(+m[1]);
  return +v.toPrecision(12);
}

const DEMO=[[0.673635295,0.272246430,0.803336740],[0.029970310,0.399990172,0.391939479],[0.864414910,0.063335977,0.283020400],[0.309538909,0.843978310,0.823522421]];

function fmtLab(d){
  d.innerHTML=`<div class="fig fmtlab"><div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">
    <label style="flex:1 1 230px">Data（2D 陣列，一行一列）<textarea class="data" rows="5" style="width:100%;font:13px Consolas,monospace">${DEMO.map(r=>r.join(' ')).join('\n')}</textarea></label>
    <div style="flex:1 1 230px"><label>format string <select class="f"><option>%.3f</option><option selected>%#.3p</option><option>%.3p</option><option>%.2e</option><option>%d</option><option value="*">自己打…</option></select></label>
      <input class="fc" value="%.1f" style="width:80px;display:none">
      <br><label style="display:inline-block;margin-top:8px">delimiter <select class="dl"><option value=",">逗號 ,</option><option value="\t">Tab（預設）</option><option value=";">分號 ;</option></select></label>
      <p class="hint" style="font-size:13px;color:#5c6577;margin:8px 0 0">格式碼和 LabVIEW 2026 實際執行 F1_Save_Array.vi 的結果一致（測過 %.3f、%#.3p、%.2e）。每個格式碼的意思在下一課 F2。</p></div></div>
    <div class="out" style="margin-top:10px"></div></div>`;
  const $=s=>d.querySelector(s);
  function upd(){
    $('.fc').style.display=$('.f').value==='*'?'':'none';
    const spec=$('.f').value==='*'?$('.fc').value:$('.f').value,delim=$('.dl').value,rows=parseRows($('.data').value);
    if(fmtNum(1,spec)===null){$('.out').innerHTML=`<p class="warn" style="margin:0">這個網頁只模擬 %f、%e、%p、%d、%g 這幾種（可加 # 和 .位數），LabVIEW 本身支援更多。</p>`;return;}
    const t=toText(rows,spec,delim);
    $('.out').innerHTML=`<b>spreadsheet string（也就是寫進檔案的內容，${t.length} 個字元）</b>
      <pre class="ssout">${shown(t)}</pre>
      <p style="font-size:13px;color:#5c6577;margin:2px 0 10px"><span class="ws">↵</span> 是每一列結尾的換行（Windows 是 \\r\\n 兩個字元）；<span class="ws">→</span> 是 Tab。最後一列後面也有換行。</p>
      <b>用 Excel 打開的樣子</b>${delim===','?'':'<span style="font-size:13px;color:#b45309">（不是逗號時，副檔名改 .txt 或用 Excel 的「資料 ▸ 從文字」匯入才會分欄）</span>'}
      <table class="t xls"><tr><th></th>${rows[0]?rows[0].map((_,j)=>`<th>${String.fromCharCode(65+j)}</th>`).join(''):''}</tr>${rows.map((r,i)=>`<tr><th>${i+1}</th>${r.map(v=>`<td>${esc(fmtNum(v,spec))}</td>`).join('')}</tr>`).join('')}</table>`;
  }
  d.querySelectorAll('textarea,select,input').forEach(e=>e.addEventListener('input',upd));
  window.addEventListener('ll-rand',e=>{if(!d.isConnected)return;$('.data').value=e.detail.map(r=>r.join(' ')).join('\n');upd();});
  upd();
}

function readLab(d){
  const file=toText(DEMO,'%#.3p',',');
  d.innerHTML=`<div class="fig"><div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">
    <label style="flex:1 1 260px">檔案內容（上一課用 %#.3p 存的）<textarea class="txt" rows="5" style="width:100%;font:13px Consolas,monospace">${esc(file.replace(/\r\n/g,'\n'))}</textarea></label>
    <div style="flex:1 1 200px"><label>Spreadsheet String To Array 的 format string<br><select class="f"><option value="%f">%f</option><option value="%p">%p</option><option value="%d">%d</option></select></label>
    <p style="font-size:13px;color:#5c6577">delimiter 一樣接 <code>,</code>。array type 不接，預設 2D DBL。</p></div></div><div class="out"></div></div>`;
  const $=s=>d.querySelector(s);
  function upd(){
    const spec=$('.f').value,lines=$('.txt').value.split(/\r?\n/).filter(x=>x.trim());
    const rows=lines.map(l=>l.split(',').map(c=>scanCell(c,spec))),ok=lines.map(l=>l.split(',').map(c=>scanCell(c,'%p')));
    const bad=rows.some((r,i)=>r.some((v,j)=>Math.abs(v-ok[i][j])>1e-9));
    $('.out').innerHTML=`<b>Data（讀回來的 2D 陣列）</b><table class="t xls">${rows.map((r,i)=>`<tr>${r.map((v,j)=>`<td style="${Math.abs(v-ok[i][j])>1e-9?'background:#fde7e7;color:#b91c1c;font-weight:700':''}">${v}</td>`).join('')}</tr>`).join('')}</table>
      ${bad?`<p class="warn" style="margin:6px 0 0"><b>數字錯了，而且沒有任何錯誤訊息。</b>%f 讀到 <code>673.635m</code> 時只讀數字的部分，把 <code>m</code>（千分之一）丟掉，所以 0.673635 變成 673.635，差了 1000 倍。改成 <b>%p</b> 就對了。</p>`:`<p class="tip" style="margin:6px 0 0"><b>正確。</b>%p 認得 m、k、M 這些 SI 字首，會換算回原本的值。</p>`}`;
  }
  d.querySelectorAll('textarea,select').forEach(e=>e.addEventListener('input',upd));
  upd();
}

/* 亂數 2D 陣列：按 Run 產生，標出每一格是外圈第幾圈、內圈第幾圈 */
function randLab(d){
  d.innerHTML=`<div class="fig"><div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
    <label>外層 N（列）<input class="r" type="number" value="3" min="1" max="8" style="width:56px"></label>
    <label>內層 N（行）<input class="c" type="number" value="4" min="1" max="8" style="width:56px"></label>
    <label>每個數 × <select class="m"><option value="1">1（0～1）</option><option value="100">100，再 Round（0～100 整數）</option></select></label>
    <button class="btn pri run">▶ Run</button><button class="btn send" disabled>用這組資料到下面試格式 ↓</button></div>
    <div class="out" style="margin-top:10px"></div></div>`;
  const $=s=>d.querySelector(s);let last=null;
  function run(){
    const R=Math.max(1,Math.min(8,+$('.r').value||1)),Cc=Math.max(1,Math.min(8,+$('.c').value||1)),m=+$('.m').value;
    last=Array.from({length:R},()=>Array.from({length:Cc},()=>m===1?Math.random():Math.round(Math.random()*100)));
    $('.out').innerHTML=`<b>Data：${R} 列 × ${Cc} 行</b>（滑鼠移到格子上看它是哪一圈產生的）
      <table class="t xls"><tr><th></th>${last[0].map((_,j)=>`<th>行 ${j}<br><small>內圈 i=${j}</small></th>`).join('')}</tr>
      ${last.map((r,i)=>`<tr><th>列 ${i}<br><small>外圈 i=${i}</small></th>${r.map((v,j)=>`<td title="外圈第 ${i} 圈、內圈第 ${j} 圈">${m===1?v.toFixed(4):v}</td>`).join('')}</tr>`).join('')}</table>
      <p style="font-size:13px;color:#5c6577;margin:4px 0 0">內圈跑 ${Cc} 次 → 一列 ${Cc} 個數（1D）。外圈跑 ${R} 次，每次拿到一列 → 疊成 ${R} 列（2D）。總共呼叫 Random Number ${R*Cc} 次。</p>`;
    $('.send').disabled=false;
  }
  $('.run').onclick=run;
  $('.send').onclick=()=>{if(!last)return;window.dispatchEvent(new CustomEvent('ll-rand',{detail:last}));const t=document.querySelector('.fmtlab');if(t)t.scrollIntoView({behavior:'smooth',block:'start'});};
  run();
}

/* 格式碼實驗室：一個輸入、一個格式字串，結果由 assets/lvfmt.js 算（和 LabVIEW 實測 304 筆逐字相同） */
function fmtPlay(d){
  const EX=[['%.2f','dbl','3.14159'],['%8.2f','dbl','3.14159'],['%08.2f','dbl','-2.5'],['%+.1f','dbl','25'],['%#.3f','dbl','12.5000'],['%.2e','dbl','0.000123'],['%.1p','dbl','1234.5678'],
   ['%d','dbl','-2.5'],['%05d','i32','42'],['%X','i32','255'],['%04X','i32','42'],['%b','i32','5'],['%08b','i32','5'],
   ['%s','str','Hello'],['%10s|','str','OK'],['%-10s|','str','OK'],['%.3s','str','LabVIEW'],['Name: %s','str','Ann'],['Temp=%.1f C','dbl','25.46'],['%.1f%%','dbl','87.25'],['%s','dbl','3.14'],['Count','i32','3']];
  d.innerHTML=`<div class="fig fmtplay"><div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end">
    <label>format string<br><input class="f" value="%8.2f" style="width:150px;font:15px Consolas,monospace"></label>
    <label>輸入的型別<br><select class="t"><option value="dbl">DBL 小數</option><option value="i32">I32 整數</option><option value="str">字串</option></select></label>
    <label>輸入的值<br><input class="v" value="3.14159" style="width:150px;font:15px Consolas,monospace"></label></div>
    <div class="res" style="margin:12px 0 6px"></div>
    <div style="font-size:13px;color:#5c6577;margin-bottom:4px">點一個例子：</div><div class="ex" style="display:flex;flex-wrap:wrap;gap:6px"></div></div>`;
  const $=s=>d.querySelector(s);
  $('.ex').innerHTML=EX.map((e,i)=>`<button class="btn" data-i="${i}" style="font:13px Consolas,monospace;padding:3px 8px">${esc(e[0])} ← ${esc(e[2])}</button>`).join('');
  $('.ex').onclick=e=>{const i=e.target.dataset.i;if(i===undefined)return;const x=EX[+i];$('.f').value=x[0];$('.t').value=x[1];$('.v').value=x[2];upd();};
  function upd(){
    const t=$('.t').value,raw=$('.v').value;
    let v=raw;
    if(t!=='str'){v=Number(raw);if(raw.trim()===''||isNaN(v)){$('.res').innerHTML='<span class="warn" style="display:inline-block;margin:0">值要是數字</span>';return;}if(t==='i32')v=Math.trunc(v);}
    const r=LVFMT.format($('.f').value,v,t);
    if(r.err){$('.res').innerHTML=`<div class="warn" style="margin:0"><b>resulting string 是空的，error out：</b>${r.msg}</div>`;return;}
    const vis=esc(r.text).replace(/ /g,'<span class="sp">·</span>');
    $('.res').innerHTML=`<div style="font-size:13px;color:#5c6577">resulting string（${r.text.length} 個字元，· 是空白）</div><div class="fmtres">${vis||'&nbsp;'}</div>`;
  }
  d.querySelectorAll('input,select').forEach(e=>e.addEventListener('input',upd));
  upd();
}

/* ---------- 方塊圖 ---------- */
const randFig={name:'F0_Random_2D.vi',view:'bd',bd:{w:560,h:250,structs:[{id:'o',k:'for',x:90,y:20,w:330,h:210},{id:'i',k:'for',x:150,y:60,w:190,h:130}],nodes:[
  {id:'k3',k:'const',t:'i32',v:3,x:40,y:19},{id:'N1',k:'N',s:'o'},
  {id:'k4',k:'const',t:'i32',v:4,x:104,y:52},{id:'N2',k:'N',s:'i'},
  {id:'it1',k:'iter',s:'o'},{id:'it2',k:'iter',s:'i'},
  {id:'rnd',k:'fn',fn:'Random Number (0-1)',x:220,y:110},
  {id:'t1',k:'tunnel',t:'dbl[]',s:'i',side:'r',y:126,idx:true},{id:'t2',k:'tunnel',t:'dbl[][]',s:'o',side:'r',y:126,idx:true},
  {id:'data',k:'ind',t:'dbl[][]',label:'Data',x:460,y:116}],
 wires:[{id:'w1',from:'k3',to:'N1',t:'i32'},{id:'w2',from:'k4',to:'N2',t:'i32',pts:[[150,61],[150,69]]},
  {id:'w3',from:'rnd.number',to:'t1.i',t:'dbl'},{id:'w4',from:'t1.o',to:'t2.i',t:'dbl[]'},{id:'w5',from:'t2.o',to:'data',t:'dbl[][]'}]}};

const saveFig={name:'F1_Save_Array.vi',view:'bd',bd:{w:780,h:270,nodes:[
  {id:'fmt',k:'const',t:'str',v:'%#.3p',x:150,y:8},
  {id:'dlm',k:'const',t:'str',v:',',x:196,y:86},
  {id:'data',k:'ctl',t:'dbl[][]',label:'Data',x:20,y:50},
  {id:'a2s',k:'fn',fn:'Array To Spreadsheet String',x:250,y:30},
  {id:'ss',k:'ind',t:'str',label:'spreadsheet string',x:640,y:42},
  {id:'path',k:'ctl',t:'path',label:'File Path',x:20,y:170},
  {id:'op',k:'const',t:'enum',v:'replace or create ▾',x:30,y:226},
  {id:'oc',k:'fn',fn:'Open/Create/Replace File',x:210,y:150},
  {id:'wr',k:'fn',fn:'Write to Text File',x:380,y:160},
  {id:'cl',k:'fn',fn:'Close File',x:520,y:164},
  {id:'eo',k:'ind',t:'err',label:'error out',x:640,y:172}],
 wires:[
  {id:'w1',from:'data',to:'a2s.array',t:'dbl[][]'},{id:'w2',from:'fmt',to:'a2s.format string',t:'str'},{id:'w3',from:'dlm',to:'a2s.delimiter',t:'str'},
  {id:'w4',from:'a2s.spreadsheet string',to:'ss',t:'str'},
  {id:'w5',from:'path',to:'oc.file path',t:'path'},{id:'w6',from:'op',to:'oc.operation',t:'enum',mx:190},
  {id:'w7',from:'oc.refnum out',to:'wr.file',t:'ref'},{id:'w8',from:'oc.error out',to:'wr.error in',t:'err'},
  {id:'w9',from:'a2s.spreadsheet string',to:'wr.text',t:'str',mx:350},
  {id:'w10',from:'wr.refnum out',to:'cl.refnum',t:'ref'},{id:'w11',from:'wr.error out',to:'cl.error in',t:'err'},
  {id:'w12',from:'cl.error out',to:'eo',t:'err'}]}};

const readFig={name:'F2_Read_Array.vi',view:'bd',bd:{w:720,h:220,nodes:[
  {id:'path',k:'ctl',t:'path',label:'File Path',x:20,y:40},
  {id:'rd',k:'fn',fn:'Read from Text File',x:170,y:26},
  {id:'txt',k:'ind',t:'str',label:'Text',x:580,y:16},
  {id:'eo',k:'ind',t:'err',label:'error out',x:580,y:70},
  {id:'fmt',k:'const',t:'str',v:'%p',x:300,y:120},{id:'dlm',k:'const',t:'str',v:',',x:330,y:176},
  {id:'s2a',k:'fn',fn:'Spreadsheet String To Array',x:400,y:126},
  {id:'data',k:'ind',t:'dbl[][]',label:'Data',x:580,y:140}],
 wires:[
  {id:'w1',from:'path',to:'rd.file',t:'path'},{id:'w2',from:'rd.text',to:'txt',t:'str'},{id:'w3',from:'rd.error out',to:'eo',t:'err'},
  {id:'w4',from:'rd.text',to:'s2a.spreadsheet string',t:'str',mx:270},{id:'w5',from:'fmt',to:'s2a.format string',t:'str'},
  {id:'w6',from:'dlm',to:'s2a.delimiter',t:'str'},{id:'w7',from:'s2a.array',to:'data',t:'dbl[][]'}]}};

const appendFig={name:'F3_Append_Line.vi',view:'bd',bd:{w:820,h:280,nodes:[
  {id:'tf',k:'const',t:'str',v:'%Y-%m-%d %H:%M:%S',x:20,y:20},
  {id:'dt',k:'fn',fn:'Format Date/Time String',x:200,y:16},
  {id:'ff',k:'const',t:'str',v:'%s,%.3f\\r\\n',x:250,y:84},
  {id:'val',k:'ctl',t:'dbl',label:'Value',x:20,y:110},
  {id:'fis',k:'fn',fn:'Format Into String',ins:['format string','input 1','input 2'],x:380,y:40,h:48},
  {id:'line',k:'ind',t:'str',label:'Line',x:700,y:50},
  {id:'path',k:'ctl',t:'path',label:'File Path',x:20,y:190},
  {id:'op',k:'const',t:'enum',v:'open or create ▾',x:30,y:244},
  {id:'oc',k:'fn',fn:'Open/Create/Replace File',x:200,y:170},
  {id:'end',k:'const',t:'enum',v:'end ▾',x:290,y:132},
  {id:'sp',k:'fn',fn:'Set File Position',x:350,y:172},
  {id:'wr',k:'fn',fn:'Write to Text File',x:480,y:178},
  {id:'cl',k:'fn',fn:'Close File',x:600,y:182},
  {id:'eo',k:'ind',t:'err',label:'error out',x:700,y:190}],
 wires:[
  {id:'w1',from:'tf',to:'dt.time format string',t:'str'},{id:'w2',from:'dt.date/time string',to:'fis.input 1',t:'str'},
  {id:'w3',from:'ff',to:'fis.format string',t:'str',mx:360},{id:'w4',from:'val',to:'fis.input 2',t:'dbl',mx:340},
  {id:'w5',from:'fis.resulting string',to:'line',t:'str'},
  {id:'w6',from:'path',to:'oc.file path',t:'path'},{id:'w7',from:'op',to:'oc.operation',t:'enum',mx:180},
  {id:'w8',from:'oc.refnum out',to:'sp.refnum',t:'ref'},{id:'w9',from:'oc.error out',to:'sp.error in',t:'err'},{id:'w10',from:'end',to:'sp.from',t:'enum',mx:335},
  {id:'w11',from:'sp.refnum out',to:'wr.file',t:'ref'},{id:'w12',from:'sp.error out',to:'wr.error in',t:'err'},
  {id:'w13',from:'fis.resulting string',to:'wr.text',t:'str',mx:460},
  {id:'w14',from:'wr.refnum out',to:'cl.refnum',t:'ref'},{id:'w15',from:'wr.error out',to:'cl.error in',t:'err'},{id:'w16',from:'cl.error out',to:'eo',t:'err'}]}};

/* ======================================================================
   F1：2D 陣列存成 CSV
   ====================================================================== */
L.push({id:'F01',order:22,no:'F1',part:PART,title:'把 2D 陣列存成 CSV：Array To Spreadsheet String 與開、寫、關',mins:65,files:['F0_Random_2D.vi','F1_Save_Array.vi'],
goals:[['學會','兩層 For Loop + Random Number 產生 3 × 4 的 2D 陣列；Array To Spreadsheet String 的 format string 和 delimiter；低階檔案函式「開檔 → 寫 → 關檔」三步驟；refnum 線和錯誤線怎麼串。'],
 ['做出','用亂數產生一個 3 列 × 4 行的陣列，存成 data.csv，用 Excel 打開是 3 列 4 欄。'],
 ['用在哪','量測數據、生產紀錄、參數表都是這樣存。這也是課堂上「File I/O」第一個範例。']],
check:'執行後選一個路徑存檔，用記事本打開看到 4 行、每行 3 個用逗號隔開的數字；改 format string 再存一次，數字的樣子跟著變。',
body:[
C.h3('懂','','這支程式在做什麼'),
`<p>上面一排把<b>數字變成文字</b>，下面一排把<b>文字寫進檔案</b>。兩件事分開想就不難：</p>
${C.table(['步驟','函式','做什麼'],[
 ['1 數字 → 文字','Array To Spreadsheet String','2D 陣列的每一格依 <code>format string</code> 變成文字，同一列用 <code>delimiter</code> 隔開，每一列結尾加換行'],
 ['2 開檔','Open/Create/Replace File','依 <code>operation</code> 打開或建立檔案，輸出一條 <b>refnum</b>（檔案的代號）'],
 ['3 寫入','Write to Text File（選盤上叫 Write Text File）','把字串寫進 refnum 指的檔案'],
 ['4 關檔','Close File','關掉檔案。沒關的話檔案可能被鎖住，Excel 打不開，或最後一段沒寫進去']])}`,
{lv:saveFig,cap:'和課堂截圖、參考答案 F1_Save_Array.vi 同樣的接法。墨綠色細線是 refnum，黃黑色粗線是 error，都要一路串到 Close File，順序才固定：開完才寫、寫完才關。'},
C.h3('做','b','先做資料：用亂數產生 3 × 4 的 2D 陣列'),
`<p>課堂上要存的數字是用亂數產生的。做法是<b>兩個 For Loop 包在一起</b>：外圈跑 3 次決定有幾<b>列</b>，內圈跑 4 次決定每列有幾<b>行</b>，最裡面放 Random Number (0-1)。</p>`,
{steps:{title:'一步一步做出 3 × 4 亂數陣列',lv:randFig,steps:[
 {t:'外層 For Loop：3 列',add:['o','k3','N1','it1','w1'],h:`<p>${fn('Programming','Structures','For Loop')}，在方塊圖拉一個大框。左上角的 <b>N</b> 右鍵 ▸ Create Constant，打 <code>3</code>。</p>`},
 {t:'內層 For Loop：4 行',add:['i','k4','N2','it2','w2'],h:`<p>在外層框<b>裡面</b>再拉一個 For Loop。它的 N 接常數 <code>4</code>。這個常數放在外層框裡面或外面都可以。</p>`},
 {t:'放 Random Number',add:['rnd'],h:`<p>${fn('Programming','Numeric','Random Number (0-1)')}${qd('Random')}，放在<b>內層</b>框裡。每執行一次輸出一個 0～1 之間的小數（不含 1）。</p>`},
 {t:'拉線出來：兩個索引通道',add:['t1','w3','t2','w4'],h:`<p>從 Random Number 的輸出拉線，<b>穿過內層框、再穿過外層框</b>。For Loop 的輸出通道預設是<b>自動索引</b>（通道上有 <code>[ ]</code> 的樣子）：每一圈的值收集成陣列。</p><p>穿過內層：4 個數 → 1D 陣列（線變粗）。穿過外層：3 個 1D → 2D 陣列（雙線）。</p>`},
 {t:'建立顯示器',add:['data','w5'],h:`<p>外層通道的輸出右鍵 ▸ Create ▸ Indicator，改名 <code>Data</code>。前面板把陣列顯示器往右、往下拉大，看得到 3 列 4 行。按 Run 每次數字都不一樣。</p><p class="cap">要接到上面的 F1：把這條線接到 Array To Spreadsheet String 的 array，取代 Data 控制項。</p>`}]}},
{fn:randLab},
C.table(['常見狀況','原因','怎麼改'],[
 ['Data 只有一個數字，不是陣列','通道被改成 Last Value（右鍵 ▸ Tunnel Mode）','通道右鍵 ▸ Tunnel Mode ▸ Indexing'],
 ['變成 4 列 × 3 行','外層、內層的 N 接反了','<b>外層 = 列數，內層 = 行數</b>'],
 ['線是斷的、出現「源是 1D 陣列、匯是 2D 陣列」','顯示器是自己從控制項選盤拿的 1D 陣列','刪掉，從通道右鍵 Create ▸ Indicator，型別一定對'],
 ['想要 0～100 的整數','Random Number 只有 0～1','乘 100，再接 '+fn('Programming','Numeric','Round To Nearest')]]),
tip('另一種做法：','只用一個 For Loop、N = 12，再用 '+fn('Programming','Array','Reshape Array')+' 把 1D 的 12 個數變成 [3][4]。兩層迴圈比較直觀，考試和課堂都是用兩層。'),
C.real('F0_Random_2D','參考答案 F0_Random_2D.vi：外層 N = 3、內層 N = 4，兩個索引通道輸出 2D DBL。實際執行兩次，都是 3 列 × 4 行、數值在 0～1 之間且兩次不同。下載：'+dl('F0_Random_2D')),
C.h3('玩','','format string 試試看'),
`<p>改下面的格式碼和分隔符號，看寫進檔案的文字和 Excel 會看到什麼。<b>%#.3p</b> 就是課堂截圖用的格式，輸出 <code>673.635m</code> 這種寫法。</p>`,
{fn:fmtLab},
C.table(['格式碼','意思','0.673635 變成'],[
 ['<code>%.3f</code>','小數點後 3 位','<code>0.674</code>'],
 ['<code>%.2e</code>','科學記號，小數 2 位','<code>6.74E-1</code>'],
 ['<code>%.3p</code>','SI 工程記號：自動用 m（10⁻³）、k（10³）、M（10⁶）這些字首','<code>673.635m</code>'],
 ['<code>#</code>（放在 % 後面）','把小數後面多餘的 0 拿掉','<code>%#.3p</code>：29.970m → <code>29.97m</code>'],
 ['<code>%d</code>','整數（四捨五入）','<code>1</code>'],
 ['不接 format string','預設 <code>%.3f</code>','<code>0.674</code>']]),
warn('SI 記號的副作用：','<code>673.635m</code> 對人好讀，但 Excel 把它當文字，不能直接加總、畫圖；讀回 LabVIEW 時格式也要配合（F3）。要給 Excel 算的資料，用 <code>%.3f</code> 或 <code>%.6e</code>。'),
C.h3('懂','','Open/Create/Replace File 的 operation'),
C.table(['值','operation','檔案已經存在','檔案不存在'],[
 ['0','open（預設）','打開','<b>錯誤 7</b>（找不到檔案）'],
 ['1','replace','清空重寫','錯誤 7'],
 ['2','create','<b>錯誤 8</b>','建立'],
 ['3','open or create','打開（寫入位置在開頭，會蓋掉前面的字）','建立'],
 ['4','replace or create','<b>清空</b>重寫','建立'],
 ['5','replace or create with confirmation','跳出對話框問要不要取代','建立']]),
note('課堂截圖用的是 open or create：','如果檔案原本比較長，新寫的內容只蓋掉開頭那一段，後面的舊資料還在，檔案會變得很怪。<b>每次都要一份全新的檔案，用 replace or create</b>（參考答案就是這樣）。要接在後面一直加，看 F4。'),
C.h3('做','b','跟著做：F1_Save_Array.vi'),
{steps:{title:'一步一步接出 F1_Save_Array.vi',lv:saveFig,steps:[
 {t:'放 Array To Spreadsheet String',add:['a2s','data','w1'],h:`<p>${fn('Programming','String','Array To Spreadsheet String')}${qd('Array To Spreadsheet String')}。在 <b>array</b> 輸入端右鍵 ▸ Create ▸ Control，改名 <code>Data</code>。要 2D：前面板的陣列索引框右鍵 ▸ Add Dimension。</p><p class="cap">課堂上也可以用兩層 For Loop + ${fn('Programming','Numeric','Random Number (0-1)')} 產生亂數陣列來測。</p>`},
 {t:'格式和分隔符號',add:['fmt','dlm','w2','w3'],h:`<p>在 <b>format string</b> 右鍵 ▸ Create ▸ Constant，打 <code>%#.3p</code>（或 <code>%.3f</code>）。在 <b>delimiter</b> 建一個字串常數打一個逗號 <code>,</code>。<b>不接 delimiter 的話預設是 Tab</b>，存成 .csv 時 Excel 不會分欄。</p>`},
 {t:'顯示產生的文字',add:['ss','w4'],h:`<p><b>spreadsheet string</b> 輸出右鍵 ▸ Create ▸ Indicator。前面板把它拉大，執行時就能看到要寫進檔案的內容（課堂截圖左邊那個框）。</p>`},
 {t:'開檔',add:['path','op','oc','w5','w6'],h:`<p>${fn('Programming','File I/O','Open/Create/Replace File')}。<b>file path</b> 右鍵 ▸ Create ▸ Control（路徑控制項）；<b>operation</b> 右鍵 ▸ Create ▸ Constant，選 <code>replace or create</code>。</p><p class="cap">file path 空白時，執行會跳出存檔對話框，所以端子名稱寫著 (use dialog)。</p>`},
 {t:'寫入',add:['wr','w7','w8','w9'],h:`<p>${fn('Programming','File I/O','Write to Text File')}（選盤上的圖示叫 Write Text File）。refnum out → <b>file</b>，error out → error in，spreadsheet string → <b>text</b>。</p>`},
 {t:'關檔、看錯誤',add:['cl','eo','w10','w11','w12'],h:`<p>${fn('Programming','File I/O','Close File')}：refnum、error 接上。Close File 的 error out 右鍵 ▸ Create ▸ Indicator。執行一次，用記事本打開檔案確認。</p>`}]}},
wt([['Data','Array To Spreadsheet String ▸ array','2D DBL'],['字串常數 %#.3p','▸ format string',''],['字串常數 ,','▸ delimiter','不接是 Tab'],
 ['▸ spreadsheet string','spreadsheet string 顯示器、Write to Text File ▸ text','一條線分兩路'],
 ['File Path','Open/Create/Replace File ▸ file path',''],['列舉常數 replace or create','▸ operation',''],
 ['Open/Create/Replace File ▸ refnum out','Write to Text File ▸ file','refnum 線'],['▸ error out','Write to Text File ▸ error in',''],
 ['Write to Text File ▸ refnum out','Close File ▸ refnum',''],['▸ error out','Close File ▸ error in',''],['Close File ▸ error out','error out 顯示器','']]),
C.real('F1_Save_Array','參考答案 F1_Save_Array.vi：用 LabVIEW 腳本照這一課的設計產生，在 LabVIEW 2026 實際執行，寫出的檔案用程式檢查過（%.3f、%#.3p、%.2e 三種格式都測了）。下載：'+dl('F1_Save_Array')),
C.h3('測','q','小測驗'),
{quiz:[
 {q:'Array To Spreadsheet String 的 delimiter 沒接，存成 data.csv 用 Excel 打開會怎樣？',o:['每一列的數字擠在 A 欄，因為預設分隔是 Tab 不是逗號','自動用逗號','執行時出錯'],a:0,ex:'delimiter 預設是 Tab。CSV（Comma-Separated Values）要逗號。'},
 {q:'0.02997 用 %#.3p 輸出是什麼？',o:['29.97m','29.970m','0.030','2.997E-2'],a:0,ex:'%p 換成 m（千分之一）是 29.970m，# 把多餘的 0 去掉 → 29.97m。'},
 {q:'Write to Text File 寫完沒接 Close File 會怎樣？',o:['檔案可能一直被 LabVIEW 佔用，Excel 打不開或內容不完整','不會怎樣，LabVIEW 會馬上自動關','錯誤 7'],a:0,ex:'開了就要關。VI 結束時 LabVIEW 最後會回收，但在迴圈或長時間執行的程式裡，沒關的檔案會一直累積。'},
 {q:'每次執行都要一份全新的檔案，operation 選哪個？',o:['replace or create','open or create','open','create'],a:0,ex:'open or create 會從開頭蓋寫，舊檔比較長時尾巴會留著；create 遇到已存在的檔案會出錯 8。'}
]}
]});

/* ======================================================================
   F2：格式碼完整教學（數字與字串）
   ====================================================================== */
L.push({id:'F05',order:22.5,no:'F2',part:PART,title:'格式碼完整教學：數字、字串都變成你要的樣子',mins:50,
goals:[['學會','格式碼的四個部分（旗標、寬度、精度、型別）；數字的 f、e、p、d、x、b；字串的 %s、對齊、截斷；%% 和 \\ 碼；Scan From String 反過來讀。'],
 ['為什麼','Array To Spreadsheet String、Format Into String、Scan From String、Spreadsheet String To Array、Format Date/Time String 都用同一套格式碼，學一次到處用。'],
 ['保證','這課每一張表、下面的實驗室，都是拿 LabVIEW 2026 實際執行的結果（304 筆）逐字核對過的。']],
check:'不看表能寫出：數字 3.14159 → "   3.14"（%7.2f）、整數 255 → "00FF"（%04X）、字串 OK → "OK        |"（%-10s|）。',
body:[
C.h3('懂','','格式碼長什麼樣'),
`<p>每個格式碼都是 <b>%</b> 開頭、<b>一個英文字母</b>結尾，中間三個部分都可以不寫：</p>`,
`<div class="fmtanat"><span class="a0">%</span><span class="a1">-+0#</span><span class="a2">8</span><span class="a3">.2</span><span class="a4">f</span></div>
<div class="fmtkey"><span class="a1">旗標（可不寫）</span><span class="a2">寬度：至少幾個字</span><span class="a3">精度：小數幾位／字串取幾個字</span><span class="a4">型別碼（一定要）</span></div>`,
C.table(['部分','寫法','意思','例子'],[
 ['旗標','<code>-</code>','靠左對齊（右邊補空白）','<code>%-8.2f</code>：3.14 → <code>3.14····</code>'],
 ['','<code>+</code>','正數也寫 + 號','<code>%+.2f</code>：3.14 → <code>+3.14</code>'],
 ['','<code>0</code>','左邊補 0（不是空白）','<code>%08.2f</code>：-2.5 → <code>-0002.50</code>'],
 ['','<code>#</code>','拿掉小數尾巴多餘的 0','<code>%#.3f</code>：12.5 → <code>12.5</code>'],
 ['寬度','數字','<b>至少</b>幾個字，不夠補空白（預設靠右）；超過不會截掉','<code>%8.2f</code>：1234.5678 → <code>·1234.57</code>'],
 ['精度','.數字','小數：小數點後幾位。字串：最多取幾個字','<code>%.3s</code>：LabVIEW → <code>Lab</code>'],
 ['型別','一個字母','見下面兩張表','—']]),
C.h3('懂','','數字的型別碼（LabVIEW 實測）'),
C.table(['格式碼','意思','3.14159','1234.5678','0.000123','-2.5'],[
 ['<code>%f</code>','小數，預設 6 位','3.141590','1234.567800','0.000123','-2.500000'],
 ['<code>%.2f</code>','小數 2 位','3.14','1234.57','0.00','-2.50'],
 ['<code>%e</code>／<code>%.2e</code>','科學記號','3.14E+0','1.23E+3','1.23E-4','-2.50E+0'],
 ['<code>%.1p</code>','SI 字首（k、m、u…）','3.1','1.2k','123.0u','-2.5'],
 ['<code>%g</code>','LabVIEW 裡和 %f 相同','3.141590','1234.567800','0.000123','-2.500000'],
 ['<code>%d</code>','整數（四捨五入）','3','1235','0','<b>-2</b>'],
 ['<code>%.0f</code>','小數 0 位','3','1235','0','<b>-2</b>']]),
warn('-2.5 為什麼是 -2 不是 -3？','LabVIEW 遇到「剛好一半」時取<b>偶數</b>（四捨六入五成雙，銀行家捨入）：2.5 → 2、3.5 → 4、-2.5 → -2。%d、%.0f、Round To Nearest 都是這樣。和 Excel 的 ROUND 不一樣。'),
C.table(['整數格式碼','意思','42','255','5','-7（I32）'],[
 ['<code>%d</code>','十進位','42','255','5','-7'],
 ['<code>%5d</code>','寬 5，靠右','···42','··255','····5','···-7'],
 ['<code>%05d</code>','寬 5，補 0','00042','00255','00005','-0007'],
 ['<code>%x</code>／<code>%X</code>','十六進位（LabVIEW 都輸出大寫）','2A','FF','5','FFFFFFF9'],
 ['<code>%04X</code>','十六進位、4 位補 0（FX 封包常用）','002A','00FF','0005','FFFFFFF9'],
 ['<code>%o</code>','八進位','52','377','5','37777777771'],
 ['<code>%b</code>／<code>%08b</code>','二進位／8 位補 0','101010／00101010','11111111','101／00000101','32 個位元']]),
note('負數的 %X：','I32 的 -7 是 FFFFFFF9（32 位元補數）；DBL 的 -2.5 會變成 16 個 F 開頭的 64 位元。要送 PLC 的 16 位元資料，先轉成 U16 再格式化。'),
C.h3('懂','','字串的格式碼'),
C.table(['格式碼','Hello','OK','LabVIEW 2018','說明'],[
 ['<code>%s</code>','Hello','OK','LabVIEW 2018','原樣放進去'],
 ['<code>%10s|</code>','·····Hello|','········OK|','LabVIEW 2018|','寬 10 靠右；太長就不補也不截'],
 ['<code>%-10s|</code>','Hello·····|','OK········|','LabVIEW 2018|','寬 10 靠左：做對齊的文字表格'],
 ['<code>%.3s</code>','Hel','OK','Lab','最多取前 3 個字'],
 ['<code>[%s]</code>','[Hello]','[OK]','[LabVIEW 2018]','前後的文字照抄'],
 ['<code>Name: %s</code>','Name: Hello','Name: OK','Name: LabVIEW 2018','']]),
C.table(['特殊寫法','寫出來','說明'],[
 ['<code>%%</code>','%','要印出百分比符號。<code>%.1f%%</code>：87.25 → <code>87.2%</code>'],
 ['<code>\\t</code>','Tab','字串常數要先右鍵 ▸ <b>\'\\\' Codes Display</b>'],
 ['<code>\\r\\n</code>','換行（Windows）','同上；<code>\\n</code> 只有換行字元'],
 ['<code>\\s</code>','空白','\\ 碼模式下看得到的空白'],
 ['<code>\\\\</code>','\\','反斜線本身']]),
C.h3('玩','','格式碼實驗室'),
`<p>打格式字串、選型別、打值，下面就是 LabVIEW 會產生的字串。試試看把 %s 配數字、把 %d 配字串，會看到 LabVIEW 實際會報的錯誤。</p>`,
{fn:fmtPlay},
C.table(['錯誤','什麼時候','怎麼改'],[
 ['81','格式碼和輸入型別不合：數字配 %s、字串配 %d','換對的型別碼；數字要變文字用 %f、%d'],
 ['83','格式碼比輸入少，例如兩個輸入只寫一個 %s','Format Into String 有幾個輸入就要幾個格式碼'],
 ['85','Scan From String 找不到要的東西（例如 %f 遇到 abc）','輸出變成 default value；檢查輸入的字串']]),
C.h3('懂','','在哪裡用得到'),
C.table(['函式','格式碼放哪','例子'],[
 ['Format Into String','format string，可以拉長放多個輸入','<code>%s,%.3f\\r\\n</code>：時間, 數值 一行'],
 ['Array To Spreadsheet String','format string，整個陣列共用一個','數字：<code>%.3f</code>。<b>2D 字串陣列</b>（例如有文字欄位的表）：<code>%s</code>'],
 ['Spreadsheet String To Array','format string','讀數字 <code>%f</code>；讀 SI 記號 <code>%p</code>'],
 ['Scan From String','format string','反過來：從字串裡挖出數字（下面）'],
 ['Format Date/Time String','time format string（另一套碼）','<code>%Y-%m-%d %H:%M:%S</code> → 2026-11-10 09:10:46；<code>%3u</code> 是毫秒']]),
C.h3('懂','','反過來：Scan From String'),
`<p>儀器回傳 <code>3.14 V</code>、PLC 回傳 <code>Temp=25.5</code>，要變回數字就用 ${fn('Programming','String','Scan From String')}。同樣的格式碼，意思反過來：「從這裡讀一個數字出來」。</p>`,
C.table(['format string','input string','output 1','remaining string','說明（LabVIEW 實測）'],[
 ['<code>%f</code>','3.14 V','3.14','" V"','讀到不是數字就停，剩下的放 remaining string'],
 ['<code>Temp=%f</code>','Temp=25.5','25.5','""','格式字串裡的文字要一模一樣才會跳過'],
 ['<code>%d</code>','123abc','123','abc',''],
 ['<code>%x</code>','1F','31','""','十六進位讀回來'],
 ['<code>%f</code>','673.635m','673.635','m','字首被丟掉（F3 讀檔的陷阱）'],
 ['<code>%p</code>','673.635m','0.673635','""','SI 字首換算回去'],
 ['<code>%f</code>','1,234.5','1','",234.5"','千分位逗號會讓它停住'],
 ['<code>%f</code>','abc','default value','abc','<b>錯誤 85</b>']]),
C.h3('測','q','小測驗'),
{quiz:[
 {q:'Format Into String，format string = %06.2f，輸入 -3.5，結果是？',o:['-03.50','-3.50','0-3.50','-003.50'],a:0,ex:'寬 6 包含負號：- 0 3 . 5 0 剛好 6 個字。0 補在負號後面。'},
 {q:'要把 PLC 的位址 4096 變成 4 個字的十六進位 "1000"，用？',o:['%04X','%4d','%x4','%.4X'],a:0,ex:'0 補零、寬 4、X 十六進位。FX 封包的位址欄就是這樣組的。'},
 {q:'%d 輸入 2.5（DBL）結果是？',o:['2','3','2.5','錯誤 81'],a:0,ex:'剛好一半取偶數：2.5 → 2、3.5 → 4。'},
 {q:'Format Into String 輸入是字串 "OK"，format string 寫 %d，會？',o:['錯誤 81，resulting string 是空的','輸出 0','輸出 OK'],a:0,ex:'型別不合就是 81。'},
 {q:'想做成「名稱靠左佔 10 格、數值靠右佔 8 格、小數 2 位」的對齊表格，format string 是？',o:['%-10s%8.2f','%10s%-8.2f','%s%.2f','%-10.2s%8f'],a:0,ex:'- 是靠左；沒有 - 就靠右。兩個輸入要兩個格式碼。'},
 {q:'Scan From String：format string = %f，input string = "12.5 mm"，remaining string 是？',o:['" mm"（前面有空白）','"mm"','""','12.5'],a:0,ex:'%f 讀到空白就停，空白留在 remaining string。'}
]}
]});

/* ======================================================================
   F3：讀回來
   ====================================================================== */
L.push({id:'F02',order:23,no:'F3',part:PART,title:'讀回來：Read from Text File 與 Spreadsheet String To Array',mins:40,files:['F2_Read_Array.vi'],
goals:[['學會','把文字檔讀成字串、再拆回 2D 數字陣列；讀檔的 format string 要和存檔時配合。'],['做出','讀回 F1 存的檔案，得到原本的 4 × 3 陣列。'],['小心','格式不配合時數字會錯但不會報錯，這種錯最難抓。']],
check:'讀回 F1 用 %#.3p 存的檔案：format 用 %p 時 Data 第一格是 0.673635；改成 %f 會變成 673.635（錯）。',
body:[
C.h3('懂','','反過來做一次'),
{lv:readFig,cap:'Read from Text File 直接接<b>路徑</b>時，會自己開檔、讀完、關檔，所以不用 Open 和 Close。count 不接（-1）就是讀整個檔案。'},
C.table(['函式','輸入','說明'],[
 ['Read from Text File（選盤上叫 Read Text File）','file：路徑或 refnum','接路徑：自己開關檔。接 refnum：從目前位置讀，要自己關'],
 ['Spreadsheet String To Array','spreadsheet string、delimiter、format string、array type','array type 不接預設 2D DBL；要讀成整數或字串，接一個對應型別的 2D 陣列常數']]),
C.h3('玩','','format string 錯了會怎樣'),
`<p>這是 F1 用 <code>%#.3p</code> 存出來的檔案。切換讀檔的格式，看讀回來的數字：</p>`,
{fn:readLab},
warn('這是 LabVIEW 2026 實測的結果，不是猜的：','用 %f 讀 SI 記號的檔案，Data 第一格是 673.635，不是 0.673635；錯誤線一樣是綠色的沒有錯誤。格式不配合時，LabVIEW 只是盡量讀，它不知道你原本的意思。'),
tip('實務做法：','存給程式讀的檔案用 <code>%.6f</code> 或 <code>%.6e</code>，讀的時候用 <code>%f</code>，最不會出事。<code>%p</code> 留給要給人看的報表。'),
C.h3('做','b','跟著做：F2_Read_Array.vi'),
{todo:[
 '新 VI 存 <code>F2_Read_Array.vi</code>。',
 fn('Programming','File I/O','Read from Text File')+'：<b>file</b> 右鍵 ▸ Create ▸ Control（改名 File Path）；<b>text</b> 右鍵 ▸ Create ▸ Indicator（改名 Text）。',
 fn('Programming','String','Spreadsheet String To Array')+'：spreadsheet string 接 Read from Text File 的 text；delimiter 接逗號常數；format string 接 <code>%p</code>（或做成控制項，方便切換）。',
 '<b>array</b> 輸出右鍵 ▸ Create ▸ Indicator（改名 Data）。前面板把 Data 拉成 4 列 × 3 行看得到。',
 'Read from Text File 的 error out 接一個 error out 顯示器。故意選一個不存在的檔案執行，看到錯誤 7。'
]},
C.real('F2_Read_Array','參考答案 F2_Read_Array.vi。測試時用 %p、%f、空白三種格式讀同一個 SI 檔，結果和上面的模擬一樣。下載：'+dl('F2_Read_Array')),
C.h3('測','q','小測驗'),
{quiz:[
 {q:'Read from Text File 的 file 接的是路徑（不是 refnum），還需要 Close File 嗎？',o:['不用，它自己開、讀、關','要，不然檔案鎖住','要先接 Open/Create/Replace File'],a:0,ex:'接路徑時它是「一次搞定」的用法。接 refnum 時才要自己關。'},
 {q:'檔案內容是 "1.5k,2.0k"，format string 用 %f 讀，Data 是？',o:['1.5、2','1500、2000','錯誤'],a:0,ex:'%f 讀到 k 就停，字首被丟掉。要 1500、2000 用 %p。'},
 {q:'Spreadsheet String To Array 想讀成字串陣列（例如檔案裡有文字欄位），要怎麼做？',o:['array type 接一個 2D 字串陣列常數，format string 用 %s','format string 改 %d','不行，只能讀數字'],a:0,ex:'array type 決定輸出型別，預設 2D DBL。'}
]}
]});

/* ======================================================================
   F4：紀錄檔一直往後加
   ====================================================================== */
L.push({id:'F03',order:24,no:'F4',part:PART,title:'紀錄檔：一筆一筆往後加（Set File Position）',mins:45,files:['F3_Append_Line.vi'],
goals:[['學會','open or create + Set File Position（end）接在檔案最後面；Format Date/Time String 做時間欄；\\r\\n 換行。'],['做出','每執行一次，log.csv 就多一行「時間,數值」。'],['用在專案','量測紀錄、異常紀錄、生產履歷，都是這個模式。']],
check:'連續執行三次（數值 1.5、2.25、3），log.csv 有三行，最舊的在最上面。',
body:[
C.h3('懂','','為什麼要 Set File Position'),
`<p><b>open or create</b> 打開檔案時，寫入位置在檔案<b>開頭</b>。直接寫會把第一行蓋掉。先用 Set File Position 把位置移到 <b>end</b>，再寫，新的一行就接在最後面。</p>`,
{lv:appendFig,cap:'和參考答案 F3_Append_Line.vi 同樣的接法。上面一排組出一行文字，下面一排開檔 → 移到最後 → 寫 → 關檔。'},
C.table(['函式','設定','結果'],[
 ['Format Date/Time String','time format string = <code>%Y-%m-%d %H:%M:%S</code>，seconds 不接（現在時間）','2026-11-10 09:10:46'],
 ['Format Into String','format string = <code>%s,%.3f\\r\\n</code>，input 1 = 時間字串，input 2 = 數值','2026-11-10 09:10:46,1.500↵'],
 ['Set File Position','from = <code>end</code>，offset 不接（0）','寫入位置移到檔案最後']]),
warn('\\r\\n 要讓 LabVIEW 看懂：','字串常數右鍵 ▸ <b>\'\\\' Codes Display</b>，才能打 <code>\\r\\n</code>（換行）、<code>\\t</code>（Tab）。沒切換的話，LabVIEW 會真的寫出反斜線和字母 r、n 四個字元。也可以直接在常數裡按 Enter 換行，但 Windows 記事本要 \\r\\n 才一定會換行。'),
note('在迴圈裡一直寫的時候：','不要每圈都開、關檔（很慢）。正確架構是<b>迴圈外開檔、迴圈內寫、迴圈外關檔</b>（CLAD 第 C6 課）。這支 VI 一次寫一行就關，適合「偶爾記一筆」，例如異常發生時。'),
C.h3('做','b','跟著做：F3_Append_Line.vi'),
{todo:[
 '新 VI 存 <code>F3_Append_Line.vi</code>。',
 fn('Programming','Timing','Format Date/Time String')+'：time format string 接 <code>%Y-%m-%d %H:%M:%S</code>。',
 fn('Programming','String','Format Into String')+'：往下拉成兩個輸入。format string 接 <code>%s,%.3f\\r\\n</code>（記得切 \'\\\' Codes Display）；input 1 接時間字串；input 2 右鍵 ▸ Create ▸ Control（Value）。resulting string 建一個顯示器（Line）。',
 fn('Programming','File I/O','Open/Create/Replace File')+'：file path 建控制項；operation 選 <code>open or create</code>。',
 fn('Programming','File I/O','Advanced File Functions','Set File Position')+'：refnum、error 接上；<b>from</b> 建常數選 <code>end</code>。',
 'Write to Text File（text 接 Line）→ Close File → error out 顯示器。',
 '執行三次，每次改 Value，用記事本打開檔案確認有三行。'
]},
C.real('F3_Append_Line','參考答案 F3_Append_Line.vi。測試時刪掉檔案後連續執行 3 次，檢查檔案剛好 3 行、順序正確。下載：'+dl('F3_Append_Line')),
C.h3('測','q','小測驗'),
{quiz:[
 {q:'用 open or create 打開已經有 10 行的檔案，沒有 Set File Position 就寫一行，會怎樣？',o:['新的一行蓋掉檔案開頭的內容','接在第 10 行後面','錯誤 8'],a:0,ex:'開檔時位置在開頭。要接在後面先移到 end。'},
 {q:'Format Into String 的 format string 是 %s,%.3f\\r\\n，但沒有切 \'\\\' Codes Display，檔案會？',o:['每行最後多了 \\r\\n 四個字，而且不換行','正常換行','錯誤'],a:0,ex:'沒切換時反斜線就是普通字元。'},
 {q:'一個每 100 ms 寫一筆的量測迴圈，最好的寫法是？',o:['迴圈外開檔、迴圈內 Write、迴圈外 Close','每圈呼叫 F3_Append_Line.vi','每圈用 Write Delimited Spreadsheet.vi，append = T'],a:0,ex:'開關檔是慢的動作，放在迴圈裡會拖慢迴圈、也增加出錯機會。'}
]}
]});

/* ======================================================================
   F5：高階 vs 低階、選盤導覽、錯誤碼
   ====================================================================== */
L.push({id:'F04',order:25,no:'F5',part:PART,title:'File I/O 選盤導覽：高階、低階怎麼選，常見錯誤碼',mins:30,
goals:[['學會','File I/O 選盤上每個圖示的用途；什麼時候用一行搞定的高階 VI、什麼時候用開寫關；看到錯誤 7、8、43 知道原因。'],['之後','異常紀錄（第 20 課）用的是高階的 Write Delimited Spreadsheet；量測迴圈用低階。']],
check:'能說出 Write Delimited Spreadsheet.vi 和「開、寫、關」各適合什麼情況，以及檔案被 Excel 開著時寫入會出現哪個錯誤。',
body:[
C.h3('懂','','File I/O 選盤（Functions ▸ Programming ▸ File I/O）'),
C.table(['圖示名稱','類型','做什麼'],[
 ['Write Delimited Spreadsheet.vi','高階','2D／1D 陣列直接寫成 CSV（自己開、寫、關）。有 format、append to file?、delimiter、transpose?'],
 ['Read Delimited Spreadsheet.vi','高階','反過來，直接讀成 2D 陣列'],
 ['Write Meas File／Read Meas File','Express','量測專用格式（.lvm、.tdms），帶時間和通道名稱。設定用對話框'],
 ['Open/Create/Replace File、Close File','低階','開檔、關檔，中間可以寫很多次'],
 ['Write Text File／Read Text File','低階','寫、讀字串。接路徑也能自己開關'],
 ['Format Into File／Scan From File','低階','Format Into String 加寫檔一次完成；Scan 反過來'],
 ['Write Binary File／Read Binary File','低階','原始二進位，檔案小、速度快，但記事本看不懂'],
 ['Build Path、Strip Path','路徑','組路徑、拿掉最後一段（例如從 VI 路徑拿到資料夾）'],
 ['File Constants','路徑','Current VI\'s Path、Default Directory 等常數'],
 ['Config File VIs','設定檔','讀寫 .ini（[section] key=value），存參數用']]),
C.h3('懂','','高階還是低階'),
C.table(['情況','用','原因'],[
 ['按一個按鈕存一次整份資料','Write Delimited Spreadsheet.vi，或 F1 的寫法','一次寫完，簡單'],
 ['偶爾記一筆（異常、換班）','Write Delimited Spreadsheet.vi（append = T）或 F3','開關一次的時間不重要'],
 ['迴圈裡每 10～100 ms 寫一筆','迴圈外 Open、迴圈內 Write、迴圈外 Close','開關檔慢，放迴圈裡會拖慢'],
 ['要讀寫同一個檔案的中間位置','低階 + Set File Position','高階做不到'],
 ['給 Excel 看','逗號分隔、%.3f 或 %.6e、副檔名 .csv','—'],
 ['大量高速資料','TDMS 或 Binary','文字檔又大又慢']]),
C.h3('懂','','常見錯誤碼'),
C.table(['錯誤碼','什麼時候出現','怎麼辦'],[
 ['7','檔案或資料夾不存在（operation = open、路徑打錯、資料夾沒建）','先確認路徑；資料夾用 Create Folder 建，或用 open or create'],
 ['8','沒有權限：檔案正被 Excel 開著、唯讀、或 create 遇到已存在的檔案','關掉 Excel 再執行；換 operation'],
 ['43','使用者在檔案對話框按了取消','用 cancelled 輸出判斷，取消時不要寫'],
 ['1430','路徑是空的或格式不對','檢查路徑控制項有沒有值']]),
tip('對照課堂畫面：','選盤上看到的「Write Text File」「Read Text File」，放到方塊圖上的函式名稱是 Write to Text File、Read from Text File，是同一個東西。'),
C.h3('測','q','小測驗'),
{quiz:[
 {q:'執行時出現錯誤 8，檔案路徑確定是對的。最可能的原因？',o:['檔案正被 Excel 開著','路徑不存在','format string 錯'],a:0,ex:'Excel 開著 CSV 會鎖住檔案，LabVIEW 寫不進去。'},
 {q:'量測迴圈每 50 ms 要記一筆，用 Write Delimited Spreadsheet.vi（append = T）放在迴圈裡，問題是？',o:['它每次都開檔、寫、關檔，很慢，可能跟不上 50 ms','它不能 append','它只能寫 2D'],a:0,ex:'高階 VI 方便但每次都完整開關一次。'},
 {q:'File Path 空白時執行 F1_Save_Array.vi 會怎樣？',o:['跳出存檔對話框讓你選','錯誤 7','寫到桌面'],a:0,ex:'Open/Create/Replace File 的 file path 沒給，就用對話框問，所以端子叫 file path (use dialog)。按取消會有錯誤 43。'}
]}
]});
})();
