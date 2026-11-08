/* 第五部分 C：CLAD 證照（C9～C12）：設計模式、錯誤處理、圖表與 UI、DAQmx 與儀器控制 */
(function(){
const L=window.LESSONS,fn=C.fn,ctl=C.ctl,qd=C.qd,wt=C.wt;
const {tip,warn,note,PART}=C.clad;

/* ======================================================================
   C9 設計模式
   ====================================================================== */
const states=['Init','Wait','Run','Stop'];
const smFig={name:'State Machine',view:'split',ratio:1.4,
 fp:{w:260,h:220,items:[{id:'go',k:'btn',label:'Go',x:20,y:20},{id:'quit',k:'btn',label:'Quit',x:110,y:20},
  {id:'st',k:'str',label:'Current State',x:20,y:80,w:200},{id:'n',k:'num',label:'Runs',x:20,y:140,w:90}]},
 bd:{w:600,h:260,structs:[{id:'wl',k:'while',x:80,y:20,w:470,h:220},{id:'cs',k:'case',x:170,y:60,w:290,h:140,frames:states.map(s=>'"'+s+'"'),cur:2}],nodes:[
  {id:'k0',k:'const',t:'enum',v:'Init ▾',x:10,y:91},{id:'sr',k:'sr',t:'enum',s:'wl',y:100},{id:'sel',k:'sel',t:'enum',s:'cs',y:110},
  ...states.map((s,i)=>({id:'n'+i,k:'const',t:'enum',v:['Wait','Run','Wait','Stop'][i]+' ▾',x:340,y:91,f:'cs:"'+s+'"'})),
  {id:'tout',k:'tunnel',t:'enum',s:'cs',side:'r',y:100},
  {id:'lab',k:'label',text:'每一頁做一件事，\n再決定下一個狀態',x:200,y:140,w:130,h:36},
  {id:'eq',k:'fn',fn:'Equal?',x:480,y:160,showName:false},{id:'kst',k:'const',t:'enum',v:'Stop ▾',x:420,y:205},{id:'cond',k:'stop',s:'wl'}],
 wires:[{id:'w1',from:'k0',to:'sr.init',t:'enum'},{id:'w2',from:'sr.L',to:'sel',t:'enum',pts:[[130,100],[130,110]]},
  ...states.map((s,i)=>({id:'wn'+i,from:'n'+i,to:'tout.i',t:'enum',f:'cs:"'+s+'"'})),{id:'w3',from:'tout.o',to:'sr.R',t:'enum'},{id:'w4',from:'tout.o',to:'eq.x',t:'enum',mx:470},{id:'w5',from:'kst',to:'eq.y',t:'enum',mx:468},{id:'w6',from:'eq.out',to:'cond',t:'bool',pts:[[530,174],[530,218]]}]},
 sim:{period:600,init(){return {s:'Init',n:0};},step(i,st){const cur=st.s;let nx=cur;
   if(cur==='Init')nx='Wait';else if(cur==='Wait'){if(i.quit)nx='Stop';else if(i.go)nx='Run';}else if(cur==='Run'){st.n++;nx='Wait';}
   st.s=nx;return {out:{st:cur+' → '+nx,n:st.n},frames:{cs:states.indexOf(cur)},stop:cur==='Stop',msg:'目前狀態：'+cur+(cur==='Wait'?'（按 Go 或 Quit）':'')};},doneMsg:'進入 Stop 狀態，迴圈結束'}};
L.push({id:'C09',order:109,no:'C9',part:PART,title:'設計模式：State Machine、Producer/Consumer、QMH',mins:60,
goals:[['學會','State Machine、Event-driven State Machine、Producer/Consumer（資料、事件）、Queued Message Handler、Master/Slave、FGV 的用途與比較。'],['考試重點','看需求選模式：「依序且可分支的步驟」→ State Machine；「接收資料不能漏、處理比較慢」→ Producer/Consumer；「UI 不能卡」→ 事件 + Producer/Consumer。']],
check:'看到題目描述能選出正確的設計模式，並說出 State Machine 的三個零件。',
body:[
C.h3('懂','','State Machine（狀態機）'),
`<p>三個零件：<b>While Loop</b> + <b>Shift Register 存「下一個狀態」</b>（Type Def Enum）+ <b>Case Structure 每個狀態一頁</b>。每一頁做完自己的事，再輸出下一個狀態。和 PLC 的步進梯形圖是同一個概念。</p>`,
{lv:smFig,cap:'按 Run，再按 Go 會進 Run 狀態一次又回 Wait；按 Quit 進 Stop 結束迴圈。Case 頁會跟著目前狀態切換。'},
C.table(['設計模式','結構','適合','缺點'],[
 ['State Machine','While + Shift Register(Enum) + Case','流程有步驟、會依條件跳轉（測試流程、機台步序）','狀態只能一個一個來，不能排隊多個命令'],
 ['Event-driven State Machine','State Machine 的某個狀態裡放 Event Structure（或 Timeout 頁做其他狀態）','有 UI 的小程式','事件頁卡住時 UI 也卡'],
 ['Producer/Consumer（資料）','兩個迴圈 + Queue；生產者放資料、消費者處理','資料不能漏、處理比擷取慢（擷取 → 存檔）','Queue 無限長會吃記憶體'],
 ['Producer/Consumer（事件）','生產者是 Event Structure，把命令放進 Queue','UI 反應要快、工作要做很久（本課程 GT_Main 的概念）','—'],
 ['Queued Message Handler（QMH）','Queue 裡放「訊息名稱 + 資料」，消費者是 State Machine','中大型專案，多個模組互傳訊息','架構比較複雜'],
 ['Master/Slave','一個 Master 迴圈用 Notifier 通知多個 Slave','多個迴圈要同時對同一事件反應，舊資料可丟','Notifier 會丟資料'],
 ['FGV / Action Engine','Non-reentrant SubVI + 未初始化 Shift Register','共用資料、避免 race condition','動作要設計在 FGV 裡面']
]),
C.h3('測','q','小測驗'),
{quiz:[
 {q:'需求：DAQ 每 10 ms 擷取一筆，存檔有時會慢到 200 ms，資料一筆都不能漏。用哪種模式？',o:['State Machine','Producer/Consumer（資料）+ Queue','Master/Slave + Notifier','單一 While Loop'],a:1,ex:'Queue 緩衝，消費者慢也不會漏。'},
 {q:'State Machine 的「下一個狀態」存在哪裡？',o:['Local Variable','Shift Register','Global Variable','Queue'],a:1,ex:'Shift Register（Enum）。'},
 {q:'State Machine 的狀態最好用什麼型別？',o:['字串','Type Def Enum','DBL','Boolean'],a:1,ex:'Type Def Enum：新增狀態時所有常數一起更新，Case 頁籤顯示名稱。'},
 {q:'Master/Slave 模式中 Master 用什麼通知 Slave？',o:['Queue','Notifier','Local Variable','File'],a:1,ex:'Notifier 一對多。'},
 {q:'QMH 和簡單 State Machine 最大的差別？',o:['QMH 不能有 UI','QMH 可以把多個訊息排隊依序處理，也能從其他迴圈送訊息進來','QMH 不用迴圈','沒有差別'],a:1,ex:'訊息放在 Queue 裡，外部也能送入。'},
 {q:'有 UI 的程式，按鈕要立刻反應、但按下後的工作要跑 30 秒，最適合？',o:['事件 + Producer/Consumer','一個 Event Structure 裡直接做 30 秒工作','Global Variable','Sequence Structure'],a:0,ex:'事件頁只負責把命令放進 Queue，消費者慢慢做，UI 不卡。'}
]}
]});

/* ======================================================================
   C10 錯誤處理與除錯進階
   ====================================================================== */
L.push({id:'C10',order:110,no:'C10',part:PART,title:'錯誤處理進階：錯誤與警告、自訂錯誤、處理策略',mins:40,
goals:[['學會','錯誤和警告的差別、自動錯誤處理、Simple 與 General Error Handler、Merge Errors、自訂錯誤碼、錯誤處理策略。'],['考試重點','status = False 但 code ≠ 0 是「警告」；error in 有錯時大部分函式不執行，但 Close、Release 類的函式照樣執行。']],
check:'能分辨 status/code 的四種組合各代表什麼。',
body:[
C.h3('懂','','錯誤、警告、沒事'),
C.table(['status','code','意思'],[['False','0','沒事'],['False','≠ 0','<b>警告</b>：完成了但有事情要注意（例如第 13 課看到的 1073676294）'],['True','≠ 0','<b>錯誤</b>：失敗了'],['True','0','不正常的寫法（自訂錯誤要給碼）']]),
C.table(['工具','說明'],[
 ['Automatic error handling','VI Properties ▸ Execution 預設啟用：<b>error out 沒接線</b>的節點出錯時，跳出對話框並暫停。有接線就不會自動處理'],
 ['Simple Error Handler.vi','有錯就跳對話框（OK），通常放在程式最後'],
 ['General Error Handler.vi','可加自訂錯誤碼表、選擇對話框種類、清除特定錯誤'],
 ['Merge Errors','多條錯誤線合一，回報<b>第一個錯誤</b>（沒有錯誤時回報第一個警告）'],
 ['Clear Errors.vi','清掉錯誤（可指定特定錯誤碼）'],
 ['Error Cluster From Error Code.vi','用錯誤碼產生錯誤 Cluster'],
 ['Error Ring','下拉選單選錯誤碼，可帶參數'],
 ['自訂錯誤碼','<b>5000～9999</b> 和 <b>-8999～-8000</b> 保留給使用者；可用 Error Code Editor 做 -errors.txt 檔，讓 LabVIEW 顯示你的錯誤說明']
]),
C.h3('懂','','處理策略'),
`<ul><li><b>錯誤線串起來</b>：決定順序、出錯自動跳過後面（第 11 課）。</li>
<li><b>Close / Release 類函式出錯照樣執行</b>：VISA Close、Close File、Release Queue 在 error in 有錯時仍會關閉資源，避免資源洩漏。</li>
<li><b>迴圈裡的錯誤</b>：決定要停止迴圈（錯誤線接 Loop Condition）、重試（第 19 課重連）、還是記錄後清除繼續。</li>
<li><b>Shift Register 放錯誤線</b>：讓錯誤能延續到下一圈處理。</li>
<li>錯誤通常在最上層（主 VI）統一顯示，SubVI 只負責把錯誤正確傳出去。</li></ul>`,
C.h3('測','q','小測驗'),
{quiz:[
 {q:'error out 顯示 status = False、code = 1073676294，這代表？',o:['錯誤','警告','沒事','LabVIEW 當機'],a:1,ex:'status False + code 非 0 = 警告。'},
 {q:'VISA Read 的 error out 沒有接線，執行時逾時了，預設會？',o:['什麼都不發生','自動錯誤處理：跳出對話框並暫停','VI 斷掉','自動重試'],a:1,ex:'Automatic error handling 只對沒接線的 error out 生效。'},
 {q:'Merge Errors 有三個輸入：無錯誤、錯誤 A（code 7）、錯誤 B（code 42），輸出？',o:['錯誤 A','錯誤 B','兩個都有','無錯誤'],a:0,ex:'回報第一個錯誤（由上到下）。'},
 {q:'哪些錯誤碼範圍可以自訂？',o:['0～100','5000～9999 和 -8999～-8000','任何負數','只能用 NI 的碼'],a:1,ex:'這兩段保留給使用者。'},
 {q:'Close File 的 error in 有錯誤時，它會？',o:['不執行','照樣關閉檔案，並把錯誤傳出去','清除錯誤','跳出對話框'],a:1,ex:'釋放資源的函式在有錯時仍會執行。'}
]}
]});

/* ======================================================================
   C11 圖表與 UI
   ====================================================================== */
function chartDemo(d){
  d.innerHTML=`<div class="fig"><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:8px">
   <b>Waveform Chart 的三種 Update Mode：</b><label><input type="radio" name="cm" value="strip" checked> Strip Chart（預設）</label>
   <label><input type="radio" name="cm" value="scope"> Scope Chart</label><label><input type="radio" name="cm" value="sweep"> Sweep Chart</label>
   <button class="btn" data-a="clr">清除歷史</button></div>
   <canvas width="640" height="180" style="background:#111;border:1px solid #555;max-width:100%"></canvas>
   <div class="cap">每 50 ms 送一個點進 Chart（正弦波 + 雜訊）。Strip：從右邊進來往左捲；Scope：畫滿一格清掉重來；Sweep：像心電圖，紅線往右掃過去覆蓋舊資料。</div></div>`;
  const cv=d.querySelector('canvas'),ctx=cv.getContext('2d');let mode='strip',hist=[],t=0,sweepPos=0,scopeBuf=[];const W=160;
  d.querySelectorAll('input').forEach(r=>r.onchange=()=>{mode=r.value;hist=[];scopeBuf=[];sweepPos=0;});
  d.querySelector('[data-a=clr]').onclick=()=>{hist=[];scopeBuf=[];sweepPos=0;};
  const y=v=>90-v*70;
  const tm=setInterval(()=>{
    if(!document.body.contains(cv)){clearInterval(tm);return;}
    const v=Math.sin(t/8)*0.8+(Math.random()-.5)*0.25;t++;
    ctx.fillStyle='#111';ctx.fillRect(0,0,640,180);ctx.strokeStyle='#333';for(let i=0;i<=8;i++){ctx.beginPath();ctx.moveTo(i*80,0);ctx.lineTo(i*80,180);ctx.stroke();}
    ctx.strokeStyle='#4f4';ctx.beginPath();
    if(mode==='strip'){hist.push(v);if(hist.length>W)hist.shift();hist.forEach((p,i)=>{const x=(W-hist.length+i)*4;i?ctx.lineTo(x,y(p)):ctx.moveTo(x,y(p));});}
    else if(mode==='scope'){scopeBuf.push(v);if(scopeBuf.length>W)scopeBuf=[v];scopeBuf.forEach((p,i)=>{i?ctx.lineTo(i*4,y(p)):ctx.moveTo(i*4,y(p));});}
    else{if(hist.length<W)hist.push(v);else hist[sweepPos]=v;sweepPos=(sweepPos+1)%W;hist.forEach((p,i)=>{if(i===sweepPos)ctx.moveTo(i*4,y(p));else i?ctx.lineTo(i*4,y(p)):ctx.moveTo(i*4,y(p));});ctx.stroke();ctx.strokeStyle='#f44';ctx.beginPath();ctx.moveTo(sweepPos*4,0);ctx.lineTo(sweepPos*4,180);}
    ctx.stroke();
  },50);
}
L.push({id:'C11',order:111,no:'C11',part:PART,title:'Chart、Graph 與使用者介面',mins:50,
goals:[['學會','Waveform Chart 與 Graph 的差別、Chart 的更新模式與歷史長度、各種 Graph 接受的資料、多條曲線、常用 UI 技巧。'],['考試重點','Chart 一次加一個（或一段）點並保留歷史；Graph 每次重畫整個陣列；XY Graph 要 X、Y 兩個陣列。']],
check:'能說出 Waveform Graph、XY Graph、Waveform Chart 各接什麼資料。',
body:[
C.h3('懂','','Chart 和 Graph 的差別'),
C.table(['','Waveform Chart','Waveform Graph','XY Graph'],[
 ['資料來源','一次一個點（純量）或一小段（陣列），<b>接在歷史後面</b>','每次給整個陣列，<b>整張重畫</b>','每次給整組 X、Y 資料'],
 ['記憶','有歷史緩衝區，預設 <b>1024 點</b>（Chart History Length）','沒有歷史','沒有歷史'],
 ['通常放在','迴圈裡面','迴圈外面，或每圈畫一次完整資料','任意'],
 ['X 軸','點的序號（可設 dt）','x0 + i × dx','任意 X 值，不需等間距'],
 ['多條曲線','把多個純量 <b>Bundle</b> 成 Cluster；或 2D 陣列','<b>2D 陣列</b>（每列一條）或 Waveform 陣列','Cluster(X 陣列, Y 陣列) 組成陣列']
]),
{fn:chartDemo},
C.table(['Waveform Graph 接受的資料','說明'],[['1D 陣列','x0 = 0、dx = 1'],['Cluster (x0, dx, Y 陣列)','自訂起點和間隔'],['Waveform','t0、dt、Y'],['2D 陣列','每一列一條曲線（可右鍵 Transpose Array）'],['Waveform 陣列','多條曲線，各自有自己的 t0、dt']]),
C.h3('懂','','常用 UI 技巧'),
C.table(['需求','做法'],[
 ['改顏色、隱藏、反灰','Property Node（C8）：Visible、Disabled、BG Color'],
 ['分頁','Tab Control（第 18 課）'],
 ['把另一個 VI 的前面板嵌進來','SubPanel 控制項 + Invoke Node Insert VI'],
 ['程式啟動時把控制項恢復預設值','Invoke Node：Reinitialize All to Default（VI 層級）'],
 ['多條曲線的名稱','Plot Legend 拉長，或 Property Node Plot.Name'],
 ['大量資料畫圖很慢','降低更新頻率、減少點數（降採樣），或在 Defer Panel Updates 期間一次更新'],
 ['游標量測','Graph 右鍵 Visible Items ▸ Cursor Legend']
]),
C.h3('測','q','小測驗'),
{quiz:[
 {q:'While Loop 每圈產生一個溫度值，要畫出隨時間變化的曲線，最簡單的顯示元件？',o:['Waveform Graph','Waveform Chart','XY Graph','Intensity Graph'],a:1,ex:'Chart 每次加一個點並保留歷史。'},
 {q:'Waveform Chart 預設的歷史長度？',o:['100 點','1024 點','無限','10000 點'],a:1,ex:'可右鍵 Chart History Length 改。'},
 {q:'Chart 要同時畫三條曲線（每圈三個純量），要怎麼接？',o:['用 Build Array 組成陣列','用 Bundle 組成 Cluster','接三次','不行'],a:1,ex:'給 Chart 一個 Cluster 代表同一時刻的多條曲線；給陣列會被當成同一條曲線的多個點。'},
 {q:'X 值不是等間距（例如溫度對應壓力），要用？',o:['Waveform Chart','Waveform Graph','XY Graph','Waveform Chart 的 Sweep 模式'],a:2,ex:'XY Graph 接 Cluster(X 陣列, Y 陣列)。'},
 {q:'Waveform Graph 接一個 2D 陣列，預設會？',o:['畫一條很長的曲線','每一列畫一條曲線','錯誤','只畫第一列'],a:1,ex:'可右鍵 Transpose Array 改成每一行一條。'},
 {q:'哪一種 Chart 更新模式像心電圖一樣，用一條線掃過去覆蓋舊資料？',o:['Strip Chart','Scope Chart','Sweep Chart','History Chart'],a:2,ex:'Strip 捲動、Scope 清掉重畫、Sweep 掃描覆蓋。'}
]}
]});

/* ======================================================================
   C12 DAQmx 與儀器控制
   ====================================================================== */
const daqFig={name:'DAQmx 連續擷取的標準寫法',bd:{w:860,h:200,structs:[{id:'wl',k:'while',x:350,y:20,w:270,h:160}],nodes:[
  {id:'ch',k:'const',t:'str',v:'Dev1/ai0',x:10,y:30},
  {id:'cv',k:'fn',fn:'DAQmx Create Virtual Channel',x:80,y:30,name:'Create Channel'},
  {id:'tm',k:'fn',fn:'DAQmx Timing',x:170,y:30,name:'Timing (Sample Clock)'},
  {id:'mode',k:'const',t:'enum',v:'Continuous ▾',x:100,y:130},{id:'rate',k:'const',t:'dbl',v:1000,x:120,y:105},
  {id:'st',k:'fn',fn:'DAQmx Start Task',x:270,y:30,name:'Start'},
  {id:'rd',k:'fn',fn:'DAQmx Read',x:420,y:30,name:'Read (N samples)'},{id:'k100',k:'const',t:'i32',v:100,x:370,y:120},
  {id:'gr',k:'ind',t:'dbl[]',label:'Waveform Chart',x:530,y:56},{id:'cond',k:'stop',s:'wl'},
  {id:'sp',k:'fn',fn:'DAQmx Stop Task',x:650,y:30,name:'Stop'},{id:'cl',k:'fn',fn:'DAQmx Clear Task',x:730,y:30,name:'Clear'},{id:'seh',k:'fn',fn:'Simple Error Handler',x:805,y:36,showName:false}],
 wires:[{id:'w1',from:'ch',to:'cv.physical channels',t:'str'},{id:'w2',from:'cv.task out',to:'tm.task/channels in',t:'clu'},{id:'w3',from:'cv.error out',to:'tm.error in',t:'err'},
  {id:'w4',from:'rate',to:'tm.rate',t:'dbl',mx:160},{id:'w5',from:'mode',to:'tm.sample mode',t:'enum',mx:162},
  {id:'w6',from:'tm.task out',to:'st.task/channels in',t:'clu'},{id:'w7',from:'tm.error out',to:'st.error in',t:'err'},
  {id:'w8',from:'st.task out',to:'rd.task/channels in',t:'clu'},{id:'w9',from:'st.error out',to:'rd.error in',t:'err'},{id:'w10',from:'k100',to:'rd.number of samples per channel',t:'i32',mx:405},
  {id:'w11',from:'rd.data',to:'gr',t:'dbl[]'},{id:'w12',from:'rd.error out',to:'cond',t:'err',pts:[[480,80],[480,148]]},
  {id:'w13',from:'rd.task out',to:'sp.task/channels in',t:'clu'},{id:'w14',from:'rd.error out',to:'sp.error in',t:'err',mx:640},
  {id:'w15',from:'sp.task out',to:'cl.task/channels in',t:'clu'},{id:'w16',from:'sp.error out',to:'cl.error in',t:'err'},{id:'w17',from:'cl.error out',to:'seh',t:'err'}]}};
L.push({id:'C12',order:112,no:'C12',part:PART,title:'硬體：DAQmx 擷取與儀器控制',mins:60,
goals:[['學會','MAX、DAQmx 的 Task/Channel/Timing、有限與連續擷取、取樣率與緩衝區、類比輸入接法、儀器控制（GPIB/Serial/USB/Ethernet）、VISA、儀器驅動程式。'],['考試重點','DAQmx 的呼叫順序、連續擷取每次讀多少、緩衝區溢位錯誤的原因、VISA 資源名稱、Instrument Driver 的好處。']],
check:'能默寫 DAQmx 連續擷取的六個步驟。',
body:[
C.h3('懂','','NI MAX（Measurement & Automation Explorer）'),
C.table(['功能','用途'],[['Devices and Interfaces','看到接上的 DAQ 卡、GPIB、序列埠；Self-Test、Reset'],['Test Panels','不用寫程式直接量一次，確認接線'],['Simulated Device','沒有硬體時建立模擬 DAQ 卡，程式照寫（就像本課程的軟 PLC）'],['Data Neighborhood / Tasks','在 MAX 裡預先建立 DAQmx Task'],['Scales','把電壓換算成工程單位']]),
C.h3('懂','','DAQmx 的六個步驟'),
{lv:daqFig,cap:'Create Channel → Timing → Start →（迴圈）Read → Stop → Clear → 錯誤處理。Task 線和錯誤線一路串。'},
C.table(['名詞','意思'],[
 ['Physical Channel','硬體腳位，例如 Dev1/ai0'],['Virtual Channel','腳位 + 設定（量程、接法、單位）'],['Task','一組 Channel + 時序 + 觸發'],
 ['Sample Clock','取樣率（每秒幾點）'],['Finite Samples','擷取固定點數就結束'],['Continuous Samples','一直擷取，資料存進<b>緩衝區</b>，程式要持續讀'],
 ['DAQ Assistant','Express VI，對話框設定（快但彈性小）']
]),
warn('緩衝區溢位','連續擷取時，如果迴圈讀得比硬體寫得慢，緩衝區會滿，出現錯誤 <b>-200279</b>（應用程式沒跟上）。解法：每次多讀一些（常用取樣率的 1/10，也就是每 100 ms 讀一次）、迴圈裡不要做慢的事（存檔交給另一個迴圈：Producer/Consumer）。'),
C.table(['取樣與接線','重點'],[
 ['Nyquist','取樣率至少是訊號最高頻率的 <b>2 倍</b>才不會失真（混疊）；實務上 5～10 倍'],
 ['Differential','兩條線相減，抗雜訊最好，用掉兩個通道'],
 ['RSE（Referenced Single-Ended）','以 DAQ 的地為參考；訊號源浮接時用'],
 ['NRSE','以 AI SENSE 為參考；訊號源本身接地時可用'],
 ['量程（min/max value）','設得越接近實際範圍，解析度越好']
]),
C.h3('懂','','儀器控制'),
C.table(['介面','VISA 資源名稱例子','說明'],[
 ['GPIB','GPIB0::12::INSTR','傳統儀器匯流排，位址 0～30'],['Serial（RS-232/422/485）','ASRL3::INSTR（COM3）','要設定鮑率、資料位、同位、停止位、終止字元（本課程第 12 課）'],
 ['USB（USBTMC）','USB0::0x0957::0x1798::MY123::INSTR','—'],['Ethernet（LXI）','TCPIP0::192.168.1.10::INSTR','也可用 ::SOCKET 直接 TCP（本課程軟 PLC）']
]),
`<ul><li><b>VISA</b> 讓不同介面用同一組函式（Open、Write、Read、Close），換介面只改資源名稱。</li>
<li><b>SCPI</b> 是儀器的標準文字命令，例如 <code>*IDN?</code> 問儀器型號、<code>*RST</code> 重設。</li>
<li><b>Instrument Driver</b>：廠商或 NI 寫好的一組 VI（Initialize、Configure、Read、Close），不用自己查命令。用 <b>Help ▸ Find Instrument Drivers</b>（NI Instrument Driver Network, IDNet）下載，會放到 instr.lib，出現在 Instrument I/O ▸ Instrument Drivers。</li>
<li>讀不到資料最常見的原因：終止字元（\\n 或 \\r）設錯、byte count 不對、逾時太短。</li></ul>`,
C.h3('測','q','小測驗'),
{quiz:[
 {q:'DAQmx 連續擷取的正確順序？',o:['Read → Create → Start → Clear','Create Channel → Timing → Start → Read（迴圈）→ Stop → Clear','Start → Create → Read → Stop','Timing → Read → Create → Clear'],a:1,ex:'建立、時序、開始、讀、停止、清除。'},
 {q:'連續擷取時出現錯誤 -200279，最可能的原因？',o:['接線錯誤','程式讀得太慢，緩衝區溢位','取樣率太低','沒有 Start'],a:1,ex:'應用程式沒跟上硬體寫入的速度。'},
 {q:'要量一個最高 1 kHz 的訊號而不混疊，取樣率至少？',o:['500 Hz','1 kHz','2 kHz','10 Hz'],a:2,ex:'Nyquist：至少 2 倍。'},
 {q:'沒有實體 DAQ 卡，想先寫程式測試，怎麼辦？',o:['不行','在 MAX 建立 Simulated Device','用 Global Variable 代替','改用 Express VI'],a:1,ex:'模擬裝置會產生假資料，程式完全一樣。'},
 {q:'VISA 資源名稱 "GPIB0::5::INSTR" 代表？',o:['COM5','GPIB 介面卡 0 上位址 5 的儀器','USB 第 5 台','TCP 埠 5'],a:1,ex:'介面::位址::INSTR。'},
 {q:'使用 Instrument Driver 的主要好處？',o:['速度更快','不用自己查儀器的命令，有現成的 Initialize/Configure/Read/Close VI','不需要 VISA','可以不接線'],a:1,ex:'驅動程式底層通常也是 VISA。'},
 {q:'抗雜訊最好的類比輸入接法？',o:['RSE','NRSE','Differential','Pseudodifferential'],a:2,ex:'差動接法兩線相減，共模雜訊被消掉。'},
 {q:'問儀器「你是誰」的 SCPI 命令是？',o:['*RST','*IDN?','*CLS','MEAS?'],a:1,ex:'*IDN? 回傳廠牌、型號、序號、韌體版本。'}
]}
]});
})();
