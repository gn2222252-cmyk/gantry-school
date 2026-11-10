/* CLAD 考題解析：比較函式的上下順序（x 在上、y 在下）＋ 條件通道收集 DAQmx 讀值（C16）
   Greater? 的上下順序在 LabVIEW 2026 實測：labview_vi/_build/build_q_threshold.py → Q_Greater_Order.vi
   （上面 Threshold = 5、下面讀值 = 3 → True；7 → False；5 → False）。 */
(function(){
const L=window.LESSONS,fn=C.fn,ctl=C.ctl;
const {tip,warn,note,PART}=C.clad;

function thrLab(d){
  const R=[2.1,6.4,4.9,7.3,1.2,5.0,3.8,8.6,0.7,5.5];
  d.innerHTML=`<div class="fig thr"><div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center">
    <label>Threshold <input class="th" type="number" step="0.1" value="5" style="width:70px"></label>
    <label>Greater? 的接法 <select class="w"><option value="t">Threshold 在上（x）、讀值在下（y）— 題目</option><option value="r">讀值在上（x）、Threshold 在下（y）</option></select></label></div>
    <div class="out" style="margin-top:10px"></div></div>`;
  const $=s=>d.querySelector(s);
  function upd(){
    const th=parseFloat($('.th').value)||0,top=$('.w').value==='t';
    const rows=R.map((v,i)=>{const x=top?th:v,y=top?v:th,b=x>y;return {i,v,x,y,b};});
    const kept=rows.filter(r=>r.b).map(r=>r.v);
    $('.out').innerHTML=`<table class="t xls"><tr><th>圈 i</th>${rows.map(r=>`<th>${r.i}</th>`).join('')}</tr>
      <tr><th>DAQmx Read 讀到</th>${rows.map(r=>`<td>${r.v}</td>`).join('')}</tr>
      <tr><th>Greater?（x &gt; y）</th>${rows.map(r=>`<td title="${r.x} > ${r.y}">${r.x} &gt; ${r.y}<br><b style="color:${r.b?'#15803d':'#b91c1c'}">${r.b?'T':'F'}</b></td>`).join('')}</tr>
      <tr><th>條件通道收不收</th>${rows.map(r=>`<td style="${r.b?'background:#e7f7ec;font-weight:700':''}">${r.b?'收':'—'}</td>`).join('')}</tr></table>
      <p style="margin:6px 0 0">輸出陣列：<code>[${kept.join(', ')}]</code>（${kept.length} 個）　→　收的是<b>${top?'比 Threshold 小':'比 Threshold 大'}</b>的值${top?'（Threshold &gt; 讀值，就是讀值 &lt; Threshold）':''}。剛好等於 ${th} 的${R.includes(th)?'（例如 '+th+'）':''}兩種接法都<b>不收</b>，因為 &gt; 不含等於。</p>`;
  }
  d.querySelectorAll('input,select').forEach(e=>e.addEventListener('input',upd));upd();
}

L.push({id:'C16',order:116,no:'C16',part:PART,title:'考題解析：比較函式的上下順序與條件通道（閾值篩選）',mins:30,
goals:[['題目','For Loop 跑 10 圈，每圈用 DAQmx Read（Analog DBL 1Chan 1Samp）讀一個值，接到 Greater?，再用條件通道收集。哪些值會被存進陣列？'],
 ['答案','Threshold 接在 Greater? <b>上面</b>（x）、讀值接<b>下面</b>（y）→ 判斷 <b>Threshold &gt; 讀值</b> → 只收<b>小於</b>閾值的讀值。'],
 ['學會','比較函式一律是「上面 x、下面 y」，算的是 x ? y；看方塊圖時先找哪條線接上面。條件通道只收 True 那圈的值。']],
check:'看到任何比較函式，能先說出哪條線是 x、哪條是 y，再說出 True 代表什麼。',
body:[
C.h3('懂','','這題用到的功能'),
C.table(['功能','在哪','做什麼'],[
 ['DAQmx Start Task.vi',fn('Measurement I/O','NI-DAQmx','DAQmx Start Task.vi'),'開始擷取。放在迴圈外，只做一次'],
 ['DAQmx Read.vi（Analog DBL 1Chan 1Samp）',fn('Measurement I/O','NI-DAQmx','DAQmx Read.vi'),'選單選 Analog ▸ Single Channel ▸ Single Sample ▸ DBL：每呼叫一次讀<b>一個</b>數。放在 N = 10 的迴圈裡就是讀 10 次'],
 ['Greater?（&gt;）',fn('Programming','Comparison','Greater?'),'<b>上面的輸入是 x、下面是 y</b>，輸出 x &gt; y 的 Boolean'],
 ['Threshold（DBL 控制項）','前面板 Numeric Control','閾值。放在迴圈裡每圈都讀一次（也可以放迴圈外）'],
 ['條件通道（?）','輸出通道右鍵 ▸ Tunnel Mode ▸ Conditional','? 接 True 的那圈才把值收進陣列（C15）'],
 ['Task、error 的線','迴圈邊框上的通道或 Shift Register','把 DAQmx 的 task 和錯誤一路傳到迴圈外的 Stop／Clear Task']]),
C.h3('懂','','比較函式：上面 x、下面 y'),
`<p>所有兩個輸入的比較函式，LabVIEW 都是<b>上面的端子叫 x、下面叫 y</b>，算的是「x 運算 y」。三角形的尖端指向輸出，跟接線的位置無關，<b>要看線接到上面還是下面</b>。</p>`,
C.table(['函式','算的是','上 = 5、下 = 3','上 = 3、下 = 5'],[
 ['Greater?','x &gt; y','<b>True</b>','False'],
 ['Less?','x &lt; y','False','<b>True</b>'],
 ['Greater Or Equal?','x ≥ y','True','False'],
 ['Equal?','x = y','False','False'],
 ['Subtract','x − y','2','−2'],
 ['Divide','x ÷ y','1.667','0.6']]),
note('LabVIEW 實測：','Greater? 上面接 Threshold = 5、下面接讀值：讀值 3 → True、7 → False、5 → False（大於不含等於）。下載：<a href="vi/LV2018/Q_Greater_Order.vi" download>Q_Greater_Order.vi（LabVIEW 2018）</a>'),
tip('看不清楚上下時：','按 <kbd>Ctrl</kbd>+<kbd>H</kbd> 打開 Context Help，滑鼠移到函式上，會畫出 x、y 哪個在上。或把滑鼠停在線上，線的端點會亮。'),
C.h3('玩','','改 Threshold、改接法，看收到哪些值'),
`<p>假設 10 圈讀到下面這些值：</p>`,
{fn:thrLab},
warn('最常見的錯：','以為 Greater? 一定是「讀值 &gt; 閾值」。題目常常故意把 Threshold 接在上面，結果剛好相反，收到的是<b>小於</b>閾值的值。'),
C.h3('做','b','自己做一次（沒有擷取卡也能練）'),
{todo:[
 '放一個 '+fn('Programming','Structures','For Loop')+'，N 接 <code>10</code>。',
 '迴圈裡放 '+fn('Programming','Numeric','Random Number (0-1)')+'，再 × 10，假裝是 DAQmx Read 讀到的電壓（0～10）。有擷取卡時換成 DAQmx Read.vi（Analog DBL 1Chan 1Samp），迴圈外先 DAQmx Start Task。',
 '前面板放一個 Numeric Control 叫 <code>Threshold</code>，端子拉進迴圈。',
 fn('Programming','Comparison','Greater?')+'：<b>Threshold 接上面</b>（x）、讀值接<b>下面</b>（y）。',
 '讀值再拉一條線穿過迴圈右邊框，通道右鍵 ▸ Tunnel Mode ▸ <b>Conditional</b>，把 Greater? 的輸出接到 ?。',
 '通道輸出 Create ▸ Indicator。Threshold 設 5 執行：陣列裡全是小於 5 的數，個數每次不一樣（0～10 個）。',
 '把 Greater? 的兩條線對調再執行：陣列變成大於 5 的數。'
]},
C.h3('測','q','小測驗'),
{quiz:[
 {q:'Greater? 上面接讀值 7、下面接 Threshold 5，輸出？',o:['True','False'],a:0,ex:'上 x = 7、下 y = 5，7 > 5。'},
 {q:'這題的 VI 跑完，陣列有幾個元素？',o:['一定 10 個','一定 1 個','不一定，0～10 個','一定 0 個'],a:2,ex:'迴圈 10 圈，條件通道只收 True 的圈，所以 0～10 個。'},
 {q:'Subtract 上面接 3、下面接 10，結果？',o:['−7','7','13'],a:0,ex:'x − y = 3 − 10。'},
 {q:'想收「大於等於」閾值的讀值，最直接的改法？',o:['讀值接上面、Threshold 接下面，函式換成 Greater Or Equal?','只把函式換成 Greater Or Equal?','加一個 Not'],a:0,ex:'只換函式還是 Threshold ≥ 讀值，收到的是小於等於。'}
]}
]});
})();
