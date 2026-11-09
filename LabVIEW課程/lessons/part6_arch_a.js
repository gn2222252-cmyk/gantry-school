/* 第六部分 A：拆解 13_PLC 檢測分選機上位機（A1～A3）
   全貌、QMH、四個迴圈的架構 */
(function(){
const L=window.LESSONS,fn=C.fn,ctl=C.ctl,qd=C.qd,wt=C.wt;
const PART='13_PLC 架構拆解';
const tip=(t,s)=>`<div class="tip"><b>${t}</b>${s}</div>`;
const warn=(t,s)=>`<div class="warn"><b>${t}</b>${s}</div>`;
const note=(t,s)=>`<div class="note"><b>${t}</b>${s}</div>`;
const why=(t,s)=>`<div class="why"><b>${t}</b>${s}</div>`;

/* ---------- 共用：真實截圖（可加標註框） ---------- */
C.p13img=(file,title,cap,marks,minw)=>{
  const m=(marks||[]).map(k=>`<div style="position:absolute;left:${k[0]}%;top:${k[1]}%;width:${k[2]}%;height:${k[3]}%;border:3px solid ${k[5]||'#e11d48'};border-radius:6px;pointer-events:none"><span style="position:absolute;left:-3px;top:-26px;background:${k[5]||'#e11d48'};color:#fff;font-size:14px;font-weight:700;padding:1px 8px;border-radius:4px;white-space:nowrap">${k[4]}</span></div>`).join('');
  return `<div class="fig"><div style="font-size:13px;font-weight:700;margin-bottom:6px">${title}</div><div style="overflow-x:auto"><div style="position:relative;min-width:${minw||0}px;margin-top:${marks&&marks.length?'26px':'0'}"><img src="assets/real/${file}" alt="${title}" style="width:100%;display:block">${m}</div></div><div class="cap">${cap||''}</div></div>`;
};

/* ---------- 共用：架構方塊圖（SVG） ---------- */
C.arch=(cfg)=>{
  const W=cfg.w,H=cfg.h,B={};let s='';
  const col={loop:'#1f6feb',plc:'#b45309',ext:'#6b7280',data:'#0b8a5f',sub:'#7c3aed'};
  (cfg.boxes||[]).forEach(b=>{B[b.id]=b;const c=col[b.k||'loop']||b.k;
    s+=`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="${b.fill||'#fff'}" stroke="${c}" stroke-width="${b.k==='data'?1.5:2.5}" ${b.k==='data'?'stroke-dasharray="5 3"':''}/>`;
    s+=`<text x="${b.x+b.w/2}" y="${b.y+20}" text-anchor="middle" font-weight="700" font-size="14" fill="${c}">${b.t}</text>`;
    (b.sub||[]).forEach((l,i)=>s+=`<text x="${b.x+b.w/2}" y="${b.y+40+i*17}" text-anchor="middle" font-size="12.5" fill="#1d2330">${l}</text>`);
  });
  const pt=(id,side)=>{const b=B[id];return side==='l'?[b.x,b.y+b.h/2]:side==='r'?[b.x+b.w,b.y+b.h/2]:side==='t'?[b.x+b.w/2,b.y]:[b.x+b.w/2,b.y+b.h];};
  (cfg.arrows||[]).forEach(a=>{
    const p=[a.p0||pt(a.from,a.fs||'r'),...(a.pts||[]),a.p1||pt(a.to,a.ts||'l')];
    const c=a.c||'#334155';
    s+=`<polyline points="${p.map(q=>q.join(',')).join(' ')}" fill="none" stroke="${c}" stroke-width="${a.wd||2}" ${a.dash?'stroke-dasharray="6 4"':''} marker-end="url(#ah${c.replace('#','')})"/>`;
    if(a.l){const m=a.lp||[(p[0][0]+p[p.length-1][0])/2,(p[0][1]+p[p.length-1][1])/2-6];
      String(a.l).split('\n').forEach((t,i)=>s+=`<text x="${m[0]}" y="${m[1]+i*15}" text-anchor="middle" font-size="12" fill="${c}" style="paint-order:stroke;stroke:#fff;stroke-width:4px">${t}</text>`);}
  });
  (cfg.notes||[]).forEach(n=>s+=`<text x="${n[0]}" y="${n[1]}" font-size="12" fill="${n[3]||'#5c6577'}" ${n[4]?'text-anchor="'+n[4]+'"':''}>${n[2]}</text>`);
  const cols=[...new Set((cfg.arrows||[]).map(a=>a.c||'#334155'))];
  const defs=cols.map(c=>`<marker id="ah${c.replace('#','')}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${c}"/></marker>`).join('');
  return `<div class="fig"><div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${H}" style="width:100%;min-width:${cfg.minw||640}px;display:block;font-family:var(--font)"><defs>${defs}</defs>${s}</svg></div>${cfg.cap?`<div class="cap">${cfg.cap}</div>`:''}</div>`;
};

/* ======================================================================
   A1：全貌
   ====================================================================== */
const tree=`Host_Main.vi                         主程式：4 個迴圈
├─ host\\Host_Init.vi                  開機：載入機種、開伺服、回原點、開相機、MES 開批
│   ├─ reuse\\…\\Load_Recipe.vi         讀機種檔（Recipe.ctl）
│   ├─ reuse\\…\\Inst_Open.vi           開伺服的 VISA（TCP 5030）
│   ├─ reuse\\…\\Axis_Cmd.vi ×3         ALMCLR → SVON 1 → HOME
│   ├─ reuse\\…\\Axis_WaitInPos.vi      等到位
│   └─ reuse\\…\\MES_Post.vi            POST /api/lot/start
├─ host\\Host_CommStep.vi              【通訊迴圈】一圈的工作
│   ├─ driver\\PLC_Open.vi              TCP 或 COM 開連線，送 ENQ 確認 PLC 在
│   ├─ driver\\PLC_ReadWords.vi ×2      讀 D300×16、D400×4
│   ├─ driver\\PLC_WriteWord.vi         寫心跳、寫佇列裡的命令
│   │   ├─ driver\\PLC_Frame.vi         加 STX、ETX、校驗碼
│   │   └─ driver\\PLC_Xfer.vi          VISA Write → VISA Read
│   └─ driver\\PLC_Close.vi
├─ host\\Host_Edge.vi                  【檢測迴圈】b0 上升緣／下降緣
├─ reuse\\…\\Do_Inspect_R.vi            【檢測迴圈】取像 + 三項檢查
│   ├─ Camera_Grab.vi、Inspect_Pins.vi、Inspect_Width.vi、Inspect_Surface.vi
│   └─ Axis_Cmd.vi、Axis_WaitInPos.vi   伺服移到檢測位置
├─ host\\Host_LogLine.vi → reuse\\12_Log\\Log_Part.vi   CSV 生產紀錄
├─ host\\Host_AxisInit.vi              【檢測迴圈】進步序 20 時重做伺服復歸
├─ host\\Host_ToSnapshot.vi → LineView\\LV_DrawLine.vi  【UI 迴圈】畫動線
├─ host\\Host_Lookup.vi ×2             【UI 迴圈】步序、警報代碼 → 文字
├─ host\\Host_Writes.vi                【UI 迴圈】按鈕 → 寫入佇列
├─ host\\Host_Params.vi                【UI 迴圈】D530～D532 參數
├─ reuse\\…\\MES_Flush.vi               【MES 迴圈】上傳，失敗留著重送
├─ host\\Host_ErrOnly.vi ×5            只顯示真錯誤
└─ host\\Host_Exit.vi                  結束：MES 結批、關伺服、關相機`;

L.push({id:'A01',order:31,no:'A1',part:PART,title:'先看全貌：13_PLC 這支程式在做什麼、檔案怎麼分',mins:50,
goals:[['學會','讀一個陌生大專案的順序：說明 → 前面板 → 呼叫樹 → 迴圈 → 追一條資料。'],['看懂','13_PLC 的分工：PLC 管機台順序，LabVIEW 管檢測、畫面、MES；每個資料夾放什麼。'],['用在','後面 A2～A9 每一課都會回到這一課的地圖。']],
check:'不看講義，能說出 Host_Main 的 4 個迴圈各做什麼，以及 D100、D300、D510、D511、D520 是誰寫、誰讀。',
body:[
note('這一部分在學什麼','前面 1～21 課你自己從零寫了雙龍門的上位機。這一部分反過來：<b>拆一個已經寫好、測試通過的完整專案</b>（家裡：桌面 <code>labview檢測分選機模擬訓練\\13_PLC</code>；學校包：<code>實作環境\\13_PLC_2018</code>，LabVIEW 2018 打得開），看懂它怎麼組裝，最後學會自己規劃大架構。每一課都附真實方塊圖截圖，和可以按的模擬。'),
note('學校能做到哪裡','學校可以打開所有 VI 看方塊圖、單獨 Run 小的 SubVI（Host_Edge、Host_Lookup、Host_Params…）。要讓 Host_Main 整套跑起來，需要用 Python 開 <code>softplc\\softplc.py</code> 和 <code>periph\\periph_sim.py</code>（模擬 PLC、相機、伺服、MES），學校電腦沒裝 Python 就在家做。'),
C.h3('懂','','這台機器和程式的分工'),
`<p>13_PLC 是一台<b>檢測分選機</b>的上位機：輸送帶把零件送到相機下，夾住、拍照、檢查針腳／寬度／表面，好的送出口，壞的推進 NG 料盒。</p>`,
C.table(['誰','負責','為什麼是它'],[
 ['<b>PLC</b>（FX3S，梯形圖）','機台的動作順序：輸送帶、擋料、夾爪、推料、警報、急停','掃描時間固定、斷電或 PC 當機時機台也會安全停下。順序寫在 <code>ladder\\AOI_PLC_source.il</code>'],
 ['<b>LabVIEW</b>（Host_Main.vi）','檢測（取像＋判斷）、畫面、按鈕、參數、MES 上傳、CSV 紀錄','影像處理、網路、畫面是 PC 擅長的'],
 ['<b>Python 模擬</b>','在家沒有機台時代替：<code>softplc</code> 代替 PLC、<code>periph</code> 代替相機／伺服／MES','讓你在家就能把整套跑起來測試']]),
why('關鍵觀念','LabVIEW 和 PLC 之間<b>只透過 D 暫存器說話</b>。LabVIEW 不直接開關輸送帶，它只寫「D100 = 1（啟動）」，PLC 自己決定怎麼動。這叫「上位機／下位機」分工。'),
C.h3('懂','','D 暫存器地圖：兩邊說話的語言'),
C.table(['方向','位址','內容','LabVIEW 哪裡用'],[
 ['LabVIEW → PLC','D100','命令：1 啟動、2 停止、3 復歸、4 清料盒、5 模擬料盒滿。PLC 做完寫回 0','UI 迴圈的按鈕'],
 ['LabVIEW → PLC','D510','檢測結果：1 OK、2 NG、3 伺服異常','檢測迴圈'],
 ['LabVIEW → PLC','D511','檢測完成旗標（交握，A5 課）','檢測迴圈'],
 ['LabVIEW → PLC','D520','心跳：每 100 ms +1。PLC 2 秒沒看到變化 → 警報 9006','通訊迴圈'],
 ['LabVIEW → PLC','D530～D532','速度 %、檢測逾時、NG 料盒容量','UI 迴圈（只在 Idle 寫）'],
 ['LabVIEW → PLC','D550','訓練用故障注入：bit0 急停、bit1 夾爪卡住','UI 迴圈'],
 ['PLC → LabVIEW','D300','目前步序（30 Idle、70 Inspect、900 Error…）','UI 顯示、Exit 判斷'],
 ['PLC → LabVIEW','D301','警報代碼','UI 顯示'],
 ['PLC → LabVIEW','D302','狀態位元：<b>b0 請求檢測</b>、b3 停止請求中…','檢測迴圈、UI'],
 ['PLC → LabVIEW','D303～D305','感測器、輸出映像','動線圖'],
 ['PLC → LabVIEW','D306','要檢測的零件 ID','檢測迴圈'],
 ['PLC → LabVIEW','D310～D313','總數、OK、NG、料盒數量','UI 顯示'],
 ['PLC → LabVIEW','D400～D403','輸送帶上零件：有無、ID、位置、判定','動線圖']]),
`<p>通訊迴圈每圈讀 D300 起 16 個、D400 起 4 個，接成 20 個字，再加 1 個「連線狀態」= <b>21 個 U16 的陣列</b>。之後所有迴圈拿到的都是這個陣列：<b>索引 0 = D300、索引 16 = D400、索引 20 = 連線旗標</b>。</p>`,
C.h3('懂','','資料夾地圖'),
C.table(['資料夾','放什麼','你要不要改'],[
 ['<code>Host_Main.vi</code>','主程式','看'],
 ['<code>host\\</code>','主程式專用的 SubVI，名字都是 <code>Host_</code> 開頭','看，練習時可以改副本'],
 ['<code>driver\\</code>','PLC 通訊驅動，<code>PLC_</code> 開頭。只有它知道 FX 協定','看'],
 ['<code>LineView\\</code>','動線圖（Picture 控制項的繪圖）','看'],
 ['<code>reuse\\</code>','從舊專案（07_QMH、08_Alarm、10 MES、12_Log）<b>複製過來重用</b>的 VI','看'],
 ['<code>ladder\\</code>','PLC 梯形圖原始碼與說明','PLC 課'],
 ['<code>softplc\\</code>、<code>periph\\</code>','Python 模擬器','照說明啟動就好'],
 ['<code>tests\\</code>、<code>REPORTS\\</code>','自動測試與測試報告','參考'],
 ['<code>build_*.py</code>','用腳本產生 VI 的程式（開發用）','不用管']]),
tip('命名規則就是架構','檔名前綴 = 所在層：<code>PLC_</code> 驅動層、<code>Host_</code> 主程式層、<code>LV_</code> 畫面、<code>MB_</code>/<code>Axis_</code>/<code>Inspect_</code> 舊專案的設備層。看到名字就知道它在哪一層、可以呼叫誰。<b>上層呼叫下層，下層不知道上層</b>：PLC_ReadWords 不知道什麼是「檢測」，Host_CommStep 不知道 FX 封包長怎樣。'),
C.h3('看','r','呼叫樹（VI Hierarchy）'),
`<p>在 LabVIEW 打開 Host_Main.vi，<b>View ▸ VI Hierarchy</b> 會畫出下面這棵樹。下面是文字版，標了每個 SubVI 屬於哪個迴圈：</p><pre style="background:#f6f8fa;border-radius:8px;padding:12px;overflow-x:auto;font-size:13.5px;line-height:1.5">${tree}</pre>`,
C.h3('看','r','前面板'),
C.p13img('P13_Host_Main_fp.png','Host_Main.vi 前面板（Idle 狀態）','上面是動線圖（Picture），下面依功能分區：SETUP 設定、STATUS 狀態、OPERATION 操作、TRAINING 故障練習、INSPECTION 檢測結果、ALARM TABLE、MES，最下面是 4 個錯誤顯示。前面板文字全英文，因為學校是英文版 LabVIEW。',
 [[0,0,89,38,'動線圖'],[0,38,18,24,'SETUP'],[18.3,38,26,24,'STATUS'],[45,38,21.6,11,'OPERATION'],[45,49.3,21.6,13,'TRAINING'],[67,38,22,24,'INSPECTION'],[45,63,44,20,'MES','#0b8a5f'],[0,84.5,77,15,'錯誤顯示','#7c3aed']],700),
C.h3('看','r','方塊圖：4 個迴圈'),
C.p13img('P13_Host_Main_bd.png','Host_Main.vi 方塊圖（LabVIEW 2026 匯出，原圖很大，可以左右捲動）','4 個 While Loop 同時跑。左邊 Obtain Queue／Obtain Notifier 建立傳遞工具，右邊 Release 和 Host_Exit 收尾。A3 課會一個一個講。',
 [[1.8,0,18,7.6,'① MES 迴圈','#0b8a5f'],[26.8,6.6,27,11.6,'② 通訊迴圈'],[26.8,19.6,59.5,46.2,'③ UI 迴圈','#b45309'],[26.8,67,71,29.5,'④ 檢測迴圈','#7c3aed'],[0,87,23,6,'Host_Init + 路徑','#334155']],1600),
C.h3('做','b','讀一個陌生大程式的 5 步'),
C.table(['步驟','做什麼','LabVIEW 工具'],[
 ['1 看說明','先讀 <code>Host_Main_說明.md</code>：怎麼操作、迴圈表、SubVI 表','—'],
 ['2 看前面板','按鈕和顯示 = 這支程式的「功能清單」','—'],
 ['3 看呼叫樹','知道有哪些零件、誰呼叫誰','View ▸ VI Hierarchy；SubVI 右鍵 ▸ Find ▸ Callers'],
 ['4 數迴圈','方塊圖縮小，先數有幾個 While Loop，每個迴圈「在等什麼」（Wait、Dequeue、Wait on Notification）','Ctrl+滑鼠滾輪縮放'],
 ['5 追一條資料','挑一個值（例如 Start 按鈕），從控制項追到它最後寫進 PLC','點一下線會選整條；按 Ctrl+E 在前面板／方塊圖切換；Highlight Execution（燈泡）；Probe']]),
{todo:[
 '打開 <code>13_PLC_2018\\Host_Main_說明.md</code>（學校）或 <code>13_PLC\\</code>（家裡），讀「程式結構」那一段。',
 '用 LabVIEW 打開 Host_Main.vi，<b>不要按 Run</b>，先 View ▸ VI Hierarchy 看呼叫樹。',
 'Ctrl+E 到方塊圖，縮小，找到 4 個 While Loop，各在等什麼？（答案在 A3）',
 '在 Start 按鈕的端子上點線，跟著走：Or → And → Host_Writes。打開 Host_Writes 看它把 Start 變成什麼數字。',
 '選做：照說明開 softplc 和 periph 模擬器，按 Run，再按 Start，看動線圖動起來。'
]},
C.h3('測','q','小測驗'),
{quiz:[
 {q:'13_PLC 裡，輸送帶什麼時候該停，是誰決定的？',o:['LabVIEW 的狀態機','PLC 的梯形圖','MES'],a:1,ex:'機台順序在 PLC。LabVIEW 只寫命令（D100）和檢測結果（D510/D511）。'},
 {q:'21 個字的陣列，索引 2 是什麼？',o:['D302 狀態位元','D320','連線旗標'],a:0,ex:'索引 0～15 = D300～D315，所以索引 2 = D302。索引 16～19 = D400～D403，索引 20 = 連線旗標。'},
 {q:'哪個資料夾的 VI 知道 FX 協定的封包長怎樣？',o:['host','driver','reuse'],a:1,ex:'只有驅動層（PLC_ 開頭）知道協定。上層只呼叫「讀 D300 起 16 個」。'},
 {q:'D520 心跳停止變化 2 秒會怎樣？',o:['LabVIEW 自動重連','PLC 發 9006 警報停機','沒事'],a:1,ex:'這是 PLC 對上位機的保護：上位機當掉，機台不會繼續亂跑。'},
 {q:'想知道 Host_Edge.vi 被誰呼叫，最快的方法？',o:['一個一個打開 VI 找','在 Host_Edge 的圖示上右鍵 ▸ Find ▸ Callers（或看 VI Hierarchy）','重新寫一個'],a:1,ex:'VI Hierarchy 和 Find Callers 是讀大專案最常用的工具。'}
]}
]});

/* ======================================================================
   A2：QMH 從零開始
   ====================================================================== */
const qmhStates=[
 ['開機','Init','開設備、載入機種、MES 開批'],
 ['待機','Idle','等 Start'],
 ['生產','RequestPart','向上游要料'],['生產','WaitEntry','等零件進入'],['生產','WaitInPos','等零件到擋料位'],['生產','WaitClamp','等夾爪夾好'],
 ['生產','Inspect','取像、檢測（呼叫 Do_Inspect_R）'],['生產','Release','放開夾爪、擋料'],['生產','WaitRelease','等放開'],['生產','WaitSort','等零件到分選位'],
 ['生產','DeliverOK','OK 送出口'],['生產','WaitExit','等出口感測'],['生產','WaitExitClear','等出口清空'],
 ['生產','PushNG','NG 推料'],['生產','WaitPushExt','等推料伸出'],['生產','WaitPushRet','等推料縮回'],
 ['清線','PurgeStart','復歸後清線開始'],['清線','PurgeRun','輸送帶空轉'],['清線','PurgePush','把殘料推掉'],['清線','PurgePushRet','等推料縮回'],['清線','PurgeEnd','清線完成'],
 ['異常','Error','記錄警報、輸出 OFF'],['異常','AlarmWait','等 Reset'],
 ['其他','Pause','暫停（保留下一個狀態）'],['其他','Done','結批、關設備、結束']];

L.push({id:'A02',order:32,no:'A2',part:PART,title:'QMH 從零開始：用 10 MES.vi 看懂「訊息 + 狀態機」',mins:90,files:['我的QMH骨架.vi'],
goals:[['學會','State Machine 的限制、QMH 的三個零件（生產者、訊息佇列、消費者）、怎麼新增一個訊息、怎麼正確結束。'],['看懂','13_PLC 的前身 10 MES.vi：25 個狀態、Decode_Cmd 解訊息、MES 迴圈。'],['做出','自己的 QMH 骨架，按按鈕送訊息、狀態機處理、Exit 正常結束。']],
check:'自己的 QMH 骨架：按 Start 狀態列會從 Idle 依序跑到 Inspect 再回來；生產中按 Pause 會停住、Resume 繼續；Exit 兩個迴圈都停、沒有錯誤對話框。',
body:[
note('先修','CLAD 的 <a href="#C09">C9 設計模式</a> 講過 State Machine 和 QMH 的定義；第 <a href="#L16">16 課</a> 寫過雙迴圈 + Queue。這一課用真實專案把它們接起來。'),
C.h3('懂','','第 1 步：State Machine 能做什麼、卡在哪'),
`<p>機台的動作是一連串「做一件事 → 等條件 → 做下一件事」。這正好是 <b>State Machine</b>：While Loop + Shift Register 存「下一個狀態」（Enum）+ Case Structure 每個狀態一頁。</p>
<p>07_QMH 之前的版本（06_Auto）就是一個大狀態機。問題是：<b>按鈕要在哪裡讀？</b></p>`,
C.table(['做法','問題'],[
 ['每個狀態頁都去讀 Start/Stop/Exit 按鈕','25 個狀態 × 5 個按鈕，到處重複；漏一個就按了沒反應'],
 ['只在 Idle 讀按鈕','生產中按 Stop、Exit 沒反應'],
 ['某個狀態在等（例如等夾爪 3 秒）','這段時間按鈕沒人看，按了可能被吃掉（Latch 按鈕被讀一次就彈回）']]),
why('QMH 的想法','把「<b>收命令</b>」和「<b>做事</b>」分成兩個迴圈：一個迴圈專門收按鈕，把按鈕變成<b>訊息</b>（例如字串 "Start"）放進<b>佇列（Queue）</b>；另一個迴圈是狀態機，有空時從佇列拿訊息出來處理。佇列會排隊，<b>訊息不會掉</b>。'),
C.h3('懂','','第 2 步：QMH 的三個零件'),
C.arch({w:900,h:260,minw:700,boxes:[
 {id:'ui',x:20,y:60,w:230,h:120,t:'① 生產者：UI 迴圈',sub:['Event Structure 等按鈕','按鈕 → 訊息字串','Enqueue Element']},
 {id:'q',x:330,y:85,w:210,h:70,k:'data',t:'② 訊息佇列（String）',sub:['"Start" "Pause" "Exit"…']},
 {id:'sm',x:620,y:40,w:260,h:160,t:'③ 消費者：狀態機迴圈',sub:['Dequeue（逾時 0，不等）','有訊息 → 改旗標／下一狀態','Case：做目前狀態的事','Shift Register 存下一狀態']}],
 arrows:[{from:'ui',to:'q',l:'Enqueue'},{from:'q',to:'sm',l:'Dequeue'}],
 notes:[[20,225,'UI 迴圈平常閒著，按鈕一按立刻反應'],[620,225,'狀態機自己決定什麼時候看訊息']],
 cap:'生產者只負責「把事情說出來」，消費者負責「照順序做」。兩個迴圈速度不同也沒關係，佇列在中間緩衝。'}),
C.h3('看','r','第 3 步：真實的 QMH：10 MES.vi'),
`<p>13_PLC 的 <code>reuse</code> 資料夾裡那些 VI，都是從 <code>10 MES Folder-2\\10 MES.vi</code> 這個 QMH 專案複製來的。先看它的整體：</p>`,
C.p13img('P13_10MES_QMH_bd.png','10 MES.vi 方塊圖（原圖很大，可以左右捲動）','上面小迴圈：Event Structure（生產者），只有 Initialize 等事件，送出 "INIT" 之類的訊息。中間大迴圈：狀態機（消費者），黃色 Case 就是 25 個狀態，現在顯示 "Inspect" 頁。左下迴圈：MES 上傳（另一個消費者，自己的佇列）。最右邊：關閉 Modbus、相機連線。',
 [[35.5,0,15.5,13.4,'① 生產者：Event 迴圈'],[34,26,48,74,'③ 消費者：狀態機迴圈','#1f6feb'],[41,28.5,23,32.5,'目前顯示 "Inspect" 狀態','#7c3aed'],[2.4,37.7,27.6,13.4,'MES 迴圈','#0b8a5f'],[40,84,3,5,'Decode_Cmd','#b45309'],[85,30,15,6,'收尾：關連線','#334155']],1700),
`<p>狀態機的 Enum（<code>State.ctl</code>，Type Def）有 25 個狀態，分 5 群：</p>`,
C.table(['群','狀態','做什麼'],qmhStates.map(s=>[s[0],`<code>${s[1]}</code>`,s[2]])),
tip('看出來了嗎','「生產」那 14 個狀態，就是 13_PLC 梯形圖步序 40～120 的前身。13_PLC 把這整段<b>搬去 PLC</b>，LabVIEW 只剩「Inspect」那一頁的工作（取像、檢測）。A3 會講為什麼。'),
C.h3('看','r','第 4 步：Decode_Cmd.vi：消費者怎麼拿訊息'),
C.p13img('P13_Decode_Cmd.png','Decode_Cmd.vi（10 MES／13_PLC reuse 裡都有）','左邊 Queue in → Dequeue Element，timeout 接 <b>0</b>：佇列空的就立刻回來（Msg 是空字串），狀態機不會被卡住。拿到的字串和 "Pause"、"Resume"、"Start"、"Exit"、"CycleStop" 比較，變成旗標。下面還把實體按鈕 DI 17/18/19 做上升緣（現在值 AND NOT 上次值），和訊息 OR 在一起。'),
C.table(['輸出','意思'],[['PausedNow／PausedNext','這一圈要不要暫停、下一圈呢'],['StartCmd','軟體 Start 或實體 Start 鈕'],['ExitReq out','一旦收到 Exit 就一直是 True（OR 上次的值 = 閂鎖）'],['CycleStopReq','做完這顆再停'],['ResetPB','實體 Reset 鈕上升緣']]),
warn('Dequeue 逾時接多少？','消費者如果<b>沒事做時才看訊息</b>（純 QMH），逾時接 −1（一直等）或一個值都可以。10 MES 的狀態機<b>一直有事做</b>（要輪詢感測器），所以接 0：有訊息就拿，沒有就繼續跑狀態，<b>絕對不能卡在 Dequeue</b>。'),
C.h3('玩','x','第 5 步：QMH 模擬：訊息怎麼排隊'),
`<p>左邊按鈕 = 生產者送訊息；中間 = 佇列；右邊 = 狀態機每 0.6 秒跑一圈（一圈：先 Dequeue 一個訊息，再做目前狀態）。試試：</p>
<ol><li>按 Start，看狀態一路跑。</li><li>生產中連按 3 次 Pause、Resume、CycleStop，看佇列排隊、一個一個被拿走。</li><li>勾「Inspect 很慢」，在 Inspect 時狂按，訊息會排隊但<b>一個都不會掉</b>。</li><li>按 Exit。</li></ol>`,
{fn:qmhSim},
C.h3('做','b','第 6 步：自己寫 QMH 骨架'),
`<p>在 LabVIEW 開新 VI <code>我的QMH骨架.vi</code>。這是以後寫任何機台程式都能用的起手式。</p>`,
C.arch({w:900,h:330,minw:720,boxes:[
 {id:'ob',x:10,y:130,w:120,h:70,k:'data',t:'Obtain Queue',sub:['型別：字串']},
 {id:'ui',x:170,y:20,w:330,h:120,t:'While：UI 迴圈',sub:['Event Structure','"Start": Value Change → Enqueue "Start"','"Exit": Value Change → Enqueue "Exit"，停止']},
 {id:'sm',x:170,y:180,w:560,h:130,t:'While：狀態機迴圈',sub:['Dequeue（timeout 0）→ Case（訊息）：改「下一狀態」或旗標','Case（狀態 Enum）：Idle / RequestPart / … / Inspect / Done','Shift Register：狀態、旗標、計數','Done 狀態 → 停止迴圈']},
 {id:'rq',x:770,y:200,w:120,h:70,k:'data',t:'Release Queue',sub:['兩個迴圈都停後']}],
 arrows:[{from:'ob',to:'ui',fs:'t',ts:'l',pts:[[70,80]]},{from:'ob',to:'sm',fs:'b',ts:'l',pts:[[70,245]]},{from:'sm',to:'rq'},{from:'ui',to:'rq',fs:'r',ts:'t',pts:[[830,80]],dash:true,l:'錯誤線串過去\n（確保順序）',lp:[640,70]}],
 cap:'Queue 參照線（青綠色粗線）分兩條：一條給 UI 迴圈 Enqueue，一條給狀態機 Dequeue。'}),
{todo:[
 '前面板：OK Button 三個 <code>Start</code>、<code>Pause</code>、<code>Exit</code>（Mechanical Action 用預設的 Latch When Released）；String Indicator <code>State</code>；Numeric <code>Parts</code>。',
 '做狀態 Enum：前面板放 '+ctl('Modern','Ring & Enum','Enum')+'，右鍵 Edit Items 加 Idle、RequestPart、Inspect、Release、Done。右鍵 ▸ Make Type Def，存成 <code>我的State.ctl</code>。以後改狀態只改這一個檔，所有常數一起更新。',
 '方塊圖：'+fn('Data Communication','Synchronization','Queue Operations','Obtain Queue')+qd('Obtain Queue')+'，element data type 接一個空字串常數。',
 '上面放 While Loop + '+fn('Programming','Structures','Event Structure')+'。右鍵 Edit Events：Start Value Change、Pause Value Change、Exit Value Change。按鈕端子<b>放在自己的事件頁裡</b>（Latch 按鈕才會彈回）。',
 '每個事件頁：'+fn('Data Communication','Synchronization','Queue Operations','Enqueue Element')+'，element 接 "Start"／"Pause"／"Exit"。Exit 頁再接 True 到迴圈停止條件。',
 '下面放 While Loop，左邊放兩個 Shift Register：狀態（初始常數 Idle）、Parts（初始 0）。',
 '迴圈裡：Dequeue Element（timeout 接 <b>0</b>）→ Case Structure（selector 接 element 字串）。加頁 "Start"：如果目前是 Idle → 下一狀態 RequestPart。"Exit"：下一狀態 Done。Default 頁（含空字串 = 沒訊息）：狀態不變。',
 '再放一個 Case Structure，selector 接狀態 Enum，右鍵 Add Case for Every Value。每頁做事並輸出下一狀態：RequestPart → Inspect → Release → RequestPart（Parts+1）；Done 頁接 True 到停止條件。',
 '狀態頁裡放 Wait (ms) 300，假裝在做事。狀態 Enum 也接 '+fn('Programming','String','Number/String Conversion','Format Into String')+' 或直接把 Enum 接 String 的地方（右鍵 Create Indicator）顯示目前狀態。',
 '兩個迴圈都結束後：Release Queue。<b>它的 error in 接狀態機迴圈出來的錯誤線</b>，確保它最後才執行。',
 'Run：按 Start → 狀態依序跑；按 Pause（下一課再實作 Pause 頁）；按 Exit → 兩個迴圈都停。'
]},
C.h3('懂','','新增一個訊息要改哪裡（QMH 的好處）'),
C.table(['要加的功能','改哪裡','不用改'],[
 ['新按鈕「Cycle Stop」','UI 迴圈加一個事件頁 Enqueue "CycleStop"；消費者訊息 Case 加一頁設旗標；Release 狀態看旗標決定回 Idle 或 RequestPart','其他狀態頁'],
 ['新狀態「Purge」','State.ctl 加一個值（所有常數自動更新），狀態 Case 加一頁','UI 迴圈'],
 ['別的迴圈也想下命令（例如 MES 迴圈收到停線）','拿同一個 Queue 參照 Enqueue "CycleStop"','狀態機完全不用改']]),
C.h3('錯','','常見錯誤'),
C.table(['症狀','原因','解法'],[
 ['按鈕按了沒反應','Latch 按鈕端子放在 Event Structure 外面，沒被讀到所以不會彈回','端子放進自己的事件頁'],
 ['狀態機卡住不動','Dequeue 逾時接 −1，佇列空的時候一直等','狀態機要一直輪詢時接 0'],
 ['結束時跳錯誤 1122','Release Queue 太早執行，另一個迴圈還在 Dequeue','Release 的 error in 接最後結束那個迴圈的錯誤線'],
 ['字串訊息打錯字（"Strat"）都沒反應','字串比對不會報錯，進了 Default','訊息名稱寫成常數集中管理，或改用 Enum 訊息'],
 ['加了新狀態，舊常數沒更新','Enum 沒做成 Type Def','右鍵 Make Type Def，常數都從 .ctl 來']]),
C.h3('測','q','小測驗'),
{quiz:[
 {q:'QMH 的三個零件是？',o:['生產者迴圈、訊息佇列、消費者狀態機','兩個 Sequence 和一個 Global','Event Structure、Notifier、Formula Node'],a:0,ex:'生產者送訊息，佇列排隊，消費者照順序處理。'},
 {q:'10 MES 的 Decode_Cmd 用 Dequeue timeout = 0，原因是？',o:['讓狀態機不被佇列卡住，沒訊息就繼續跑狀態','比較省 CPU','LabVIEW 規定'],a:0,ex:'狀態機要一直輪詢感測器，所以不能等訊息。'},
 {q:'生產中連按 3 次 Pause，佇列會？',o:['只留最後一個','依序排 3 個，一個都不會掉','直接丟掉'],a:1,ex:'Queue 是先進先出，不會覆蓋。這是和 Notifier 最大的差別（A3）。'},
 {q:'新增狀態最安全的做法？',o:['在每個 Enum 常數手動加','改 Type Def 的 State.ctl','改成 String'],a:1,ex:'Type Def 一改，所有常數和 Case 選擇器都更新。'},
 {q:'Release Queue 的 error in 為什麼要接迴圈出來的錯誤線？',o:['為了顯示錯誤','資料流：讓它等迴圈結束後才執行','沒有原因'],a:1,ex:'沒接的話它一開始就執行，佇列被釋放，迴圈立刻出錯停止。'},
 {q:'13_PLC 的 PLC 梯形圖步序 40～120 對應 10 MES 的哪一群狀態？',o:['開機','生產（RequestPart～WaitPushRet）','異常'],a:1,ex:'生產順序從 LabVIEW 狀態機搬到 PLC。'}
]}
]});

function qmhSim(d){
  const SEQ=['RequestPart','WaitEntry','WaitInPos','WaitClamp','Inspect','Release','WaitRelease','WaitSort','DeliverOK','WaitExit'];
  d.innerHTML=`<div class="fig" style="font-size:14px">
  <div style="display:grid;grid-template-columns:minmax(150px,1fr) minmax(170px,1.2fr) minmax(220px,1.6fr);gap:12px">
   <div style="border:2px solid #1f6feb;border-radius:8px;padding:8px"><b style="color:#1f6feb">① 生產者（UI）</b><div class="bt" style="display:flex;flex-direction:column;gap:6px;margin-top:6px"></div>
    <label style="display:block;margin-top:8px;font-size:13px"><input type="checkbox" class="slow"> Inspect 很慢（3 秒）</label></div>
   <div style="border:2px dashed #0b8a5f;border-radius:8px;padding:8px"><b style="color:#0b8a5f">② 訊息佇列</b><div class="q" style="min-height:120px;display:flex;flex-direction:column;gap:4px;margin-top:6px"></div><div style="font-size:12px;color:#5c6577">上面先出（先進先出）</div></div>
   <div style="border:2px solid #b45309;border-radius:8px;padding:8px"><b style="color:#b45309">③ 消費者（狀態機）</b>
    <div style="margin:6px 0">目前狀態：<b class="st" style="font-family:var(--mono);font-size:16px"></b></div>
    <div style="font-size:13px">旗標：<span class="fl"></span>　零件數：<b class="np">0</b></div>
    <div class="lg" style="font-family:var(--mono);font-size:12px;background:#f6f8fa;border-radius:6px;padding:6px;height:150px;overflow:auto;margin-top:6px"></div></div>
  </div></div>`;
  const s={st:'Init',q:[],paused:false,cstop:false,exit:false,n:0,wait:0,done:false,i:0};
  const bt=d.querySelector('.bt');
  ['Start','Pause','Resume','CycleStop','Exit'].forEach(m=>{const b=document.createElement('button');b.className='btn';b.textContent=m;b.onclick=()=>{if(!s.done){s.q.push(m);draw();}};bt.appendChild(b);});
  const rb=document.createElement('button');rb.className='btn';rb.textContent='重來';rb.onclick=()=>{Object.assign(s,{st:'Init',q:[],paused:false,cstop:false,exit:false,n:0,wait:0,done:false,i:0});d.querySelector('.lg').innerHTML='';draw();};bt.appendChild(rb);
  const log=t=>{const l=d.querySelector('.lg');l.innerHTML+=`<div>#${s.i} ${t}</div>`;l.scrollTop=1e6;};
  function draw(){
    d.querySelector('.q').innerHTML=s.q.length?s.q.map((m,k)=>`<div style="background:${k?'#ecfdf3':'#bbf7d0'};border:1px solid #86efac;border-radius:4px;padding:2px 8px;font-family:var(--mono)">"${m}"</div>`).join(''):'<div style="color:#9ca3af">（空的）</div>';
    d.querySelector('.st').textContent=s.st+(s.paused?'（Paused）':'');
    d.querySelector('.fl').textContent=[s.cstop?'CycleStop':'',s.exit?'Exit':''].filter(Boolean).join(', ')||'—';
    d.querySelector('.np').textContent=s.n;
  }
  function tick(){
    if(!document.body.contains(d)){clearInterval(t);return;}
    if(s.done)return;
    s.i++;
    if(s.st==='Init'){s.st='Idle';log('Init：開設備、MES 開批（先做完才開始看訊息）→ Idle');draw();return;}
    if(s.wait>0){s.wait--;log(`${s.st} 還在做…（這圈沒看佇列）`);draw();return;}
    const m=s.q.shift();
    if(m){log(`Dequeue → "${m}"`);
      if(m==='Pause')s.paused=true;else if(m==='Resume')s.paused=false;else if(m==='CycleStop')s.cstop=true;else if(m==='Exit')s.exit=true;
      else if(m==='Start'){if(s.st==='Idle'){s.st='RequestPart';s.cstop=false;log('　Idle → RequestPart');}else log('　不是 Idle，Start 忽略');}}
    if(s.paused){log('Paused：不換狀態');draw();return;}
    const cur=s.st;let nx=cur;
    if(cur==='Init')nx='Idle';
    else if(cur==='Idle'){if(s.exit)nx='Done';}
    else if(cur==='Done'){s.done=true;log('Done：結批、關設備，迴圈結束 → Release Queue');draw();return;}
    else{const k=SEQ.indexOf(cur);
      if(cur==='Inspect'&&d.querySelector('.slow').checked&&!s._slow){s._slow=true;s.wait=4;log('Inspect 開始（很慢）');draw();return;}
      s._slow=false;
      if(cur==='WaitExit'){s.n++;nx=(s.exit||s.cstop)?'Idle':'RequestPart';if(s.exit)nx='Done';}
      else nx=SEQ[k+1];}
    if(nx!==cur)log(`${cur} → ${nx}`);
    s.st=nx;draw();
  }
  draw();const t=setInterval(tick,600);
}

/* ======================================================================
   A3：從 QMH 到 Host_Main：四個迴圈
   ====================================================================== */
L.push({id:'A03',order:33,no:'A3',part:PART,title:'從 QMH 到 Host_Main：為什麼變成 4 個迴圈、資料怎麼流',mins:80,
goals:[['學會','依「時間尺度」和「資源擁有者」切迴圈；Queue、Notifier、Shift Register 各用在哪；U32 打包命令。'],['看懂','Host_Main 4 個迴圈的責任、週期、在等什麼，以及一顆零件從請求檢測到結果寫回 PLC 的完整路徑。'],['用在','A4～A7 逐一拆每個迴圈；A8 自己規劃架構。']],
check:'能畫出 4 個迴圈和 3 個傳遞工具的圖，並說出：為什麼檢測不能放在通訊迴圈、為什麼通訊迴圈到 UI 用 Notifier 不用 Queue。',
body:[
C.h3('懂','','專案怎麼一路演進'),
C.table(['版本','誰跑機台順序','LabVIEW 架構','學到什麼'],[
 ['06_Auto','LabVIEW','一個大狀態機','按鈕不好處理'],
 ['07_QMH','LabVIEW','QMH：UI 迴圈 + 狀態機（Modbus 控制 IO）','訊息排隊'],
 ['08_Alarm／09_Recipe','LabVIEW','加警報、機種檔','Type Def Cluster（Recipe.ctl）'],
 ['10 MES','LabVIEW','QMH + MES 迴圈（第二個消費者）','網路慢不能卡生產'],
 ['12_Log','LabVIEW','加 CSV 紀錄','檔案 I/O'],
 ['<b>13_PLC</b>','<b>PLC</b>','<b>4 個平行迴圈，沒有大狀態機</b>','分工：PLC 管順序、PC 管資訊']]),
why('為什麼把順序搬到 PLC','① PLC 掃描時間固定（毫秒級），Windows 不保證時間；② PC 當機、LabVIEW 被關掉，PLC 還在，會因為心跳逾時安全停機；③ 急停、安全迴路本來就該在 PLC；④ 現場維修人員看得懂梯形圖。<b>結果：LabVIEW 不需要「生產狀態機」了</b>，PLC 的 D300 步序就是狀態。'),
C.h3('懂','','切迴圈的兩個問題'),
`<p>規劃大架構時，對每一件工作問：</p><ol><li><b>它多久做一次、一次做多久？</b>（時間尺度）——快的和慢的不要放同一個迴圈，慢的會拖累快的。</li><li><b>它用到哪個設備／資源？</b>——同一個設備只給<b>一個</b>迴圈用（擁有者），別人要用就送訊息給它。</li></ol>`,
C.table(['工作','多久一次','一次多久','用到的資源','→ 放哪個迴圈'],[
 ['讀 PLC 狀態、寫心跳','每 100 ms','約 20 ms','PLC 連線','<b>通訊迴圈</b>（PLC 唯一擁有者）'],
 ['寫命令、結果到 PLC','有事才做','幾 ms','PLC 連線','送到通訊迴圈的<b>寫入佇列</b>'],
 ['取像 + 檢測','每顆零件一次','約 1.4 秒','相機、伺服','<b>檢測迴圈</b>'],
 ['畫動線、更新顯示、讀按鈕','每 200 ms','畫圖可能慢','前面板','<b>UI 迴圈</b>'],
 ['上傳 MES','每顆零件一次','網路不定，可能幾秒或失敗','HTTP','<b>MES 迴圈</b>']]),
warn('如果把檢測放進通訊迴圈','檢測 1.4 秒期間通訊迴圈停住 → 心跳 D520 不變 → 如果檢測稍微慢一點超過 2 秒，PLC 就發 9006 心跳逾時。而且這段時間畫面、按鈕全部收不到新資料。下面的模擬可以親自試。'),
C.h3('懂','','Host_Main 架構圖'),
C.arch({w:960,h:470,minw:760,boxes:[
 {id:'plc',x:10,y:170,w:120,h:110,k:'plc',t:'PLC',sub:['FX3S／softplc','D100…D550']},
 {id:'cm',x:200,y:150,w:200,h:150,t:'② 通訊迴圈（100 ms）',sub:['Host_CommStep','讀 D300×16、D400×4','寫心跳 D520','Flush 寫入佇列 → 寫 PLC']},
 {id:'nt',x:470,y:190,w:150,h:70,k:'data',t:'Notifier',sub:['21 個 U16（最新一筆）']},
 {id:'ui',x:690,y:20,w:250,h:150,k:'#b45309',t:'③ UI 迴圈（200 ms）',sub:['畫動線、步序、警報、計數','按鈕 → Host_Writes','參數 → Host_Params','Exit 流程']},
 {id:'in',x:690,y:200,w:250,h:130,k:'#7c3aed',t:'④ 檢測迴圈（等通知）',sub:['b0 上升緣 → 檢測','結果 → D510、D511=1','b0 下降緣 → D511=0','CSV 紀錄']},
 {id:'wq',x:420,y:360,w:200,h:70,k:'data',t:'寫入佇列（U32）',sub:['位址×65536＋值']},
 {id:'mq',x:690,y:370,w:120,h:70,k:'data',t:'MES 佇列',sub:['JSON 字串']},
 {id:'ms',x:840,y:360,w:110,h:90,k:'#0b8a5f',t:'① MES 迴圈',sub:['MES_Flush','失敗重送']}],
 arrows:[
  {from:'cm',to:'plc',fs:'l',ts:'r',p0:[200,205],p1:[130,205],l:'讀',c:'#b45309'},
  {from:'cm',to:'plc',fs:'l',ts:'r',p0:[200,250],p1:[130,250],l:'寫',c:'#b45309',lp:[165,268]},
  {from:'cm',to:'nt',l:'Send Notification'},
  {from:'nt',to:'ui',fs:'r',ts:'l',pts:[[650,225],[650,95]],l:'Wait on\nNotification',lp:[600,120]},
  {from:'nt',to:'in',fs:'r',ts:'l',p1:[690,250]},
  {from:'ui',to:'wq',fs:'b',ts:'r',p0:[700,170],pts:[[660,170],[660,395]],p1:[620,395],c:'#1f6feb',l:'Enqueue',lp:[640,350]},
  {from:'in',to:'wq',fs:'b',ts:'r',p0:[720,330],pts:[[720,345],[640,345],[640,410]],p1:[620,410],c:'#1f6feb'},
  {from:'wq',to:'cm',fs:'l',ts:'b',pts:[[300,395]],c:'#1f6feb',l:'Flush Queue',lp:[340,385]},
  {from:'in',to:'mq',fs:'b',ts:'t',p0:[750,330],p1:[750,370],c:'#0b8a5f'},
  {from:'mq',to:'ms',c:'#0b8a5f'}],
 notes:[[10,20,'只有通訊迴圈碰 PLC；別人要寫，就丟進寫入佇列。'],[10,40,'讀到的資料用 Notifier 廣播，UI 和檢測兩個迴圈都拿得到最新的一筆。']],
 cap:'藍色線 = 寫入路徑（不能掉）；黑色 = 讀取路徑（只要最新）；綠色 = MES。'}),
C.h3('懂','','三種傳遞工具：為什麼這樣選'),
C.table(['工具','行為','Host_Main 用在','為什麼'],[
 ['<b>Queue</b>（佇列）','先進先出，排隊，<b>不會掉</b>；一個元素只會被一個 Dequeue 拿走','寫入佇列（U32）、MES 佇列（字串）','命令和結果少一筆就出事：Start 沒寫到、D511 沒寫到 PLC 會逾時'],
 ['<b>Notifier</b>（通知）','<b>只保留最新一筆</b>，舊的被蓋掉；<b>多個</b>等待者都能收到同一筆','通訊 → UI、檢測','狀態每 100 ms 一筆，只在乎最新；UI 慢了跳過幾筆沒關係；兩個迴圈都要看'],
 ['<b>Shift Register</b>','同一個迴圈裡記住上一圈的值','心跳計數、上一次 b0、Exit 閂鎖、待重送清單','只有自己用，不需要跨迴圈']]),
tip('記憶法','「<b>命令用 Queue，狀態用 Notifier</b>」。命令是事件，一個都不能少；狀態是快照，只要最新。'),
C.h3('懂','','U32 打包：一個數字裝「位址 + 值」'),
`<p>寫入佇列的元素型別是 <b>U32</b>（32 位元）。高 16 位元放 D 位址、低 16 位元放值：</p>
<p style="font-family:var(--mono);font-size:15px;background:#f6f8fa;padding:8px 12px;border-radius:6px">元素 = 位址 × 65536 + 值</p>`,
C.table(['命令','計算','U32 值','在 Host_Main 截圖裡'],[
 ['D100 = 2（Cycle Stop／Exit）','100 × 65536 + 2','6553602','UI 迴圈 Exit 那個 Case 的常數'],
 ['D510 = 1（OK）','510 × 65536 + 1','33423361','檢測迴圈'],
 ['D510 = 2（NG）','510 × 65536 + 2','33423362','檢測迴圈'],
 ['D511 = 0（交握結束）','511 × 65536 + 0','33488896','檢測迴圈下降緣 Case'],
 ['D511 = 1','511 × 65536 + 1','33488897','檢測迴圈']]),
`<p>通訊迴圈拿到後用 ${fn('Programming','Numeric','Data Manipulation','Split Number')} 拆回 hi（位址）、lo（值）。好處：佇列只需要一種簡單型別；壞處：值只能 0～65535。另一種做法是 Cluster {位址, 值}，更好讀，A8 會比較。</p>`,
C.h3('玩','x','模擬：一顆零件的資料旅程'),
`<p>這是 Host_Main 的縮小版：一個假的 PLC 跑步序，四個迴圈照真的邏輯運作。按 Start，看：PLC 到 70 → b0=1 → 檢測迴圈抓到上升緣 → 檢測 → 兩筆寫入進佇列 → 通訊迴圈寫進 PLC → PLC 往下走 → b0=0 → 下降緣寫 D511=0。<br>然後試：把檢測時間拉到 2.5 秒，再勾「檢測放進通訊迴圈（錯誤示範）」。</p>`,
{fn:flowSim},
C.h3('測','q','小測驗'),
{quiz:[
 {q:'切迴圈時最重要的兩個問題是？',o:['時間尺度、資源擁有者','顏色、大小','有幾個按鈕、有幾個顯示'],a:0,ex:'快慢分開；一個設備只給一個迴圈。'},
 {q:'通訊迴圈到 UI 迴圈為什麼用 Notifier？',o:['Notifier 比較快','只要最新狀態、而且 UI 和檢測兩個迴圈都要收','Queue 不能放陣列'],a:1,ex:'Queue 的元素被一個迴圈拿走就沒了；Notifier 每個等待者都看得到最新一筆。'},
 {q:'寫入佇列為什麼不用 Notifier？',o:['Notifier 會蓋掉舊的，連續兩筆寫入（D510 再 D511）會掉一筆','Notifier 不能放 U32','沒有原因'],a:0,ex:'命令不能掉，所以用 Queue。'},
 {q:'U32 元素 6553603 代表？',o:['D100 = 3（Reset）','D65 = 53603','D655 = 3603'],a:0,ex:'6553603 ÷ 65536 = 100 餘 3。'},
 {q:'UI 迴圈想寫 D100，正確做法？',o:['自己呼叫 PLC_WriteWord','Enqueue 到寫入佇列，交給通訊迴圈','用 Global Variable'],a:1,ex:'PLC 連線只有通訊迴圈擁有。兩個迴圈同時用同一條連線，封包會交錯，回覆對不上。'},
 {q:'13_PLC 為什麼沒有 25 個狀態的大狀態機？',o:['忘了寫','機台順序搬到 PLC，D300 步序就是狀態','LabVIEW 2018 不支援'],a:1,ex:'LabVIEW 只需要「看 PLC 狀態，做該做的事」。'}
]}
]});

function flowSim(d){
  d.innerHTML=`<div class="fig" style="font-size:13.5px">
  <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:8px" class="ctl"></div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px">
   <div class="bx" style="border:2px solid #b45309"><b style="color:#b45309">PLC（假的）</b><div class="plc"></div></div>
   <div class="bx" style="border:2px solid #1f6feb"><b style="color:#1f6feb">② 通訊迴圈</b><div class="cm"></div></div>
   <div class="bx" style="border:2px dashed #0b8a5f"><b style="color:#0b8a5f">Notifier（最新一筆）</b><div class="nt"></div><b style="color:#1f6feb;display:block;margin-top:6px">寫入佇列</b><div class="wq"></div></div>
   <div class="bx" style="border:2px solid #7c3aed"><b style="color:#7c3aed">④ 檢測迴圈</b><div class="in"></div></div>
   <div class="bx" style="border:2px solid #b45309"><b style="color:#b45309">③ UI 迴圈</b><div class="ui"></div></div>
   <div class="bx" style="border:2px solid #0b8a5f"><b style="color:#0b8a5f">① MES 迴圈</b><div class="ms"></div></div>
  </div>
  <div class="lg" style="font-family:var(--mono);font-size:12px;background:#f6f8fa;border-radius:6px;padding:6px;height:170px;overflow:auto;margin-top:8px"></div>
  </div>`;
  d.querySelectorAll('.bx').forEach(b=>b.style.cssText+=';border-radius:8px;padding:8px;background:#fff;min-height:96px');
  const STEPN={0:'---',30:'Idle',40:'RequestPart',50:'ToStopper',60:'Clamp',70:'Inspect',80:'Release',90:'ToSort',100:'PushNG',110:'ToExit',120:'Done',900:'Error',910:'AlarmWait'};
  const c=d.querySelector('.ctl');
  c.innerHTML=`<button class="btn" data-c="1">Start（D100=1）</button><button class="btn" data-c="2">Cycle Stop</button><button class="btn" data-c="3">Reset</button>
   <label>檢測時間 <input type="range" class="it" min="5" max="30" value="14" style="vertical-align:middle"> <b class="itv">1.4</b> 秒</label>
   <label><input type="checkbox" class="bad"> 檢測放進通訊迴圈（錯誤示範）</label><label><input type="checkbox" class="hb"> Pause Heartbeat</label><button class="btn rs">重來</button>`;
  let S;
  function reset(){S={t:0,step:30,alarm:0,b0:0,pid:1000,d100:0,d510:0,d511:0,d520:0,lastBeat:0,beatT:0,stepT:0,ok:0,ng:0,
    beat:0,q:[],mq:[],nt:null,ntSeq:0,inPrev:0,inBusy:0,inRes:0,uiSeq:0,uiShown:null,cmBlock:0,cmN:0,inN:0,uiN:0,msN:0,mesOk:0,msBusy:0};
    d.querySelector('.lg').innerHTML='';}
  reset();
  const log=t=>{const l=d.querySelector('.lg');l.innerHTML+=`<div>${(S.t/10).toFixed(1)}s ${t}</div>`;if(l.children.length>300)l.removeChild(l.firstChild);l.scrollTop=1e6;};
  const enq=(addr,val,who)=>{S.q.push([addr,val]);log(`${who} Enqueue ${addr*65536+val}（D${addr}=${val}）`);};
  c.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>enq(100,+b.dataset.c,'UI 迴圈'));
  c.querySelector('.rs').onclick=reset;
  const it=c.querySelector('.it');it.oninput=()=>c.querySelector('.itv').textContent=(it.value/10).toFixed(1);
  function plcScan(){ // 每 100 ms
    if(S.d100){const k=S.d100;S.d100=0;
      if(k===1&&S.step===30){S.step=40;S.stepT=0;S.stop=0;log('PLC：收到 D100=1 → 40 RequestPart');}
      else if(k===2){S.stop=1;log('PLC：收到 D100=2，做完這顆再停');}
      else if(k===3&&S.step===910){S.step=30;S.alarm=0;S.stepT=0;log('PLC：Reset → 30 Idle（實機會先清線）');}}
    if(S.d520!==S.lastBeat){S.lastBeat=S.d520;S.beatT=0;}else S.beatT++;
    if(S.step>=40&&S.step<=120&&S.beatT>=20){S.step=910;S.alarm=9006;S.b0=0;log('PLC：D520 兩秒沒變 → 警報 9006 心跳逾時，停機');}
    S.stepT++;const st=S.step;
    if([40,50,60].includes(st)&&S.stepT>=6){S.step=st+10;S.stepT=0;if(S.step===70){S.pid++;S.b0=1;log(`PLC：70 Inspect，D306=${S.pid}，b0=1（請求檢測）`);}}
    else if(st===70&&S.d511===1){S.b0=0;S.res=S.d510;S.step=80;S.stepT=0;log(`PLC：看到 D511=1，讀 D510=${S.d510}，b0=0 → 80`);}
    else if(st===80&&S.stepT>=4){S.step=90;S.stepT=0;}
    else if(st===90&&S.stepT>=4){S.step=S.res===1?110:100;S.stepT=0;}
    else if((st===100||st===110)&&S.stepT>=5){S.res===1?S.ok++:S.ng++;S.step=120;S.stepT=0;}
    else if(st===120&&S.stepT>=3&&S.d511===0){S.step=S.stop?30:40;S.stepT=0;if(S.stop)log('PLC：停止請求 → 30 Idle');}
  }
  function words(){return {step:S.step,alarm:S.alarm,b0:S.b0,pid:S.pid,ok:S.ok,ng:S.ng,seq:++S.ntSeq};}
  function commLoop(){ // 每 100 ms 一圈
    const bad=c.querySelector('.bad').checked;
    if(S.cmBlock>0){S.cmBlock--;
      if(S.cmBlock===0&&S.badBusy){S.badBusy=0;const r=Math.random()<0.8?1:2;S.d510=r;S.d511=1;log(`通訊迴圈：檢測完 → 直接寫 D510=${r}、D511=1`);}
      return;}
    S.cmN++;
    if(!c.querySelector('.hb').checked)S.d520=++S.beat;
    while(S.q.length){const [a,v]=S.q.shift();if(a===100)S.d100=v;else if(a===510)S.d510=v;else if(a===511)S.d511=v;log(`通訊迴圈：Flush → 寫 D${a}=${v}`);}
    S.nt=words();
    if(bad){ // 錯誤示範：檢測直接在通訊迴圈裡做
      if(S.nt.b0&&!S.badPrev){S.cmBlock=+it.value;S.badBusy=1;log(`通訊迴圈：（錯誤示範）在這裡檢測 ${(S.cmBlock/10).toFixed(1)} 秒，期間不讀、不寫、不送心跳…`);}
      if(!S.nt.b0&&S.badPrev){S.d511=0;log('通訊迴圈：b0 下降 → 寫 D511=0');}
      S.badPrev=S.nt.b0;}
  }
  function inspectLoop(){ // 等通知
    if(c.querySelector('.bad').checked){S.inPrev=S.nt?S.nt.b0:0;return;}
    if(!S.nt)return;S.inN++;
    if(S.inBusy>0){S.inBusy--;if(S.inBusy===0){const r=Math.random()<0.8?1:2;enq(510,r,'檢測迴圈');enq(511,1,'檢測迴圈');S.mq.push(`{"part_id":${S.pid},"result":"${r===1?'OK':'NG'}"}`);log('檢測迴圈：MES 佇列 +1');}return;}
    const b0=S.nt.b0;
    if(b0&&!S.inPrev){log(`檢測迴圈：b0 上升緣 → 取像、檢測 ID ${S.nt.pid}`);S.inBusy=+it.value;}
    if(!b0&&S.inPrev){log('檢測迴圈：b0 下降緣');enq(511,0,'檢測迴圈');}
    S.inPrev=b0;
  }
  function mesLoop(){if(S.mq.length&&!S.msBusy){S.msBusy=5;}if(S.msBusy){S.msBusy--;if(!S.msBusy){S.mq.shift();S.mesOk++;}}S.msN++;}
  function draw(){
    const n=S.nt||{};const bad=c.querySelector('.bad').checked;
    d.querySelector('.plc').innerHTML=`步序 D300 = <b>${S.step} ${STEPN[S.step]||''}</b><br>警報 D301 = <b style="color:${S.alarm?'#b91c1c':'inherit'}">${S.alarm}</b><br>b0 請求檢測 = <b>${S.b0}</b>　D306 = ${S.pid}<br>D510 = ${S.d510}　D511 = ${S.d511}<br>心跳 D520 = ${S.d520}（${(S.beatT/10).toFixed(1)} 秒沒變）`;
    d.querySelector('.cm').innerHTML=S.cmBlock>0?`<b style="color:#b91c1c">卡住中…還剩 ${(S.cmBlock/10).toFixed(1)} 秒</b><br>不讀、不寫、心跳不動`:`跑了 ${S.cmN} 圈<br>每圈：讀 → 心跳 → Flush 佇列 → Send Notification`;
    d.querySelector('.nt').innerHTML=S.nt?`<span style="font-family:var(--mono)">#${n.seq}：步序 ${n.step}、b0 ${n.b0}、ID ${n.pid}</span>`:'—';
    d.querySelector('.wq').innerHTML=S.q.length?S.q.map(x=>`<span style="font-family:var(--mono);background:#eef5ff;border-radius:4px;padding:0 4px;margin-right:4px">${x[0]*65536+x[1]}</span>`).join(''):'<span style="color:#9ca3af">（空的）</span>';
    d.querySelector('.in').innerHTML=bad?'<span style="color:#9ca3af">（錯誤示範中：工作搬到通訊迴圈了）</span>':(S.inBusy>0?`<b>檢測中…還剩 ${(S.inBusy/10).toFixed(1)} 秒</b><br>通訊迴圈照樣在跑`:`等通知中<br>上一次 b0 = ${S.inPrev}`);
    d.querySelector('.ui').innerHTML=`顯示步序：<b>${n.step??'—'} ${STEPN[n.step]||''}</b><br>OK ${n.ok??0}　NG ${n.ng??0}<br>${S.cmBlock>0?'<span style="color:#b91c1c">畫面凍結（收不到新通知）</span>':'畫面更新中'}`;
    d.querySelector('.ms').innerHTML=`待上傳 ${S.mq.length} 筆<br>已上傳 ${S.mesOk} 筆${S.msBusy?'<br>上傳中…':''}`;
  }
  const tm=setInterval(()=>{if(!document.body.contains(d)){clearInterval(tm);return;}S.t++;plcScan();commLoop();inspectLoop();if(S.t%2===0)mesLoop();draw();},100);
  draw();
}

})();
