/* CLAD 考題解析：Cluster 線分叉、Bundle By Name 的上方輸入決定改哪一個（C18）
   原理是 LabVIEW 的資料流「線分叉 = 複製一份」，沒有在 LabVIEW 裡建 VI 實測（Bundle By Name 的元素名稱無法用 VI 腳本設定）。 */
(function(){
const L=window.LESSONS,fn=C.fn,ctl=C.ctl;
const {tip,warn,note,PART}=C.clad;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function bundleLab(d){
  d.innerHTML=`<div class="fig q26"><label>最後一個 Bundle By Name 上面的 cluster 輸入接：
    <select class="src"><option value="orig" selected>最上面那條原始 cluster（題目）</option><option value="mod">中間那條已經改過 Name 的 cluster</option></select></label>
    <div style="display:flex;gap:8px;align-items:center;margin:10px 0"><button class="btn p">◀ 上一步</button><button class="btn pri n">下一步 ▶</button><span class="w" style="font-size:14px"></span></div>
    <div class="out"></div></div>`;
  const $=s=>d.querySelector(s);let step=0;
  const show=c=>`{ Age: <b>${c.Age}</b>, Name: "<b>${esc(c.Name)}</b>" }`;
  function steps(){
    const orig={Age:18,Name:'Jack'},name=orig.Name+' Williams',mod={...orig,Name:name},age=mod.Age+1;
    const base=$('.src').value==='orig'?orig:mod,out={...base,Age:age};
    return [
      ['Cluster 常數','原始 cluster '+show(orig)+'。線往右分成<b>三條</b>：每一條都是一份<b>複本</b>，誰改了都不會影響別條。'],
      ['Unbundle By Name（Name）','從複本拿出 Name = "Jack"。'],
      ['Concatenate Strings','"Jack" 接上 " Williams" → "'+esc(name)+'"。'],
      ['第一個 Bundle By Name','上面接<b>原始 cluster 的複本</b>，把 Name 換掉 → 新 cluster '+show(mod)+'。原始那條線上的值還是 '+show(orig)+'。'],
      ['Unbundle By Name（Age）','從剛做好的新 cluster 拿 Age = 18。'],
      ['Increment','18 + 1 = 19。'],
      ['第二個 Bundle By Name','上面接的是 <b>'+($('.src').value==='orig'?'最上面那條原始 cluster':'改過名字的那條')+'</b> '+show(base)+'，把 Age 換成 19 → '+show(out)+'。'],
      ['Output Cluster','顯示 '+show(out)+'　→ 選項 <b>'+(out.Name==='Jack'?'B':'D')+'</b>'+($('.src').value==='orig'?'（題目的答案）':'（如果接的是中間那條）')]];
  }
  function draw(){
    const S=steps();step=Math.max(0,Math.min(S.length-1,step));
    $('.w').textContent=`${step+1} / ${S.length}`;
    $('.out').innerHTML=`<ol style="font-size:14px;padding-left:20px;margin:0">${S.map((s,i)=>`<li style="${i===step?'background:#fff6cc;':''}${i>step?'color:#aab1bd;':''}padding:3px 4px"><b>${s[0]}</b>：${i<=step?s[1]:'…'}</li>`).join('')}</ol>`;
    $('.p').disabled=step===0;$('.n').disabled=step===S.length-1;
  }
  $('.p').onclick=()=>{step--;draw();};$('.n').onclick=()=>{step++;draw();};$('.src').onchange=()=>{step=0;draw();};
  draw();
}

L.push({id:'C18',order:118,no:'C18',part:PART,title:'考題解析：Cluster 線分叉與 Bundle By Name 改的是哪一份',mins:30,
goals:[['題目','Cluster {Age 18, Name "Jack"} 經過 Unbundle By Name、Concatenate Strings、Bundle By Name、Increment、再一個 Bundle By Name，最後 Output Cluster 顯示什麼？'],
 ['答案','<b>B：Age 19、Name Jack</b>。最後一個 Bundle By Name 上面接的是<b>原始 cluster</b>，Name 改成 Jack Williams 的那份在最後被丟掉了。'],
 ['學會','線分叉是<b>複製</b>（傳值），不是同一份；Bundle By Name 的上方輸入決定「改哪一份」；看圖時一定要追這條線從哪裡來。']],
check:'能指出圖上最後一個 Bundle By Name 的上方輸入從哪裡接過來，並說出為什麼 Name 還是 Jack。',
body:[
C.h3('懂','','這題用到的功能'),
C.table(['功能','在哪','做什麼'],[
 ['Cluster 常數／控制項',fn('Programming','Cluster, Class, & Variant','Cluster Constant')+'、'+ctl('Modern','Array, Matrix & Cluster','Cluster'),'把不同型別包在一起：這題是 Age（I32）和 Name（字串）。線是粉紅和咖啡交錯的粗線'],
 ['Unbundle By Name',fn('Programming','Cluster, Class, & Variant','Unbundle By Name'),'用名字取出一個元素。拉長可以一次取好幾個'],
 ['Bundle By Name',fn('Programming','Cluster, Class, & Variant','Bundle By Name'),'<b>上面一定要接一個 cluster</b>（當樣板和底稿），只把指定的元素換成新值，其他元素照抄底稿'],
 ['Concatenate Strings',fn('Programming','String','Concatenate Strings'),'把字串接起來'],
 ['Increment',fn('Programming','Numeric','Increment'),'加 1'],
 ['線分叉','一條線拉到兩個地方','每個地方拿到的是<b>同一個值的複本</b>。一邊改了，另一邊看不到']]),
C.h3('懂','','追線：每一步的值'),
`<p>這題的陷阱在<b>線從哪裡來</b>。原始 cluster 的線分成三條：一條到 Unbundle（拿 Name）、一條往下接第一個 Bundle 的上方輸入、一條沿著最上面一路拉到<b>第二個 Bundle 的上方輸入</b>。</p>`,
{fn:bundleLab},
C.table(['位置','值'],[
 ['原始 cluster','{18, "Jack"}'],
 ['Concatenate 之後','"Jack Williams"'],
 ['第一個 Bundle By Name 的輸出','{18, "Jack Williams"}'],
 ['Unbundle Age → Increment','19'],
 ['第二個 Bundle By Name（底稿是<b>原始</b> cluster {18, "Jack"}）','{<b>19</b>, "<b>Jack</b>"}　→ B']]),
warn('為什麼不是 D：','D 是 {19, "Jack Williams"}，要第二個 Bundle By Name 的上方輸入接<b>第一個 Bundle 的輸出</b>才會得到。題目的圖上，那條線是從最上面原始 cluster 拉下來的，所以改名字的結果沒有傳到最後。'),
C.table(['選項','什麼情況會得到'],[
 ['A {18, Jack}','兩個 Bundle 都沒作用（直接把原始 cluster 接到輸出）'],
 ['<b>B {19, Jack}</b>','<b>題目的接法</b>：最後的底稿是原始 cluster'],
 ['C {18, Jack Williams}','輸出接第一個 Bundle，沒有經過 Increment 那段'],
 ['D {19, Jack Williams}','最後的底稿接第一個 Bundle 的輸出（一路串下來）']]),
tip('LabVIEW 是「傳值」：','一條線分叉，就是把資料複製一份給每個去處。這和 C 語言的指標、Python 的 list 不一樣：沒有「改了一個地方、別的地方也跟著變」這件事（Reference 類型的 refnum 除外）。所以讀方塊圖時，看一個節點的輸入，一定要沿著線往回追到源頭。'),
note('沒有實測的部分：','這題沒有在 LabVIEW 裡建 VI 實測，因為 Bundle By Name 的元素名稱沒辦法用 VI 腳本設定。答案是照 LabVIEW 的資料流規則（線分叉＝複本）推出來的。'),
C.h3('做','b','自己做一次'),
{todo:[
 '前面板放 '+ctl('Modern','Array, Matrix & Cluster','Cluster')+'，裡面放一個 Numeric 改名 <code>Age</code>（Representation I32）和一個 String 改名 <code>Name</code>。右鍵 ▸ Change to Indicator 之前先複製一份當控制項，填 Age 18、Name Jack。',
 '方塊圖放 '+fn('Programming','Cluster, Class, & Variant','Unbundle By Name')+'，點元素選 Name；接 '+fn('Programming','String','Concatenate Strings')+'，下面接字串常數 <code> Williams</code>（前面有空白）。',
 '放 '+fn('Programming','Cluster, Class, & Variant','Bundle By Name')+'：<b>上方輸入接原始 cluster</b>，點元素選 Name，接 Concatenate 的結果。',
 '再一個 Unbundle By Name 選 Age → '+fn('Programming','Numeric','Increment')+' → 第二個 Bundle By Name 選 Age。',
 '第二個 Bundle By Name 的上方輸入：<b>先接原始 cluster</b>（和題目一樣），輸出接 Output Cluster，執行 → {19, Jack}。',
 '把上方輸入改接第一個 Bundle By Name 的輸出，再執行 → {19, Jack Williams}。'
]},
C.h3('測','q','小測驗'),
{quiz:[
 {q:'一條數值線分成兩條，一條接 Increment，另一條直接接顯示器 A，顯示器 A 顯示？',o:['原本的值（沒有加 1）','加 1 之後的值','不一定'],a:0,ex:'分叉是複本，Increment 改的是它自己那份。'},
 {q:'Bundle By Name 的上方輸入有什麼用？',o:['提供樣板和底稿：決定輸出的結構，沒換掉的元素照抄它','只是裝飾，可以不接','決定執行順序'],a:0,ex:'Bundle By Name 的上方輸入一定要接。'},
 {q:'題目改成第二個 Bundle By Name 的上方輸入接第一個 Bundle By Name 的輸出，答案變成？',o:['D {19, Jack Williams}','B {19, Jack}','C {18, Jack Williams}'],a:0,ex:'底稿已經是改過名字的那份，再改 Age。'}
]}
]});
})();
