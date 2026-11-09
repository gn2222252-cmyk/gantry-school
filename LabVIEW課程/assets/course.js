/* course.js — 課程導覽、步驟播放器、測驗、進度 */
(function(){
'use strict';
const LESSONS=window.LESSONS=window.LESSONS||[];
const C=window.C={};

/* ---------- 寫課文用的小工具 ---------- */
C.pal=(...p)=>`<span class="pal">${p.map(s=>`<span>${s}</span>`).join('')}</span>`;
C.fn=(...p)=>C.pal('Functions',...p);
C.ctl=(...p)=>C.pal('Controls',...p);
C.qd=name=>`<span class="qd">（或按 <kbd>Ctrl</kbd>+<kbd>Space</kbd> 打 <code>${name}</code>）</span>`;
C.wt=rows=>`<table class="t wire-table"><tr><th>從（輸出端）</th><th></th><th>接到（輸入端）</th><th>說明</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="arrow">→</td><td>${r[1]}</td><td>${r[2]||''}</td></tr>`).join('')}</table>`;
C.table=(head,rows)=>`<table class="t"><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
C.h3=(tag,cls,title)=>`<h3><span class="tag ${cls}">${tag}</span>${title}</h3>`;
C.real=(name,cap)=>`<div class="fig"><div style="font-size:13px;font-weight:700;margin-bottom:6px">真實 LabVIEW 長這樣：參考答案 ${name}.vi 的方塊圖</div><div style="overflow-x:auto"><img src="assets/real/${name}.png" alt="${name} block diagram" style="max-width:none"></div><div class="cap">${cap||'用 LabVIEW 腳本依本課程的設計產生、Clean Up Diagram 排版，並對軟 PLC 實測通過。檔案在 參考答案 資料夾（LV2018 子資料夾是 2018 版）。'}</div></div>`;
C.frameHTML=parts=>`<div class="frame">${parts.map(p=>`<span class="${p[2]||''}">${p[0]}<small>${p[1]||''}</small></span>`).join('')}</div>`;

/* FX 編程協定（課程內示範用，與 softplc/fx_server.py 相同規則） */
const FX=C.FX={
  STX:'\x02',ETX:'\x03',ENQ:'\x05',ACK:'\x06',NAK:'\x15',
  hex:(n,w)=>(n>>>0).toString(16).toUpperCase().padStart(w,'0').slice(-w),
  addr:d=>0x1000+2*d,
  sum(body){let s=0;for(const c of body)s+=c.charCodeAt(0);return FX.hex(s&0xFF,2);},
  swap4:v=>{const h=FX.hex(v&0xFFFF,4);return h.slice(2)+h.slice(0,2);},
  readFrame(d,n){const body='0'+FX.hex(FX.addr(d),4)+FX.hex(2*n,2)+'\x03';return '\x02'+body+FX.sum(body);},
  writeFrame(d,v){const body='1'+FX.hex(FX.addr(d),4)+'02'+FX.swap4(v)+'\x03';return '\x02'+body+FX.sum(body);},
  reply(words){const body=words.map(FX.swap4).join('')+'\x03';return '\x02'+body+FX.sum(body);},
  parse(rx,n){ // 回傳 {ok, words, why}
    if(!rx||rx[0]!=='\x02')return{ok:false,why:'第一個字元不是 STX'};
    const body=rx.slice(1,rx.length-2);if(FX.sum(body)!==rx.slice(-2))return{ok:false,why:'校驗碼不符'};
    const w=[];for(let i=0;i<n;i++){const s=body.substr(i*4,4);w.push(parseInt(s.slice(2)+s.slice(0,2),16));}
    return{ok:true,words:w};
  },
  show(s){return [...s].map(c=>({'\x02':'<STX>','\x03':'<ETX>','\x05':'<ENQ>','\x06':'<ACK>','\x15':'<NAK>'}[c]||c)).join('');}
};

/* ---------- 進度（存在瀏覽器，存不了也不影響上課） ---------- */
const KEY='gantry-lv-course-v1';
function load(){try{return JSON.parse(localStorage.getItem(KEY)||'{}');}catch(e){return {};}}
function save(p){try{localStorage.setItem(KEY,JSON.stringify(p));}catch(e){}}
let prog=load();prog.done=prog.done||{};

/* ---------- 側欄 ---------- */
function buildSide(){
  const side=document.getElementById('side');
  let h=`<h1>雙龍門 LabVIEW 上位機<br>從零開始自己寫</h1><div class="sub">LabVIEW 2018 英文版／2026 都適用</div><div class="prog"><i id="progbar"></i></div>`;
  let part='';
  LESSONS.forEach(L=>{
    if(L.part!==part){part=L.part;h+=`<div class="part">${part}</div>`;}
    h+=`<a class="ls${prog.done[L.id]?' done':''}" href="#${L.id}" data-id="${L.id}"><span class="no">${L.no}</span><span>${L.title}</span><span class="ck">✔</span></a>`;
  });
  side.innerHTML=h;
  updateBar();
}
function updateBar(){const n=LESSONS.filter(L=>prog.done[L.id]).length;const b=document.getElementById('progbar');if(b)b.style.width=(100*n/LESSONS.length)+'%';}

/* ---------- 一堂課 ---------- */
let widgets=[];
function show(id){
  widgets.forEach(w=>w.stop&&w.stop());widgets=[];
  const i=Math.max(0,LESSONS.findIndex(L=>L.id===id));const L=LESSONS[i];
  document.querySelectorAll('#side a.ls').forEach(a=>a.classList.toggle('on',a.dataset.id===L.id));
  const c=document.getElementById('content');c.innerHTML='';
  const head=document.createElement('div');head.className='lhead';
  head.innerHTML=`<div class="kicker">${L.part}．第 ${L.no} 課</div><h2>${L.title}</h2><div class="meta">${L.mins?'約 '+L.mins+' 分鐘':''}${L.files?'　｜　這課存檔：'+L.files.map(f=>`<code>${f}</code>`).join('、'):''}</div>`;
  if(L.goals){const g=document.createElement('div');g.className='goal';g.innerHTML=L.goals.map(x=>`<div><b>${x[0]}</b>${x[1]}</div>`).join('');head.appendChild(g);}
  c.appendChild(head);
  (L.body||[]).forEach(b=>block(c,b));
  // 完成鈕＋上下課
  const done=document.createElement('div');done.className='donebar';
  done.innerHTML=`<button class="btn pri">${prog.done[L.id]?'✔ 已完成（再按取消）':'我做完這課了'}</button><span>${L.check?'完成標準：'+L.check:''}</span>`;
  done.querySelector('button').onclick=()=>{prog.done[L.id]=!prog.done[L.id];save(prog);buildSide();show(L.id);};
  c.appendChild(done);
  const nav=document.createElement('div');nav.className='navbtm';
  const pv=LESSONS[i-1],nx=LESSONS[i+1];
  nav.innerHTML=`${pv?`<a href="#${pv.id}">← ${pv.no}. ${pv.title}</a>`:'<span></span>'}${nx?`<a href="#${nx.id}">${nx.no}. ${nx.title} →</a>`:'<span></span>'}`;
  c.appendChild(nav);
  document.getElementById('main').scrollTop=0;
  prog.last=L.id;save(prog);
  document.title=`${L.no}. ${L.title}｜雙龍門 LabVIEW 課程`;
  // 截圖檢查用：?step=K 讓步驟播放器跳到第 K 步，?focus=N 捲到第 N 個 VI 視窗，?run=1 按 Run
  const q=new URLSearchParams(location.search);
  if(q.get('step')) document.querySelectorAll('.stepper').forEach(s=>s._go&&s._go(+q.get('step')-1));
  if(q.get('frame')) widgets.forEach(w=>{const s=w.S.spec.bd;if(s&&s.structs)s.structs.filter(x=>x.k==='case').forEach(x=>w.setFrame(x.id,+q.get('frame')));});
  if(q.get('run')) widgets.forEach(w=>w.S.spec.sim&&w.run(false));
  if(q.get('focus')){const e=document.querySelectorAll('.lvwin')[+q.get('focus')];if(e){const m=document.getElementById('main');m.style.scrollBehavior='auto';m.scrollTop=e.getBoundingClientRect().top-m.getBoundingClientRect().top+m.scrollTop-(q.get('off')?+q.get('off'):150);}}
}

function block(c,b){
  if(typeof b==='string'){const d=document.createElement('div');d.innerHTML=b;while(d.firstChild)c.appendChild(d.firstChild);return;}
  if(b.lv){const w=LV.widget(c,b.lv);widgets.push(w);if(b.cap){const p=document.createElement('div');p.className='cap';p.style.cssText='font-size:13px;color:#5c6577;margin:-6px 0 12px';p.innerHTML=b.cap;c.appendChild(p);}return;}
  if(b.steps){stepper(c,b.steps);return;}
  if(b.quiz){b.quiz.forEach(q=>quiz(c,q));return;}
  if(b.todo){const ul=document.createElement('ul');ul.className='todo';b.todo.forEach((t,i)=>{const li=document.createElement('li');li.innerHTML=t;const k=location.hash+'#'+i+t.length;if(prog[k])li.classList.add('ok');li.onclick=()=>{li.classList.toggle('ok');prog[k]=li.classList.contains('ok');save(prog);};ul.appendChild(li);});c.appendChild(ul);return;}
  if(b.fn){const d=document.createElement('div');c.appendChild(d);b.fn(d);return;}
  if(b.exam){exam(c,b.exam);return;}
}

/* ---------- 步驟播放器：同一個 VI，一步一步長出來 ---------- */
function stepper(c,cfg){
  const box=document.createElement('div');box.className='stepper';
  box.innerHTML=`<div class="bar"><span class="ttl">${cfg.title||'跟著做'}</span><button class="btn" data-k="p">◀ 上一步</button><span class="dots"></span><button class="btn pri" data-k="n">下一步 ▶</button></div><div class="txt"></div><div class="stage"></div>`;
  c.appendChild(box);
  const w=LV.widget(box.querySelector('.stage'),cfg.lv);widgets.push(w);
  const dots=box.querySelector('.dots'),txt=box.querySelector('.txt');
  const steps=cfg.steps;let cur=0;const seen=new Set([0]);
  steps.forEach((s,i)=>{const d=document.createElement('i');d.textContent=i+1;d.title=s.t;d.onclick=()=>go(i);dots.appendChild(d);});
  function go(i){
    cur=Math.max(0,Math.min(steps.length-1,i));seen.add(cur);
    const ids=[];for(let j=0;j<=cur;j++){(steps[j].add||[]).forEach(x=>ids.push(x));}
    const s=steps[cur];
    if(s.all) w.show(null,s.add||[]);else w.show(ids,s.add||[]);
    if(s.view) w.setView(s.view);
    if(s.frames) Object.entries(s.frames).forEach(([k,v])=>w.setFrame(k,v));
    txt.innerHTML=`<h5>步驟 ${cur+1}／${steps.length}　${s.t}</h5>${s.h||''}`;
    [...dots.children].forEach((d,j)=>{d.className=j===cur?'on':(seen.has(j)?'seen':'');});
    box.querySelector('[data-k=p]').disabled=cur===0;
    box.querySelector('[data-k=n]').textContent=cur===steps.length-1?'完成 ✔':'下一步 ▶';
  }
  box._go=go;
  box.querySelector('[data-k=p]').onclick=()=>go(cur-1);
  box.querySelector('[data-k=n]').onclick=()=>go(cur+1);
  go(0);
}

/* ---------- 測驗 ---------- */
/* 選項隨機排列（避免答案位置被猜到）；回傳新題目物件，a 對應新位置 */
function shuffled(q){
  if(q.keep) return q;
  const idx=q.o.map((_,i)=>i);for(let i=idx.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[idx[i],idx[j]]=[idx[j],idx[i]];}
  return Object.assign({},q,{o:idx.map(i=>q.o[i]),a:idx.indexOf(q.a)});
}
function quiz(c,q){
  q=shuffled(q);
  const d=document.createElement('div');d.className='quiz';
  d.innerHTML=`<div class="q">${q.q}</div><div class="qfig"></div>${q.o.map((o,i)=>`<label><input type="radio" name="q${Math.random()}" value="${i}">${o}</label>`).join('')}<div class="ex">${q.ex||''}</div>`;
  if(q.lv){const w=LV.widget(d.querySelector('.qfig'),Object.assign({view:'bd'},q.lv));widgets.push(w);}
  if(q.html) d.querySelector('.qfig').innerHTML=q.html;
  d.querySelectorAll('label').forEach((lb,i)=>lb.onclick=()=>{
    if(d.classList.contains('answered'))return;
    d.classList.add('answered');
    d.querySelectorAll('label').forEach((l2,j)=>{if(j===q.a)l2.classList.add('right');else if(j===i)l2.classList.add('wrong');});
    d.querySelector('.ex').innerHTML=(i===q.a?'<b>答對了。</b>':'<b>正確答案是：'+q.o[q.a]+'</b>　')+(q.ex||'');
  });
  c.appendChild(d);
}

/* ---------- 模擬考：隨機抽題、計時、交卷後顯示對錯與解說 ---------- */
function exam(c,cfg){
  const box=document.createElement('div');box.className='exam';c.appendChild(box);
  const KEYB='gantry-lv-exam-best';
  let best=null;try{best=JSON.parse(localStorage.getItem(KEYB)||'null');}catch(e){}
  function start(topic){
    if(typeof topic!=='string') topic='';
    const pool=topic?cfg.bank.filter(q=>q.topic===topic):cfg.bank;
    const bank=pool.slice();for(let i=bank.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bank[i],bank[j]]=[bank[j],bank[i]];}
    const qs=(topic?bank:bank.slice(0,Math.min(cfg.n,bank.length))).map(shuffled);
    const ans=new Array(qs.length).fill(-1);
    const minutes=topic?Math.ceil(qs.length*1.5):cfg.minutes;
    let left=minutes*60,timer=null;
    box.innerHTML=`<div class="exbar"><b>${topic?'主題練習：'+topic:'模擬考進行中'}</b><span class="clock"></span><span class="cnt"></span><button class="btn pri sub">交卷</button></div><div class="qs"></div>`;
    const list=box.querySelector('.qs');
    qs.forEach((q,k)=>{
      const d=document.createElement('div');d.className='quiz';
      d.innerHTML=`<div class="q">${k+1}. ${q.q}</div><div class="qfig"></div>${q.o.map((o,i)=>`<label><input type="radio" name="ex${k}" value="${i}">${o}</label>`).join('')}<div class="ex"></div>`;
      if(q.lv){const w=LV.widget(d.querySelector('.qfig'),Object.assign({view:'bd'},q.lv));widgets.push(w);}
      if(q.html) d.querySelector('.qfig').innerHTML=q.html;
      d.querySelectorAll('input').forEach(inp=>inp.onchange=()=>{ans[k]=+inp.value;upd();});
      list.appendChild(d);
    });
    const clock=box.querySelector('.clock'),cnt=box.querySelector('.cnt');
    function upd(){const m=Math.floor(left/60),s=left%60;clock.textContent=`剩下 ${m}:${String(s).padStart(2,'0')}`;cnt.textContent=`已作答 ${ans.filter(a=>a>=0).length} / ${qs.length}`;}
    upd();
    timer=setInterval(()=>{left--;upd();if(left<=0){clearInterval(timer);finish(true);}},1000);
    box.querySelector('.sub').onclick=()=>{if(ans.includes(-1)&&!confirm('還有題目沒作答，確定交卷？'))return;clearInterval(timer);finish(false);};
    function finish(timeout){
      let ok=0;
      [...list.children].forEach((d,k)=>{const q=qs[k];d.classList.add('answered');
        d.querySelectorAll('input').forEach(i=>i.disabled=true);
        d.querySelectorAll('label').forEach((l,j)=>{if(j===q.a)l.classList.add('right');else if(j===ans[k])l.classList.add('wrong');});
        if(ans[k]===q.a)ok++;
        d.querySelector('.ex').innerHTML=(ans[k]===q.a?'<b>答對。</b>':(ans[k]<0?'<b>沒作答。</b>':'<b>答錯。</b>'))+' '+(q.ex||'')+(q.topic?` <span class="qd">（${q.topic}）</span>`:'');});
      const pct=Math.round(100*ok/qs.length),pass=pct>=cfg.pass;
      if(!topic&&(!best||pct>best.pct)){best={pct,at:new Date().toLocaleString()};try{localStorage.setItem(KEYB,JSON.stringify(best));}catch(e){}}
      const used=minutes*60-left;
      const bar=box.querySelector('.exbar');
      bar.innerHTML=`<b style="color:${pass?'#0b8a5f':'#b91c1c'}">${timeout?'時間到。':''}得分 ${ok} / ${qs.length}（${pct}%）${pass?'　通過':'　未通過'}（及格 ${cfg.pass}%）</b><span>用時 ${Math.floor(used/60)} 分 ${used%60} 秒</span><button class="btn menu">回選單</button><button class="btn pri again">${topic?'再練一次':'再考一次（重新抽題）'}</button>`;
      bar.querySelector('.again').onclick=()=>start(topic);
      bar.querySelector('.menu').onclick=menu;
      const wrong=[...new Set(qs.filter((q,k)=>ans[k]!==q.a).map(q=>q.topic).filter(Boolean))];
      if(wrong.length){const w=document.createElement('div');w.className='warn';w.innerHTML='<b>要複習的主題</b>'+wrong.join('、');bar.after(w);}
      box.scrollIntoView();
    }
  }
  function menu(){
    const topics=[...new Set(cfg.bank.map(q=>q.topic).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh',{numeric:true}));
    box.innerHTML=`<div class="exbar"><span>${cfg.n} 題、${cfg.minutes} 分鐘、及格 ${cfg.pass}%。每次從 ${cfg.bank.length} 題題庫隨機抽題，交卷後才顯示答案和解說。${best?`　你的最佳成績：${best.pct}%（${best.at}）`:''}</span><button class="btn pri go">開始模擬考</button></div>
<div class="exbar topicbar"><span>或依主題練習（該主題全部題目）：</span><select class="tp">${topics.map(t=>`<option value="${t}">${t}（${cfg.bank.filter(q=>q.topic===t).length} 題）</option>`).join('')}</select><button class="btn tgo">開始練習</button></div>`;
    box.querySelector('.go').onclick=()=>start('');
    box.querySelector('.tgo').onclick=()=>start(box.querySelector('.tp').value);
  }
  menu();
}

/* ---------- 啟動 ---------- */
window.addEventListener('DOMContentLoaded',()=>{
  LESSONS.sort((a,b)=>a.order-b.order);
  buildSide();
  const go=()=>show((location.hash||'').slice(1)||prog.last||LESSONS[0].id);
  window.addEventListener('hashchange',()=>{go();document.getElementById('side').classList.remove('open');});
  go();
  document.getElementById('menuBtn').onclick=()=>document.getElementById('side').classList.toggle('open');
});
})();
