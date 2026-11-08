/* =====================================================================
   lvdraw.js — 仿 LabVIEW 前面板 + 方塊圖的教學元件
   方塊圖用 SVG 畫（節點、結構、資料線），前面板用 HTML 畫（可操作）。
   一個 widget = 一個「VI 視窗」：可單獨看前面板、方塊圖，或並排。
   sim 物件模擬這個 VI 執行時的資料，Run / Highlight Execution 都靠它。
   ===================================================================== */
(function(){
'use strict';
const NS='http://www.w3.org/2000/svg';
const LV=window.LV={};

/* ---------- 資料型別：顏色與端子文字（照 LabVIEW 線色） ---------- */
const T={
  dbl:{c:'#e86f00',x:'DBL'}, sgl:{c:'#e86f00',x:'SGL'},
  i32:{c:'#1652c9',x:'I32'}, i16:{c:'#1652c9',x:'I16'}, i8:{c:'#1652c9',x:'I8'},
  u32:{c:'#1652c9',x:'U32'}, u16:{c:'#1652c9',x:'U16'}, u8:{c:'#1652c9',x:'U8'},
  enum:{c:'#1652c9',x:'U16'},
  bool:{c:'#008a00',x:'TF'}, str:{c:'#e0359e',x:'abc'}, path:{c:'#1a8a7a',x:'Path'},
  err:{c:'#a08400',x:'err'}, clu:{c:'#8b4a2b',x:'▦'}, visa:{c:'#6b3fa0',x:'I/O'},
  queue:{c:'#007b7b',x:'Q'}, time:{c:'#8b4a2b',x:'⏲'}, void:{c:'#888',x:''}
};
LV.T=T;
function base(t){return (t||'dbl').replace(/\[\]/g,'')}
function isArr(t){return /\[\]/.test(t||'')}
function tcol(t){return (T[base(t)]||T.dbl).c}
function ttxt(t){const b=T[base(t)]||T.dbl;return isArr(t)?'['+b.x+']':b.x}

/* ---------- 函式目錄：方塊、端子、選盤位置 ---------- */
const P='Functions';
const PR=[P,'Programming'];
const F={
 'Add':{p:'+',a:2,pal:[...PR,'Numeric','Add']},
 'Subtract':{p:'−',a:2,pal:[...PR,'Numeric','Subtract']},
 'Multiply':{p:'×',a:2,pal:[...PR,'Numeric','Multiply']},
 'Divide':{p:'÷',a:2,pal:[...PR,'Numeric','Divide']},
 'Increment':{p:'+1',a:1,pal:[...PR,'Numeric','Increment']},
 'Decrement':{p:'−1',a:1,pal:[...PR,'Numeric','Decrement']},
 'Equal?':{p:'=',a:2,pal:[...PR,'Comparison','Equal?']},
 'Not Equal?':{p:'≠',a:2,pal:[...PR,'Comparison','Not Equal?']},
 'Greater?':{p:'>',a:2,pal:[...PR,'Comparison','Greater?']},
 'Less?':{p:'<',a:2,pal:[...PR,'Comparison','Less?']},
 'Greater Or Equal?':{p:'≥',a:2,pal:[...PR,'Comparison','Greater Or Equal?']},
 'Less Or Equal?':{p:'≤',a:2,pal:[...PR,'Comparison','Less Or Equal?']},
 'Equal To 0?':{p:'=0',a:1,pal:[...PR,'Comparison','Equal To 0?']},
 'Not Equal To 0?':{p:'≠0',a:1,pal:[...PR,'Comparison','Not Equal To 0?']},
 'Greater Than 0?':{p:'>0',a:1,pal:[...PR,'Comparison','Greater Than 0?']},
 'And':{p:'∧',a:2,pal:[...PR,'Boolean','And']},
 'Or':{p:'∨',a:2,pal:[...PR,'Boolean','Or']},
 'Exclusive Or':{p:'⊕',a:2,pal:[...PR,'Boolean','Exclusive Or']},
 'Not':{p:'¬',a:1,pal:[...PR,'Boolean','Not']},
 'To Unsigned Word Integer':{p:'U16',a:1,pal:[...PR,'Numeric','Conversion','To Unsigned Word Integer']},
 'To Unsigned Byte Integer':{p:'U8',a:1,pal:[...PR,'Numeric','Conversion','To Unsigned Byte Integer']},
 'To Long Integer':{p:'I32',a:1,pal:[...PR,'Numeric','Conversion','To Long Integer']},
 'Select':{p:'sel',pal:[...PR,'Comparison','Select']},
 'Quotient & Remainder':{p:'qr',pal:[...PR,'Numeric','Quotient & Remainder']},
 // ---- 方塊型函式 ----
 'Add Array Elements':{g:'Σ',ins:['numeric array'],outs:['sum'],pal:[...PR,'Numeric','Add Array Elements']},
 'Swap Bytes':{g:'⇄B',ins:['x'],outs:['swapped'],pal:[...PR,'Numeric','Data Manipulation','Swap Bytes']},
 'In Range and Coerce':{g:'⊏⊐',ins:['upper limit','x','lower limit'],outs:['coerced(x)','In Range?'],pal:[...PR,'Comparison','In Range and Coerce']},
 'Boolean Array To Number':{g:'[TF]→#',ins:['Boolean array'],outs:['number'],w:46,pal:[...PR,'Boolean','Boolean Array To Number']},
 'Number To Boolean Array':{g:'#→[TF]',ins:['number'],outs:['Boolean array'],w:46,pal:[...PR,'Boolean','Number To Boolean Array']},
 'Index Array':{g:'[i]',ins:['array','index'],outs:['element'],pal:[...PR,'Array','Index Array']},
 'Build Array':{g:'[+]',ins:['element','element'],outs:['appended array'],pal:[...PR,'Array','Build Array']},
 'Array Size':{g:'[#]',ins:['array'],outs:['size'],pal:[...PR,'Array','Array Size']},
 'Array Subset':{g:'[⋯]',ins:['array','index','length'],outs:['subarray'],pal:[...PR,'Array','Array Subset']},
 'Initialize Array':{g:'[0…]',ins:['element','dimension size'],outs:['initialized array'],pal:[...PR,'Array','Initialize Array']},
 'Insert Into Array':{g:'[↓]',ins:['array','new element','index'],outs:['output array'],pal:[...PR,'Array','Insert Into Array']},
 'Replace Array Subset':{g:'[⇆]',ins:['array','index','new element'],outs:['output array'],pal:[...PR,'Array','Replace Array Subset']},
 'Bundle By Name':{g:'▦←',ins:['input cluster','name'],outs:['output cluster'],w:56,pal:[...PR,'Cluster, Class, & Variant','Bundle By Name']},
 'Unbundle By Name':{g:'▦→',ins:['input cluster'],outs:['name'],w:56,pal:[...PR,'Cluster, Class, & Variant','Unbundle By Name']},
 'Concatenate Strings':{g:'a+b',ins:['string','string'],outs:['concatenated string'],pal:[...PR,'String','Concatenate Strings']},
 'String Length':{g:'len',ins:['string'],outs:['length'],pal:[...PR,'String','String Length']},
 'String Subset':{g:'ab|c',ins:['string','offset','length'],outs:['substring'],pal:[...PR,'String','String Subset']},
 'Format Into String':{g:'%d',ins:['format string','input 1'],outs:['resulting string'],w:46,pal:[...PR,'String','Format Into String']},
 'Scan From String':{g:'%→',ins:['input string','format string'],outs:['output 1'],w:46,pal:[...PR,'String','Scan From String']},
 'Number To Hexadecimal String':{g:'#→hex',ins:['number','width'],outs:['hex integer string'],w:46,pal:[...PR,'String','Number/String Conversion','Number To Hexadecimal String']},
 'Hexadecimal String To Number':{g:'hex→#',ins:['string','offset','default'],outs:['number'],w:46,pal:[...PR,'String','Number/String Conversion','Hexadecimal String To Number']},
 'Number To Decimal String':{g:'#→abc',ins:['number','width'],outs:['decimal integer string'],w:46,pal:[...PR,'String','Number/String Conversion','Number To Decimal String']},
 'String To Byte Array':{g:'abc→[U8]',ins:['string'],outs:['unsigned byte array'],w:56,pal:[...PR,'String','String/Array/Path Conversion','String To Byte Array']},
 'Byte Array To String':{g:'[U8]→abc',ins:['unsigned byte array'],outs:['string'],w:56,pal:[...PR,'String','String/Array/Path Conversion','Byte Array To String']},
 'Wait (ms)':{g:'⌚',ins:['milliseconds to wait'],outs:['millisecond timer value'],pal:[...PR,'Timing','Wait (ms)'],col:'#e8f0ff'},
 'Tick Count (ms)':{g:'⏱',ins:[],outs:['millisecond timer value'],pal:[...PR,'Timing','Tick Count (ms)'],col:'#e8f0ff'},
 'Get Date/Time String':{g:'📅',ins:['date format','time stamp','want seconds?'],outs:['date string','time string'],w:46,pal:[...PR,'Timing','Get Date/Time String'],col:'#e8f0ff'},
 'Simple Error Handler':{g:'!',ins:['error in'],outs:['error out'],w:40,pal:[...PR,'Dialog & User Interface','Simple Error Handler.vi'],col:'#fff1c2'},
 'One Button Dialog':{g:'💬',ins:['message'],outs:[],pal:[...PR,'Dialog & User Interface','One Button Dialog']},
 'Merge Errors':{g:'⊕err',ins:['error 1','error 2'],outs:['error out'],pal:[...PR,'Dialog & User Interface','Merge Errors'],col:'#fff1c2'},
 'Clear Errors':{g:'✕err',ins:['error in'],outs:['error out'],pal:[...PR,'Dialog & User Interface','Clear Errors.vi'],col:'#fff1c2'},
 'VISA Open':{g:'VISA\nOPEN',ins:['VISA resource name','timeout','error in'],outs:['VISA resource name out','error out'],w:44,h:44,col:'#efe6fb',pal:[P,'Instrument I/O','VISA','Advanced VISA','VISA Open']},
 'VISA Configure Serial Port':{g:'VISA\nSER',ins:['VISA resource name','baud rate','data bits','parity','stop bits','error in'],outs:['VISA resource name out','error out'],w:44,h:72,col:'#efe6fb',pal:[P,'Instrument I/O','Serial','VISA Configure Serial Port']},
 'VISA Write':{g:'VISA\nW',ins:['VISA resource name','write buffer','error in'],outs:['VISA resource name out','return count','error out'],w:44,h:44,col:'#efe6fb',pal:[P,'Instrument I/O','Serial','VISA Write']},
 'VISA Read':{g:'VISA\nR',ins:['VISA resource name','byte count','error in'],outs:['VISA resource name out','read buffer','error out'],w:44,h:44,col:'#efe6fb',pal:[P,'Instrument I/O','Serial','VISA Read']},
 'VISA Close':{g:'VISA\nCLOSE',ins:['VISA resource name','error in'],outs:['error out'],w:44,h:44,col:'#efe6fb',pal:[P,'Instrument I/O','Serial','VISA Close']},
 'VISA Flush I/O Buffer':{g:'VISA\nFLUSH',ins:['VISA resource name','mask','error in'],outs:['VISA resource name out','error out'],w:44,h:44,col:'#efe6fb',pal:[P,'Instrument I/O','Serial','VISA Flush I/O Buffer']},
 'Obtain Queue':{g:'Q+',ins:['max queue size','name','element data type','error in'],outs:['queue out','error out'],w:40,h:56,col:'#dff4f4',pal:[...PR,'Synchronization','Queue Operations','Obtain Queue']},
 'Enqueue Element':{g:'Q←',ins:['queue','element','timeout in ms','error in'],outs:['queue out','error out'],w:40,h:56,col:'#dff4f4',pal:[...PR,'Synchronization','Queue Operations','Enqueue Element']},
 'Dequeue Element':{g:'Q→',ins:['queue','timeout in ms','error in'],outs:['queue out','element','timed out?','error out'],w:40,h:56,col:'#dff4f4',pal:[...PR,'Synchronization','Queue Operations','Dequeue Element']},
 'Release Queue':{g:'Q✕',ins:['queue','force destroy?','error in'],outs:['remaining elements','error out'],w:40,h:44,col:'#dff4f4',pal:[...PR,'Synchronization','Queue Operations','Release Queue']},
 'Flush Queue':{g:'Q∅',ins:['queue','error in'],outs:['queue out','remaining elements','error out'],w:40,h:44,col:'#dff4f4',pal:[...PR,'Synchronization','Queue Operations','Flush Queue']},
 'Write Delimited Spreadsheet':{g:'CSV\n✎',ins:['file path','2D data','append?','delimiter','error in'],outs:['new file path','error out'],w:44,h:60,col:'#e6f3ea',pal:[...PR,'File I/O','Write Delimited Spreadsheet.vi']},
 'Build Path':{g:'📁+',ins:['base path','name or relative path'],outs:['appended path'],pal:[...PR,'File I/O','Build Path']},
 'Application Directory':{g:'📁',ins:[],outs:['application directory'],pal:[...PR,'File I/O','File Constants','Application Directory.vi']},
 'Format Date/Time String':{g:'%Y',ins:['time format string','time stamp'],outs:['date/time string'],w:46,pal:[...PR,'Timing','Format Date/Time String'],col:'#e8f0ff'},
 'Get Date/Time In Seconds':{g:'⏲',ins:[],outs:['current time'],pal:[...PR,'Timing','Get Date/Time In Seconds'],col:'#e8f0ff'}
};
LV.F=F;

/* ---------- 幾何：每種節點的大小與端子位置（相對節點左上角） ---------- */
function spread(n,h,i){return Math.round(h*(i+1)/(n+1))}
function geom(n,S){
  const k=n.k;
  if(k==='ctl'||k==='ind'){
    const w=n.w||36,h=20;
    return {w,h,t: k==='ctl'?{out:{x:w,y:10,o:1}}:{in:{x:0,y:10}}};
  }
  if(k==='const'){
    const s=String(n.v);let w;
    if(n.t==='bool') w=20; else w=Math.max(22,[...s].reduce((a,ch)=>a+(ch.charCodeAt(0)>255?12:7),0)+10);
    if(n.w) w=n.w;
    const h=n.h||18;
    return {w,h,t:{out:{x:w,y:h/2,o:1}}};
  }
  if(k==='fn'){
    const f=F[n.fn]||{};
    if(f.p){ // 三角形原生函式
      if(f.p==='sel') return {w:30,h:32,t:{t:{x:0,y:7},s:{x:0,y:16},f:{x:0,y:25},out:{x:30,y:16,o:1}}};
      if(f.p==='qr') return {w:30,h:32,t:{x:{x:0,y:9},y:{x:0,y:23},R:{x:30,y:9,o:1},IQ:{x:30,y:23,o:1}}};
      if(f.a===1) return {w:28,h:28,t:{x:{x:0,y:14},out:{x:28,y:14,o:1}}};
      return {w:28,h:28,t:{x:{x:0,y:7},y:{x:0,y:21},out:{x:28,y:14,o:1}}};
    }
    const ins=n.ins||f.ins||[],outs=n.outs||f.outs||[];
    const w=n.w||f.w||40;
    const h=n.h||f.h||Math.max(32,Math.max(ins.length,outs.length)*13+8);
    const t={};
    ins.forEach((nm,i)=>t[nm]={x:0,y:spread(ins.length,h,i)});
    outs.forEach((nm,i)=>t[nm]={x:w,y:spread(outs.length,h,i),o:1});
    return {w,h,t};
  }
  if(k==='sub'){
    const w=n.w||46,h=n.h||46;const t={};
    const ins=n.ins||[],outs=n.outs||[];
    const top=n.err?h-12:h;
    ins.forEach((nm,i)=>t[nm]={x:0,y:spread(ins.length,top,i)});
    outs.forEach((nm,i)=>t[nm]={x:w,y:spread(outs.length,top,i),o:1});
    if(n.err){t['error in']={x:0,y:h-7};t['error out']={x:w,y:h-7,o:1};}
    return {w,h,t};
  }
  if(k==='bundle'||k==='unbundle'){ // Bundle/Unbundle By Name：列出元素名稱
    const items=n.items||[];const w=n.w||86,row=14,h=items.length*row+(k==='bundle'?16:14);
    const t={};
    if(k==='bundle'){
      t['input cluster']={x:w/2,y:0};
      items.forEach((nm,i)=>t[nm]={x:0,y:14+i*row+7});
      t['output cluster']={x:w,y:h/2,o:1};
    }else{
      t['input cluster']={x:0,y:h/2};
      items.forEach((nm,i)=>t[nm]={x:w,y:7+i*row+7,o:1});
    }
    return {w,h,t};
  }
  if(k==='label'){return {w:n.w||160,h:n.h||36,t:{}};}
  if(k==='fb') return {w:28,h:22,t:{in:{x:0,y:11},out:{x:28,y:11,o:1},init:{x:14,y:22}}};
  if(k==='local'||k==='global'){
    const w=n.w||Math.max(40,[...String(n.v)].length*7+26),h=18;
    return {w,h,t:n.write?{in:{x:0,y:9}}:{out:{x:w,y:9,o:1}}};
  }
  if(k==='prop'||k==='invoke'){
    const items=n.items||[];const w=n.w||110,row=15,top=18,h=top+items.length*row+(n.err?14:2);
    const t={reference:{x:0,y:9},'reference out':{x:w,y:9,o:1}};
    items.forEach((it,i)=>{const y=top+i*row+7;if(it.w)t[it.n]={x:0,y};else t[it.n]={x:w,y,o:1};});
    if(n.err){t['error in']={x:0,y:h-7};t['error out']={x:w,y:h-7,o:1};}
    return {w,h,t};
  }
  const s=S[n.s];
  if(k==='tunnel'||k==='sr'||k==='iter'||k==='stop'||k==='N'||k==='sel'||k==='tmo'||k==='evd'){
    if(!s) return {w:0,h:0,t:{}};
  }
  if(k==='tunnel'){
    const sz=12;
    if(n.side==='r'){const t={i:{x:0,y:sz/2},o:{x:sz,y:sz/2,o:1}};if(n.mode==='cond')t.c={x:-16,y:20};return {w:sz,h:sz,t,ax:s.x+s.w-sz/2,ay:n.y-sz/2};}
    return {w:sz,h:sz,t:{o:{x:0,y:sz/2},i:{x:sz,y:sz/2,o:1}},ax:s.x-sz/2,ay:n.y-sz/2};
  }
  if(k==='sr'){
    return {w:s.w+16,h:16,t:{init:{x:0,y:8},L:{x:14,y:8,o:1},R:{x:s.w+2,y:8},out:{x:s.w+16,y:8,o:1}},ax:s.x-8,ay:n.y-8};
  }
  if(k==='iter') return {w:18,h:18,t:{out:{x:18,y:9,o:1}},ax:s.x+10,ay:s.y+s.h-30};
  if(k==='stop') return {w:20,h:20,t:{in:{x:0,y:10}},ax:s.x+s.w-32,ay:s.y+s.h-32};
  if(k==='N') return {w:18,h:18,t:{in:{x:0,y:9}},ax:s.x+8,ay:s.y+8};
  if(k==='sel') return {w:14,h:14,t:{in:{x:0,y:7}},ax:s.x-7,ay:(n.y||s.y+s.h/2)-7};
  if(k==='tmo') return {w:18,h:18,t:{in:{x:0,y:9}},ax:s.x+6,ay:s.y+6};
  if(k==='evd'){const items=n.items||[];const t={};items.forEach((nm,i)=>t[nm]={x:n.w||80,y:8+i*14,o:1});return {w:n.w||80,h:items.length*14+2,t,ax:s.x+5,ay:s.y+30};}
  return {w:20,h:20,t:{}};
}

/* ---------- SVG 小工具 ---------- */
function el(tag,attrs,parent){const e=document.createElementNS(NS,tag);for(const a in attrs){if(attrs[a]!=null)e.setAttribute(a,attrs[a]);}if(parent)parent.appendChild(e);return e;}
function txt(parent,x,y,s,cls,extra){extra=Object.assign({},extra||{});if(extra['font-size']){extra.style=(extra.style||'')+'font-size:'+extra['font-size']+'px';delete extra['font-size'];}const e=el('text',Object.assign({x,y,class:cls},extra),parent);e.textContent=s;return e;}
function esc(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}

/* ---------- 線的樣式 ---------- */
function wireStyle(t){
  const b=base(t),a=isArr(t),c=tcol(t);
  if(b==='err'||b==='clu'||b==='time') return {c,w:a?6:5,dbl:true};
  if(b==='visa'||b==='queue') return {c,w:a?4:2.4};
  if(b==='str') return {c,w:a?4:2.2,dash:a?null:'7 1.5'};
  return {c,w:a?3.4:1.6};
}

/* ---------- 方塊圖繪製 ---------- */
function drawDiagram(svg,D,opt){
  // opt: {shown:Set|null, fresh:Set, frames:{caseId:index}, vals:{}, showVals, dimSet, onNode}
  while(svg.firstChild) svg.removeChild(svg.firstChild);
  const S={};(D.structs||[]).forEach(s=>S[s.id]=s);
  const W=D.w||700,H=D.h||300;
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  svg.setAttribute('width',W);svg.setAttribute('height',H);
  el('rect',{x:0,y:0,width:W,height:H,fill:'#fff'},svg);
  const defs=el('defs',{},svg);
  const shown=opt.shown, fresh=opt.fresh||new Set();
  const frames=opt.frames||{};
  const vis=id=>!shown||shown.has(id);
  const nodeIndex={};(D.nodes||[]).forEach(n=>nodeIndex[n.id]=n);
  // 節點是否在目前顯示的 Case 頁
  function frameOK(o){
    if(!o.f) return true;
    const fs=Array.isArray(o.f)?o.f:[o.f];
    return fs.every(f=>{const ci=f.indexOf(':'),cid=f.slice(0,ci),fr=f.slice(ci+1);const s=S[cid];if(!s)return true;const cur=s.frames[frames[cid]!=null?frames[cid]:(s.cur||0)];return cur===fr;});
  }
  function structVisible(s){return vis(s.id)&&frameOK(s);}
  function nodeVisible(n){
    if(!vis(n.id)||!frameOK(n)) return false;
    if(n.s&&S[n.s]&&!structVisible(S[n.s])) return false;
    return true;
  }
  const G={};// 絕對位置
  const pos=n=>{const g=geom(n,S);const x=g.ax!=null?g.ax:n.x,y=g.ay!=null?g.ay:n.y;return {x,y,g};};
  function termAbs(ref){
    let [id,tn]=ref.split('.');
    if(ref.includes('.')){id=ref.slice(0,ref.indexOf('.'));tn=ref.slice(ref.indexOf('.')+1);}
    const n=nodeIndex[id];if(!n) return null;
    const p=pos(n);const ts=p.g.t;let t=tn?ts[tn]:null;
    if(!t){// 預設：第一個輸出或第一個輸入
      const keys=Object.keys(ts);t=ts[keys.find(k=>ts[k].o)]||ts[keys[0]];
    }
    if(!t) return null;
    return {x:p.x+t.x,y:p.y+t.y,n};
  }
  function defaultIn(ref){// 目的端預設第一個輸入
    if(ref.includes('.')) return termAbs(ref);
    const n=nodeIndex[ref];if(!n) return null;const p=pos(n);const ts=p.g.t;
    const k=Object.keys(ts).find(k=>!ts[k].o);if(!k) return null;
    return {x:p.x+ts[k].x,y:p.y+ts[k].y,n};
  }
  // ---- 結構（大的先畫） ----
  const structs=(D.structs||[]).filter(structVisible).sort((a,b)=>b.w*b.h-a.w*a.h);
  structs.forEach(s=>{
    const g=el('g',{class:'struct'+(fresh.has(s.id)?' newg':'')},svg);
    if(s.k==='while'||s.k==='for'){
      el('rect',{x:s.x,y:s.y,width:s.w,height:s.h,fill:'none',stroke:'#8c8c8c','stroke-width':7},g);
      el('rect',{x:s.x-3.5,y:s.y-3.5,width:s.w+7,height:s.h+7,fill:'none',stroke:'#5e5e5e','stroke-width':1},g);
      el('rect',{x:s.x+3.5,y:s.y+3.5,width:s.w-7,height:s.h-7,fill:'none',stroke:'#b8b8b8','stroke-width':1},g);
    }else if(s.k==='case'||s.k==='event'){
      el('rect',{x:s.x,y:s.y,width:s.w,height:s.h,fill:'none',stroke:'#7a7a7a','stroke-width':6},g);
      el('rect',{x:s.x-3,y:s.y-3,width:s.w+6,height:s.h+6,fill:'none',stroke:'#333','stroke-width':1},g);
      const cur=frames[s.id]!=null?frames[s.id]:(s.cur||0);
      const label=s.k==='event'?'['+cur+'] '+s.frames[cur]:s.frames[cur]+(s.def===s.frames[cur]?', Default':'');
      const lw=Math.max(70,[...label].length*7+44);
      const lx=s.x+s.w/2-lw/2,ly=s.y-10;
      const lg=el('g',{style:'cursor:pointer'},g);
      el('rect',{x:lx,y:ly,width:lw,height:18,fill:'#fff',stroke:'#444'},lg);
      txt(lg,lx+9,ly+13,'◀','lb',{'font-size':9});
      txt(lg,lx+lw/2,ly+13,label,'lb',{'text-anchor':'middle'});
      txt(lg,lx+lw-14,ly+13,'▶','lb',{'font-size':9});
      el('line',{x1:lx+18,y1:ly,x2:lx+18,y2:ly+18,stroke:'#999'},lg);
      el('line',{x1:lx+lw-20,y1:ly,x2:lx+lw-20,y2:ly+18,stroke:'#999'},lg);
      lg.addEventListener('click',ev=>{
        const r=lg.getBoundingClientRect();const left=ev.clientX<r.left+r.width/2;
        const n=s.frames.length;frames[s.id]=((cur+(left?-1:1))%n+n)%n;opt.redraw&&opt.redraw();
      });
      lg.appendChild(el('title',{})).textContent='按左右箭頭切換 Case 頁（LabVIEW 也是這樣切）';
    }else if(s.k==='seq'){
      el('rect',{x:s.x,y:s.y,width:s.w,height:s.h,fill:'none',stroke:'#a8a8a8','stroke-width':9},g);
      el('rect',{x:s.x,y:s.y,width:s.w,height:s.h,fill:'none',stroke:'#fff','stroke-width':4,'stroke-dasharray':'5 4'},g);
      let x=s.x;(s.fw||[]).slice(0,-1).forEach(w=>{x+=w;el('line',{x1:x,y1:s.y,x2:x,y2:s.y+s.h,stroke:'#a8a8a8','stroke-width':9},g);el('line',{x1:x,y1:s.y,x2:x,y2:s.y+s.h,stroke:'#fff','stroke-width':4,'stroke-dasharray':'5 4'},g);});
    }else if(s.k==='formula'){
      el('rect',{x:s.x,y:s.y,width:s.w,height:s.h,fill:'#fbfbfb',stroke:'#8a8a8a','stroke-width':6},g);
      String(s.text||'').split('\n').forEach((ln,i)=>txt(g,s.x+30,s.y+22+i*15,ln,'lb',{'font-family':'Consolas,monospace'}));
    }
    if(fresh.has(s.id)) el('rect',{class:'hlb',x:s.x-8,y:s.y-8,width:s.w+16,height:s.h+16,rx:4},g);
    if(s.name) txt(g,s.x+4,s.y-8,s.name,'nm');
  });
  // ---- 線 ----
  const wireLayer=el('g',{},svg);
  const wirePaths={};
  (D.wires||[]).forEach(w=>{
    if(!vis(w.id)) return;
    if(!frameOK(w)) return;
    const a=termAbs(w.from),b=defaultIn(w.to);
    if(!a||!b) return;
    if(!nodeVisible(a.n)||!nodeVisible(b.n)) return;
    let pts;
    if(w.pts) pts=[[a.x,a.y],...w.pts,[b.x,b.y]];
    else if(Math.abs(a.y-b.y)<0.5) pts=[[a.x,a.y],[b.x,b.y]];
    else{const mx=w.mx!=null?w.mx:Math.round((a.x+b.x)/2);pts=[[a.x,a.y],[mx,a.y],[mx,b.y],[b.x,b.y]];}
    const d='M'+pts.map(p=>p.join(',')).join('L');
    const st=wireStyle(w.t);
    const g=el('g',{class:'wire'+(opt.dimSet&&opt.dimSet.has(w.id)?' dim':'')},wireLayer);
    if(st.dbl){
      el('path',{d,fill:'none',stroke:st.c,'stroke-width':st.w,'stroke-linejoin':'miter'},g);
      el('path',{d,fill:'none',stroke:'#fff','stroke-width':st.w-3.2},g);
    }else{
      el('path',{d,fill:'none',stroke:st.c,'stroke-width':st.w,'stroke-dasharray':st.dash||null},g);
      if(isArr(w.t)&&base(w.t)!=='str') el('path',{d,fill:'none',stroke:'#fff','stroke-width':1},g);
    }
    if(fresh.has(w.id)) el('path',{d,fill:'none',stroke:'#ff9d00','stroke-width':st.w+6,opacity:.35},g);
    if(w.coerce) el('circle',{cx:b.x+2,cy:b.y,r:2.6,fill:'#e00000'},g);
    wirePaths[w.id]={pts,w};
  });
  // ---- 節點 ----
  const nodeLayer=el('g',{},svg);
  const nodeG={};
  (D.nodes||[]).forEach(n=>{
    if(!nodeVisible(n)) return;
    const {x,y,g}=pos(n);
    const grp=el('g',{class:'node'+(fresh.has(n.id)?' newg':'')+(opt.dimSet&&opt.dimSet.has(n.id)?' dim':''),transform:`translate(${x},${y})`},nodeLayer);
    nodeG[n.id]=grp;
    drawNode(grp,n,g,S);
    if(fresh.has(n.id)){
      if(n.k==='sr'){const sw=S[n.s].w;el('rect',{class:'hlb',x:-5,y:-5,width:24,height:26,rx:3},grp);el('rect',{class:'hlb',x:sw-3,y:-5,width:24,height:26,rx:3},grp);}
      else el('rect',{class:'hlb',x:-6,y:-6,width:g.w+12,height:g.h+12,rx:4},grp);}
    if(opt.onNode){
      grp.addEventListener('mouseenter',ev=>opt.onNode(n,ev,true));
      grp.addEventListener('mouseleave',ev=>opt.onNode(n,ev,false));
    }
  });
  // ---- 線上的值（探針） ----
  const tagLayer=el('g',{},svg);
  if(opt.showVals&&opt.vals){
    Object.values(wirePaths).forEach(({pts,w})=>{
      let v=opt.vals[w.from];
      if(v===undefined) v=opt.vals[w.from.split('.')[0]];
      if(v===undefined||w.noval) return;
      const s=fmtVal(v,w.t);
      const p0=pts[pts.length-2],p1=pts[pts.length-1];
      const mx=(p0[0]+p1[0])/2,my=(p0[1]+p1[1])/2;
      const tw=Math.min(220,[...s].length*6+8);
      const tg=el('g',{class:'vtag'},tagLayer);
      el('rect',{x:mx-tw/2,y:my-17,width:tw,height:13,rx:2},tg);
      txt(tg,mx-tw/2+4,my-10.5,s.length>36?s.slice(0,35)+'…':s,'');
    });
  }
  return {wirePaths,nodeG,termAbs,tagLayer,svg};
}

/* 顯示用：值轉文字（字串中的控制字元顯示成 <STX>） */
const CC={2:'STX',3:'ETX',5:'ENQ',6:'ACK',21:'NAK',10:'LF',13:'CR'};
function fmtVal(v,t){
  if(v===null||v===undefined) return '';
  if(typeof v==='boolean') return v?'T':'F';
  if(typeof v==='string') return '"'+[...v].map(c=>{const k=c.charCodeAt(0);return CC[k]?'<'+CC[k]+'>':(k<32?'\\'+k.toString(16):c);}).join('')+'"';
  if(Array.isArray(v)) return '['+v.slice(0,8).map(x=>fmtVal(x)).join(',')+(v.length>8?',…':'')+']';
  if(typeof v==='object') return v.status!==undefined?(v.status?'錯誤 '+v.code:'無錯誤'):'{…}';
  if(typeof v==='number'&&base(t)==='dbl'&&!Number.isInteger(v)) return v.toFixed(2);
  return String(v);
}
LV.fmtVal=fmtVal;

function drawNode(g,n,geo,S){
  const k=n.k;
  if(k==='ctl'||k==='ind'){
    const c=tcol(n.t),w=geo.w,h=geo.h,ctl=k==='ctl';
    el('rect',{x:0,y:0,width:w,height:h,rx:2,fill:'#fff',stroke:c,'stroke-width':ctl?3:1.3},g);
    if(isArr(n.t)){el('rect',{x:3,y:3,width:w-6,height:h-6,fill:'none',stroke:c,'stroke-width':.8},g);}
    if(base(n.t)==='err'||base(n.t)==='clu'){el('rect',{x:3,y:3,width:w-6,height:h-6,fill:'none',stroke:c,'stroke-width':1.2},g);}
    txt(g,w/2-(ctl?3:-3),h/2,ttxt(n.t),'tt',{fill:c});
    if(ctl) el('path',{d:`M${w-7},${h/2-4}L${w-2},${h/2}L${w-7},${h/2+4}Z`,fill:c},g);
    else el('path',{d:`M2,${h/2-4}L7,${h/2}L2,${h/2+4}Z`,fill:c},g);
    if(n.label) txt(g,0,-5,n.label,'lb');
    return;
  }
  if(k==='const'){
    const c=tcol(n.t),w=geo.w,h=geo.h;
    if(n.t==='bool'){
      el('rect',{x:0,y:0,width:w,height:h,rx:2,fill:n.v?'#2fbf2f':'#1d5e1d',stroke:'#0a4a0a'},g);
      txt(g,w/2,h/2,n.v?'T':'F','tt',{fill:'#fff'});
    }else{
      const fill=base(n.t)==='str'?'#fff':(base(n.t)==='enum'?'#fff':'#fff');
      el('rect',{x:0,y:0,width:w,height:h,rx:1,fill,stroke:c,'stroke-width':1.2},g);
      txt(g,w-5,h/2+.5,String(n.v),'lb',{fill:c,'text-anchor':'end','dominant-baseline':'central','font-family':base(n.t)==='str'?'Consolas,monospace':null});
      if(n.hex) txt(g,3,h/2+.5,'x','nm',{'dominant-baseline':'central',fill:c});
    }
    if(n.label) txt(g,0,-5,n.label,'nm');
    return;
  }
  if(k==='fn'){
    const f=F[n.fn]||{};
    if(f.p){
      const w=geo.w,h=geo.h;
      el('path',{d:`M1,1L${w-1},${h/2}L1,${h-1}Z`,fill:/Equal|Greater|Less|0\?/.test(n.fn)?'#fdf3c7':(/And|Or|Not|Exclusive/.test(n.fn)?'#f3f8d8':'#fff8c8'),stroke:'#6b5a00','stroke-width':1.2},g);
      let gl=f.p;
      if(gl==='sel'){el('rect',{x:1,y:1,width:w-2,height:h-2,fill:'#fff8c8',stroke:'#6b5a00'},g);
        txt(g,7,7,'t','nm');txt(g,7,16,'?','nm');txt(g,7,25,'f','nm');
        el('path',{d:`M11,7L22,16M11,25L22,16`,stroke:'#777',fill:'none'},g);}
      else if(gl==='qr'){el('rect',{x:1,y:1,width:w-2,height:h-2,fill:'#fff8c8',stroke:'#6b5a00'},g);
        txt(g,w/2,h/2,'R IQ','gl',{'font-size':8});}
      else txt(g,w*0.38,h/2,gl,'gl',{'font-size':gl.length>2?8:13});
      if(n.showName!==false) txt(g,0,h+11,n.fn,'nm');
      return;
    }
    const w=geo.w,h=geo.h;
    el('rect',{x:0,y:0,width:w,height:h,rx:2,fill:n.col||f.col||'#fff7d6',stroke:'#6b5a00','stroke-width':1.2},g);
    const lines=String(n.g||f.g||'?').split('\n');
    lines.forEach((s,i)=>txt(g,w/2,h/2+(i-(lines.length-1)/2)*12,s,'gl',{'font-size':[...s].length>4?9:11}));
    if(n.showName!==false) txt(g,0,h+11,n.name||n.fn,'nm');
    if(n.fmt) txt(g,0,-4,n.fmt,'nm',{fill:'#a0006a'});
    return;
  }
  if(k==='sub'){
    const w=geo.w,h=geo.h;
    el('rect',{x:0,y:0,width:w,height:h,fill:'#fff',stroke:'#222','stroke-width':1.3},g);
    el('rect',{x:1,y:1,width:w-2,height:13,fill:n.color||'#2f6fd0'},g);
    txt(g,w/2,8,n.top||'SUB','tt',{fill:'#fff'});
    (n.icon||[]).forEach((s,i)=>txt(g,w/2,22+i*11,s,'tt',{fill:'#222','font-size':8.5}));
    txt(g,0,h+11,n.name||'','nm',{fill:'#1d4fa0','font-weight':'bold'});
    return;
  }
  if(k==='bundle'||k==='unbundle'){
    const w=geo.w,h=geo.h,items=n.items||[];
    el('rect',{x:0,y:0,width:w,height:h,fill:'#f7efe4',stroke:'#8b4a2b','stroke-width':1.3},g);
    const top=k==='bundle'?14:7;
    if(k==='bundle'){el('rect',{x:w/2-6,y:-1,width:12,height:6,fill:'#8b4a2b'},g);}
    items.forEach((nm,i)=>{
      el('rect',{x:3,y:top+i*14,width:w-6,height:13,fill:'#fff',stroke:'#c9b29a'},g);
      txt(g,8,top+i*14+7,nm,'lb',{'dominant-baseline':'central','font-size':10});
    });
    if(n.showName!==false) txt(g,0,h+11,k==='bundle'?'Bundle By Name':'Unbundle By Name','nm');
    return;
  }
  if(k==='fb'){
    const c=tcol(n.t);
    el('rect',{x:0,y:0,width:28,height:22,rx:3,fill:'#fff',stroke:c,'stroke-width':1.5},g);
    el('path',{d:'M21,11 H7 M11,6 L6,11 L11,16',fill:'none',stroke:c,'stroke-width':2},g);
    el('path',{d:'M10,22 L14,28 L18,22 Z',fill:c},g);
    if(n.showName!==false) txt(g,0,40,'Feedback Node','nm');
    return;
  }
  if(k==='local'||k==='global'){
    const c=tcol(n.t),w=geo.w;
    el('rect',{x:0,y:0,width:w,height:18,rx:2,fill:'#fff',stroke:c,'stroke-width':n.write?1.2:2.6},g);
    txt(g,4,9.5,k==='local'?'⌂':'⊕','tt',{fill:c,'text-anchor':'start','font-size':11});
    txt(g,17,9.5,String(n.v),'lb',{'dominant-baseline':'central',fill:'#111'});
    if(n.showName!==false) txt(g,0,30,(k==='local'?'Local Variable':'Global Variable')+(n.write?'（寫）':'（讀）'),'nm');
    return;
  }
  if(k==='prop'||k==='invoke'){
    const w=geo.w,h=geo.h,items=n.items||[];
    el('rect',{x:0,y:0,width:w,height:h,fill:'#fffbe6',stroke:'#6b5a00','stroke-width':1.2},g);
    el('rect',{x:1,y:1,width:w-2,height:16,fill:'#efe3a6'},g);
    txt(g,6,9.5,(k==='prop'?'⚙ ':'▶ ')+(n.cls||''),'lb',{'dominant-baseline':'central','font-size':10});
    items.forEach((it,i)=>{const y=18+i*15;el('rect',{x:3,y:y+1,width:w-6,height:13,fill:'#fff',stroke:'#d6c98a'},g);
      txt(g,it.w?10:8,y+8,(it.w?'▸ ':'')+it.n+(it.w?'':' ▸'),'lb',{'dominant-baseline':'central','font-size':10});});
    if(n.label) txt(g,0,-5,n.label,'lb');
    if(n.showName!==false) txt(g,0,h+11,k==='prop'?'Property Node':'Invoke Node','nm');
    return;
  }
  if(k==='tmo'){el('rect',{x:0,y:0,width:18,height:18,fill:'#fff',stroke:'#1652c9','stroke-width':1.5},g);txt(g,9,9,'⧗','tt',{fill:'#1652c9','font-size':12});return;}
  if(k==='evd'){
    const items=n.items||[],w=geo.w;
    el('rect',{x:0,y:0,width:w,height:geo.h,fill:'#f4f7fb',stroke:'#7d8ba3'},g);
    items.forEach((nm,i)=>txt(g,4,8+i*14,nm,'lb',{'dominant-baseline':'central','font-size':10}));
    return;
  }
  if(k==='label'){
    const gg=el('g',{class:'free'},g);
    el('rect',{x:0,y:0,width:geo.w,height:geo.h,rx:2},gg);
    String(n.text).split('\n').forEach((s,i)=>txt(gg,5,14+i*14,s,''));
    return;
  }
  if(k==='tunnel'){
    const c=tcol(n.t);
    if(n.mode==='concat'){el('rect',{x:0,y:0,width:12,height:12,fill:'#fff',stroke:c,'stroke-width':1.5},g);txt(g,6,6,'[▤]','tt',{fill:c,'font-size':7});}
    else if(n.mode==='cond'){el('rect',{x:0,y:0,width:12,height:12,fill:'#fff',stroke:c,'stroke-width':1.5},g);txt(g,6,6,'[ ]','tt',{fill:c,'font-size':8});el('rect',{x:-16,y:14,width:12,height:12,fill:'#fff',stroke:'#008a00','stroke-width':1.3},g);txt(g,-10,20,'?','tt',{fill:'#008a00','font-size':9});}
    else if(n.idx){el('rect',{x:0,y:0,width:12,height:12,fill:'#fff',stroke:c,'stroke-width':1.5},g);txt(g,6,6,'[ ]','tt',{fill:c,'font-size':8});}
    else el('rect',{x:0,y:0,width:12,height:12,fill:c,stroke:'#222','stroke-width':.6},g);
    return;
  }
  if(k==='sr'){
    const c=tcol(n.t);const s=S[n.s];
    [[0,'▼'],[s.w+2,'▲']].forEach(([x0,a])=>{el('rect',{x:x0,y:0,width:14,height:16,fill:'#fff',stroke:c,'stroke-width':1.5},g);txt(g,x0+7,8,a,'tt',{fill:c,'font-size':9});});
    return;
  }
  if(k==='iter'){el('rect',{x:0,y:0,width:18,height:18,fill:'#fff',stroke:'#1652c9','stroke-width':1.5},g);txt(g,9,9,'i','tt',{fill:'#1652c9','font-size':12});return;}
  if(k==='N'){el('rect',{x:0,y:0,width:18,height:18,fill:'#fff',stroke:'#1652c9','stroke-width':1.5},g);txt(g,9,9,'N','tt',{fill:'#1652c9','font-size':11});return;}
  if(k==='stop'){
    el('rect',{x:0,y:0,width:20,height:20,fill:'#fff',stroke:'#008a00','stroke-width':1.5},g);
    if(n.cont){el('path',{d:'M6,13 A5,5 0 1 1 14,13',fill:'none',stroke:'#008a00','stroke-width':2},g);el('path',{d:'M12,15L15,12L16,16Z',fill:'#008a00'},g);}
    else{const r=6.5,cx=10,cy=10;let d='';for(let i=0;i<8;i++){const a=Math.PI/8+i*Math.PI/4;d+=(i?'L':'M')+(cx+r*Math.cos(a)).toFixed(1)+','+(cy+r*Math.sin(a)).toFixed(1);}el('path',{d:d+'Z',fill:'#e00000'},g);}
    return;
  }
  if(k==='sel'){
    const c=tcol(n.t||'bool');
    el('rect',{x:0,y:0,width:14,height:14,fill:'#fff',stroke:c,'stroke-width':1.5},g);txt(g,7,7,'?','tt',{fill:c,'font-size':10});return;
  }
}

/* ---------- 前面板 ---------- */
function drawPanel(root,FP,state,api){
  root.innerHTML='';
  root.style.width=(FP.w||400)+'px';root.style.height=(FP.h||240)+'px';
  const tabsCur=api.tabs;
  const visible=it=>{
    if(api.shown&&it.id&&!api.shown.has(it.id)) return false;
    if(it.tab){const [tid,pg]=it.tab.split(':');const tab=FP.items.find(x=>x.id===tid);if(tab&&tab.pages[tabsCur[tid]||0]!==pg) return false;}
    return true;
  };
  FP.items.forEach(it=>{
    if(!visible(it)) return;
    const d=document.createElement('div');d.className='it';d.style.left=it.x+'px';d.style.top=it.y+'px';
    if(it.w) d.style.width=it.w+'px';
    if(api.fresh&&api.fresh.has(it.id)) d.classList.add('glow');
    const v=state[it.id]!==undefined?state[it.id]:it.v;
    const lab=()=>{if(it.label&&it.k!=='btn'||it.k==='btn'&&it.showLabel){const l=document.createElement('span');l.className='lab';l.textContent=it.label;d.appendChild(l);}};
    const k=it.k;
    if(k==='num'){
      lab();
      if(it.ctl){
        const box=document.createElement('div');box.className='numc';
        const arw=document.createElement('div');arw.className='arw';arw.innerHTML='<b>▲</b><b>▼</b>';
        const inp=document.createElement('input');inp.className='nv';inp.value=fmtNum(v,it);
        inp.addEventListener('change',()=>api.set(it.id,parseNum(inp.value,it)));
        arw.children[0].onclick=()=>api.set(it.id,clampRep((state[it.id]??it.v??0)+(it.inc||1),it));
        arw.children[1].onclick=()=>api.set(it.id,clampRep((state[it.id]??it.v??0)-(it.inc||1),it));
        box.append(arw,inp);d.appendChild(box);
      }else{d.classList.add('ind');const s=document.createElement('span');s.className='nv';s.textContent=fmtNum(v,it);d.appendChild(s);}
    }else if(k==='str'){
      lab();
      if(it.ctl){const ta=document.createElement('textarea');ta.className='sv';ta.rows=it.rows||1;ta.value=v||'';ta.addEventListener('change',()=>api.set(it.id,ta.value));d.appendChild(ta);}
      else{d.classList.add('ind');const s=document.createElement('div');s.className='sv';if(it.rows)s.style.minHeight=(it.rows*16+6)+'px';s.innerHTML=strHTML(v||'',it.codes);d.appendChild(s);}
    }else if(k==='led'){
      lab();const l=document.createElement('div');l.className='led'+(v?' on':'')+(it.color?' '+it.color:'')+(it.sq?' sq':'');d.appendChild(l);
    }else if(k==='btn'){
      lab();
      if(it.style==='toggle'){
        const t=document.createElement('div');t.className='tog'+(v?' on':'');t.innerHTML='<i></i>';t.onclick=()=>api.set(it.id,!state[it.id]);
        const l=document.createElement('span');l.className='lab';l.textContent=it.label;d.append(l,t);
      }else{
        const b=document.createElement('button');b.className='bbtn'+(v?' down':'')+(it.stop?' stopb':'')+(it.lit&&v?' lit':'');b.textContent=it.text||it.label;
        if(it.mech==='switch'){b.onclick=()=>api.set(it.id,!state[it.id]);}
        else if(it.mech==='hold'){b.onmousedown=()=>api.set(it.id,true);b.onmouseup=b.onmouseleave=()=>{if(state[it.id])api.set(it.id,false);};}
        else{b.onclick=()=>api.set(it.id,true);}// latch：被讀一次後自動彈回
        d.appendChild(b);
      }
    }else if(k==='ring'||k==='enum'){
      lab();const s=document.createElement('select');s.className='ring';
      it.options.forEach((o,i)=>{const op=document.createElement('option');op.value=i;op.textContent=o;s.appendChild(op);});
      s.value=v||0;s.onchange=()=>api.set(it.id,+s.value);d.appendChild(s);
    }else if(k==='visa'){
      lab();const box=document.createElement('div');box.className='visa';box.innerHTML='<i>I/O</i>';
      const s=document.createElement('select');s.className='ring';(it.options||[]).forEach(o=>{const op=document.createElement('option');op.textContent=o;s.appendChild(op);});
      s.value=v;s.onchange=()=>api.set(it.id,s.value);box.appendChild(s);d.appendChild(box);
    }else if(k==='err'){
      lab();const e=v||{status:false,code:0,source:''};
      const b=document.createElement('div');b.className='errc';
      b.innerHTML=`<div class="row"><span>status</span><span style="margin-left:auto">code</span></div>
      <div class="row"><div class="st ${e.status?'bad':'ok'}">${e.status?'✗':'✓'}</div><span class="nv" style="width:70px;margin-left:auto;background:#fff;height:20px;display:block;text-align:right;border:1px solid #888;padding:1px 3px">${e.code}</span></div>
      <div>source</div><div class="src">${esc(e.source||'')}</div>`;d.appendChild(b);
    }else if(k==='leds'){
      lab();const gdv=document.createElement('div');gdv.className='ledgrid';gdv.style.gridTemplateColumns=`repeat(${it.cols||1},auto)`;
      const arr=v||[];(it.names||[]).forEach((nm,i)=>{const r=document.createElement('div');r.innerHTML=`<span class="led${arr[i]?' on':''}${it.color?' '+it.color:''}"></span>${esc(nm)}`;gdv.appendChild(r);});d.appendChild(gdv);
    }else if(k==='arr'){
      lab();const a=v||[];const box=document.createElement('div');box.className='arrind';
      box.innerHTML=`<span class="ix">0</span><span class="cells">${Array.from({length:it.n||4},(_,i)=>`<span>${a[i]!==undefined?fmtVal(a[i],it.t).replace(/^"|"$/g,''):''}</span>`).join('')}</span>`;d.appendChild(box);
    }else if(k==='clu'){
      d.classList.add('clu');d.style.height=it.h+'px';const l=document.createElement('span');l.className='lab';l.style.cssText='position:absolute;top:-18px;left:0';l.textContent=it.label||'';d.appendChild(l);
    }else if(k==='tab'){
      d.classList.add('tabc');d.style.height=it.h+'px';const hd=document.createElement('div');hd.className='tabh';
      it.pages.forEach((pg,i)=>{const b=document.createElement('b');b.textContent=pg;if((tabsCur[it.id]||0)===i)b.className='on';b.onclick=()=>{tabsCur[it.id]=i;api.set(it.id,i);};hd.appendChild(b);});d.appendChild(hd);
    }else if(k==='table'){
      lab();const rows=v||[];const t=document.createElement('table');t.className='tbl';
      t.innerHTML='<tr>'+it.cols.map(c=>`<th>${esc(c)}</th>`).join('')+'</tr>'+rows.slice(-(it.rows||6)).map(r=>'<tr>'+it.cols.map((c,i)=>`<td>${esc(r[i]??'')}</td>`).join('')+'</tr>').join('')+Array.from({length:Math.max(0,(it.rows||6)-rows.length)},()=>'<tr>'+it.cols.map(()=>'<td>&nbsp;</td>').join('')+'</tr>').join('');
      d.appendChild(t);
    }else if(k==='chart'){
      lab();const c=document.createElement('canvas');c.width=it.w||200;c.height=it.h||80;c.className='chart';d.appendChild(c);
      const ctx=c.getContext('2d');const hist=v||[];ctx.strokeStyle='#33ff33';ctx.beginPath();
      const max=it.max||1,min=it.min||0;hist.slice(-c.width/2).forEach((y,i)=>{const px=i*2,py=c.height-4-(y-min)/(max-min)*(c.height-8);i?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.stroke();
    }else if(k==='deco'){
      d.className='deco';d.style.left=it.x+'px';d.style.top=it.y+'px';d.style.width=it.w+'px';d.style.height=it.h+'px';
      d.style.background=(typeof it.fill==='function'?it.fill(state):it.fill)||'#bbb';d.style.border=it.border||'1px solid #666';d.style.borderRadius=(it.r||0)+'px';
      if(it.dx||it.dy){const dx=typeof it.dx==='function'?it.dx(state):0;d.style.transform=`translate(${dx}px,${typeof it.dy==='function'?it.dy(state):0}px)`;d.style.transition='transform .25s';}
    }else if(k==='text'){
      d.className='ftxt';d.style.left=it.x+'px';d.style.top=it.y+'px';d.textContent=typeof it.text==='function'?it.text(state):it.text;if(it.color)d.style.color=it.color;if(it.size)d.style.fontSize=it.size+'px';if(it.bold)d.style.fontWeight='700';
    }
    if(it.tip) d.title=it.tip;
    root.appendChild(d);
  });
}
function strHTML(s,codes){return [...String(s)].map(c=>{const k=c.charCodeAt(0);if(CC[k])return `<span class="cc">${CC[k]}</span>`;return esc(c);}).join('');}
function fmtNum(v,it){if(v===undefined||v===null)return '0';if(it.hex)return Number(v).toString(16).toUpperCase().padStart(it.hex,'0');if(it.dig!=null)return Number(v).toFixed(it.dig);return String(v);}
function parseNum(s,it){let v=it.hex?parseInt(s,16):parseFloat(s);if(isNaN(v))v=0;return clampRep(v,it);}
function clampRep(v,it){const r=(it.rep||'DBL').toUpperCase();
  const R={U8:[0,255],U16:[0,65535],U32:[0,4294967295],I8:[-128,127],I16:[-32768,32767],I32:[-2147483648,2147483647]}[r];
  if(R){v=Math.round(v);if(v<R[0])v=R[0];if(v>R[1])v=R[1];} return v;}

/* ---------- 工具列小圖示 ---------- */
const ICON={
 run:'<svg width="20" height="16"><path d="M3,2 L17,8 L3,14 Z" fill="#fff" stroke="#333" stroke-width="1.3"/></svg>',
 running:'<svg width="20" height="16"><path d="M3,2 L17,8 L3,14 Z" fill="#222" stroke="#000"/></svg>',
 cont:'<svg width="20" height="16"><path d="M5,9 A5,5 0 1 1 10,13" fill="none" stroke="#333" stroke-width="1.6"/><path d="M2,7 L5,11 L8,7Z" fill="#333"/></svg>',
 abort:'<svg width="20" height="16"><circle cx="10" cy="8" r="6.5" fill="#e33" stroke="#900"/></svg>',
 bulb:'<svg width="20" height="18"><path d="M10,2 a5,5 0 0 1 3,9 v3 h-6 v-3 a5,5 0 0 1 3,-9z" fill="#fff" stroke="#555"/><rect x="7.5" y="14.5" width="5" height="2" fill="#777"/></svg>',
 bulbOn:'<svg width="20" height="18"><path d="M10,2 a5,5 0 0 1 3,9 v3 h-6 v-3 a5,5 0 0 1 3,-9z" fill="#ffe14d" stroke="#a08000"/><rect x="7.5" y="14.5" width="5" height="2" fill="#777"/></svg>',
 probe:'<svg width="20" height="16"><rect x="3" y="3" width="14" height="10" rx="2" fill="#fffbd1" stroke="#a08a00"/><text x="10" y="11" font-size="8" text-anchor="middle">123</text></svg>'
};

/* =====================================================================
   widget：建一個 VI 視窗
   spec = {name, fp:{w,h,items}, bd:{w,h,nodes,structs,wires}, sim, view, hint}
   sim  = {period?, init()->st, step(inputs, st, ctx)->{out, vals, stop, msg}}
   ===================================================================== */
LV.widget=function(host,spec){
  const S={spec,state:{},tabs:{},frames:{},shown:null,fresh:new Set(),vals:null,showVals:false,
           running:false,hl:false,simSt:null,timer:null,iter:0};
  (spec.fp&&spec.fp.items||[]).forEach(it=>{if(it.id&&it.v!==undefined)S.state[it.id]=it.v;});
  const win=document.createElement('div');win.className='lvwin';
  const hasFP=!!spec.fp,hasBD=!!spec.bd;
  win.innerHTML=`<div class="lvhead"><span class="vname">${esc(spec.name||'Untitled 1.vi')}</span>
    ${hasFP&&hasBD?'<span class="vt" data-v="fp">前面板 Front Panel</span><span class="vt" data-v="bd">方塊圖 Block Diagram</span><span class="vt" data-v="split">並排 Ctrl+T</span>':''}
    <span class="hint">${spec.hint||''}</span></div>
    <div class="lvbody"></div>`;
  host.appendChild(win);
  const body=win.querySelector('.lvbody');
  if(spec.ratio) body.style.setProperty('--bdw',spec.ratio+'fr');
  let fpPane,bdPane,fpRoot,svg,msgFP,msgBD;
  function toolbar(withDiagramTools){
    const t=document.createElement('div');t.className='lvtool';
    t.innerHTML=`<span class="pt">${withDiagramTools?'方塊圖':'前面板'}</span>
      <button data-a="run" title="Run（Ctrl+R）：執行一次">${ICON.run}</button>
      <button data-a="cont" title="Run Continuously：一直重複執行（只用來測試）">${ICON.cont}</button>
      <button data-a="abort" title="Abort Execution：強制停止（正式程式不要靠它結束）">${ICON.abort}</button>
      ${withDiagramTools?`<span class="sep"></span><button data-a="hl" title="Highlight Execution：慢動作看資料怎麼流">${ICON.bulb}</button>
      <button data-a="probe" title="顯示線上的值（像在每條線放 Probe）">${ICON.probe}</button>`:''}
      <span class="msg"></span>`;
    t.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b||b.disabled)return;act(b.dataset.a);});
    return t;
  }
  if(hasFP){
    fpPane=document.createElement('div');fpPane.className='lvpane';
    fpPane.appendChild(toolbar(false));
    const sc=document.createElement('div');sc.className='lvscroll';fpRoot=document.createElement('div');fpRoot.className='fp';sc.appendChild(fpRoot);fpPane.appendChild(sc);
    body.appendChild(fpPane);msgFP=fpPane.querySelector('.msg');
  }
  if(hasBD){
    bdPane=document.createElement('div');bdPane.className='lvpane bd';
    bdPane.appendChild(toolbar(true));
    const sc=document.createElement('div');sc.className='lvscroll';svg=document.createElementNS(NS,'svg');sc.appendChild(svg);bdPane.appendChild(sc);
    body.appendChild(bdPane);msgBD=bdPane.querySelector('.msg');
  }
  const noSim=!spec.sim;
  win.querySelectorAll('.lvtool button').forEach(b=>{if(noSim&&b.dataset.a!=='probe'&&b.dataset.a!=='hl')b.disabled=true;if(noSim&&(b.dataset.a==='hl'||b.dataset.a==='probe'))b.disabled=true;});
  function setView(v){
    S.view=v;
    win.querySelectorAll('.vt').forEach(x=>x.classList.toggle('on',x.dataset.v===v));
    if(!(hasFP&&hasBD)){body.className='lvbody stack';return;}
    body.className='lvbody '+(v==='split'?'split':'stack');
    fpPane.classList.toggle('hide',v==='bd');bdPane.classList.toggle('hide',v==='fp');
  }
  win.querySelectorAll('.vt').forEach(x=>x.onclick=()=>setView(x.dataset.v));
  setView(spec.view||'split');
  const msg=s=>{if(msgFP)msgFP.textContent=s||'';if(msgBD)msgBD.textContent=s||'';};
  // 提示框
  let tip=null;
  function onNode(n,ev,on){
    if(!on){if(tip){tip.remove();tip=null;}return;}
    let h='';
    if(n.k==='fn'){const f=F[n.fn]||{};h=`<b>${esc(n.fn)}</b><br>${f.pal?f.pal.join(' ▸ '):''}`;}
    else if(n.k==='ctl') h=`<b>Control 端子</b>「${esc(n.label||'')}」<br>前面板的輸入，資料從這裡流出`;
    else if(n.k==='ind') h=`<b>Indicator 端子</b>「${esc(n.label||'')}」<br>前面板的顯示，資料流進來`;
    else if(n.k==='const') h=`<b>常數</b> ${esc(n.v)}<br>在端子上按右鍵 ▸ Create ▸ Constant`;
    else if(n.k==='sub') h=`<b>SubVI：${esc(n.name||'')}</b><br>${esc(n.tip||'自己寫的 VI，拖進方塊圖就能呼叫')}`;
    else if(n.k==='tunnel') h='<b>Tunnel 通道</b><br>資料穿過結構邊框的地方'+(n.idx?'（自動索引）':'');
    else if(n.k==='sr') h='<b>Shift Register</b><br>右邊存進去，下一圈從左邊拿出來';
    else if(n.k==='iter') h='<b>Iteration 端子 i</b><br>目前第幾圈，從 0 開始';
    else if(n.k==='stop') h='<b>Loop Condition</b><br>Stop if True：接到 True 就停';
    else if(n.k==='sel') h='<b>Case Selector ?</b><br>接進來的值決定執行哪一頁';
    else if(n.k==='fb') h='<b>Feedback Node</b><br>和 Shift Register 一樣：存這一圈的值給下一圈；下面的菱形是初始值';
    else if(n.k==='local') h='<b>Local Variable</b>「'+esc(n.v)+'」<br>同一個 VI 裡讀／寫同一個前面板物件的另一個地方。粗框 = 讀，細框 = 寫';
    else if(n.k==='global') h='<b>Global Variable</b>「'+esc(n.v)+'」<br>存在另一個只有前面板的 global VI 裡，所有 VI 都能讀寫';
    else if(n.k==='prop') h='<b>Property Node</b><br>讀或寫物件的屬性（Value、Disabled、Visible…）。▸ 在左邊 = 寫，在右邊 = 讀，由上往下執行';
    else if(n.k==='invoke') h='<b>Invoke Node</b><br>呼叫物件的方法（例如 Reinitialize to Default）';
    else if(n.k==='tmo') h='<b>Timeout 端子</b><br>等多久沒有事件就執行 Timeout 頁；不接 = -1 = 永遠等';
    else if(n.k==='evd') h='<b>Event Data Node</b><br>這個事件附帶的資料（OldVal、NewVal、CtlRef…）';
    else if(n.k==='bundle'||n.k==='unbundle') h=`<b>${n.k==='bundle'?'Bundle By Name':'Unbundle By Name'}</b><br>Programming ▸ Cluster, Class, & Variant`;
    if(n.tip&&n.k!=='sub') h+='<br>'+esc(n.tip);
    if(!h) return;
    tip=document.createElement('div');tip.className='lvtip';tip.innerHTML=h;document.body.appendChild(tip);
    const r=ev.target.closest('g').getBoundingClientRect();tip.style.left=Math.min(window.innerWidth-330,r.right+8)+'px';tip.style.top=(r.top-4)+'px';
  }
  let dimSet=null;
  function render(){
    if(hasFP) drawPanel(fpRoot,spec.fp,S.state,{set:setInput,shown:S.shown,fresh:S.fresh,tabs:S.tabs});
    if(hasBD) S.dg=drawDiagram(svg,spec.bd,{shown:S.shown,fresh:S.fresh,frames:S.frames,vals:S.vals,showVals:S.showVals,dimSet,onNode,redraw:render});
    win.querySelectorAll('[data-a=hl]').forEach(b=>{b.classList.toggle('on',S.hl);b.innerHTML=S.hl?ICON.bulbOn:ICON.bulb;});
    win.querySelectorAll('[data-a=probe]').forEach(b=>b.classList.toggle('on',S.showVals));
    win.querySelectorAll('[data-a=run]').forEach(b=>b.innerHTML=S.running?ICON.running:ICON.run);
  }
  function setInput(id,v){
    S.state[id]=v;
    if(spec.onInput) spec.onInput(id,v,S);
    if(!S.running&&spec.sim&&spec.sim.live){once();return;}
    render();
  }
  function inputs(){const o={};(spec.fp?spec.fp.items:[]).forEach(it=>{if(it.id)o[it.id]=S.state[it.id]!==undefined?S.state[it.id]:it.v;});return o;}
  function applyResult(r){
    if(!r) return;
    if(r.out) Object.assign(S.state,r.out);
    if(r.vals) S.vals=r.vals;
    if(r.frames) Object.assign(S.frames,r.frames);
    if(r.msg!==undefined) msg(r.msg);
    // latch 按鈕：讀過一次就彈回
    (spec.fp?spec.fp.items:[]).forEach(it=>{if(it.k==='btn'&&(it.mech||'latch')==='latch'&&S.state[it.id]&&!(r.keep&&r.keep.includes(it.id)))S.state[it.id]=false;});
  }
  function once(){
    const sim=spec.sim;S.simSt=sim.init?sim.init(S):{};S.iter=0;
    const r=sim.step(inputs(),S.simSt,{i:0,S});applyResult(r);S.showVals=S.showVals||(!!S.vals&&!S.userHid&&(spec.bd?(spec.bd.wires||[]).length<=12:false));render();
  }
  async function highlightPass(){
    // 依資料相依關係分批：沒有輸入的節點先走，資料到齊的下一批
    const D=spec.bd;const ws=(D.wires||[]).filter(w=>S.dg.wirePaths[w.id]);
    const id=r=>r.split('.')[0];
    const nodes=new Set();ws.forEach(w=>{nodes.add(id(w.from));nodes.add(id(w.to));});
    const lvl={};const inc={};nodes.forEach(n=>inc[n]=[]);ws.forEach(w=>inc[id(w.to)].push(id(w.from)));
    const get=(n,seen=new Set())=>{if(lvl[n]!=null)return lvl[n];if(seen.has(n))return 0;seen.add(n);const ps=inc[n].filter(p=>!(spec.bd.back||[]).includes(p+'>'+n));lvl[n]=ps.length?1+Math.max(...ps.map(p=>get(p,seen))):0;return lvl[n];};
    nodes.forEach(n=>get(n));
    const maxL=Math.max(0,...Object.values(lvl));
    dimSet=new Set([...nodes,...ws.map(w=>w.id)]);
    const savedShow=S.showVals;S.showVals=false;render();
    for(let L=0;L<=maxL;L++){
      if(!S.hlRun) break;
      nodes.forEach(n=>{if(lvl[n]===L)dimSet.delete(n);});
      const batch=ws.filter(w=>lvl[id(w.from)]===L);
      batch.forEach(w=>dimSet.delete(w.id));
      render();
      await Promise.all(batch.map(w=>bubble(S.dg.wirePaths[w.id].pts,w.t)));
      // 秀出這批線上的值
      S.showVals=true;const keep=S.vals;S.vals={};batch.forEach(w=>{const k=w.from;if(keep&&keep[k]!==undefined)S.vals[k]=keep[k];else if(keep&&keep[id(k)]!==undefined)S.vals[id(k)]=keep[id(k)];});
      S.partial=Object.assign(S.partial||{},S.vals);S.vals=Object.assign({},S.partial);render();S.vals=keep;
    }
    nodes.forEach(n=>dimSet.delete(n));dimSet=null;S.partial=null;S.showVals=true||savedShow;render();
  }
  function bubble(pts,t){
    return new Promise(res=>{
      const segs=[];let L=0;for(let i=1;i<pts.length;i++){const l=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);segs.push(l);L+=l;}
      const c=el('circle',{r:5,fill:tcol(t),stroke:'#fff','stroke-width':1.5},S.dg.svg);
      const dur=Math.min(1100,350+L*2.2),t0=performance.now();
      function f(now){
        if(!S.hlRun){c.remove();res();return;}
        let p=Math.min(1,(now-t0)/dur)*L,i=0;while(i<segs.length-1&&p>segs[i]){p-=segs[i];i++;}
        const a=pts[i],b=pts[i+1],r=segs[i]?p/segs[i]:0;c.setAttribute('cx',a[0]+(b[0]-a[0])*r);c.setAttribute('cy',a[1]+(b[1]-a[1])*r);
        if(now-t0<dur)requestAnimationFrame(f);else{c.remove();res();}
      }
      requestAnimationFrame(f);
    });
  }
  async function run(cont){
    if(!spec.sim) return;
    if(S.running) return;
    S.running=true;S.iter=0;const sim=spec.sim;S.simSt=sim.init?sim.init(S):{};render();
    msg('執行中…');
    const loop=!!sim.period;
    do{
      do{
        const r=sim.step(inputs(),S.simSt,{i:S.iter,S});
        applyResult(r);
        if(S.hl&&S.iter===0){S.hlRun=true;await highlightPass();S.hlRun=false;}
        S.showVals=S.showVals||S.hl||(S.iter===0&&!!S.vals&&!S.userHid&&(spec.bd?(spec.bd.wires||[]).length<=12:false));render();
        S.iter++;
        if(r&&r.stop) break;
        if(!S.running) break;
        if(loop) await new Promise(res=>S.timer=setTimeout(res,S.hl?Math.max(sim.period,500):sim.period));
      }while(loop&&S.running);
      if(cont&&S.running) await new Promise(res=>S.timer=setTimeout(res,300));
    }while(cont&&S.running);
    if(S.running){S.running=false;if(!S.lastMsgKeep)msg(spec.sim.doneMsg||'執行完畢');}
    if(sim.finish){applyResult(sim.finish(inputs(),S.simSt,S));}
    render();
  }
  function act(a){
    if(a==='run') run(false);
    else if(a==='cont') run(true);
    else if(a==='abort'){S.running=false;S.hlRun=false;clearTimeout(S.timer);msg('已 Abort：程式被強制中斷，後面的收尾（例如關閉通訊埠）沒有執行');render();}
    else if(a==='hl'){S.hl=!S.hl;render();}
    else if(a==='probe'){S.showVals=!S.showVals;S.userHid=!S.showVals;render();}
  }
  render();
  return {
    S,el:win,render,setView,run,
    show(ids,fresh){S.shown=ids?new Set(ids):null;S.fresh=new Set(fresh||[]);render();},
    setFrame(cid,i){S.frames[cid]=i;render();},
    set(id,v){S.state[id]=v;render();},
    stop(){S.running=false;clearTimeout(S.timer);}
  };
};
})();
