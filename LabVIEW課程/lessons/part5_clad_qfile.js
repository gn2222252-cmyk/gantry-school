/* CLAD 考題解析：迴圈每 500 ms 處理一筆，停止後把全部資料寫進檔案（C17）
   原題題目文字被截掉，這裡用最常見的要求帶入：全部資料、停止後寫一次、檔案已存在要先詢問。
   B（Shift Register + Concatenate Strings）與 D（Last Value）在 LabVIEW 2026 實測：labview_vi/_build/build_q_collect.py
   （三圈各產生 "0;" "1;" "2;"：B → "0;1;2;"，D → "2;"）。C 的 Concatenate Strings 接字串陣列照 LabVIEW 說明。 */
(function(){
const L=window.LESSONS,fn=C.fn,ctl=C.ctl;
const {tip,warn,note,PART}=C.clad;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function collectLab(d){
  d.innerHTML=`<div class="fig qcol"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">選項 ${'ABCD'.split('').map(k=>`<button class="btn" data-o="${k}">${k}</button>`).join(' ')}
    <label style="margin-left:10px"><input type="checkbox" class="exists" checked> 檔案已經存在</label></div>
    <div style="display:flex;gap:8px;align-items:center;margin:10px 0"><button class="btn pri run">▶ 跑一圈（500 ms）</button><button class="btn stop">■ 按停止</button><button class="btn reset">重來</button><span class="it" style="font-size:14px"></span></div>
    <div class="out"></div></div>`;
  const $=s=>d.querySelector(s);let opt='B',i=0,stopped=false,log=[],sr='',arr=[],last='',file=null,dialogs=0;
  function reset(){i=0;stopped=false;log=[];sr='';arr=[];last='';file=$('.exists').checked?'（舊內容）':null;dialogs=0;draw();}
  function run(){
    if(stopped)return;const s=`資料${i};`;
    if(opt==='A'){dialogs++;file=s;log.push(`第 ${i} 圈：PROCESS 產生 <code>${s}</code>，Write Text File 沒接路徑 → <b>跳出存檔對話框</b>（第 ${dialogs} 次），選了同一個檔案 → 檔案被覆蓋成 <code>${s}</code>`);}
    if(opt==='B'){sr=sr+s;log.push(`第 ${i} 圈：Concatenate Strings 把 <code>${s}</code> 接在 Shift Register 後面 → <code>${sr}</code>`);}
    if(opt==='C'){arr.push(s);log.push(`第 ${i} 圈：<code>${s}</code> 送到自動索引通道，累積成陣列 [${arr.map(x=>`"${x}"`).join(', ')}]`);}
    if(opt==='D'){last=s;log.push(`第 ${i} 圈：<code>${s}</code> 送到「最後一個值」通道，<b>蓋掉</b>上一圈的`);}
    i++;draw();
  }
  function stop(){
    if(stopped)return;stopped=true;
    if(opt==='A')log.push('按停止：迴圈結束。檔案只剩最後一圈的資料，而且使用者每 500 ms 就要點一次對話框。');
    if(opt==='B'){const ex=file!==null;dialogs++;log.push(`按停止：迴圈結束，Shift Register 的最後值 <code>${sr}</code> 送出迴圈 → Open/Create/Replace File 的 file path 沒接，跳出一次對話框選檔案 ${ex?'→ 檔案已存在，因為是 replace or create <b>with confirmation</b>，<b>再跳確認視窗</b>問要不要取代 → 使用者按「取代」':'→ 檔案不存在，直接建立'} → Write → Close。`);file=sr;}
    if(opt==='C'){dialogs++;const all=arr.join('');log.push(`按停止：通道送出整個陣列 → Concatenate Strings 把陣列接成一個字串 <code>${all}</code> → Write Text File 沒接路徑 → 跳出一次存檔對話框 → 寫入。沒有用 replace or create with confirmation，${$('.exists').checked?'檔案已存在時不保證先詢問':'這次檔案不存在所以沒差'}。`);file=all;}
    if(opt==='D'){dialogs++;log.push(`按停止：通道只有最後一圈的 <code>${last}</code> → 寫入。前面的資料都沒了。`);file=last;}
    draw();
  }
  function draw(){
    d.querySelectorAll('[data-o]').forEach(b=>b.classList.toggle('pri',b.dataset.o===opt));
    $('.it').textContent=stopped?'已停止':`已跑 ${i} 圈`;
    const ok=opt==='B';
    $('.out').innerHTML=`<ol style="font-size:14px;margin:0 0 8px;padding-left:20px">${log.map(l=>`<li>${l}</li>`).join('')}</ol>
      <p><b>檔案內容：</b><code>${esc(file===null?'（還沒有檔案）':file)}</code>　<b>跳出對話框：</b>${dialogs} 次</p>
      ${stopped?`<p class="${ok?'tip':'warn'}" style="margin:6px 0 0"><b>${ok?'✓ 符合題目':'✗ 不符合題目'}</b>${ok?'全部資料、停止後寫一次、檔案存在時先詢問。':opt==='A'?'每圈都問、每圈都覆蓋。':opt==='C'?'資料是全部的，但沒有「檔案已存在先詢問」的保證。':'只有最後一筆。'}</p>`:''}`;
  }
  d.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>{opt=b.dataset.o;reset();});
  $('.run').onclick=run;$('.stop').onclick=stop;$('.reset').onclick=reset;$('.exists').onchange=reset;
  reset();
}

L.push({id:'C17',order:117,no:'C17',part:PART,title:'考題解析：迴圈收集資料，停止後一次寫進檔案',mins:40,
goals:[['題目（帶入版）','需要寫一個 VI：每 500 ms 呼叫 PROCESS.vi 處理一筆資料，使用者按停止後，把<b>所有</b>資料一次寫進文字檔；如果檔案已經存在，要<b>先詢問使用者</b>是否取代。哪個 VI 滿足？'],
 ['答案','<b>B</b>：Shift Register + Concatenate Strings 累積每一圈的字串，迴圈結束後用 Open/Create/Replace File（<b>replace or create with confirmation</b>）開檔、寫一次、關檔。'],
 ['學會','迴圈裡怎麼「記住」每一圈的資料（Shift Register、自動索引通道）、最後一個值通道會丟資料、寫檔函式沒接路徑會跳對話框、operation 各選項的差別。']],
check:'能說出 A、C、D 各自哪裡不符合題目；能自己用 Shift Register 累積字串。',
body:[
note('關於題目：','原題的題目文字被截掉了，這裡用這類考題最常見的要求帶入。四個選項的行為不會變，題目要求不同時答案可能不同，下面「如果題目改成…」有整理。'),
C.h3('懂','','這題用到的功能'),
C.table(['功能','在哪','做什麼'],[
 ['While Loop＋停止按鈕',fn('Programming','Structures','While Loop'),'一直跑到使用者按 STOP（迴圈裡的紅色停止端子接 Boolean）'],
 ['Wait (ms)',fn('Programming','Timing','Wait (ms)'),'接 500：每圈至少等 500 ms'],
 ['PROCESS.vi','題目給的 SubVI','每呼叫一次產生一個字串（這一圈的資料）'],
 ['Shift Register','迴圈邊框右鍵 ▸ Add Shift Register','把這一圈的結果帶到下一圈（L5）。左邊要接初始值（這題接空字串）'],
 ['Concatenate Strings',fn('Programming','String','Concatenate Strings'),'把字串接起來。接<b>字串陣列</b>時，會把陣列裡的每一個接成一個字串'],
 ['自動索引／最後一個值通道','迴圈邊框的通道右鍵 ▸ Tunnel Mode','自動索引：每圈的值收成陣列；最後一個值（實心方塊）：只留最後一圈（C3、C15）'],
 ['Open/Create/Replace File',fn('Programming','File I/O','Open/Create/Replace File'),'開檔。operation 選 <b>replace or create with confirmation</b>：檔案已存在時跳出視窗問使用者；access 選 read/write'],
 ['Write to Text File',fn('Programming','File I/O','Write to Text File'),'寫字串。file 端子<b>沒接</b>時，每次執行都跳出存檔對話框，寫完自己關檔'],
 ['Close File',fn('Programming','File I/O','Close File'),'關檔'],
 ['error out',ctl('Modern','Array, Matrix & Cluster','Error Out 3D.ctl'),'顯示錯誤；錯誤線把開、寫、關串成固定順序']]),
C.h3('懂','','四個選項'),
C.table(['選項','資料怎麼出迴圈','怎麼寫檔','結果'],[
 ['A','Write Text File 放在<b>迴圈裡</b>','沒接路徑','每 500 ms <b>跳一次對話框</b>，而且每次覆蓋，最後只剩最後一圈 ✗'],
 ['<b>B</b>','<b>Shift Register</b> 每圈 Concatenate 接起來','迴圈後 Open（replace or create <b>with confirmation</b>，路徑用對話框選一次）→ Write → Close','全部資料、寫一次、檔案存在時<b>先詢問</b> ✓'],
 ['C','<b>自動索引</b>通道收成字串陣列，迴圈後 Concatenate 接成一個','迴圈後 Write Text File，沒接路徑','全部資料、跳一次對話框寫入；但<b>沒有「已存在先詢問」</b>的保證 ✗（題目沒這條件時也算對）'],
 ['D','<b>最後一個值</b>通道（實心方塊）','迴圈後 Write Text File','<b>只有最後一圈</b>的資料 ✗']]),
note('LabVIEW 實測：','我用 For Loop 跑 3 圈代替 While Loop＋停止，每圈產生 "0;"、"1;"、"2;" 代替 PROCESS.vi：B 的 Shift Register 最後是 <code>0;1;2;</code>，D 的最後一個值通道只有 <code>2;</code>。C（自動索引＋Concatenate Strings 接陣列）用 VI 腳本建出來一直無法執行，沒有找出原因，所以 C 的結果照 LabVIEW 說明寫，沒有實測。'),
C.h3('玩','','一圈一圈跑跑看'),
`<p>選一個選項，按「跑一圈」幾次，再按「停止」，看檔案最後是什麼、跳了幾次對話框。可以取消「檔案已經存在」比較 B 和 C。</p>`,
{fn:collectLab},
C.h3('懂','','如果題目改成…'),
C.table(['題目的要求','答案'],[
 ['只要「停止後把全部資料寫進檔案」','B、C 都可以（C 會用對話框問路徑）'],
 ['「每一圈都要寫進檔案」（即時記錄，當機也不會全丟）','四個都不理想。標準做法：<b>迴圈外開檔、迴圈內 Write、迴圈外關檔</b>（F4、C6）。A 雖然每圈寫，但每圈跳對話框又覆蓋'],
 ['「只要最後一筆」','D'],
 ['「不能跳出任何對話框」','都不行：要給 file path 常數或控制項']]),
tip('Shift Register 和自動索引怎麼選？','要的結果是<b>一個累積起來的值</b>（字串接起來、總和、最大值）用 Shift Register；要的是<b>每一圈的值排成陣列</b>就用自動索引通道。字串兩種都可以，自動索引出來再 Concatenate 一次就好。'),
C.h3('做','b','自己做一次：選項 B'),
{todo:[
 '方塊圖放 '+fn('Programming','Structures','While Loop')+'，停止端子右鍵 ▸ Create Control（STOP 按鈕）。',
 '迴圈裡放 '+fn('Programming','Timing','Wait (ms)')+'，接常數 <code>500</code>。',
 '代替 PROCESS.vi：放 '+fn('Programming','String','Format Into String')+'，format string 接 <code>資料%d;</code>，input 1 接迴圈的 <b>i</b>。',
 '迴圈右邊框右鍵 ▸ <b>Add Shift Register</b>。左邊的 Shift Register 外面接一個 '+fn('Programming','String','Empty String Constant')+'（空字串，當初始值）。',
 fn('Programming','String','Concatenate Strings')+'：上面接左邊 Shift Register（前幾圈累積的），下面接這一圈的字串，輸出接右邊 Shift Register。',
 '迴圈外：右邊 Shift Register 的輸出接 Write to Text File 的 <b>text</b>。',
 fn('Programming','File I/O','Open/Create/Replace File')+'：operation 右鍵 Create ▸ Constant 選 <b>replace or create with confirmation</b>；file path 不接（會用對話框問）或接一個路徑。',
 'refnum、error 依序接 Write to Text File → '+fn('Programming','File I/O','Close File')+'，最後 error out 接顯示器。',
 '執行，等幾秒按 STOP，用記事本打開檔案：所有的「資料0;資料1;…」都在。再執行一次存同一個檔：會先跳出確認視窗。'
]},
warn('Shift Register 一定要接初始值：','左邊不接空字串的話，第二次執行 VI 時 Shift Register 會留著上一次的內容，資料越來越長（這是 CLAD 常考的陷阱）。'),
C.h3('測','q','小測驗'),
{quiz:[
 {q:'Write to Text File 放在 While Loop 裡，file 端子沒接，跑 10 圈會怎樣？',o:['跳 10 次存檔對話框','只跳一次','錯誤'],a:0,ex:'file 沒接時每次執行都問路徑。'},
 {q:'迴圈輸出通道是實心方塊（Last Value），迴圈跑了 20 圈，通道外面拿到？',o:['第 20 圈的值','20 圈的值組成的陣列','第 1 圈的值'],a:0,ex:'最後一個值只留最後一圈。'},
 {q:'operation 選 replace or create with confirmation，檔案已存在時？',o:['跳出視窗問使用者要不要取代','直接覆蓋','錯誤 8'],a:0,ex:'with confirmation 就是會先問。replace or create 不問直接覆蓋。'},
 {q:'Shift Register 左邊沒接初始值，同一個 VI 連續執行兩次（不關閉），第二次的字串？',o:['會接在第一次的結果後面','從空字串開始','錯誤'],a:0,ex:'未初始化的 Shift Register 會保留上次執行結束時的值。'}
]}
]});
})();
