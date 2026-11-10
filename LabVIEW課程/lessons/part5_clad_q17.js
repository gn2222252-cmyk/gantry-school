/* CLAD 考題解析：Waveform Graph 畫多條線要給 2D 陣列（C14）
   四個選項在 LabVIEW 2026 實際建出來跑過：labview_vi/_build/build_q17.py → Q17_Two_Plots.vi，
   兩個 1D DBL 控制項代替「Basic Function Generator + Get Waveform Components」（各 1000 點、5 週期與 1 週期）。 */
(function(){
const L=window.LESSONS,fn=C.fn,ctl=C.ctl;
const {tip,warn,note,PART}=C.clad;
const N=1000,S5=Array.from({length:N},(_,i)=>Math.sin(2*Math.PI*5*i/N)),S1=Array.from({length:N},(_,i)=>Math.sin(2*Math.PI*i/N)),Z=Array(N).fill(0);
const RES={
 A:{rows:[S5.map((v,i)=>v+S1[i])],shape:'1D，1000 個',why:'Add 把兩個陣列<b>逐點相加</b>，變成一個 1D 陣列 → 只有 <b>1 條線</b>，而且是兩個波疊在一起的形狀，振幅會到 2。'},
 B:{rows:[S5,S1],shape:'2D，2 列 × 1000',why:'Build Array（沒有勾 Concatenate Inputs）把兩個 1D 疊成 2D：第 0 列是 5 週期、第 1 列是 1 週期。Waveform Graph 收到 2D，<b>每一列畫一條線</b> → Plot 0、Plot 1。'},
 C:{rows:[S5,Z,Z],shape:'2D，3 列 × 1000',why:'Initialize Array 先做出 2 列 × 1000 個 0。Insert Into Array 是<b>插入</b>，不是取代：在第 0 列插入一列，原本的 2 列 0 被往下擠 → 變成 3 列，多出<b>平平的 0 線</b>。'},
 D:{rows:[S5,S1],shape:'2D，2 列 × 1000',why:'先做 2 列 × 1000 個 0，Replace Array Subset 把<b>第 0 列換成 5 週期、第 1 列換成 1 週期</b>，大小不變 → 和 B 一模一樣的 2D 陣列。'}};

function graphLab(d){
  d.innerHTML=`<div class="fig q17"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">選項 ${'ABCD'.split('').map(k=>`<button class="btn" data-o="${k}">${k}</button>`).join(' ')}<span class="shape" style="margin-left:8px;font-size:14px"></span></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px"><canvas width="560" height="230" style="background:#101418;border-radius:6px;max-width:100%"></canvas><div class="leg" style="font-size:13px"></div></div>
    <p class="why" style="margin:8px 0 0"></p></div>`;
  const cv=d.querySelector('canvas'),g=cv.getContext('2d'),COL=['#f2f2f2','#ff4d4d','#4dd2ff','#ffd24d'];
  function draw(o){
    d.querySelectorAll('[data-o]').forEach(b=>b.classList.toggle('pri',b.dataset.o===o));
    const r=RES[o],W=cv.width,H=cv.height,pad=30,ymax=2;
    g.clearRect(0,0,W,H);g.strokeStyle='#2c3a2c';g.lineWidth=1;
    for(let k=0;k<=4;k++){const y=pad/2+(H-pad)*k/4;g.beginPath();g.moveTo(pad,y);g.lineTo(W-6,y);g.stroke();}
    for(let k=0;k<=5;k++){const x=pad+(W-pad-6)*k/5;g.beginPath();g.moveTo(x,pad/2);g.lineTo(x,H-pad/2);g.stroke();g.fillStyle='#8a94a6';g.font='10px sans-serif';g.fillText(String(k*200),k===5?x-24:x-8,H-3);}
    g.fillStyle='#8a94a6';['2','1','0','-1','-2'].forEach((t,k)=>g.fillText(t,6,pad/2+(H-pad)*k/4+4));
    r.rows.forEach((row,ri)=>{g.strokeStyle=COL[ri%COL.length];g.lineWidth=1.6;g.beginPath();
      row.forEach((v,i)=>{const x=pad+(W-pad-6)*i/(N-1),y=pad/2+(H-pad)*(ymax-v)/(2*ymax);i?g.lineTo(x,y):g.moveTo(x,y);});g.stroke();});
    d.querySelector('.leg').innerHTML=r.rows.map((_,i)=>`<div><span style="display:inline-block;width:22px;height:3px;background:${COL[i%COL.length]};vertical-align:middle;border:1px solid #888"></span> Plot ${i}</div>`).join('');
    const ok=o==='B'||o==='D';
    d.querySelector('.shape').innerHTML=`接到 Waveform Graph 的資料：<b>${r.shape}</b> → <b>${r.rows.length} 條線</b> ${ok?'<span style="color:#15803d">✓ 和題目的圖一樣</span>':'<span style="color:#b91c1c">✗ 和題目的圖不一樣</span>'}`;
    d.querySelector('.why').innerHTML=r.why;
  }
  d.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>draw(b.dataset.o));
  draw('B');
}

L.push({id:'C14',order:114,no:'C14',part:PART,title:'考題解析：Waveform Graph 畫兩條線（Build Array、Replace、Insert）',mins:35,
goals:[['題目','Waveform Graph 上有兩條線：Plot 0 是 5 個週期、Plot 1 是 1 個週期，橫軸 0～1000。哪個 VI 會產生這個輸出？'],
 ['答案','<b>B</b>（Build Array）。<b>D</b>（Replace Array Subset）在 LabVIEW 實測產生的陣列和 B 完全相同，也會畫出這張圖；A、C 不會。'],
 ['學會','Waveform Graph 收 1D 畫一條、收 2D 每列畫一條；Build Array 疊列、Replace Array Subset 換列、Insert Into Array 插列的差別。']],
check:'能說出 A 為什麼只有一條線、C 為什麼會多出 0 的線；能自己用 Build Array 做出兩條線的 Waveform Graph。',
body:[
C.h3('懂','','這題用到的功能'),
C.table(['功能','在哪','做什麼'],[
 ['Basic Function Generator.vi（圖上的 Sine Wave 方塊）',fn('Signal Processing','Waveform Generation','Basic Function Generator.vi'),'產生一段波形。signal type 選 Sine Wave、frequency 接 5 或 1。取樣設定不接時預設每秒 1000 點、共 1000 點 → 1 秒的資料，frequency 5 就是 5 個週期'],
 ['Get Waveform Components（圖上的 ~Y 方塊）',fn('Programming','Waveform','Get Waveform Components'),'把 Waveform 拆開，只拿出 <b>Y</b>（1000 個數的 1D DBL 陣列）'],
 ['Add',fn('Programming','Numeric','Add'),'兩個陣列<b>逐點相加</b>，結果還是 1D'],
 ['Build Array',fn('Programming','Array','Build Array'),'把兩個 1D 疊成 2D（每個輸入變一列）。勾 Concatenate Inputs 才會接成一條長的 1D'],
 ['Initialize Array',fn('Programming','Array','Initialize Array'),'做出指定大小、全部同一個值的陣列。往下拉成兩個 dimension size：2 和 1000 → 2 列 × 1000 個 0'],
 ['Insert Into Array',fn('Programming','Array','Insert Into Array'),'在指定位置<b>插入</b>，陣列會<b>變大</b>'],
 ['Replace Array Subset',fn('Programming','Array','Replace Array Subset'),'把指定位置<b>換掉</b>，陣列大小<b>不變</b>。可以往下拉，一次換好幾組'],
 ['Waveform Graph',ctl('Modern','Graph','Waveform Graph'),'1D 陣列 → 1 條線；<b>2D 陣列 → 每一列 1 條線</b>（Plot 0、Plot 1、…）；橫軸是索引 0～999']]),
C.h3('玩','','切換選項，看 Graph 畫出什麼'),
{fn:graphLab},
C.h3('懂','','LabVIEW 實際跑出來的結果'),
`<p>我在 LabVIEW 2026 把四個選項接在同一個 VI，用 1000 點的 5 週期、1 週期正弦波當輸入：</p>`,
C.table(['選項','輸出','線','和題目的圖'],[
 ['A　Add','1D、1000 個（兩個波逐點相加）','1 條','✗'],
 ['<b>B　Build Array</b>','2D、2 × 1000：第 0 列 5 週期、第 1 列 1 週期','2 條','<b>✓</b>'],
 ['C　Initialize + Insert Into Array','2D、3 × 1000：5 週期、0、0','3 條（兩條是平的 0）','✗'],
 ['<b>D　Initialize + Replace Array Subset</b>','2D、2 × 1000：和 B 完全相同','2 條','<b>✓</b>']]),
note('B 和 D 都對？','LabVIEW 實測兩個的輸出陣列一模一樣。考卷如果只能選一個，通常是 B：最簡單、不用先建一個全是 0 的陣列。D 的寫法在「陣列大小固定、只換其中幾列」時才有優勢（例如在迴圈裡用 Shift Register 反覆更新同一個陣列，不會一直配置新記憶體）。'),
`<div class="fig"><div style="font-size:13px;font-weight:700;margin-bottom:6px">真實 LabVIEW：四個選項接在同一個 VI（由上到下 C、D、A、B）</div><img src="assets/real/Q17_Two_Plots.png" alt="四個選項的方塊圖" style="max-width:100%"><div class="cap">為了能自動測試，兩個正弦波用控制項代替（Sine 5、Sine 1）。下載：<a href="vi/LV2018/Q17_Two_Plots.vi" download>Q17_Two_Plots.vi（LabVIEW 2018）</a></div></div>`,
C.h3('做','b','自己做一次：選項 B'),
{todo:[
 '開新 VI。前面板放 '+ctl('Modern','Graph','Waveform Graph')+'。',
 '方塊圖放 '+fn('Signal Processing','Waveform Generation','Basic Function Generator.vi')+'。<b>signal type</b> 右鍵 ▸ Create ▸ Constant，選 <code>Sine Wave</code>；<b>frequency</b> 接常數 <code>5</code>。',
 fn('Programming','Waveform','Get Waveform Components')+'：signal out 接進來，拉出 <b>Y</b>（1D DBL）。',
 '再複製一組（Ctrl + 拖曳），frequency 改 <code>1</code>。',
 fn('Programming','Array','Build Array')+'：往下拉成 2 個輸入。上面接 5 週期的 Y、下面接 1 週期的 Y。輸出是雙線（2D）。',
 'Build Array 的輸出接 Waveform Graph。執行：Plot 0 是 5 週期（上面那個輸入），Plot 1 是 1 週期。',
 '試試：Build Array 右鍵勾 <b>Concatenate Inputs</b>，Graph 變成一條 2000 點的線（兩段接起來）。再取消勾選。',
 '試試 D 的寫法：'+fn('Programming','Array','Initialize Array')+' 往下拉成兩個 dimension size（2、1000），element 接 <code>0</code>（DBL）→ '+fn('Programming','Array','Replace Array Subset')+'，往下拉成兩組：index (row) 0 接 5 週期、index (row) 1 接 1 週期。結果和 B 一樣。'
]},
warn('Graph 的線順序：','Plot 0 永遠是 2D 陣列的第 0 列。Build Array 上面的輸入就是第 0 列。上下接反，紅白兩條線的顏色就會對調。'),
C.h3('測','q','小測驗'),
{quiz:[
 {q:'Waveform Graph 接一個 3 × 500 的 2D DBL 陣列，會畫出什麼？',o:['3 條線，每條 500 點','500 條線，每條 3 點','1 條 1500 點的線'],a:0,ex:'2D 陣列每一列一條線。要反過來，先 Transpose 2D Array。'},
 {q:'Build Array 勾了 Concatenate Inputs，接兩個 1000 點的 1D，輸出是？',o:['1D、2000 個','2D、2 × 1000','2D、1000 × 2'],a:0,ex:'Concatenate 是接成一條，不是疊起來。'},
 {q:'Insert Into Array 和 Replace Array Subset 最大的差別？',o:['Insert 會讓陣列變大，Replace 大小不變','Replace 會讓陣列變大','兩個一樣'],a:0,ex:'C 選項就是因為「插入」多了一列 0。'},
 {q:'兩個 1000 點的 1D 陣列接到 Add，Waveform Graph 會畫幾條線？',o:['1 條','2 條','錯誤'],a:0,ex:'Add 是逐點相加，結果還是 1D。'}
]}
]});
})();
