/* CLAD 考題解析：2D 陣列（DAQmx 多通道）、For Loop 自動索引、Index Array（C13）
   四個選項都在 LabVIEW 2026 實際建出來跑過：labview_vi/_build/build_q15.py → Q15_Channel_Pick.vi，
   用 2D DBL 控制項代替 DAQmx Read（Analog 2D DBL NChan NSamp），第 c 通道第 s 個取樣 = c×10+s。 */
(function(){
const L=window.LESSONS,fn=C.fn;
const {tip,warn,note,PART}=C.clad;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* 逐圈播放：選選項、選通道數，一圈一圈看資料怎麼流 */
function q15Lab(d){
  d.innerHTML=`<div class="fig q15"><div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
    <span>選項 <span class="opts"></span></span>
    <label>通道數（列）<select class="ch">${[1,2,3,4,5,6].map(n=>`<option${n===4?' selected':''}>${n}</option>`).join('')}</select></label>
    <span style="font-size:13px;color:#5c6577">每個通道 5 個取樣；第 c 通道第 s 個 = c×10+s</span></div>
    <div class="grid" style="margin-top:10px"></div>
    <div class="bar" style="display:flex;gap:8px;align-items:center;margin:8px 0"><button class="btn p">◀ 上一步</button><button class="btn pri n">下一步 ▶</button><span class="where" style="font-size:14px"></span></div>
    <div class="say"></div><div class="res"></div></div>`;
  const $=s=>d.querySelector(s);
  const OPT={A:'A：迴圈內 Index Array 3，輸出「自動索引」',B:'B：迴圈內 Index Array 3，輸出「最後一個值」',C:'C：沒有迴圈，Index Array 只接列索引 3',D:'D：迴圈直接 ×2，輸出「最後一個值」'};
  $('.opts').innerHTML=Object.keys(OPT).map(k=>`<button class="btn" data-o="${k}" title="${OPT[k]}">${k}</button>`).join(' ');
  let opt='D',step=0;
  function data(){const R=+$('.ch').value;return Array.from({length:R},(_,c)=>Array.from({length:5},(_,s)=>c*10+s));}
  function plan(){
    const D=data(),R=D.length,steps=[];
    if(opt==='C'){
      steps.push({row:3,cell:null,say:R>3?'Index Array 收到整個 2D 陣列，只接了<b>列</b>索引 3（下面的行索引空著）→ 輸出整個第 3 列（第 4 個通道）這個 1D 陣列。':'Index Array 要第 3 列，可是只有 '+R+' 列 → <b>超出範圍，輸出空陣列</b>，不會出錯。',
        out:R>3?D[3].map(v=>v*2):[]});
      return steps;
    }
    const n=Math.min(4,R);let acc=[];
    steps.push({row:-1,say:`For Loop 的 N 接 4，但輸入通道是<b>自動索引</b>，陣列只有 ${R} 列 → 實際只跑 <b>${n} 圈</b>（取 N 和列數比較小的那個）。`,out:opt==='B'?null:(opt==='A'?[]:null)});
    for(let i=0;i<n;i++){
      const row=D[i];let v,say;
      if(opt==='D'){v=row.map(x=>x*2);say=`第 ${i} 圈：自動索引通道把<b>第 ${i} 列</b>整列（通道 ${i}）送進來，是 1D 陣列 → 每個值 ×2。輸出通道是實心的「最後一個值」，<b>這一圈的結果蓋掉上一圈的</b>。`;acc=v;}
      else{v=row[3]*2;say=`第 ${i} 圈：送進來的是第 ${i} 列（1D）。迴圈裡的 Index Array 接 3，在 1D 陣列上拿的是<b>第 3 個取樣</b>（單一個數 ${row[3]}），不是第 3 個通道 → ×2 = ${v}。`;
        if(opt==='A'){acc=acc.concat([v]);say+=' 輸出通道是自動索引：每圈的值<b>收集成陣列</b>。';}else{acc=v;say+=' 輸出通道是「最後一個值」：只留這一圈的。';}}
      steps.push({row:i,cell:opt==='D'?null:3,say,out:Array.isArray(acc)?acc.slice():acc});
    }
    steps.push({row:-1,say:'迴圈結束，element 拿到的就是輸出通道最後留下來的東西。',out:Array.isArray(acc)?acc.slice():acc,end:true});
    return steps;
  }
  function draw(){
    const D=data(),S=plan();step=Math.max(0,Math.min(S.length-1,step));const st=S[step];
    d.querySelectorAll('[data-o]').forEach(b=>b.classList.toggle('pri',b.dataset.o===opt));
    $('.grid').innerHTML=`<table class="t xls"><tr><th></th>${[0,1,2,3,4].map(s=>`<th>取樣 ${s}<br><small>行 ${s}</small></th>`).join('')}</tr>${D.map((r,c)=>`<tr${st.row===c?' class="hot"':''}><th>通道 ${c}<br><small>列 ${c}</small></th>${r.map((v,s)=>`<td class="${st.row===c&&st.cell===s?'pick':''}">${v}</td>`).join('')}</tr>`).join('')}</table>`;
    $('.where').textContent=`${step+1} / ${S.length}`;
    $('.say').innerHTML=`<p>${st.say}</p>`;
    const want=D.length>3?D[3].map(v=>v*2):[];
    const fmt=v=>v===null||v===undefined?'（還沒有）':Array.isArray(v)?'['+v.join(', ')+']':String(v);
    const last=S[S.length-1].out,ok=JSON.stringify(last)===JSON.stringify(want);
    $('.res').innerHTML=`<p><b>element 現在：</b><code>${esc(fmt(st.out))}</code></p>`+
      (st.end||opt==='C'?`<p class="${ok?'tip':'warn'}" style="margin:6px 0 0"><b>${ok?'✓ 這個通道數的結果正確':'✗ 這個通道數的結果錯了'}</b>題目要的是 <code>${esc(fmt(want))}</code>${D.length>3?'（第 4 個通道每個值 ×2）':'（少於 4 個通道 → 空陣列）'}。${ok&&opt==='D'?' 但一個選項要在<b>每一種</b>通道數都對才算對，把通道數改成 3 再看一次。':''}${!ok&&opt==='D'&&D.length<4?' D 在少於 4 個通道時，給的是<b>最後一個通道</b>，不是空陣列。':''}</p>`:'');
    $('.p').disabled=step===0;$('.n').disabled=step===S.length-1;
  }
  $('.opts').onclick=e=>{if(e.target.dataset.o){opt=e.target.dataset.o;step=0;draw();}};
  $('.ch').oninput=()=>{step=0;draw();};
  $('.p').onclick=()=>{step--;draw();};$('.n').onclick=()=>{step++;draw();};
  draw();
}

L.push({id:'C13',order:113,no:'C13',part:PART,title:'考題解析：多通道 2D 陣列、自動索引與 Index Array',mins:35,
goals:[['學會','2D 陣列的「列」和「行」；For Loop 自動索引一圈拿一列；輸出通道「自動索引」和「最後一個值」的差別；Index Array 只接列索引就拿整列；超出範圍回傳空陣列。'],
 ['題目','DAQmx Read（Analog 2D DBL NChan NSamp）讀到多個通道。要拿出第四個通道、每個值乘 2；通道少於 4 個時回傳空陣列。四個選項哪個對？'],
 ['答案','<b>C</b>。下面每一個選項都在 LabVIEW 實際跑過。']],
check:'能解釋：為什麼 D 在 4 個通道時看起來對、3 個通道時卻錯；為什麼 A、B 迴圈裡的 Index Array 3 拿到的是「第 4 個取樣」而不是「第 4 個通道」。',
body:[
C.h3('懂','','這題用到的功能'),
C.table(['功能','在哪','做什麼'],[
 ['DAQmx Read.vi',fn('Measurement I/O','NI-DAQmx','DAQmx Read.vi'),'從擷取卡讀資料。下面的選單選 <b>Analog ▸ Multiple Channels ▸ Multiple Samples ▸ 2D DBL</b>（圖上寫 Analog 2D DBL NChan NSamp）：每一列一個通道、每一行一個取樣'],
 ['For Loop',fn('Programming','Structures','For Loop'),'N 次的迴圈。陣列接進來時預設<b>自動索引</b>：一圈拿一個元素（2D 就是一列）'],
 ['自動索引／最後一個值','迴圈邊框上的通道右鍵 ▸ Tunnel Mode','輸入：自動索引 = 一圈拿一份。輸出：自動索引 = 收集成陣列；Last Value = 只留最後一圈'],
 ['Index Array',fn('Programming','Array','Index Array'),'拿陣列的一部分。2D 只接列索引 → 一整列；只接行索引 → 一整行；超出範圍回傳空陣列'],
 ['Multiply',fn('Programming','Numeric','Multiply'),'陣列 × 數字 = 每個元素都乘（多型）'],
 ['element（Waveform Graph）',C.ctl('Modern','Graph','Waveform Graph'),'顯示結果。1D 陣列畫一條線']]),
C.h3('懂','','先把方向搞清楚：列、行、通道、取樣'),
`<p>DAQmx Read 選 <b>Analog 2D DBL NChan NSamp</b>（多通道、多取樣）時，輸出的 2D 陣列是：</p>`,
C.table(['','方向','在 DAQmx 代表','LabVIEW 的索引'],[
 ['<b>列</b>（row，橫的一排）','由上往下數','<b>一個通道</b>：通道 0、通道 1、…','第一個索引 <code>index (row)</code>'],
 ['<b>行</b>（column，直的一排）','由左往右數','<b>同一個時間點的取樣</b>：取樣 0、取樣 1、…','第二個索引 <code>index (col)</code>']]),
`<p>所以「第四個通道」= <b>第 3 列</b>（從 0 開始數）= 一整排橫的數字。題目要的是把這<b>整列</b>拿出來每個乘 2。</p>`,
C.h3('懂','','你問的那件事：為什麼自動索引是「一列一列」，D 卻剩下「最後一列」'),
C.table(['東西','做什麼','在這題'],[
 ['<b>輸入通道（自動索引）</b><br><small>空心方塊，帶 [ ]</small>','2D 陣列進 For Loop，LabVIEW <b>永遠沿著第一個索引（列）切</b>：第 i 圈拿到第 i 列，迴圈裡的線少一維，變成 1D','第 0 圈拿通道 0、第 1 圈拿通道 1… 每圈拿的都是<b>一整個通道</b>'],
 ['<b>迴圈次數</b>','N 和「自動索引的陣列列數」取<b>比較小</b>的','N = 4，只有 3 個通道 → 只跑 3 圈'],
 ['<b>輸出通道「最後一個值」</b><br><small>實心方塊</small>','每圈的結果都會<b>蓋掉</b>上一圈的，迴圈結束只剩最後一圈的','D：剩下的是「最後跑的那一圈」的那一列 ×2'],
 ['<b>輸出通道「自動索引」</b><br><small>空心方塊</small>','每圈的結果<b>收集</b>起來，變成多一維的陣列','A：4 圈各一個數 → 1D 陣列'],
 ['<b>Index Array 接 2D、只接列索引</b>','拿出<b>整列</b>（1D）。行索引不接時是灰的（disabled），代表「整列都要」','C：直接拿第 3 列 = 第四個通道'],
 ['<b>Index Array 超出範圍</b>','不會出錯，回傳預設值：要拿一列就回傳<b>空陣列</b>','C：只有 3 個通道時 → 空陣列，正是題目要的']]),
note('一句話：','D 的「最後一列」不是自動索引挑出來的，自動索引只是一圈給一列；是<b>實心的輸出通道只留最後一圈</b>。剛好 N = 4、又剛好有 4 個以上的通道時，最後一圈是第 3 列，所以看起來對；通道一少，最後一圈就變成別的通道。'),
C.h3('玩','','一圈一圈看'),
`<p>選一個選項、改通道數，按「下一步」看每一圈送進來的是哪一列（黃底）、Index Array 拿到哪一格（紅框）、輸出通道留下什麼。<b>把通道數改成 3</b>，再看 C 和 D 的差別。</p>`,
{fn:q15Lab},
C.h3('懂','','四個選項，LabVIEW 實際跑出來的結果'),
`<p>我在 LabVIEW 2026 把四個選項接成一個 VI（用 2D DBL 控制項代替 DAQmx Read，第 c 通道第 s 個取樣 = c×10+s），分別餵 4、3、6 個通道：</p>`,
C.table(['選項','接法','4 個通道','3 個通道','對嗎'],[
 ['A','索引進 → Index Array 3（在 1D 上 = 第 3 個<b>取樣</b>）→ ×2 → <b>索引</b>出','[6, 26, 46, 66]','[6, 26, 46]','✗ 拿到每個通道的第 4 個取樣'],
 ['B','同 A，但<b>最後一個值</b>出','66','46','✗ 只有一個數'],
 ['<b>C</b>','沒有迴圈；Index Array 在 <b>2D</b> 上只接列索引 3 → ×2','[60, 62, 64, 66, 68]','<b>[ ]</b>','<b>✓</b>'],
 ['D','索引進（每圈一列）→ ×2 → <b>最後一個值</b>出','[60, 62, 64, 66, 68]','[40, 42, 44, 46, 48]','✗ 通道不夠時給了最後一個通道']]),
`<div class="fig"><div style="font-size:13px;font-weight:700;margin-bottom:6px">真實 LabVIEW：四個選項接在同一個 VI（由上到下 D、B、A、C）</div><img src="assets/real/Q15_Channel_Pick.png" alt="四個選項的方塊圖" style="max-width:100%"><div class="cap">看通道的樣子：D、B 的輸出是<b>實心</b>方塊（最後一個值），A 的輸出是<b>空心</b>方塊（自動索引）。C 的 Index Array 下面那個行索引沒接、是灰的。下載：<a href="vi/LV2018/Q15_Channel_Pick.vi" download>Q15_Channel_Pick.vi（LabVIEW 2018）</a></div></div>`,
warn('最常見的誤會：','以為迴圈裡的 Index Array 3 拿的是「第 3 個通道」。進了自動索引的迴圈，2D 已經被切成一列一列，<b>迴圈裡面的陣列只剩 1D（一個通道的取樣）</b>，索引 3 拿的是第 4 個取樣。看線就知道：迴圈外是雙線（2D），迴圈裡變成單粗線（1D）。'),
C.h3('做','b','自己做一次：選項 C（沒有擷取卡也能練）'),
{todo:[
 '開新 VI。前面板放一個 2D DBL 陣列控制項：'+C.ctl('Modern','Array, Matrix & Cluster','Array')+'，裡面放 Numeric Control，再右鍵 ▸ Add Dimension。改名 <code>Data</code>，填 4 列 × 5 行的數字（假裝是 4 個通道各 5 個取樣）。',
 fn('Programming','Array','Index Array')+'：array 接 Data。接上 2D 後會出現兩個索引：<b>只在上面的 index (row) 接常數 3</b>，下面的不要接。',
 fn('Programming','Numeric','Multiply')+'：x 接 Index Array 的輸出（1D），y 接常數 <code>2</code>。',
 '輸出右鍵 ▸ Create ▸ Indicator（或接一個 Waveform Graph）。執行：拿到第 4 列 ×2。',
 '把 Data 刪成只剩 3 列再執行：輸出變成空陣列，沒有錯誤。這就是題目要的。',
 '有擷取卡時，把 Data 換成 '+fn('Measurement I/O','NI-DAQmx','DAQmx Read.vi')+'（選 Analog 2D DBL NChan NSamp），其他不變。',
 '再接一次選項 D 做比較：For Loop（N 接 4）、Data 拉進迴圈（自動索引）、裡面 × 2、輸出通道右鍵 ▸ Tunnel Mode ▸ Last Value。3 列時看它輸出什麼。'
]},
C.h3('懂','','考試時怎麼快速判斷'),
C.table(['看哪裡','怎麼看'],[
 ['線的粗細','細線 = 一個數；粗線 = 1D；雙線 = 2D。每穿過一個自動索引通道，進迴圈少一維、出迴圈多一維'],
 ['通道的樣子','空心方塊帶 [ ] = 自動索引；實心方塊 = 最後一個值。右鍵 ▸ Tunnel Mode 可以切換'],
 ['Index Array 的索引端子','接 2D 時有兩個索引（列、行）。只接上面那個 = 拿整列；只接下面那個 = 拿整行；兩個都接 = 一個元素'],
 ['題目說「少於 N 個時回傳空的」','想到 Index Array 超出範圍回傳預設值（空陣列），不是迴圈'],
 ['For Loop 的 N 和自動索引一起用','跑的次數 = 兩者比較小的']]),
tip('要拿一整「行」（同一時間所有通道的值）怎麼辦？','Index Array 只接下面的行索引；或先用 '+fn('Programming','Array','Transpose 2D Array')+' 把列和行對調，再用自動索引。'),
C.h3('測','q','小測驗'),
{quiz:[
 {q:'2D 陣列（3 列 × 5 行）接到 For Loop 的自動索引通道，N 沒接。迴圈跑幾圈、每圈拿到什麼？',o:['3 圈，每圈一列（5 個數的 1D 陣列）','5 圈，每圈一行（3 個數）','15 圈，每圈一個數'],a:0,ex:'自動索引永遠沿著第一個索引（列）切。'},
 {q:'For Loop 的 N 接 10，自動索引的陣列只有 3 個元素，迴圈跑幾圈？',o:['3','10','13','錯誤'],a:0,ex:'取比較小的那個。'},
 {q:'Index Array 接一個 4 列的 2D 陣列，只接列索引 7，輸出是？',o:['空的 1D 陣列，沒有錯誤','錯誤','最後一列'],a:0,ex:'超出範圍回傳預設值；拿一列的預設值就是空陣列。'},
 {q:'迴圈的輸出通道是實心方塊（Last Value），迴圈跑了 5 圈，輸出是？',o:['第 5 圈（i = 4）的結果','5 圈的結果組成的陣列','第 1 圈的結果'],a:0,ex:'最後一個值只留最後一圈。'},
 {q:'題目改成「第二個通道每個值乘 2」，C 選項要怎麼改？',o:['Index Array 的列索引改成 1','行索引改成 1','把 For Loop 的 N 改成 2'],a:0,ex:'通道是列，從 0 數，第二個通道是列 1。'}
]}
]});
})();
