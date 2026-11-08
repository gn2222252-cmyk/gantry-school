/* 第四部分 B：完整專案（第 18～21 課） */
(function(){
const L=window.LESSONS,fn=C.fn,ctl=C.ctl,qd=C.qd,wt=C.wt,FX=C.FX;
LV.F["Current VI's Path"]={g:'📄',ins:[],outs:["current VI's path"],pal:['Functions','Programming','File I/O','File Constants',"Current VI's Path"]};
LV.F['Strip Path']={g:'📁−',ins:['path'],outs:['stripped path','name'],pal:['Functions','Programming','File I/O','Strip Path']};

/* ======================================================================
   第 18 課：前面板設計
   ====================================================================== */
L.push({id:'L18',order:18,no:'18',part:'完整專案',title:'前面板：分頁、機台圖、步序文字',mins:70,files:['GT_Main.vi（完成面板）'],
goals:[['學會','Tab Control、裝飾元件、對齊與分佈工具、LED 疊在圖上當感測器、Tip Strip、視窗設定。'],['做出','完成品的五頁面板：Main、Manual、Parameters、IO Monitor、Alarm Log。'],['用在專案','操作員看到的就是這個畫面。']],
check:'GT_Main 的面板和下面的完成品預覽一樣分成五頁；Main 頁的機台圖上，龍門在前側／後側時對應的燈會亮。',
body:[
C.h3('看','r','目標畫面'),
`<p>這是第 0 課看過的完成品。這一課照著它把面板排好。按 Run 再按 Home、Start 可以看它動。</p>`,
{lv:{name:'GT_Main.vi（完成品）',fp:C.mainPanel(),sim:C.mainSim(),view:'fp'}},
C.h3('懂','','Tab Control：控制項放在分頁上'),
`<p>${ctl('Modern','Containers','Tab Control')} 是一個有頁籤的容器。把控制項拖到某一頁上，它就屬於那一頁，切換頁籤時跟著顯示／隱藏。<b>方塊圖上沒有任何變化</b>：端子還是一樣用，Tab Control 本身也有一個端子，值是目前在第幾頁（通常不用接）。</p>
${C.table(['操作','怎麼做'],[
 ['加頁','頁籤上右鍵 ▸ Add Page After'],
 ['改頁名','雙擊頁籤文字'],
 ['把控制項放到某頁','先切到那一頁，再把控制項拖進 Tab Control 的範圍（看到框線變色再放開）'],
 ['把控制項移出來','拖出 Tab Control 範圍']
])}`,
C.h3('做','b','跟著做：五個分頁'),
C.table(['頁','放什麼','對應 Status / 命令'],[
 ['Main','機台圖、7 顆狀態燈、計數、Alarm Code + Alarm Text、三個步序文字、Start/Stop/Home/Reset/Clear Counts','Status 的各元素；GT_StepText、GT_AlarmText'],
 ['Manual','Manual Allowed 燈、11 個點動／切換按鈕、D107 (hex) 顯示','第 17 課 ② ④'],
 ['Parameters','4 個參數 + Write','第 17 課 ③'],
 ['IO Monitor','X、Y 兩組燈（Status.X、Status.Y）','用 Index Array 取出 X0～X13、Y0～Y7、位元 8～10'],
 ['Alarm Log','Alarm History 表格','第 20 課']
]),
{todo:[
 'PLC Port、PLC Connected、Exit 放在 Tab Control <b>外面</b>（不管在哪一頁都看得到）。',
 '三個步序文字：在通訊迴圈用 Unbundle By Name 取 Right Step、Left Step、Home Step，各接一個 <b>GT_StepText.vi</b>，輸出接 String Indicator。',
 'Alarm Text：Alarm Code → <b>GT_AlarmText.vi</b>。',
 '狀態燈：Unbundle By Name 取 Auto Running、Manual Mode、Homed、Cycle Stopping、Alarm、E-Stop。Alarm 和 E-Stop 燈改紅色（用 Coloring 工具，或右鍵 ▸ Properties ▸ Appearance ▸ On 顏色）。',
 '選取多個控制項後，用工具列的 <b>Align Objects</b> 和 <b>Distribute Objects</b> 對齊，畫面馬上整齊。'
]},
C.h3('懂','','機台圖：裝飾 + 燈'),
`<p>不需要畫圖函式。用 ${ctl('Modern','Decorations')} 的方塊畫輸送帶和軌道，再把<b>方形 LED</b> 疊在對應的位置當感測器。燈亮代表感測器 ON，操作員一看就知道龍門在哪、哪裡有料。</p>
${C.table(['畫面上的位置','LED 接','意思'],[
 ['右龍門軌道前端／後端','X2、X3','右龍門在前側／後側'],['左龍門軌道前端／後端','X0、X1','左龍門在前側／後側'],
 ['前輸送帶右端','X4','有工件到位'],['後輸送帶左端','X5','有工件到位'],['左／右龍門頭','X7、X12','氣缸在下限'],['龍門頭旁的小燈','Y5','吸盤真空中']
])}`,
{todo:[
 '用 Flat Box 畫兩條灰色長條（前、後輸送帶）、兩條細長條（左、右龍門軌道），右鍵 ▸ Move to Back 讓它們在最底層。',
 '放 Square LED，關掉標籤（右鍵 ▸ Visible Items ▸ Label 取消），用 Free Label（雙擊空白處打字）寫小字說明。',
 '方塊圖：Status.X → Index Array（拉長，接 0、1、2、3、4、5、7、10）→ 各個 LED。注意 X12 是索引 10（八進位！）。',
 '在每個 LED 上右鍵 ▸ Description and Tip… 寫 Tip（英文），滑鼠停上去就會提示，例如 <code>X2 R gantry front</code>。'
]},
C.h3('懂','','收尾：視窗設定'),
C.table(['設定','位置','建議'],[
 ['預設值','控制項上右鍵 ▸ Data Operations ▸ Make Current Value Default','PLC Port、參數預設值設好再存檔'],
 ['開啟時自動執行','File ▸ VI Properties ▸ Execution ▸ Run when opened','做完、測完再勾'],
 ['視窗外觀','VI Properties ▸ Window Appearance ▸ Customize','可關掉工具列的 Abort 按鈕（Show Abort button 取消），逼使用者用 Exit'],
 ['面板大小','拉好視窗後 VI Properties ▸ Window Size','固定成 1024 × 600 左右，工廠螢幕比較小']
]),
`<div class="warn"><b>面板文字用英文</b>學校、工廠的英文版 Windows 打開中文會亂碼。說明寫在 Tip Strip（英文）或另外的文件裡。</div>`,
C.h3('測','q','小測驗'),
{quiz:[
 {q:'把按鈕放到 Tab Control 的 Manual 頁後，方塊圖要改什麼？',o:['要用 Tab Control 的端子讀它','什麼都不用改，端子照常使用','要重新接線'],a:1,ex:'Tab Control 只影響前面板顯示。'},
 {q:'右氣缸下限 X12 在 Status.X 陣列的索引是？',o:['12','10','14'],a:1,ex:'X 是八進位：X10 = 索引 8、X11 = 9、X12 = 10。'}
]}
]});

/* ======================================================================
   第 19 課：心跳、斷線重連、結束順序
   ====================================================================== */
const hb={name:'通訊迴圈：心跳（每秒寫 D240）',view:'bd',
 bd:{w:780,h:300,structs:[{id:'wl',k:'while',x:110,y:20,w:640,h:260},{id:'cs',k:'case',x:380,y:50,w:300,h:200,frames:['False','True'],cur:1}],
  nodes:[
  {id:'k0',k:'const',t:'u32',v:0,x:20,y:52},{id:'srl',k:'sr',t:'u32',s:'wl',y:61},
  {id:'k1',k:'const',t:'u16',v:0,x:20,y:212},{id:'srb',k:'sr',t:'u16',s:'wl',y:221},
  {id:'vin',k:'ctl',t:'visa',label:'VISA（來自 Shift Register）',x:140,y:150},
  {id:'tk',k:'fn',fn:'Tick Count (ms)',x:150,y:84},
  {id:'sub',k:'fn',fn:'Subtract',x:220,y:76},{id:'ge',k:'fn',fn:'Greater Or Equal?',x:290,y:82},{id:'k1000',k:'const',t:'u32',v:1000,x:240,y:116},
  {id:'sel',k:'sel',t:'bool',s:'cs',y:96},
  {id:'tnow',k:'tunnel',t:'u32',s:'cs',side:'l',y:70},{id:'tb',k:'tunnel',t:'u16',s:'cs',side:'l',y:221},{id:'tv',k:'tunnel',t:'visa',s:'cs',side:'l',y:160},
  {id:'inc',k:'fn',fn:'Increment',x:410,y:207,f:'cs:True'},{id:'gt',k:'fn',fn:'Greater?',x:460,y:190,f:'cs:True',showName:false},{id:'kmax',k:'const',t:'u16',v:32767,x:420,y:174,f:'cs:True'},
  {id:'one',k:'const',t:'u16',v:1,x:470,y:228,f:'cs:True'},{id:'sl',k:'fn',fn:'Select',x:520,y:200,f:'cs:True',showName:false},
  {id:'k240',k:'const',t:'u16',v:240,x:530,y:150,f:'cs:True'},
  {id:'wd',k:'sub',name:'FX_WriteD.vi',top:'FX',icon:['WRITE D'],ins:['VISA in','D','Value'],outs:['VISA out'],x:580,y:140,f:'cs:True'},
  {id:'tlo',k:'tunnel',t:'u32',s:'cs',side:'r',y:70},{id:'tbo',k:'tunnel',t:'u16',s:'cs',side:'r',y:221},{id:'tvo',k:'tunnel',t:'visa',s:'cs',side:'r',y:160}],
  wires:[{id:'w0',from:'k0',to:'srl.init',t:'u32'},{id:'w1',from:'k1',to:'srb.init',t:'u16'},
   {id:'w2',from:'tk.millisecond timer value',to:'sub.x',t:'u32'},{id:'w3',from:'srl.L',to:'sub.y',t:'u32',mx:200},{id:'w4',from:'sub.out',to:'ge.x',t:'u32'},{id:'w5',from:'k1000',to:'ge.y',t:'u32',mx:278},{id:'w6',from:'ge.out',to:'sel',t:'bool'},
   {id:'w7',from:'tk.millisecond timer value',to:'tnow.o',t:'u32',mx:205},{id:'w8',from:'srb.L',to:'tb.o',t:'u16'},{id:'w9',from:'vin',to:'tv.o',t:'visa'},
   {id:'t1',from:'tb.i',to:'inc',t:'u16',f:'cs:True'},{id:'t2',from:'inc.out',to:'gt.x',t:'u16',f:'cs:True',mx:448},{id:'t3',from:'kmax',to:'gt.y',t:'u16',f:'cs:True',mx:452},
   {id:'t4',from:'gt.out',to:'sl.s',t:'bool',f:'cs:True'},{id:'t5',from:'one',to:'sl.t',t:'u16',f:'cs:True',pts:[[505,237],[505,207]]},{id:'t6',from:'inc.out',to:'sl.f',t:'u16',f:'cs:True',pts:[[445,221],[445,240],[512,240],[512,225]]},
   {id:'t7',from:'sl.out',to:'wd.Value',t:'u16',f:'cs:True',mx:565},{id:'t8',from:'k240',to:'wd.D',t:'u16',f:'cs:True'},{id:'t9',from:'tv.i',to:'wd.VISA in',t:'visa',f:'cs:True',mx:560},
   {id:'t10',from:'wd.VISA out',to:'tvo.i',t:'visa',f:'cs:True'},{id:'t11',from:'sl.out',to:'tbo.i',t:'u16',f:'cs:True',mx:650},{id:'t12',from:'tnow.i',to:'tlo.i',t:'u32',f:'cs:True'},
   {id:'f1',from:'tv.i',to:'tvo.i',t:'visa',f:'cs:False'},{id:'f2',from:'tb.i',to:'tbo.i',t:'u16',f:'cs:False'},
   {id:'w10',from:'tlo.o',to:'srl.R',t:'u32'},{id:'w11',from:'tbo.o',to:'srb.R',t:'u16'}]}
};
L.push({id:'L19',order:19,no:'19',part:'完整專案',title:'心跳、斷線重連、正確結束',mins:70,files:['GT_Main.vi（加入心跳與重連）'],
goals:[['學會','用 Tick Count 做定時、在迴圈裡重新連線、Flush Queue、可控的結束順序。'],['做出','每秒寫 D240；通訊斷了自動重連；Exit 時寫 D240 = 0 再關埠。'],['用在專案','讓程式在工廠可以「開著不用管」。']],
check:'軟 PLC 上 D240 每秒加 1；關掉軟 PLC → PLC Connected 熄滅、程式不會停；重開軟 PLC → 幾秒內自動連回；按 Exit 後 D240 變 0。',
body:[
C.h3('懂','','HMI 心跳：PLC 怎麼知道 LabVIEW 還活著'),
`<p>PLC 程式會看 D240：<b>3 秒沒有變化就當作 HMI 斷線</b>。手動模式下斷線會報異常 40 並停止點動輸出（萬一 LabVIEW 當掉時操作員正按著點動，機台不會一直動）。<b>D240 = 0 表示「沒有 HMI」</b>，PLC 就不檢查。</p>
<p>所以 LabVIEW 要：① 每秒寫一次 D240，值在 1～32767 循環（第 5 課的計數器）；② 正常結束時寫 D240 = 0。</p>`,
{lv:hb,cap:'Tick Count 減上一次寫入的時間 ≥ 1000 ms 就進 True 頁：計數加 1（超過 32767 回 1）、FX_WriteD(240)、記下這次的時間。False 頁三條線都直接穿過。'},
`<div class="tip"><b>為什麼不用「每 10 圈寫一次」？</b>通訊迴圈的週期會變（有命令時比較快），用圈數算時間不準。Tick Count 是真正的毫秒數。</div>`,
C.h3('懂','','斷線重連'),
`<p>工廠裡線會被踢到、PLC 會斷電。好的上位機不會因此停掉，而是顯示「斷線」並一直嘗試重連。做法：通訊迴圈的<b>錯誤線也放進 Shift Register</b>，每圈開頭先看上一圈有沒有錯：</p>
${C.table(['上一圈','這一圈做什麼'],[
 ['沒有錯誤（No Error 頁）','照常：取命令、寫、心跳、讀狀態'],
 ['有錯誤（Error 頁）','① Clear Errors 清掉錯誤　② VISA Close 關舊連線　③ Wait 1000 ms　④ FX_Open 重開，新的 VISA 線放回 Shift Register　⑤ <b>Flush Queue</b> 清掉斷線期間累積的命令']
])}
<div class="warn"><b>為什麼要清佇列</b>斷線時操作員可能按了很多下點動。如果重連後把這些舊命令全部送出去，機台會突然自己動起來。斷線期間的命令一律丟掉。</div>
<p><b>PLC Connected</b> 燈 = 這一圈的錯誤線 status 取反（Not）。</p>`,
{todo:[
 '通訊迴圈加一個錯誤 Shift Register（初始值接 FX_Open 的 error out）。',
 '迴圈一開始放一個 Case，Selector 接左邊錯誤 Shift Register。',
 'Error 頁：Clear Errors → VISA Close → Wait (ms) 1000 → FX_Open（PLC Port 從迴圈外接進來）→ Flush Queue。輸出新的 VISA 線和錯誤線。',
 'No Error 頁：VISA 線、錯誤線直接穿過。',
 '原本的「Dequeue → 寫命令 → 心跳 → 讀狀態」放在 Case 後面，錯誤線一路串；最後的錯誤線接回右邊 Shift Register，並經過 Unbundle（status）→ Not → PLC Connected。',
 '<b>注意</b>：Dequeue 的錯誤（佇列被釋放）仍然單獨接到 Loop Condition，不要和通訊錯誤混在一起，否則一斷線迴圈就結束了。'
]},
C.h3('懂','','結束順序：Exit 之後發生什麼'),
{fn:d=>{d.innerHTML=`<div class="fig"><svg viewBox="0 0 900 210" width="100%" style="max-width:900px" font-family="Microsoft JhengHei UI,sans-serif" font-size="13">
<defs><marker id="a2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="#445"/></marker></defs>
${[['按 Exit','UI 迴圈這圈結束','#eef4ff'],['Release Queue','佇列銷毀','#dff4f4'],['Dequeue 出錯','通訊迴圈結束','#dff4f4'],['FX_WriteD','D240 = 0：HMI 下線','#fff4ec'],['VISA Close','關閉通訊埠','#efe6fb'],['Simple Error Handler','有真的錯誤才跳窗','#fff1c2']].map((b,i)=>`<rect x="${10+i*148}" y="40" width="132" height="70" rx="8" fill="${b[2]}" stroke="#889"/><text x="${76+i*148}" y="68" text-anchor="middle" font-weight="700">${b[0]}</text><text x="${76+i*148}" y="92" text-anchor="middle" font-size="12">${b[1]}</text>${i<5?`<path d="M${142+i*148},75H${156+i*148}" stroke="#445" stroke-width="2" marker-end="url(#a2)"/>`:''}`).join('')}
<text x="10" y="150">每一步都在等前一步的<b>線</b>：Release Queue 等 UI 迴圈的佇列線、FX_WriteD 等通訊迴圈的 VISA 線、VISA Close 等 FX_WriteD 的 VISA 線。</text>
<text x="10" y="175">順序完全由資料流決定，沒有任何「延遲一下」。用 Abort 結束的話這些步驟全部不會執行，PLC 會以為 HMI 斷線。</text>
</svg></div>`;}},
{todo:[
 '通訊迴圈右邊的 VISA 線 → FX_WriteD（D = 240、Value = 0）→ VISA Close → Simple Error Handler。',
 '如果在手動模式按 Exit：PLC 看到 D240 = 0，知道是正常離線，不會報 40。用 Abort 結束就會報 40——自己試試看。'
]},
C.h3('測','q','小測驗'),
{quiz:[
 {q:'為什麼心跳值不能是 0？',o:['0 代表「沒有 HMI」，PLC 不檢查斷線','0 會讓 PLC 當機','LabVIEW 不能寫 0'],a:0,ex:'PLC 程式：D240 > 0 才開始計算 3 秒沒變化。'},
 {q:'斷線重連後為什麼要 Flush Queue？',o:['佇列滿了','丟掉斷線期間累積的舊命令，避免機台突然動作','重連需要'],a:1,ex:'安全考量：舊的點動命令不能在重連後才執行。'},
 {q:'Exit 後 FX_WriteD(240, 0) 一定在 VISA Close 之前執行，是因為？',o:['它在左邊','VISA Close 的輸入接的是 FX_WriteD 輸出的 VISA 線','LabVIEW 照順序執行'],a:1,ex:'資料流：VISA Close 要等 FX_WriteD 的輸出。'}
]}
]});

/* ======================================================================
   第 20 課：異常紀錄
   ====================================================================== */
const logVI={name:'GT_Log.vi',view:'bd',
 bd:{w:820,h:300,nodes:[
  {id:'code',k:'ctl',t:'u16',label:'Code',x:20,y:150},{id:'tx',k:'ctl',t:'str',label:'Text',x:20,y:200},{id:'ev',k:'ctl',t:'str',label:'Event (ALARM/CLEAR)',x:20,y:100},{id:'ei',k:'ctl',t:'err',label:'error in',x:20,y:260},
  {id:'cvp',k:'fn',fn:"Current VI's Path",x:30,y:20},{id:'sp',k:'fn',fn:'Strip Path',x:100,y:20},
  {id:'klog',k:'const',t:'str',v:'logs',x:150,y:70},{id:'bp',k:'fn',fn:'Build Path',x:200,y:24},
  {id:'kd',k:'const',t:'str',v:'%Y-%m-%d.csv',x:180,y:110},{id:'fd',k:'fn',fn:'Format Date/Time String',x:290,y:96},
  {id:'bp2',k:'fn',fn:'Build Path',x:380,y:30},
  {id:'kt',k:'const',t:'str',v:'%H:%M:%S',x:200,y:170},{id:'ft',k:'fn',fn:'Format Date/Time String',x:290,y:160},
  {id:'nd',k:'fn',fn:'Number To Decimal String',x:290,y:214,ins:['number']},
  {id:'ba',k:'fn',fn:'Build Array',x:420,y:140,h:110,ins:['time','event','code','text']},
  {id:'kc',k:'const',t:'str',v:',',x:500,y:226},{id:'kt2',k:'const',t:'bool',v:true,x:520,y:200},
  {id:'wds',k:'fn',fn:'Write Delimited Spreadsheet',ins:['file path','1D data','append to file?','delimiter','error in'],x:580,y:60,h:200,w:50},
  {id:'eo',k:'ind',t:'err',label:'error out',x:720,y:220}],
  wires:[{id:'w1',from:"cvp.current VI's path",to:'sp.path',t:'path'},{id:'w2',from:'sp.stripped path',to:'bp.base path',t:'path'},{id:'w3',from:'klog',to:'bp.name or relative path',t:'str',mx:185},
   {id:'w4',from:'kd',to:'fd.time format string',t:'str',mx:275},{id:'w5',from:'bp.appended path',to:'bp2.base path',t:'path'},{id:'w6',from:'fd.date/time string',to:'bp2.name or relative path',t:'str',mx:360},
   {id:'w7',from:'bp2.appended path',to:'wds.file path',t:'path',mx:550},
   {id:'w8',from:'kt',to:'ft.time format string',t:'str',mx:275},{id:'w9',from:'ft.date/time string',to:'ba.time',t:'str'},{id:'w10',from:'ev',to:'ba.event',t:'str',pts:[[250,110],[250,140],[400,140],[400,184]]},
   {id:'w11',from:'code',to:'nd',t:'u16',pts:[[240,160],[240,230]]},{id:'w12',from:'nd.decimal integer string',to:'ba.code',t:'str',mx:395},{id:'w13',from:'tx',to:'ba.text',t:'str',pts:[[250,210],[250,262],[410,262],[410,228]]},
   {id:'w14',from:'ba.appended array',to:'wds.1D data',t:'str[]',mx:540},{id:'w15',from:'kt2',to:'wds.append to file?',t:'bool',mx:560},{id:'w16',from:'kc',to:'wds.delimiter',t:'str',mx:565},
   {id:'w17',from:'ei',to:'wds.error in',t:'err',pts:[[110,270],[110,285],[570,285],[570,227]]},{id:'w18',from:'wds.error out',to:'eo',t:'err',mx:680}]}
};
L.push({id:'L20',order:20,no:'20',part:'完整專案',title:'異常紀錄：表格與 CSV 檔',mins:60,files:['GT_Log.vi','GT_Main.vi（加入紀錄）'],
goals:[['學會','路徑函式、日期時間格式、Write Delimited Spreadsheet、Table 顯示、變化偵測。'],['做出','異常碼一變就寫一列到 logs\\yyyy-mm-dd.csv，並顯示在 Alarm Log 頁。'],['用在專案','工廠最常問的問題：「昨天下午 3 點為什麼停機？」']],
check:'在軟 PLC 勾急停再取消：Alarm Log 頁多兩列（ALARM 1 E-STOP、CLEAR 0 OK），logs 資料夾的當天 CSV 也有同樣內容，可以用 Excel 開。',
body:[
C.h3('懂','','什麼時候寫'),
`<p>不要每圈都寫（一天幾十萬列沒人看得完）。只在<b>異常碼改變</b>時寫：</p>
${C.table(['上一圈','這一圈','寫什麼'],[['0','非 0','ALARM，碼、文字'],['非 0','0','CLEAR（異常排除）'],['非 0','另一個非 0','ALARM（新的異常）'],['一樣','一樣','不寫']])}
<p>用 Shift Register 記住上一圈的 Alarm Code，Not Equal? 就知道有沒有變。</p>`,
C.h3('做','b','跟著做：GT_Log.vi'),
{lv:logVI,cap:'檔案放在 VI 所在資料夾下的 logs 子資料夾，檔名是當天日期。Write Delimited Spreadsheet 接 1D 字串陣列時會寫成一列，append to file? = True 才不會覆蓋。'},
{todo:[
 '在 <code>我的雙龍門</code> 裡先手動建立 <code>logs</code> 資料夾（Write Delimited Spreadsheet 不會自己建資料夾）。',
 '開新 VI 存 <code>GT_Log.vi</code>：輸入 <code>Event</code>（字串）、<code>Code</code>（U16）、<code>Text</code>（字串）、error in；輸出 error out。',
 '路徑：' + fn('Programming','File I/O','File Constants',"Current VI's Path") + ' → ' + fn('Programming','File I/O','Strip Path') + ' → Build Path（logs）→ Build Path（當天日期 + .csv）。',
 '日期：' + fn('Programming','Timing','Format Date/Time String') + '，格式 <code>%Y-%m-%d.csv</code>；另一個格式 <code>%H:%M:%S</code> 當時間欄。',
 'Build Array（4 格）：時間、Event、Code（Number To Decimal String）、Text → ' + fn('Programming','File I/O','Write Delimited Spreadsheet.vi') + ' 的 <b>1D data</b>；append to file? 接 T；delimiter 接 <code>,</code>。',
 'Connector：左邊 Event、Code、Text，左下 error in，右下 error out。'
]},
C.real('GT_Log','和上圖同樣的流程：路徑（Current VI&#39;s Path → Strip Path → Build Path × 2）、時間字串、Build Array 一列、Write Delimited Spreadsheet（append = T、delimiter = 逗號）。'),
C.h3('做','b','接進 GT_Main'),
{todo:[
 '通訊迴圈加 Shift Register：<code>Last Code</code>（U16，初始 0）和 <code>History</code>（2D 字串陣列，初始接一個空的 2D 字串陣列常數）。',
 'Alarm Code 和 Last Code 比 Not Equal? → Case True：Event = Code 是 0 就 "CLEAR" 否則 "ALARM"（用 Select）、Text 用 GT_AlarmText → GT_Log。',
 '同一頁裡把這一列（時間、碼、文字）Build Array 成 1D，再用 Build Array 把它加到 History 下面（History 接上面、新列接下面，<b>要勾 Concatenate Inputs</b>：2D 陣列加一個 1D 陣列，就是在最下面多一列；不勾的話 LabVIEW 會要你把兩個都變成同一維度）→ 接回 Shift Register，也接到 Alarm Log 頁的 ' + ctl('Modern','List, Table & Tree','Table') + '。',
 'Table 右鍵 ▸ Visible Items ▸ Column Headers，雙擊表頭打 Time、Code、Text。',
 '寫檔錯誤不要讓通訊斷線重連：GT_Log 的 error out 接 Clear Errors，或另外顯示一個「Log Error」燈。'
]},
C.h3('測','q','小測驗'),
{quiz:[
 {q:'Write Delimited Spreadsheet 的 append to file? 沒接（預設 False）會怎樣？',o:['每次都覆蓋，檔案只剩最後一列','會自動附加','錯誤'],a:0,ex:'預設是「新檔案」。紀錄檔一定要 append。'},
 {q:'為什麼只在異常碼改變時寫？',o:['寫檔很慢，而且每圈都寫檔案會爆量、看不出重點','Write Delimited Spreadsheet 一次只能寫一列','規定'],a:0,ex:'事件紀錄記「變化」就好。'}
]}
]});

/* ======================================================================
   第 21 課：整合測試與上實機
   ====================================================================== */
L.push({id:'L21',order:21,no:'21',part:'完整專案',title:'整合測試、除錯、上實機',mins:90,files:['GT_Main.vi（完成）'],
goals:[['學會','照測試表驗收、系統化除錯、換到 COM 埠、另存舊版。'],['做出','通過全部測試項目的 GT_Main.vi。'],['之後','能帶著這套程式到工廠接 FX3S，也能用同樣的方法寫別台機器的上位機。']],
check:'下面測試表全部打勾。',
body:[
C.h3('測','q','驗收測試表（軟 PLC）'),
`<p>開 <code>python .\\softplc\\softplc.py --no-board</code>，GT_Main Run，一項一項做。這份表和 14_Gantry 原本 Main.vi 的自動測試是同一套項目。</p>`,
{todo:[
 '連線：Run 後 PLC Connected 亮；軟 PLC 的 D240 每秒加 1。',
 '開機狀態：Home Step = 0、Homed 不亮、Right/Left Step = 0（Stopped）。',
 '原點：按 Home → Home Step 10→11→12→13→0，Homed 亮。',
 '自動：軟 PLC 放一個工件 → 按 Start → Auto Running 亮，步序文字跟著跑，搬完 Right Count / Left Count 加 1。',
 '連續：多放幾個工件，Cycles 增加，沒有異常、沒有工件不見。',
 '循環停止：按 Stop → Cycle Stopping 亮，做完這趟才停，龍門回原位。',
 '參數：Vacuum Time 改 20，按 Write → 軟 PLC D100 = 20。',
 '計數清除：按 Clear Counts → 計數歸 0。',
 '急停：軟 PLC 勾「X13 急停按下」→ Alarm Code 1、E-STOP、E-Stop 燈亮、所有輸出關；急停還按著時按 Reset 無效；取消急停再按 Reset → 異常清除；要再按 Home。',
 '逾時（進階）：軟 PLC 有一個測試用的文字控制埠 5552。另開 PowerShell 執行 <code>python -c "import socket;s=socket.create_connection((&#39;127.0.0.1&#39;,5552));s.sendall(b&#39;force X003 0\\n&#39;);print(s.recv(99))"</code>，讓 X3（右龍門後側感測器）壞掉，再放工件按 Start → 約 5 秒後 Alarm Code 10、RIGHT AXIS TIMEOUT。測完把 <code>force X003 0</code> 換成 <code>unforce X003</code> 再送一次。',
 '手動：軟 PLC 取消「X10 自動模式」→ Manual Mode、Manual Allowed 亮 → 按 Conveyors 輸送帶轉，再按停；按住 R Forward 龍門動、放開停。',
 '互鎖：氣缸在下面時按橫軸點動，PLC 不會動（PLC 的互鎖，不是 LabVIEW 的）。',
 'I/O 頁：龍門在前側時 X2 燈亮，和軟 PLC 一致。',
 '斷線：手動模式下關掉軟 PLC → PLC Connected 熄滅，程式繼續跑；重開軟 PLC → 自動連回；（軟 PLC 端會報 40，按 Reset 清除）。',
 '斷線期間按的點動，重連後不會送出。',
 '異常紀錄：Alarm Log 頁和 logs\\當天.csv 都有 ALARM / CLEAR 紀錄。',
 '結束：按 Exit → 兩個迴圈都停、軟 PLC D240 = 0、沒有錯誤對話框、手動模式下也不會報 40。'
]},
C.h3('錯','x','除錯的方法：找第一個錯的地方'),
C.table(['現象','先看哪裡','工具'],[
 ['PLC Connected 不亮','FX_Open 和第一個 FX_ReadD 的 error out','在錯誤線上放 Probe；開 FX_ReadD 前面板看 TX/RX (debug)'],
 ['數字都是 0','GT_Parse 的輸入 Words 有沒有 42 個','Probe 看陣列長度；Build Array 有沒有勾 Concatenate'],
 ['按鈕沒反應','佇列有沒有收到','在 Enqueue 的 element 線放 Probe；Dequeue 的 timed out? 是不是一直 True'],
 ['值對了但燈不亮','Index Array 的索引','X 是八進位；Status bits 順序'],
 ['偶爾出現 5001','封包被切斷或混在一起','是不是有兩個迴圈同時用 VISA？'],
 ['程式結束時跳 1122 錯誤','Dequeue 的錯誤被接到 Simple Error Handler','把佇列結束的錯誤分開處理']
]),
C.table(['LabVIEW 除錯工具','怎麼開','用途'],[
 ['Probe','線上右鍵 ▸ Probe','即時看值，不影響速度'],
 ['Breakpoint','節點或線上右鍵 ▸ Breakpoint ▸ Set Breakpoint','跑到這裡暫停，可以一步一步按 Step Over'],
 ['Highlight Execution','工具列燈泡','慢動作看資料流（迴圈裡會很慢，小 VI 用）'],
 ['Retain Wire Values','工具列燈泡右邊','跑完還能看每條線最後的值'],
 ['單獨跑 SubVI','打開 SubVI 前面板，填輸入，Run','確認每一塊零件都正確，再組起來']
]),
C.h3('實','b','上實機：FX3S-20MT/ES'),
{todo:[
 '接線：USB-SC09-FX（或 FX-USB-AW）接 PLC 圓形 8 pin 埠；裝驅動後在裝置管理員看是 COM 幾。',
 'PLC 參數：GX Works2 的 PLC 參數 ▸ PLC 系統(2) <b>不要勾</b>（勾了會變成計算機連結，編程協定就不能用）。',
 'GT_Main：PLC Port 選 COM 埠，FX_Open 的 Serial (COM)? 要 True（可以在 GT_Main 面板加一個開關，或依資源名稱判斷）。',
 '先跑 L12_Ping.vi 確認 ENQ → ACK，再跑 GT_Monitor.vi 確認讀得到，最後才跑 GT_Main。',
 '第一次上機：<b>先移除負載或隔離致動器</b>，確認急停有效，再由熟悉電氣安全的人在旁邊一起測。',
 '待確認（14_Gantry 的交接清單）：FX3S 是否接受編程協定的 0、1 命令和 D 位址 1000h；這是整套通訊風險最高的一點。若 PLC 回 NAK 或不回，記下 TX/RX (debug) 的內容。'
]},
C.h3('存','r','帶去學校／工廠：另存舊版'),
`<p>家裡是 LabVIEW 2026，學校是 2018。新版存的 VI 舊版打不開。打開 GT_Main.vi，<b>File ▸ Save for Previous Version…</b> 選 <b>18.0</b>，存到另一個資料夾（例如 D 槽）。它會把所有 SubVI 和 .ctl 一起轉換。</p>`,
C.h3('下','','接下來可以挑戰'),
C.table(['挑戰','學到什麼'],[
 ['UI 迴圈改用 Event Structure（Value Change 事件）取代 50 ms 掃描','事件驅動的 UI，CPU 更省、反應更即時'],
 ['Manual 頁在 Manual Allowed = False 時把按鈕反灰','Property Node（Disabled 屬性）'],
 ['把 PLC Port、參數存在設定檔，下次開啟自動載入','Configuration File VIs（.ini）'],
 ['把通訊迴圈改成 Queued Message Handler（QMH）','大型專案常用的架構，07_QMH 資料夾有範例'],
 ['做成執行檔（.exe）','Application Builder，工廠電腦不用裝 LabVIEW 開發環境'],
 ['加一張產量趨勢圖','Waveform Chart']
]),
C.real('GT_Main','參考答案的完整 GT_Main（Clean Up Diagram 自動排版，上面是通訊迴圈、下面是 UI 迴圈，圖很大可以橫向捲動）。截圖只看得到每個 Case 的 True 頁；在 LabVIEW 打開，點 Case 上的箭頭看另一頁。參考答案按第 21 課的測試表自動測過（見 參考答案\專案測試結果.md）。'),
`<div class="tip"><b>對照</b>本資料夾的 <code>參考答案</code> 有依照本課程架構、用 LabVIEW 腳本自動產生並實測過的 VI（驅動 7 個、GT_ 專案 6 個，含 GT_Main），寫不出來或結果不同時可以打開對照。<code>實作環境\\Main.vi</code> 是另一個寫法（14_Gantry 的原版，四個迴圈、Notifier），功能相同，可以比較兩種架構。</div>`
]});
})();
