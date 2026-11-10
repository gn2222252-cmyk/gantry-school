/* LabVIEW Format Into String，常用的格式碼，行為照 LabVIEW 2026 實測（labview_vi/out/fmt_results*.json）。
   LVFMT.format(fmt, value, type) → {text} 或 {err, msg}；type 是 'dbl'、'i32'、'str'。
   支援：%[-+0#][寬度][.精度] 加 d x X o b f e g p s，%% 和其他文字照抄。 */
(function(root){
const SI={'-15':'f','-12':'p','-9':'n','-6':'u','-3':'m','0':'','3':'k','6':'M','9':'G','12':'T'};
const RE=/%([-+0#]*)(\d+)?(?:\.(\d+))?([dxXobfegps])/g;

function strip(t){return t.indexOf('.')<0?t:t.replace(/0+$/,'').replace(/\.$/,'');}
/* 小數點後 p 位；剛好在一半時取偶數（LabVIEW 的 -2.5 → -2、%.0f 也一樣） */
function fixed(v,p){
  // toFixed with many digits is the exact decimal value of the double: 2.675 is really 2.67499…, 87.25 is exactly 87.25
  const ex=Math.abs(v).toFixed(Math.min(100,p+30)),cut=ex.indexOf('.')+(p?p+1:0),rest=ex.slice(cut).replace('.','');
  if(/^50*$/.test(rest)){
    const keep=ex.slice(0,cut).replace(/\.$/,''),last=+keep.replace('.','').slice(-1);
    if(last%2===0) return (v<0?'-':'')+keep;                     // tie: the even neighbour is the one below
  }
  return v.toFixed(p);
}
function roundEven(v){const f=Math.floor(v),d=v-f;if(d===0.5)return f%2===0?f:f+1;return Math.round(v);}
function intBase(v,base,type){
  let n=BigInt(roundEven(v));
  if(n<0n) n+=(1n<<BigInt(type==='i32'?32:64));
  return n.toString(base).toUpperCase();
}
function one(flags,width,prec,code,v,type){
  if(code==='s'){
    if(type!=='str') return {err:81};
    let t=String(v);if(prec!==undefined)t=t.slice(0,+prec);
    return {text:pad(t,flags,width,false)};
  }
  if(type==='str') return {err:81};
  let t,neg=false,num=+v;
  if(code==='d'){const r=roundEven(num);neg=r<0;t=String(Math.abs(r));}
  else if('xXob'.includes(code)){t=intBase(num,code==='o'?8:code==='b'?2:16,type);}
  else{
    const p=prec===undefined?6:+prec;neg=num<0||Object.is(num,-0)&&false;const a=Math.abs(num);
    if(code==='f'||code==='g'){t=fixed(a,p);if(flags.includes('#'))t=strip(t);}
    else if(code==='e'){
      if(a===0){t=(0).toFixed(p)+'E+0';}
      else{let ex=Math.floor(Math.log10(a)),m=a/Math.pow(10,ex);let ms=fixed(m,p);if(+ms>=10){ex+=1;ms=fixed(a/Math.pow(10,ex),p);}
        if(flags.includes('#'))ms=strip(ms);t=ms+'E'+(ex<0?'-':'+')+Math.abs(ex);}
    }else{ // p
      if(a===0){t=(0).toFixed(p);if(flags.includes('#'))t=strip(t);}
      else{let e3=Math.floor(Math.log10(a)/3)*3;e3=Math.max(-15,Math.min(12,e3));let ms=fixed(a/Math.pow(10,e3),p);
        if(+ms>=1000&&e3<12){e3+=3;ms=fixed(a/Math.pow(10,e3),p);}
        if(flags.includes('#'))ms=strip(ms);t=ms+SI[e3];}
    }
    if(+t.replace(/[^\d.]/g,'')===0&&!/[1-9]/.test(t)) neg=num<0&&false;
  }
  const sign=neg?'-':(flags.includes('+')&&!'xXob'.includes(code)?'+':'');
  if(flags.includes('0')&&!flags.includes('-')&&width){const w=+width-sign.length;while(t.length<w)t='0'+t;return {text:sign+t};}
  return {text:pad(sign+t,flags,width,true)};
}
function pad(t,flags,width,num){
  if(!width) return t;const w=+width;
  if(t.length>=w) return t;
  const sp=' '.repeat(w-t.length);
  return flags.includes('-')?t+sp:sp+t;
}
function format(fmt,value,type){
  const parts=[];let last=0,m,count=0,err=null;
  const src=fmt.replace(/%%/g,'\u0000');
  RE.lastIndex=0;
  while((m=RE.exec(src))){
    parts.push(src.slice(last,m.index));
    count++;
    if(count===1){const r=one(m[1],m[2],m[3],m[4],value,type);if(r.err){err=r.err;break;}parts.push(r.text);}
    last=RE.lastIndex;
  }
  if(err) return {err,msg:'錯誤 81：格式碼和輸入的型別不合（例如數字配 %s、字串配 %d）。'};
  if(count===0) return {err:83,msg:'錯誤 83：格式字串裡沒有格式碼，但有一個輸入要放。'};
  if(count>1) return {err:-1,msg:'這個練習只有一個輸入，格式碼只能有一個。LabVIEW 裡要幾個輸入，就要有幾個格式碼。'};
  parts.push(src.slice(last));
  return {text:parts.join('').replace(/\u0000/g,'%')};
}
root.LVFMT={format};
if(typeof module!=='undefined') module.exports=root.LVFMT;
})(typeof window!=='undefined'?window:globalThis);
