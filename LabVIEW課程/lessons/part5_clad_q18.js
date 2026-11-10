/* CLAD 考題解析：兩層 For Loop 處理 2D 陣列，輸出所有正值（C15）
   輸入每穿過一個自動索引通道少一維；輸出通道：Indexing 多一維、Concatenating 接起來、Last Value 只留最後一圈。
   維度的變化在 LabVIEW 2026 實測：labview_vi/_build/build_q18.py → Q18_Nested_Loops.vi（輸入 3 × 4）。
   條件通道（Conditional）VI 腳本設定不了，沒有放進測試 VI；它的行為照 LabVIEW 說明寫。 */
(function(){
const L=window.LESSONS,fn=C.fn,ctl=C.ctl;
const {tip,warn,note,PART}=C.clad;
const DIN=[[3,-1,5,0],[-2,7,-4,1],[6,-8,2,-3]];
const arr=a=>Array.isArray(a)?'['+a.map(arr).join(', ')+']':String(a);

function nestLab(d){
  d.innerHTML=`<div class="fig q18"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">選項 ${'ABCD'.split('').map(k=>`<button class="btn" data-o="${k}">${k}</button>`).join(' ')}
    <span style="font-size:13px;color:#5c6577;margin-left:6px">Data In = 3 列 × 4 行</span></div>
    <div class="grid" style="margin-top:8px"></div>
    <div class="wires"></div>
    <div style="display:flex;gap:8px;align-items:center;margin:8px 0"><button class="btn p">◀ 上一步</button><button class="btn pri n">下一步 ▶</button><span class="where" style="font-size:14px"></span></div>
    <div class="say"></div></div>`;
  const $=s=>d.querySelector(s);let opt='A',step=0;
  const OPT={A:{inner:'cond',outer:'concat'},B:{inner:'cond',outer:'last'},C:null,D:{inner:'index',outer:'index'}};
  function plan(){
    if(opt==='C') return [{i:-1,j:-1,broken:true}];
    const o=OPT[opt],S=[{i:-1,j:-1,start:true}];let outerAcc=opt==='A'?[]:(opt==='D'?[]:null);
    DIN.forEach((row,i)=>{let inner=[];
      row.forEach((v,j)=>{const pos=v>0;if(o.inner==='index'||pos)inner=inner.concat([v]);S.push({i,j,v,pos,inner:inner.slice(),outer:outerAcc===null?null:JSON.parse(JSON.stringify(outerAcc))});});
      if(o.outer==='concat')outerAcc=outerAcc.concat(inner);else if(o.outer==='index')outerAcc=outerAcc.concat([inner]);else outerAcc=inner;
      S.push({i,j:-1,rowEnd:true,inner:inner.slice(),outer:JSON.parse(JSON.stringify(outerAcc))});});
    S.push({i:-1,j:-1,end:true,outer:outerAcc});
    return S;
  }
  function draw(){
    d.querySelectorAll('[data-o]').forEach(b=>b.classList.toggle('pri',b.dataset.o===opt));
    const S=plan();step=Math.max(0,Math.min(S.length-1,step));const st=S[step];
    $('.grid').innerHTML=`<table class="t xls"><tr><th></th>${[0,1,2,3].map(j=>`<th>行 ${j}<br><small>內圈 j=${j}</small></th>`).join('')}</tr>${DIN.map((r,i)=>`<tr${st.i===i?' class="hot"':''}><th>列 ${i}<br><small>外圈 i=${i}</small></th>${r.map((v,j)=>`<td class="${st.i===i&&st.j===j?'pick':''}">${v}</td>`).join('')}</tr>`).join('')}</table>`;
    $('.where').textContent=`${step+1} / ${S.length}`;$('.p').disabled=step===0;$('.n').disabled=step===S.length-1;
    const o=OPT[opt];
    if(st.broken){$('.wires').innerHTML='';$('.say').innerHTML=`<p class="warn" style="margin:0"><b>C 根本不能執行：</b>Data In 進外層迴圈的通道是<b>實心</b>（沒有自動索引），每圈拿到整個 2D；進內層才自動索引，所以內層每圈拿到一整<b>列</b>（1D）。&gt;0 比較一整列，輸出是 Boolean <b>陣列</b>，但條件通道的 ? 只能接一個 Boolean → 斷線。另外 Array Size 對 2D 輸出的是 [列數, 行數] 陣列，接不上 N。</p>`;return;}
    const rowTxt=st.i>=0?arr(DIN[st.i]):'—',elTxt=st.j>=0?String(st.v):'—';
    $('.wires').innerHTML=`<table class="t" style="font-size:14px"><tr><th>線</th><th>現在的內容</th><th>維度</th></tr>
      <tr><td>Data In（迴圈外）</td><td><code>${arr(DIN)}</code></td><td>2D（雙線）</td></tr>
      <tr><td>穿過外層的輸入通道（自動索引）</td><td><code>${rowTxt}</code></td><td>1D：第 ${st.i>=0?st.i:'?'} 列（粗線）</td></tr>
      <tr><td>穿過內層的輸入通道（自動索引）</td><td><code>${elTxt}</code></td><td>一個數（細線）</td></tr>
      <tr><td>內層輸出通道（${o.inner==='cond'?'自動索引＋條件':'自動索引'}）收集到</td><td><code>${st.inner?arr(st.inner):'—'}</code></td><td>1D</td></tr>
      <tr><td>外層輸出通道（${o.outer==='concat'?'串接 Concatenating':o.outer==='index'?'自動索引 Indexing':'最後一個值 Last Value'}）</td><td><code>${st.outer===null||st.outer===undefined?'（還沒有）':arr(st.outer)}</code></td><td>${o.outer==='index'?'2D':'1D'}</td></tr></table>`;
    let say;
    if(st.start) say=`外層 For Loop 的 N 沒接，靠自動索引決定圈數：Data In 有 3 列 → 外層跑 <b>3 圈</b>。內層每圈收到一列（4 個數）→ 內層跑 <b>4 圈</b>。按「下一步」。`;
    else if(st.end){const ok=opt==='A';say=`<b>Data Out = <code>${arr(st.outer)}</code></b>　${ok?'<span style="color:#15803d">✓ 一維、只有正值，符合題目</span>':opt==='B'?'<span style="color:#b91c1c">✗ 只剩最後一列的正值（外層是 Last Value）</span>':'<span style="color:#b91c1c">✗ 變回 2D，而且沒有過濾（接到 1D 的 Data Out 會斷線）</span>'}`;}
    else if(st.rowEnd) say=`外層第 ${st.i} 圈結束：內層收集的 <code>${arr(st.inner)}</code> 交給外層的輸出通道 → ${o.outer==='concat'?'<b>接在後面</b>，還是 1D':o.outer==='index'?'<b>疊成新的一列</b>，變 2D':'<b>蓋掉</b>前一圈的'}。`;
    else say=`外層第 ${st.i} 圈、內層第 ${st.j} 圈：拿到 <b>${st.v}</b>，&gt;0 是 <b>${st.pos?'True':'False'}</b>。${o.inner==='cond'?(st.pos?'條件通道收下這個數。':'條件是 False，條件通道<b>不收</b>。'):'內層輸出是一般的自動索引，<b>不管 True/False 都收</b>（&gt;0 的結果沒接到任何地方）。'}`;
    $('.say').innerHTML=`<p>${say}</p>`;
  }
  d.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>{opt=b.dataset.o;step=0;draw();});
  $('.p').onclick=()=>{step--;draw();};$('.n').onclick=()=>{step++;draw();};
  draw();
}

L.push({id:'C15',order:115,no:'C15',part:PART,title:'考題解析：兩層迴圈處理 2D 陣列，輸出所有正值（通道模式）',mins:40,
goals:[['題目','輸入是二維陣列，輸出要是一維陣列，裡面是所有的正值。四個 VI 哪個做得到？'],
 ['答案','<b>A</b>：內層輸出用<b>條件通道</b>只收正值，外層輸出用<b>串接通道</b>把每一列的結果接成一條。'],
 ['學會','輸入每穿過一個自動索引通道<b>少一維</b>；輸出通道三種模式：Indexing 多一維、Concatenating 接起來、Last Value 只留最後一圈；Conditional 只收條件成立的。']],
check:'能說出 Data In（2D）在外層迴圈裡、內層迴圈裡各是什麼；能說出 A、B、D 的 Data Out 各是什麼。',
body:[
C.h3('懂','','這題用到的功能'),
C.table(['功能','在哪','做什麼'],[
 ['For Loop',fn('Programming','Structures','For Loop'),'N 次的迴圈。N 不接時，跑的次數由自動索引的陣列決定'],
 ['輸入通道：自動索引','陣列拉進迴圈，預設就是（空心方塊，帶 [ ]）','一圈拿一個元素，<b>少一維</b>。2D 的一個元素是一整列'],
 ['輸入通道：不索引','通道右鍵 ▸ Disable Indexing（實心方塊）','每圈都拿到整個陣列，維度不變'],
 ['Greater Than 0?（&gt;0）',fn('Programming','Comparison','Greater Than 0?'),'一個數是不是大於 0，輸出 Boolean'],
 ['輸出通道：Indexing','迴圈右邊的通道，For Loop 預設','每圈的值收集成陣列，<b>多一維</b>'],
 ['輸出通道：Concatenating','通道右鍵 ▸ Tunnel Mode ▸ Concatenating','每圈給一個陣列時，<b>接在後面</b>，維度不變'],
 ['輸出通道：Last Value','通道右鍵 ▸ Tunnel Mode ▸ Last Value（實心方塊）','只留最後一圈的值'],
 ['輸出通道：Conditional','通道右鍵 ▸ Tunnel Mode ▸ Conditional（通道旁多一個 <b>?</b>）','? 接 True 那一圈的值才收，False 就跳過'],
 ['Array Size（選項 C）',fn('Programming','Array','Array Size'),'1D 輸出一個數；<b>2D 輸出 [列數, 行數] 陣列</b>']]),
C.h3('懂','','你問的那件事：2D 進了迴圈為什麼變 1D'),
`<p>自動索引的意思是「<b>一圈拿陣列的一個元素</b>」。陣列的「一個元素」是什麼，要看它是幾維：</p>`,
C.table(['陣列','它的一個元素','穿過一個自動索引的輸入通道後'],[
 ['1D：[3, -1, 5, 0]','一個數','一圈拿一個數'],
 ['2D：3 列 × 4 行','<b>一整列</b>（4 個數的 1D）','一圈拿一列 → 線變成 1D'],
 ['3D','一整頁（2D）','一圈拿一頁']]),
`<p>所以這題的 Data In 經過兩層迴圈：</p>`,
C.table(['位置','線上是什麼','線的樣子'],[
 ['迴圈外 Data In','整個 2D（3 × 4）','雙線'],
 ['穿過<b>外層</b>的索引通道','第 i 列：1D，4 個數','粗線'],
 ['再穿過<b>內層</b>的索引通道','第 i 列的第 j 個數：一個 I32','細線'],
 ['內層的 &gt;0','比較這<b>一個</b>數','—']]),
note('出來的時候倒過來：','每穿過一個<b>自動索引</b>的輸出通道就<b>多一維</b>。兩層都用自動索引出來，又會變回 2D（選項 D）。要變成一維，外層要用 <b>Concatenating</b>：每圈的 1D 接在後面，不疊成新的一列。'),
`<div class="fig"><div style="font-size:13px;font-weight:700;margin-bottom:6px">真實 LabVIEW：同樣兩層迴圈，外層輸出換三種模式</div><img src="assets/real/Q18_Nested_Loops.png" alt="三種外層輸出模式" style="max-width:100%"><div class="cap">看線：迴圈外雙線（2D），外層裡變粗線（1D），內層裡變細線（一個數）。輸入 3 × 4，LabVIEW 實際跑出來：<b>Indexing</b> → 2D 3 × 4；<b>Concatenating</b> → 1D 12 個；<b>Last Value</b> → 1D，只有最後一列。下載：<a href="vi/LV2018/Q18_Nested_Loops.vi" download>Q18_Nested_Loops.vi（LabVIEW 2018）</a></div></div>`,
C.h3('玩','','一圈一圈看'),
`<p>選一個選項，按「下一步」：黃底是外層這一圈拿到的那一列，紅框是內層這一圈拿到的那一個數，下面的表是每條線現在的內容。</p>`,
{fn:nestLab},
C.h3('懂','','四個選項'),
C.table(['選項','內層輸出','外層輸出','Data Out（Data In 用上面的 3 × 4）','對嗎'],[
 ['<b>A</b>','自動索引 + <b>條件</b>（只收 &gt;0）','<b>Concatenating</b>','[3, 5, 7, 1, 6, 2]：1D、只有正值','<b>✓</b>'],
 ['B','自動索引 + 條件','<b>Last Value</b>','[6, 2]：只有最後一列的正值','✗'],
 ['C','條件','Indexing','—','✗ 斷線：外層沒索引，內層拿到一整列，&gt;0 變 Boolean 陣列接不上 ?'],
 ['D','自動索引（沒有條件）','Indexing','2D、全部的值，沒有過濾','✗ 沒過濾，而且是 2D']]),
warn('沒有實測的部分：','上面 A、B 的「條件通道」用 VI 腳本設定不了，所以 LabVIEW 實測的 VI 只驗證了維度怎麼變（Indexing、Concatenating、Last Value 三種）。條件通道的行為照 LabVIEW 的說明：? 接 True 才收那一圈的值。'),
C.h3('做','b','自己做一次：選項 A'),
{todo:[
 '開新 VI。前面板放一個 2D I32 陣列控制項 <code>Data In</code>（'+ctl('Modern','Array, Matrix & Cluster','Array')+' 裡放 Numeric Control，右鍵 Representation ▸ I32，陣列右鍵 ▸ Add Dimension），填 3 列 × 4 行、有正有負的數。',
 '方塊圖放一個 '+fn('Programming','Structures','For Loop')+'（外層），裡面再放一個 For Loop（內層）。兩個 N 都<b>不要接</b>。',
 'Data In 拉線穿過外層、接到內層裡面。兩個邊框上都會出現空心的 [ ] 通道（自動索引）。滑鼠停在外層裡面那段線上看：是 1D；內層裡面是一個 I32。',
 '內層放 '+fn('Programming','Comparison','Greater Than 0?')+'，輸入接內層通道進來的那個數。',
 '同一個數再拉線穿過內層的右邊框。在這個輸出通道右鍵 ▸ <b>Tunnel Mode ▸ Conditional</b>，通道旁出現 <b>?</b>，把 &gt;0 的輸出接到 ?。',
 '內層輸出通道再拉線穿過外層的右邊框。在外層這個通道右鍵 ▸ <b>Tunnel Mode ▸ Concatenating</b>。',
 '外層通道輸出右鍵 ▸ Create ▸ Indicator，改名 <code>Data Out</code>。應該是 1D I32。執行，看到所有正值排成一列。',
 '比較：把外層通道改成 Indexing，Data Out 的線斷掉（變 2D 了），刪掉重新 Create Indicator，會看到每列的正值分開成好幾列，短的補 0。'
]},
tip('Indexing 疊成 2D 時長度不一樣怎麼辦？','2D 陣列每一列長度要一樣。每列的正值個數不同時，Indexing 會用 0 把短的補齊，看起來就會多出很多 0。這也是這題一定要用 Concatenating 的原因之一。'),
C.h3('測','q','小測驗'),
{quiz:[
 {q:'2D 陣列（5 列 × 8 行）接到 For Loop 的自動索引輸入通道，迴圈裡那條線是？',o:['1D，8 個數（一列）','1D，5 個數','一個數','還是 2D'],a:0,ex:'自動索引一圈拿一個元素；2D 的一個元素是一整列。'},
 {q:'兩層 For Loop，內層每圈輸出一個數，內層輸出 Indexing、外層輸出 Indexing，最後是？',o:['2D 陣列','1D 陣列','一個數'],a:0,ex:'每穿過一個 Indexing 輸出通道多一維：數 → 1D → 2D。'},
 {q:'外層輸出改 Concatenating，內層每圈給外層一個 1D，最後是？',o:['1D，所有的接在一起','2D','只有最後一個 1D'],a:0,ex:'Concatenating 接在後面，不增加維度。'},
 {q:'條件通道（Conditional）的 ? 接 False 的那一圈，會怎樣？',o:['那一圈的值不收','收一個 0','迴圈停止'],a:0,ex:'只收條件成立的。和 For Loop 的「條件終端」（停止迴圈）不一樣。'},
 {q:'Array Size 接一個 2D 陣列，輸出是？',o:['1D 陣列 [列數, 行數]','一個數：總元素數','一個數：列數'],a:0,ex:'所以選項 C 把它接到 N 會斷線。'}
]}
]});
})();
