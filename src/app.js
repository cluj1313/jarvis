(function(){
'use strict';
var $=function(id){return document.getElementById(id)};
var BLANK=!!window.JARVIS_BLANK||/[?&]gol\b/.test(location.search),PFX=BLANK?'jvb_':'';
var LS={get:function(k,d){try{var v=localStorage.getItem(PFX+k);return v?JSON.parse(v):d}catch(e){return d}},set:function(k,v){try{localStorage.setItem(PFX+k,JSON.stringify(v))}catch(e){}}};
/* v21: drop AI/search keys */
(function(){['jv_gkey','jv_skey','jv_chat','jv_gmodel','jv_gauto','jv_gnosearch'].forEach(function(k){try{localStorage.removeItem(PFX+k)}catch(e){}})})();
var ZILE=['Duminică','Luni','Marți','Miercuri','Joi','Vineri','Sâmbătă'];
var ZILE_S=['Dum','Lun','Mar','Mie','Joi','Vin','Sâm'];
var LUNI=['ianuarie','februarie','martie','aprilie','mai','iunie','iulie','august','septembrie','octombrie','noiembrie','decembrie'];
var LUNI_S=['ian','feb','mar','apr','mai','iun','iul','aug','sept','oct','nov','dec'];
function pad(n){return (n<10?'0':'')+n}
function dkey(d){d=d||new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function toast(m){var t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(function(){t.classList.remove('show')},3000)}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
var DEFAULT_STATUS='Agent local. Doar vreme și taskuri.';
function setStatus(m,err){var s=$('vstatus');s.textContent=m||(cfg&&!cfg.name?'Setează-ți numele în Setări.':DEFAULT_STATUS);s.className='status'+(err?' err':'')}

/* ---------- settings ---------- */
var cfg=null;cfg=Object.assign({name:BLANK?'':'Iosif',city:'Gherla',lat:47.03,lon:23.91,tz:'Europe/Bucharest',engine:'piper',rate:1.25,pitch:null,voiceURI:null,
 clockFont:'condensed',clockColor:'#3fd8ff',clockSize:56},LS.get('jv_cfg',{}));
if(cfg.engine==='piper'||!cfg.engine||(cfg.engine!=='browser'&&!TTS.voice(cfg.engine)))cfg.engine='mihai';if(cfg.tone==null)cfg.tone=1;
if(!LS.get('jv_v4',false)){cfg.clockFont='condensed';cfg.clockSize=56;cfg.clockColor='#3fd8ff';LS.set('jv_v4',true);LS.set('jv_cfg',cfg)}
if(!LS.get('jv_v3',false)){cfg.engine='mihai';if(cfg.rate==null||cfg.rate===1.3)cfg.rate=1.25;LS.set('jv_v3',true);LS.set('jv_cfg',cfg)}
function saveCfg(){LS.set('jv_cfg',cfg)}

/* ---------- clock ---------- */
var FONTS=[
 {id:'condensed',name:'Condensat (implicit)',css:'"Roboto Condensed",Oswald,"Arial Narrow",sans-serif-condensed,sans-serif',w:700,k:1},
 {id:'orbitron',name:'Orbitron',css:'Orbitron,monospace',w:700,k:1},
 {id:'rajdhani',name:'Rajdhani',css:'Rajdhani,sans-serif',w:700,k:1.25},
 {id:'sharetech',name:'Share Tech Mono',css:'"Share Tech Mono",monospace',w:400,k:1.2},
 {id:'audiowide',name:'Audiowide',css:'Audiowide,sans-serif',w:400,k:1},
 {id:'teko',name:'Teko',css:'Teko,sans-serif',w:500,k:1.45},
 {id:'oxanium',name:'Oxanium',css:'Oxanium,sans-serif',w:700,k:1.1},
 {id:'dseg7',name:'DSEG7 (7 segmente)',css:'"DSEG7 Classic",monospace',w:700,k:.9,seg:'88.88'},
 {id:'dseg14',name:'DSEG14 (14 segm.)',css:'"DSEG14 Classic",monospace',w:700,k:.9,seg:'~~.~~'},
 {id:'mono',name:'Monospace sistem',css:'ui-monospace,"Roboto Mono","Droid Sans Mono",Menlo,Consolas,monospace',w:700,k:1.15}];
function fontById(id){return FONTS.filter(function(f){return f.id===id})[0]||FONTS[0]}
function applyClock(c){c=c||cfg;var f=fontById(c.clockFont),el=$('clock');
 el.style.fontFamily=f.css;el.style.fontWeight=f.w;el.style.fontSize=Math.round(c.clockSize*f.k)+'px';
 document.documentElement.style.setProperty('--clock',c.clockColor);
 el.classList.toggle('seg',!!f.seg);if(f.seg)el.setAttribute('data-ghost',f.seg)}
applyClock();
var newsScale=+LS.get('jv_newssize',100)||100;
function applyNewsSize(p){p=Math.max(80,Math.min(160,+p||100));var s=String(p/100);var c=$('cNews');if(c)c.style.setProperty('--ns',s);var pv=$('newsSizePrev');if(pv)pv.style.setProperty('--ns',s)}
applyNewsSize(newsScale);

/* ---------- greeting ---------- */
function greeting(){var h=new Date().getHours();var g=h>=5&&h<12?'Bună dimineața':h>=12&&h<18?'Bună ziua':'Bună seara';return cfg.name?g+', '+cfg.name+'.':g+'!'}
function greetFull(){return greeting()+' Sunt Jarvis, asistentul tău. Cu ce te pot ajuta?'}
var greetBusy=false,greetRestoreT=null;
function renderGreet(force){if(greetBusy&&!force)return;greetBusy=false;
 var seg=prepSeg($('greet'),greetFull());var i=seg.words.length-1;
 greetStatic={seg:seg,span:seg.words[i]&&seg.words[i].span};
 requestAnimationFrame(function(){moveBar(seg,greetStatic.span,true)})} /* static underline under "ajuta" */
var greetStatic=null;
function reflowBars(){if(activeSeg&&activeSeg.cur>=0&&activeSeg.words[activeSeg.cur].span)moveBar(activeSeg,activeSeg.words[activeSeg.cur].span,true);
 if(greetStatic&&greetStatic.span&&greetStatic.span.isConnected&&activeSeg!==greetStatic.seg)moveBar(greetStatic.seg,greetStatic.span,true)}
if(document.fonts){if(document.fonts.ready)document.fonts.ready.then(reflowBars);if(document.fonts.addEventListener)document.fonts.addEventListener('loadingdone',reflowBars)}
var lastDay=dkey();
function dayCheck(){if(dkey()===lastDay)return;lastDay=dkey();rollTasks();renderTasks();renderShop();renderTabs()}
document.addEventListener('visibilitychange',function(){if(!document.hidden)dayCheck()});window.addEventListener('focus',dayCheck);
(function midnight(){var n=new Date(),m=new Date(n.getFullYear(),n.getMonth(),n.getDate()+1,0,0,2);setTimeout(function(){dayCheck();midnight()},Math.max(1000,m-n))})();
function tick(){var d=new Date();$('clock').textContent=pad(d.getHours())+'.'+pad(d.getMinutes());
 if(d.getSeconds()===0||!tick.done){if(!speaking)renderGreet();tick.done=1}
 dayCheck()}

/* ---------- karaoke core ---------- */
/* A segment = a piece of text shown in a DOM element; every word becomes a span, and the element gets its own glowing bar. */
function prepSeg(el,text){var seg={el:el,text:text,words:[],bar:null,cur:-1};
 var re=/\S+/g,m,last=0,html='';
 while((m=re.exec(text))){seg.words.push({s:m.index,e:m.index+m[0].length,w:m[0]});
  if(el)html+=esc(text.slice(last,m.index))+'<span class="w">'+esc(m[0])+'</span>';last=re.lastIndex}
 if(el){el.innerHTML=html+esc(text.slice(last))+'<span class="kbar"></span>';el.classList.add('kw');
  var sp=el.querySelectorAll('.w');seg.words.forEach(function(w,i){w.span=sp[i]});seg.bar=el.querySelector('.kbar')}
 return seg}
function moveBar(seg,span,instant){var b=seg&&seg.bar;if(!b)return;if(!span){b.classList.remove('show');return}
 if(instant)b.style.transition='none';
 b.style.width=span.offsetWidth+'px';b.style.transform='translate('+span.offsetLeft+'px,'+(span.offsetTop+span.offsetHeight)+'px)';b.classList.add('show');
 if(instant){void b.offsetWidth;b.style.transition=''}}
var activeSeg=null;
function hl(seg,i){if(!seg)return;
 if(activeSeg!==seg){if(activeSeg)clearSeg(activeSeg);activeSeg=seg;seg.cur=-1;
  if(seg.el&&seg.el.scrollIntoView&&seg.el.isConnected){var r=seg.el.getBoundingClientRect();if(r.top<70||r.bottom>innerHeight-110)seg.el.scrollIntoView({block:'center',behavior:'smooth'})}}
 if(i===seg.cur||i<0||i>=seg.words.length)return;seg.cur=i;
 if(!seg.el)return;
 seg.words.forEach(function(w,j){if(w.span){w.span.classList.toggle('cur',j===i);w.span.classList.toggle('past',j<i)}});
 moveBar(seg,seg.words[i].span,false)}
function clearSeg(seg){if(!seg)return;seg.words.forEach(function(w){if(w.span)w.span.classList.remove('cur','past')});moveBar(seg,null)}
function clearActive(){if(activeSeg)clearSeg(activeSeg);activeSeg=null}
addEventListener('resize',reflowBars);

/* ---------- weather ---------- */
var WMO={0:['Cer senin','clear','Senin'],1:['Predominant senin','clear','Senin'],2:['Parțial noros','partly','Parțial noros'],3:['Cer acoperit','cloud','Acoperit'],45:['Ceață','fog','Ceață'],48:['Ceață cu chiciură','fog','Chiciură'],
51:['Burniță slabă','drizzle','Burniță'],53:['Burniță','drizzle','Burniță'],55:['Burniță densă','drizzle','Burniță'],56:['Burniță înghețată','drizzle','Burniță'],57:['Burniță înghețată','drizzle','Burniță'],
61:['Ploaie slabă','rain','Ploaie'],63:['Ploaie','rain','Ploaie'],65:['Ploaie puternică','rain','Ploaie'],66:['Ploaie înghețată','rain','Ploaie'],67:['Ploaie înghețată','rain','Ploaie'],
71:['Ninsoare slabă','snow','Ninsoare'],73:['Ninsoare','snow','Ninsoare'],75:['Ninsoare abundentă','snow','Ninsoare'],77:['Fulgi de zăpadă','snow','Ninsoare'],
80:['Averse slabe','rain','Averse'],81:['Averse de ploaie','rain','Averse'],82:['Averse puternice','rain','Averse'],85:['Averse de ninsoare','snow','Ninsoare'],86:['Averse de ninsoare','snow','Ninsoare'],
95:['Furtună','storm','Furtună'],96:['Furtună cu grindină','storm','Furtună'],99:['Furtună cu grindină','storm','Furtună']};
var _iconN=0;
function iconDefs(u){return '<defs>'+
 '<radialGradient id="'+u+'sg" cx="38%" cy="35%" r="60%"><stop offset="0%" stop-color="#fff6c8"/><stop offset="45%" stop-color="#ffd24a"/><stop offset="100%" stop-color="#ff8a1a"/></radialGradient>'+
 '<radialGradient id="'+u+'sg2" cx="40%" cy="35%" r="55%"><stop offset="0%" stop-color="#ffe9a0"/><stop offset="100%" stop-color="#ffb020" stop-opacity="0"/></radialGradient>'+
 '<radialGradient id="'+u+'mg" cx="40%" cy="35%" r="65%"><stop offset="0%" stop-color="#f0f6ff"/><stop offset="55%" stop-color="#c5d4ea"/><stop offset="100%" stop-color="#7a90b0"/></radialGradient>'+
 '<linearGradient id="'+u+'cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="45%" stop-color="#e8eef5"/><stop offset="100%" stop-color="#9aafc0"/></linearGradient>'+
 '<linearGradient id="'+u+'cgd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#d8e0ea"/><stop offset="50%" stop-color="#a8b8c8"/><stop offset="100%" stop-color="#6a7f92"/></linearGradient>'+
 '<linearGradient id="'+u+'cgs" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#5a6a7c"/><stop offset="100%" stop-color="#2a3544"/></linearGradient>'+
 '<linearGradient id="'+u+'rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7ad4ff"/><stop offset="100%" stop-color="#2a8fd4"/></linearGradient>'+
 '<linearGradient id="'+u+'lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff6a0"/><stop offset="50%" stop-color="#ffd020"/><stop offset="100%" stop-color="#ff8a00"/></linearGradient>'+
 '<filter id="'+u+'glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'+
 '<filter id="'+u+'soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.1"/></filter>'+
 '<filter id="'+u+'fluff" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".6"/></filter>'+
 '</defs>'}
function sunBody(u,cx,cy,r){return '<circle cx="'+cx+'" cy="'+cy+'" r="'+(r*1.55)+'" fill="url(#'+u+'sg2)" opacity=".55"/>'+
 '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="url(#'+u+'sg)" filter="url(#'+u+'glow)"/>'+
 '<circle cx="'+(cx-r*.28)+'" cy="'+(cy-r*.32)+'" r="'+(r*.28)+'" fill="#fff" opacity=".35"/>'}
function moonBody(u,cx,cy,r){return '<g filter="url(#'+u+'glow)"><path d="M'+(cx+r*.15)+' '+(cy-r)+'a'+r+' '+r+' 0 1 0 '+(r*.2)+' '+(r*1.85)+'a'+(r*.72)+' '+(r*.72)+' 0 1 1 -'+(r*.2)+' -'+(r*1.85)+'z" fill="url(#'+u+'mg)"/></g>'+
 '<circle cx="'+(cx+r*.35)+'" cy="'+(cy-r*.2)+'" r="'+(r*.12)+'" fill="#9eb0c8" opacity=".35"/>'+
 '<circle cx="'+(cx+r*.1)+'" cy="'+(cy+r*.25)+'" r="'+(r*.08)+'" fill="#9eb0c8" opacity=".28"/>'}
function cloudBody(u,x,y,sc,dark){sc=sc||1;var g=dark?(dark===2?u+'cgs':u+'cgd'):u+'cg';
 return '<g transform="translate('+x+' '+y+') scale('+sc+')" filter="url(#'+u+'fluff)">'+
 '<ellipse cx="22" cy="28" rx="14" ry="10" fill="url(#'+g+')"/><ellipse cx="36" cy="24" rx="16" ry="12" fill="url(#'+g+')"/>'+
 '<ellipse cx="50" cy="30" rx="12" ry="9" fill="url(#'+g+')"/><ellipse cx="36" cy="34" rx="22" ry="11" fill="url(#'+g+')"/>'+
 (dark?'':'<ellipse cx="30" cy="22" rx="10" ry="6" fill="#fff" opacity=".45"/>')+'</g>'}
function rainDrops(u,y){y=y||46;return '<g fill="url(#'+u+'rg)" opacity=".9">'+
 '<path d="M20 '+y+'q1.2 3 0 6q-1.2-3 0-6z"/><path d="M28 '+(y+3)+'q1.4 3.5 0 7q-1.4-3.5 0-7z"/><path d="M36 '+y+'q1.2 3 0 6q-1.2-3 0-6z"/>'+
 '<path d="M44 '+(y+4)+'q1.3 3.2 0 6.5q-1.3-3.3 0-6.5z"/><path d="M24 '+(y+8)+'q1 2.5 0 5q-1-2.5 0-5z"/><path d="M40 '+(y+9)+'q1 2.5 0 5q-1-2.5 0-5z"/></g>'}
function snowFlakes(y){y=y||48;return '<g fill="#eef6ff" opacity=".95">'+
 '<circle cx="22" cy="'+y+'" r="2.2"/><circle cx="32" cy="'+(y+4)+'" r="2.6"/><circle cx="42" cy="'+y+'" r="2.2"/>'+
 '<circle cx="27" cy="'+(y+10)+'" r="1.8"/><circle cx="37" cy="'+(y+11)+'" r="1.9"/>'+
 '<g stroke="#eef6ff" stroke-width="1.2" stroke-linecap="round" opacity=".7"><path d="M22 '+(y-3)+'v6M19 '+y+'h6"/><path d="M42 '+(y-3)+'v6M39 '+y+'h6"/></g></g>'}
function fogBands(u){return '<g stroke="#c8d6e4" stroke-width="3.2" stroke-linecap="round" opacity=".75" filter="url(#'+u+'soft)"><path d="M12 40h40"/><path d="M16 48h32" opacity=".85"/><path d="M14 56h36" opacity=".65"/></g>'}
function bolt(u){return '<path d="M36 34l-9 12h6.5l-4.5 12 13-16h-7l5.5-8z" fill="url(#'+u+'lg)" filter="url(#'+u+'glow)"/>'}
function icon(kind,day){var u='i'+(_iconN++),body='';
 if(kind==='clear')body=day?sunBody(u,32,32,14):moonBody(u,34,32,16);
 else if(kind==='partly')body=(day?sunBody(u,22,20,10):moonBody(u,22,18,11))+cloudBody(u,4,18,.95);
 else if(kind==='cloud')body=cloudBody(u,-2,8,1.05,1)+cloudBody(u,6,16,1);
 else if(kind==='fog')body=cloudBody(u,2,2,.9)+fogBands(u);
 else if(kind==='drizzle')body=cloudBody(u,2,4)+'<g opacity=".7">'+rainDrops(u,48)+'</g>';
 else if(kind==='rain')body=cloudBody(u,2,2,1,1)+rainDrops(u,46);
 else if(kind==='snow')body=cloudBody(u,2,2)+snowFlakes(48);
 else if(kind==='storm')body=cloudBody(u,0,0,1.05,2)+bolt(u)+'<g opacity=".55">'+rainDrops(u,50)+'</g>';
 else body=cloudBody(u,2,10);
 return '<svg viewBox="0 0 64 64" aria-hidden="true">'+iconDefs(u)+body+'</svg>'}
function windTxt(k){return k<6?'Vânt calm':k<20?'Vânt slab':k<39?'Vânt moderat':k<62?'Vânt puternic':'Vânt foarte puternic'}
var wx=LS.get('jv_wx',null);
function wxSentence(w){if(!w)return 'Nu am date despre vreme.';var d=WMO[w.code]||['Vreme variabilă','cloud','Variabil'];
 var s=d[0]+'. Acum '+Math.round(w.temp)+' grade. Maxima '+Math.round(w.max)+', minima '+Math.round(w.min)+'. Șanse de ploaie: '+w.pp+'%. '+windTxt(w.wind)+'.';
 var rainy=/rain|storm|drizzle/.test(d[1]);s+=(w.pp>=40||rainy)?' Ia umbrela cu tine.':' Nu ai nevoie de umbrelă.';return s}
function wxDayLabel(iso){var p=String(iso||'').split('-');if(p.length<3)return'—';
 var d=new Date(+p[0],+p[1]-1,+p[2]);return ZILE_S[d.getDay()]+' '+d.getDate()}
function renderWxDays(){var el=$('wxdays');if(!el)return;el.innerHTML='';
 var days=(wx&&wx.days)||[];if(!days.length){el.hidden=true;return}el.hidden=false;
 days.slice(0,5).forEach(function(day){var d=WMO[day.code]||['Vreme variabilă','cloud','Variabil'];
  var cell=document.createElement('div');cell.className='wxday';
  var lab=document.createElement('div');lab.className='wd';lab.textContent=wxDayLabel(day.date);cell.appendChild(lab);
  var ic=document.createElement('div');ic.className='wi';ic.innerHTML=icon(d[1],1);cell.appendChild(ic);
  el.appendChild(cell)})}
function renderWx(){$('wxlbl').textContent='Vremea · '+cfg.city;
 if(!wx){$('wxicon').innerHTML=icon('cloud',1);$('wxtemp').textContent='—°';$('wxcond').textContent='Se încarcă…';$('wxfeel').textContent='';$('wxline').textContent='';$('wxhi').textContent='';$('wxmeta').textContent='';renderWxDays();return}
 var d=WMO[wx.code]||['Vreme variabilă','cloud','Variabil'];$('wxicon').innerHTML=icon(d[1],wx.day);
 $('wxtemp').textContent=Math.round(wx.temp)+'°';
 $('wxcond').textContent=d[2]||d[0];
 $('wxfeel').textContent=wx.feel!=null?'Se simte ca: '+Math.round(wx.feel)+'°C':'';
 $('wxhi').textContent=Math.round(wx.max)+'°/'+Math.round(wx.min)+'°';
 $('wxline').textContent='Ploaie '+wx.pp+'% · '+windTxt(wx.wind);
 if(!(speaking&&activeSeg&&activeSeg.el===$('wxtxt')))$('wxtxt').textContent=wxSentence(wx);
 var t=new Date(wx.ts),n=new Date();
 var when=dkey(t)===dkey(n)?'azi la '+pad(t.getHours())+':'+pad(t.getMinutes()):t.getDate()+' '+LUNI_S[t.getMonth()]+' '+pad(t.getHours())+':'+pad(t.getMinutes());
 $('wxmeta').textContent='Actualizat '+when+(wx.stale?' (offline)':'');
 renderWxDays()}
function loadWx(){
 var u='https://api.open-meteo.com/v1/forecast?latitude='+cfg.lat+'&longitude='+cfg.lon+'&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone='+encodeURIComponent(cfg.tz||'Europe/Bucharest')+'&forecast_days=5';
 return fetch(u).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()}).then(function(j){
  var days=[],time=(j.daily&&j.daily.time)||[],codes=(j.daily&&j.daily.weather_code)||[];
  for(var i=0;i<Math.min(5,time.length);i++)days.push({date:time[i],code:codes[i]});
  wx={temp:j.current.temperature_2m,feel:j.current.apparent_temperature,code:j.current.weather_code,wind:j.current.wind_speed_10m,day:j.current.is_day===1,
   max:j.daily.temperature_2m_max[0],min:j.daily.temperature_2m_min[0],pp:j.daily.precipitation_probability_max[0]||0,days:days,ts:Date.now(),city:cfg.city};
  LS.set('jv_wx',wx);renderWx()}).catch(function(){if(wx){wx.stale=true;renderWx()}else{$('wxcond').textContent='Fără date';$('wxtxt').textContent='Nu pot încărca vremea (fără internet?).';renderWx()}})}

/* ---------- tasks (never lost: open tasks carry over; done/deleted kept as history) ---------- */
var tasks=LS.get('jv_tasks',null);
if(!tasks&&BLANK)tasks=[];
if(!tasks){ /* first visit of the owner's page only; the shared blank copy never seeds */var y=new Date();y.setDate(y.getDate()-1);var yk=dkey(y),tk0=dkey(),i0=0;
 tasks=[['De comandat ață gri de 20. De vorbit cu Grig ori cu Alex',yk],['De curățat uleiul de sub mașina de cusut',yk],['Scaune Sorin',tk0],['Burete pat Leia, strada Dejului, de sunat',tk0],['Contor apă',tk0]]
  .map(function(a){return{id:Date.now()+'_'+(i0++),text:a[0],date:a[1],done:false,doneDate:null}});LS.set('jv_tasks',tasks)} /* (v15 migrate() below gives them dueDay) */
function save(){LS.set('jv_tasks',tasks);histPush()}
function live(t){return !t.deleted}
function visible(t){return live(t)&&(!t.done||t.doneDate===dkey())} /* done tasks stay visible until the end of the day they were completed */
function dayOff(n){var d=new Date();d.setDate(d.getDate()+n);return dkey(d)}
function shortDate(k){var p=k.split('-');return 'din '+(+p[2])+' '+LUNI_S[+p[1]-1]}
/* v15: Azi / Mâine. Each task has dueDay. Azi = dueDay <= today (open, or done today); Mâine = dueDay >= tomorrow.
   Open tasks whose dueDay passed roll to today (fromDay keeps the first day they were due -> "din 3 oct" note). */
function inList(t,which){var tk=dkey();return which==='maine'?t.dueDay>tk:t.dueDay<=tk}
function listFor(which){return tasks.filter(function(t){return visible(t)&&inList(t,which)}).sort(urgOrd(which==='maine'?'maine':'azi'))}
/* v14: explicit order set by drag & drop (ord + ordK = list it was ordered in); unordered items keep the old date order, after the ordered ones */
function ordCmp(k){return function(a,b){var oa=a.ord!=null&&a.ordK===k,ob=b.ord!=null&&b.ordK===k;
 if(oa&&ob)return a.ord-b.ord;if(oa!==ob)return oa?-1:1;return a.date<b.date?-1:a.date>b.date?1:0}}
function urgOrd(k){return function(a,b){if(!!a.urgent!==!!b.urgent)return a.urgent?-1:1;return ordCmp(k+(a.urgent?':u':':n'))(a,b)}}
function urgSort(a,b){if(!!a.urgent!==!!b.urgent)return a.urgent?-1:1;return 0}
(function migrate(){var tk=dkey(),need=tasks.filter(function(t){return !t.dueDay});if(!need.length)return;
 /* keep what v14 showed: old "ieri" list, then "noi", in their on-screen order -> all open ones go to Azi */
 var vis=function(t){return !t.dueDay&&visible(t)},seen=tasks.filter(function(t){return vis(t)&&t.date<tk}).sort(ordCmp('old'))
  .concat(tasks.filter(function(t){return vis(t)&&!(t.date<tk)}).sort(ordCmp('new@'+tk)));
 need.forEach(function(t){if(live(t)&&!t.done){t.dueDay=tk;if(t.date&&t.date<tk)t.fromDay=t.date}else t.dueDay=t.date||tk;delete t.ord;delete t.ordK});
 seen.forEach(function(t,i){t.ord=i;t.ordK='azi'});LS.set('jv_tasks',tasks)})();
function rollTasks(){var tk=dkey(),ch=false;tasks.forEach(function(t){if(live(t)&&!t.done&&t.dueDay<tk){if(!t.fromDay)t.fromDay=t.dueDay;t.dueDay=tk;ch=true}});
 if(ch){LS.set('jv_tasks',tasks);if(typeof hCur!=='undefined'&&hCur!==null)hCur=snap()}return ch}
(function(){var ch=false;tasks.forEach(function(t){if(t.urgent==null){t.urgent=false;ch=true}});if(ch)LS.set('jv_tasks',tasks)})();
rollTasks();
function renderItem(t,stHtml){var li=document.createElement('li');li.className='task'+(t.done?' done':'')+(t.urgent?' urgent':'');li.dataset.id=t.id;
 li.innerHTML='<span class="dot"></span><span class="t kw">'+esc(t.text)+'</span><span class="st">'+stHtml+'</span><button class="ed" aria-label="Editează">✎</button><button class="x" aria-label="Șterge">×</button>';return li}
function fillList(ul,list,emptyTxt,makeLi){ul.innerHTML=list.length?'':'<li class="empty">'+emptyTxt+'</li>';if(!list.length)return;
 list.filter(function(x){return x.urgent}).forEach(function(x){ul.appendChild(makeLi(x))});
 var sep=document.createElement('li');sep.className='jv-sep';sep.setAttribute('aria-hidden','true');sep.innerHTML='<span>URGENT ↑</span>';ul.appendChild(sep);
 list.filter(function(x){return !x.urgent}).forEach(function(x){ul.appendChild(makeLi(x))})}
function renderTasks(){
 [['lAzi','azi'],['lMaine','maine']].forEach(function(p){
  var ul=$(p[0]),list=listFor(p[1]),tk=dkey();
  fillList(ul,list,'Niciun task.',function(t){return renderItem(t,(t.done?'Făcut':'Deschis')+(p[1]==='azi'&&t.fromDay&&t.fromDay<tk?'<small>'+shortDate(t.fromDay)+'</small>':''))})});updCardCount('azi');updCardCount('maine')}
function findT(id){for(var i=0;i<tasks.length;i++)if(tasks[i].id===id)return i;return -1}
function delTask(id){var i=findT(id);if(i<0)return;if(confirm('Ștergi taskul „'+tasks[i].text+'"?')){tasks[i].deleted=new Date().toISOString();save();renderTasks()}}
function addTask(txt,which){txt=(txt||'').trim();if(!txt)return false;txt=txt.charAt(0).toUpperCase()+txt.slice(1);
 tasks.push({id:Date.now()+'_'+Math.random().toString(36).slice(2,6),text:txt,date:dkey(),dueDay:which==='maine'?dayOff(1):dkey(),done:false,doneDate:null,urgent:false,created:new Date().toISOString()});save();renderTasks();return true}
['lAzi','lMaine'].forEach(function(id){var ul=$(id);
 ul.addEventListener('click',function(e){var li=e.target.closest('.task');if(!li||li.classList.contains('editing'))return;
  if(e.target.closest('.ed')){var i=findT(li.dataset.id);if(i>=0)startEdit(li,tasks[i],save,renderTasks);return}
  if(e.target.classList.contains('x')){delTask(li.dataset.id);return}
  if(dndEat())return
  var i=findT(li.dataset.id);if(i<0)return;var t=tasks[i];t.done=!t.done;t.doneDate=t.done?dkey():null;t.doneAt=t.done?new Date().toISOString():null;save();renderTasks()});
 ul.addEventListener('contextmenu',function(e){if(e.target.closest('.task'))e.preventDefault()})});
$('fAdd').addEventListener('submit',function(e){e.preventDefault();if(addTask($('iTask').value,'azi')){$('iTask').value='';toast('Task adăugat pentru azi')}});
$('fAddM').addEventListener('submit',function(e){e.preventDefault();if(addTask($('iTaskM').value,'maine')){$('iTaskM').value='';toast('Task adăugat pentru mâine')}});

/* ---------- inline edit (tasks + shopping): keeps id/date/done, records editedAt ---------- */
var editing=null;
function startEdit(li,item,saveFn,rerender){if(editing&&editing!==li&&editing.isConnected)return;
 if(speaking)stopSpeaking();editing=li;li.classList.add('editing');var t=li.querySelector('.t');t.classList.remove('kw');
 t.innerHTML='<textarea class="edin" rows="1" enterkeyhint="done" aria-label="Editează textul"></textarea><span class="edb"><button type="button" class="btn eok" aria-label="Salvează">✓</button><button type="button" class="btn eno" aria-label="Anulează">✕</button></span>';
 var ta=t.querySelector('textarea');ta.value=item.text;
 function grow(){ta.style.height='auto';ta.style.height=ta.scrollHeight+'px'}
 function close(){editing=null;rerender()}
 function ok(e){if(e){e.preventDefault();e.stopPropagation()}var v=ta.value.replace(/\s+/g,' ').trim();
  if(!v){toast('Textul nu poate fi gol');ta.focus();return}
  if(v!==item.text){item.text=v;item.editedAt=new Date().toISOString();saveFn();toast('Salvat')}close()}
 function no(e){if(e){e.preventDefault();e.stopPropagation()}close()}
 ta.addEventListener('input',grow);
 ta.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){ok(e)}else if(e.key==='Escape'){no(e)}});
 t.querySelector('.eok').addEventListener('click',ok);t.querySelector('.eno').addEventListener('click',no);
 ['click','pointerdown'].forEach(function(ev){t.addEventListener(ev,function(e){e.stopPropagation()})});
 grow();ta.focus();try{ta.setSelectionRange(ta.value.length,ta.value.length)}catch(_){}}

/* ---------- shopping list (unbought items carry over forever; bought ones vanish after their day; hidden = kept in storage) ---------- */
var shop=LS.get('jv_shop',[]);
function saveShop(){LS.set('jv_shop',shop);histPush()}
function shopVisible(s){return !s.hidden&&(!s.bought||s.boughtDate===dkey())}
function shopList(){return shop.filter(shopVisible).sort(urgSort)}
(function(){var ch=false;shop.forEach(function(s){if(s.urgent==null){s.urgent=false;ch=true}});if(ch)LS.set('jv_shop',shop)})();
function renderShop(){renderShop0();updCardCount('shop')}
function renderShop0(){var ul=$('lShop'),list=shopList();
 fillList(ul,list,'Lista e goală.',function(s){var li=document.createElement('li');li.className='task'+(s.bought?' done':'')+(s.urgent?' urgent':'');li.dataset.id=s.id;
  li.innerHTML='<span class="dot"></span><span class="t kw">'+esc(s.text)+'</span><span class="st">'+(s.bought?'Cumpărat':'De luat')+(s.date<dkey()?'<small>'+shortDate(s.date)+'</small>':'')+'</span><button class="ed" aria-label="Editează">✎</button><button class="x" aria-label="Ascunde">×</button>';return li})}
function findS(id){for(var i=0;i<shop.length;i++)if(shop[i].id===id)return shop[i];return null}
function hideShop(id){var s=findS(id);if(!s)return;if(confirm('Scoți „'+s.text+'" din listă?')){s.hidden=new Date().toISOString();saveShop();renderShop()}}
function addShop(txt){txt=(txt||'').trim();if(!txt)return false;txt=txt.charAt(0).toUpperCase()+txt.slice(1);
 shop.push({id:Date.now()+'_'+Math.random().toString(36).slice(2,6),text:txt,date:dkey(),bought:false,boughtDate:null,urgent:false,created:new Date().toISOString()});saveShop();renderShop();return true}
(function(){var ul=$('lShop');
 ul.addEventListener('click',function(e){var li=e.target.closest('.task');if(!li||li.classList.contains('editing'))return;
  if(e.target.closest('.ed')){var s=findS(li.dataset.id);if(s)startEdit(li,s,saveShop,renderShop);return}
  if(e.target.classList.contains('x')){hideShop(li.dataset.id);return}
  if(dndEat())return
  var s=findS(li.dataset.id);if(!s)return;s.bought=!s.bought;s.boughtDate=s.bought?dkey():null;s.boughtAt=s.bought?new Date().toISOString():null;saveShop();renderShop()});
 ul.addEventListener('contextmenu',function(e){if(e.target.closest('.task'))e.preventDefault()})})();
$('fShop').addEventListener('submit',function(e){e.preventDefault();if(addShop($('iShop').value)){$('iShop').value='';toast('Produs adăugat')}});
$('bMicShop').onclick=function(){var i=$('iShop');i.focus();try{i.click()}catch(e){}};


/* ---------- custom tabs (list cards like Cumpărături; open items carry over, done ones vanish after their day; deleted tab/items = hidden, kept in storage) ---------- */
var tabs=LS.get('jv_tabs',[]),TCOL=['#3fd8ff','#4ade80','#facc15','#ffb547','#ff6b6b','#f472b6','#c084fc','#94a3b8'];
var MIC_SVG='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/></svg>';
var SPK_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
var TRASH_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>';
function uid(){return Date.now()+'_'+Math.random().toString(36).slice(2,6)}
function saveTabs(){LS.set('jv_tabs',tabs);histPush()}
function visTabs(){return tabs.filter(function(t){return !t.hidden})}
function findTab(id){for(var i=0;i<tabs.length;i++)if(tabs[i].id===id)return tabs[i];return null}
function findTI(tab,id){for(var i=0;i<tab.items.length;i++)if(tab.items[i].id===id)return tab.items[i];return null}
function tiVisible(x){return !x.hidden&&(!x.done||x.doneDate===dkey())}
function tabList(tab){return tab.items.filter(tiVisible).sort(urgSort)}
(function(){var ch=false;tabs.forEach(function(tab){(tab.items||[]).forEach(function(s){if(s.urgent==null){s.urgent=false;ch=true}})});if(ch)LS.set('jv_tabs',tabs)})();
var tabCol=LS.get('jv_tabcol',{});if(!tabCol||typeof tabCol!=='object')tabCol={}; /* v25: collapsed custom tabs (not in undo history) */
function tabOpenCount(tab){return tabList(tab).filter(function(x){return !x.done}).length}
function updTabCount(tab){var n=document.querySelector('#ct_'+tab.id+' .tcnt');if(n)n.textContent='· '+tabOpenCount(tab)}
function toggleTabCol(tab){var c=$('ct_'+tab.id);if(!c)return;var col=!c.classList.contains('col');c.classList.toggle('col',col);
 if(col)tabCol[tab.id]=1;else delete tabCol[tab.id];LS.set('jv_tabcol',tabCol);
 var b=c.querySelector('.tcol');if(b){b.setAttribute('aria-expanded',col?'false':'true');b.setAttribute('aria-label',col?'Extinde tabul':'Restrânge tabul')}updTabCount(tab)}
function renderTabItems(tab){var ul=document.querySelector('#ct_'+tab.id+' ul');if(!ul)return;updTabCount(tab);
 fillList(ul,tabList(tab),'Lista e goală.',function(s){return renderItem(s,(s.done?'Gata':'Deschis')+(s.date<dkey()?'<small>'+shortDate(s.date)+'</small>':''))})}
function renderTabs(){var box=$('customCards');if(!box)return;box.innerHTML='';
 visTabs().forEach(function(tab){var c=document.createElement('section');c.className='card ctab'+(tabCol[tab.id]?' col':'');c.id='ct_'+tab.id;c.dataset.tab=tab.id;
  if(tab.color)c.style.setProperty('--tc',tab.color);
  c.innerHTML='<div class="lbl"><span class="lt kw">'+esc(tab.name)+'</span><span class="tcnt" aria-hidden="true"></span><span class="hgrp"><button class="hb ren" aria-label="Redenumește tabul">✎</button><button class="hb del" aria-label="Șterge tabul">'+TRASH_SVG+'</button><button class="spk" data-read="tab:'+tab.id+'" aria-label="Citește">'+SPK_SVG+'</button><button type="button" class="hb tcol" aria-expanded="'+(tabCol[tab.id]?'false':'true')+'" aria-label="'+(tabCol[tab.id]?'Extinde tabul':'Restrânge tabul')+'">▾</button></span></div><ul class="tasks ctl"></ul>'+
   '<form class="add"><input placeholder="Scrie un element" autocomplete="off" aria-label="Element nou"><button type="button" class="btn mic tmic" title="Scrie sau dictează cu tastatura" aria-label="Deschide tastatura">'+MIC_SVG+'</button><button class="btn" type="submit">Adaugă</button></form>';
  box.appendChild(c);renderTabItems(tab)});
 if(typeof updEq==='function')updEq()}
function hideTI(tab,id){var s=findTI(tab,id);if(!s)return;if(confirm('Scoți „'+s.text+'" din listă?')){s.hidden=new Date().toISOString();saveTabs();renderTabItems(tab)}}
function addTI(tab,txt){txt=(txt||'').trim();if(!txt)return false;txt=txt.charAt(0).toUpperCase()+txt.slice(1);
 tab.items.push({id:uid(),text:txt,date:dkey(),done:false,doneDate:null,urgent:false,created:new Date().toISOString()});saveTabs();renderTabItems(tab);return true}
function delTab(tab){if(!confirm('Ștergi tabul „'+tab.name+'"? Elementele lui nu mai apar (datele rămân salvate în telefon).'))return;
 if(speaking&&speakKey==='tab:'+tab.id)stopSpeaking();tab.hidden=new Date().toISOString();saveTabs();renderTabs();toast('Tab șters')}
(function(){var box=$('customCards');
 function ctx(e){var c=e.target.closest('.ctab');return c?findTab(c.dataset.tab):null}
 box.addEventListener('click',function(e){var tab=ctx(e);if(!tab)return;
  if(e.target.closest('.spk')){readCard('tab:'+tab.id);return}
  if(e.target.closest('.ren')){openTabModal(tab);return}
  if(e.target.closest('.del')){delTab(tab);return}
  if(e.target.closest('.lbl')){toggleTabCol(tab);return}
  if(e.target.closest('.tmic')){var i=e.target.closest('form').querySelector('input');i.focus();try{i.click()}catch(_){}return}
  var li=e.target.closest('.task');if(!li||li.classList.contains('editing')||!li.dataset.id)return;
  if(e.target.closest('.ed')){var s=findTI(tab,li.dataset.id);if(s)startEdit(li,s,saveTabs,function(){renderTabItems(tab)});return}
  if(e.target.classList.contains('x')){hideTI(tab,li.dataset.id);return}
  if(dndEat())return
  var s=findTI(tab,li.dataset.id);if(!s)return;s.done=!s.done;s.doneDate=s.done?dkey():null;s.doneAt=s.done?new Date().toISOString():null;saveTabs();renderTabItems(tab)});
 box.addEventListener('submit',function(e){e.preventDefault();var tab=ctx(e);if(!tab)return;var i=e.target.querySelector('input');if(addTI(tab,i.value)){i.value='';toast('Adăugat în '+tab.name)}});
 box.addEventListener('contextmenu',function(e){if(e.target.closest('.task'))e.preventDefault()})})();
/* v27: collapsible built-in cards (Taskuri azi/mâine, Cumpărături, Știri); state in jv_cardcol, not in undo history */
var cardCol=LS.get('jv_cardcol',{});if(!cardCol||typeof cardCol!=='object')cardCol={};
function ccEl(k){return $({azi:'cAzi',maine:'cMaine',shop:'cShop',news:'cNews'}[k])}
function cardCount(k){if(k==='azi'||k==='maine')return listFor(k).filter(function(t){return !t.done}).length;
 if(k==='shop')return shopList().filter(function(x){return !x.bought}).length;return document.querySelectorAll('#newsBody .news-item').length}
function updCardCount(k){var c=ccEl(k),n=c&&c.querySelector('.tcnt');if(n)n.textContent='· '+cardCount(k)}
function setCardCol(k,col){var c=ccEl(k);if(!c)return;c.classList.toggle('col',col);
 var b=c.querySelector('.tcol');if(b){b.setAttribute('aria-expanded',col?'false':'true');b.setAttribute('aria-label',col?'Extinde cardul':'Restrânge cardul')}}
['azi','maine','shop','news'].forEach(function(k){var c=ccEl(k);if(!c)return;setCardCol(k,!!cardCol[k]);
 c.querySelector('.lbl').addEventListener('click',function(e){if(e.target.closest('.spk,.nrf'))return;
  var col=!c.classList.contains('col');setCardCol(k,col);if(col)cardCol[k]=1;else delete cardCol[k];LS.set('jv_cardcol',cardCol);updCardCount(k)})});
/* create / rename modal */
var tmTab=null,tmColor='';
function buildTabColors(){var row=$('tmColors');row.innerHTML='';
 [''].concat(TCOL).forEach(function(c){var b=document.createElement('button');b.type='button';b.className='sw'+(c?'':' none')+(c===tmColor?' sel':'');
  if(c)b.style.background=c;else b.textContent='—';b.setAttribute('aria-label',c?'Culoare '+c:'Fără culoare');b.dataset.c=c;
  b.onclick=function(){tmColor=c;buildTabColors()};row.appendChild(b)})}
function openTabModal(tab){tmTab=tab||null;tmColor=tab?(tab.color||''):'';$('tmTitle').textContent=tab?'Redenumește tabul':'Tab nou';$('tmSave').textContent=tab?'Salvează':'Creează';
 $('tmName').value=tab?tab.name:'';buildTabColors();$('tabModal').classList.add('show');setTimeout(function(){$('tmName').focus()},30)}
function closeTabModal(){$('tabModal').classList.remove('show');tmTab=null}
$('bNewTab').onclick=function(){openTabModal(null)};
$('tmCancel').onclick=closeTabModal;
$('tabModal').addEventListener('click',function(e){if(e.target===this)closeTabModal()});
$('tmName').addEventListener('keydown',function(e){if(e.key==='Escape')closeTabModal()});
$('tmForm').addEventListener('submit',function(e){e.preventDefault();var n=$('tmName').value.replace(/\s+/g,' ').trim();
 if(!n){toast('Numele tabului e obligatoriu');$('tmName').focus();return}
 if(tmTab){tmTab.name=n;tmTab.color=tmColor;tmTab.editedAt=new Date().toISOString();saveTabs();renderTabs();closeTabModal();toast('Tab redenumit');return}
 var t={id:uid(),name:n,color:tmColor,created:new Date().toISOString(),items:[]};tabs.push(t);saveTabs();renderTabs();closeTabModal();
 var c=$('ct_'+t.id);if(c){c.scrollIntoView({behavior:'smooth',block:'center'})}toast('Tab „'+n+'" creat')});

/* ---------- undo / redo: snapshot history of tasks + shopping + tabs (session only, max 50 steps) ---------- */
var HMAX=50,hUndo=[],hRedo=[],hCur=null;
function snap(){return JSON.stringify({tasks:tasks,shop:shop,tabs:tabs})}
function histBtns(){var u=$('bUndo'),r=$('bRedo');if(u)u.disabled=!hUndo.length;if(r)r.disabled=!hRedo.length}
function histPush(){if(hCur===null)return;var s=snap();if(s===hCur)return;hUndo.push(hCur);if(hUndo.length>HMAX)hUndo.shift();hRedo=[];hCur=s;histBtns()}
function histApply(s){var d=JSON.parse(s);if(speaking)stopSpeaking();editing=null;if($('tabModal').classList.contains('show'))closeTabModal();
 tasks=d.tasks;shop=d.shop;tabs=d.tabs;LS.set('jv_tasks',tasks);LS.set('jv_shop',shop);LS.set('jv_tabs',tabs);hCur=s;
 renderTasks();renderShop();renderTabs();histBtns()}
function undo(){if(!hUndo.length)return;hRedo.push(hCur);histApply(hUndo.pop());toast('Anulat')}
function redo(){if(!hRedo.length)return;hUndo.push(hCur);histApply(hRedo.pop());toast('Refăcut')}
$('bUndo').onclick=undo;$('bRedo').onclick=redo;
document.addEventListener('keydown',function(e){if(!(e.ctrlKey||e.metaKey)||e.altKey)return;var t=e.target,tag=t&&t.tagName;
 if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||(t&&t.isContentEditable)||document.querySelector('.modal.show'))return;
 var k=e.key.toLowerCase();if(k==='z'&&!e.shiftKey){e.preventDefault();undo()}else if(k==='y'||(k==='z'&&e.shiftKey)){e.preventDefault();redo()}});
/* ---------- v14: drag & drop for list items (Pointer Events: touch + mouse; nothing new visible unless a drag is in progress)
   long-press ~480 ms arms the drag (haptic + lift); moving then = drag; holding still >= 900 ms and releasing = old delete/hide confirm;
   a move before arming cancels (page scrolls normally); short tap still toggles. Each drop = one undo step. ---------- */
var DND_ARM=480,DND_DEL=900,DND_SLOP=10,DND_EDGE=70;
var dnd=null,dndEatClick=false;
function dndEat(){if(dndEatClick){dndEatClick=false;return true}return false}
function dndListOf(ul){if(!ul)return null;
 if(ul.id==='lAzi')return{kind:'azi',key:'azi'};if(ul.id==='lMaine')return{kind:'maine',key:'maine'};if(ul.id==='lShop')return{kind:'shop',key:'shop'};
 var c=ul.closest&&ul.closest('.ctab');if(c&&ul.classList.contains('ctl')){var tb=findTab(c.dataset.tab);if(tb)return{kind:'tab',key:'tab:'+tb.id,tab:tb}}return null}
function dndUL(el){if(!el||!el.closest)return null;var ul=el.closest('#lAzi,#lMaine,#lShop,.ctab ul.ctl');if(ul)return ul;
 var c=el.closest('#cAzi,#cMaine,#cShop,.ctab');return c&&!c.classList.contains('col')?c.querySelector('#lAzi,#lMaine,#lShop,ul.ctl'):null}
function dndYest(){var y=new Date();y.setDate(y.getDate()-1);return dkey(y)}
function dndClasses(on){var r=document.documentElement;r.classList.toggle('jv-press',!!on);if(!on)r.classList.remove('jv-dragging')}
function dndReset(){if(!dnd)return;clearTimeout(dnd.armT);clearTimeout(dnd.delT);if(dnd.raf)cancelAnimationFrame(dnd.raf);
 if(dnd.li)dnd.li.classList.remove('jv-lift','jv-hide');if(dnd.ghost&&dnd.ghost.parentNode)dnd.ghost.parentNode.removeChild(dnd.ghost);
 if(dnd.ph&&dnd.ph.parentNode)dnd.ph.parentNode.removeChild(dnd.ph);if(dnd.over){dnd.over.classList.remove('jv-over');var c=dnd.over.closest('.card');if(c)c.classList.remove('jv-tgt')}
 dnd=null;dndClasses(false)}
function dndArm(){if(!dnd)return;if(editing&&editing.isConnected){dndReset();return}dnd.armed=true;if(navigator.vibrate)try{navigator.vibrate(15)}catch(_){}
 dnd.li.classList.add('jv-lift');dnd.delT=setTimeout(function(){if(dnd&&dnd.armed&&!dnd.drag&&navigator.vibrate)try{navigator.vibrate(30)}catch(_){}},DND_DEL-DND_ARM)}
function dndStart(){var d=dnd,li=d.li,r=li.getBoundingClientRect();d.drag=true;clearTimeout(d.delT);d.ox=d.sx-r.left+12;d.oy=d.sy-r.top;
 var g=document.createElement('ul');g.className=d.ul.className+(d.src.kind==='tab'?' ctab':'')+' jv-ghost';g.setAttribute('aria-hidden','true');
 var tc=getComputedStyle(d.ul).getPropertyValue('--tc');if(tc&&tc.trim())g.style.setProperty('--tc',tc.trim());
 g.style.width=(r.width+24)+'px';var c=li.cloneNode(true);c.classList.remove('jv-lift');g.appendChild(c);document.body.appendChild(g);d.ghost=g;
 var ph=document.createElement('li');ph.className='jv-ph';ph.style.height=r.height+'px';d.ph=ph;li.parentNode.insertBefore(ph,li);
 li.classList.remove('jv-lift');li.classList.add('jv-hide');document.documentElement.classList.add('jv-dragging');
 dndPlace();d.raf=requestAnimationFrame(dndTick)}
function dndNextSlot(n,skip){n=n.nextSibling;while(n&&(n===skip||!(n.classList&&((n.classList.contains('task')&&n.dataset.id)||n.classList.contains('jv-sep')))))n=n.nextSibling;return n}
function dndPlace(){var d=dnd;if(!d||!d.drag)return;d.ghost.style.transform='translate('+(d.x-d.ox)+'px,'+(d.y-d.oy)+'px) scale(1.03)';
 var ul=dndUL(document.elementFromPoint(d.x,d.y));if(!ul||!dndListOf(ul))return;
 if(d.over!==ul){if(d.over){d.over.classList.remove('jv-over');var oc=d.over.closest('.card');if(oc)oc.classList.remove('jv-tgt')}
  d.over=ul;ul.classList.add('jv-over');var nc=ul.closest('.card');if(nc)nc.classList.add('jv-tgt')}
 var before=null,ch=ul.children;
 for(var i=0;i<ch.length;i++){var n=ch[i];if(n===d.li||n===d.ph)continue;
  if(n.classList.contains('jv-sep')){var rs=n.getBoundingClientRect();if(d.y<rs.top+rs.height/2){before=n;break}continue}
  if(!n.classList.contains('task')||!n.dataset.id)continue;var r=n.getBoundingClientRect();if(d.y<r.top+r.height/2){before=n;break}}
 if(d.ph.parentNode===ul&&dndNextSlot(d.ph,d.li)===before)return;
 if(before)ul.insertBefore(d.ph,before);else ul.appendChild(d.ph)}
function dndTick(){var d=dnd;if(!d||!d.drag)return;var h=window.innerHeight,v=0;
 if(d.y<DND_EDGE)v=-Math.ceil((DND_EDGE-d.y)/4);else if(d.y>h-DND_EDGE)v=Math.ceil((d.y-(h-DND_EDGE))/4);
 if(v){var y0=window.scrollY;window.scrollBy(0,v);if(window.scrollY!==y0)dndPlace()}d.raf=requestAnimationFrame(dndTick)}
function dndObj(L,id){if(L.kind==='azi'||L.kind==='maine'){var i=findT(id);return i<0?null:tasks[i]}return L.kind==='shop'?findS(id):findTI(L.tab,id)}
function dndArr(L){return L.kind==='shop'?shop:L.kind==='tab'?L.tab.items:tasks}
function dndConv(o,toShop,date){var done=o.done!=null?!!o.done:!!o.bought,dd=done?(o.doneDate||o.boughtDate||dkey()):null,da=done?(o.doneAt||o.boughtAt||null):null,n={};
 for(var k in o)if(['done','doneDate','doneAt','bought','boughtDate','boughtAt','ord','ordK'].indexOf(k)<0)n[k]=o[k];
 n.date=date;if(toShop){n.bought=done;n.boughtDate=dd;n.boughtAt=da}else{n.done=done;n.doneDate=dd;n.doneAt=da}n.movedAt=new Date().toISOString();return n}
function dndApply(S,T,id,ids,urgMap){var o=dndObj(S,id);if(!o)return;var isT=function(L){return L.kind==='azi'||L.kind==='maine'},today=dkey();
 if(S.key===T.key){var cur=(isT(S)?listFor(S.kind):S.kind==='shop'?shopList():tabList(S.tab)).map(function(x){return x.id});
  if(cur.join('|')===ids.join('|')&&cur.every(function(x){var it=dndObj(S,x);return !!it.urgent===!!urgMap[x]}))return}
 var date=isT(T)?(isT(S)?o.date:(o.date||today)):(isT(S)?(o.fromDay||o.date||today):(o.date||today)),due=T.kind==='maine'?dayOff(1):today;
 if(isT(S)&&isT(T)){if(T.kind!==S.kind){o.dueDay=due;if(T.kind==='maine')delete o.fromDay}}
 else{var sa=dndArr(S),si=sa.indexOf(o);if(si<0)return;sa.splice(si,1);
  var n=(isT(S)===isT(T)&&(S.kind==='shop')===(T.kind==='shop'))?o:dndConv(o,T.kind==='shop',date);if(n===o){o.date=date;o.movedAt=new Date().toISOString()}
  if(isT(T)){n.dueDay=due;delete n.fromDay;if(T.kind==='azi'&&n.date<today)n.fromDay=n.date}else{delete n.dueDay;delete n.fromDay}
  var ta=dndArr(T);if(isT(T))ta.push(n);else{var p=ids.indexOf(id),at=-1,j;
   for(j=p+1;j<ids.length&&at<0;j++)at=ta.findIndex(function(x){return x.id===ids[j]});
   if(at<0){for(j=p-1;j>=0&&at<0;j--){at=ta.findIndex(function(x){return x.id===ids[j]});if(at>=0)at++}}
   if(at<0)ta.push(n);else ta.splice(at,0,n)}}
 if(isT(T)){var k=T.kind,uI=0,nI=0;ids.forEach(function(x){var t=tasks[findT(x)];if(!t)return;t.urgent=!!urgMap[x];if(t.urgent){t.ord=uI++;t.ordK=k+':u'}else{t.ord=nI++;t.ordK=k+':n'}})}
 else ids.forEach(function(x){var it=dndObj(T,x);if(it)it.urgent=!!urgMap[x]});
 LS.set('jv_tasks',tasks);LS.set('jv_shop',shop);LS.set('jv_tabs',tabs);histPush();
 [S,T].forEach(function(L){if(isT(L))renderTasks();else if(L.kind==='shop')renderShop();else renderTabItems(L.tab)})}
function dndDrop(){var d=dnd,ul=d.ph&&d.ph.parentNode,T=ul&&dndListOf(ul),id=d.li.dataset.id,ids=[],urgMap={},S=d.src,sec=true;
 if(ul)[].forEach.call(ul.children,function(n){if(n.classList&&n.classList.contains('jv-sep')){sec=false;return}
  if(n===d.ph){ids.push(id);urgMap[id]=sec}else if(n!==d.li&&n.classList.contains('task')&&n.dataset.id){ids.push(n.dataset.id);urgMap[n.dataset.id]=sec}});
 dndReset();if(T)dndApply(S,T,id,ids,urgMap)}
document.addEventListener('pointerdown',function(e){dndEatClick=false;if(dnd){dndReset();return}
 if(e.pointerType==='mouse'&&e.button!==0)return;var li=e.target.closest&&e.target.closest('.task');
 if(!li||!li.dataset.id||li.classList.contains('editing')||e.target.closest('.x,.ed,textarea,.edb'))return;
 var S=dndListOf(li.parentNode);if(!S||(editing&&editing.isConnected)||document.querySelector('.modal.show'))return;
 dnd={id:e.pointerId,li:li,ul:li.parentNode,src:S,sx:e.clientX,sy:e.clientY,x:e.clientX,y:e.clientY,t0:Date.now(),armed:false,drag:false,armT:setTimeout(dndArm,DND_ARM)};dndClasses(true)});
window.addEventListener('pointermove',function(e){var d=dnd;if(!d||e.pointerId!==d.id)return;d.x=e.clientX;d.y=e.clientY;
 var far=Math.abs(d.x-d.sx)>DND_SLOP||Math.abs(d.y-d.sy)>DND_SLOP;if(!d.armed){if(far)dndReset();return}
 if(!d.drag){if(!far)return;dndStart()}if(e.cancelable)e.preventDefault();dndPlace()},{passive:false});
window.addEventListener('pointerup',function(e){var d=dnd;if(!d||e.pointerId!==d.id)return;
 if(d.drag){dndEatClick=true;dndDrop();return}var held=d.armed&&Date.now()-d.t0>=DND_DEL,armed=d.armed,S=d.src,id=d.li.dataset.id;dndReset();
 if(armed)dndEatClick=true;if(held)setTimeout(function(){if(S.kind==='shop')hideShop(id);else if(S.kind==='tab')hideTI(S.tab,id);else delTask(id)},0)});
window.addEventListener('pointercancel',function(e){if(dnd&&e.pointerId===dnd.id)dndReset()});
document.addEventListener('touchmove',function(e){if(dnd&&dnd.armed&&e.cancelable)e.preventDefault()},{passive:false});
['contextmenu','selectstart','dragstart'].forEach(function(ev){document.addEventListener(ev,function(e){if(dnd)e.preventDefault()})});
window.addEventListener('blur',dndReset);document.addEventListener('visibilitychange',function(){if(document.hidden)dndReset()});
/* ---------- speech output ---------- */
var speaking=false,listening=false,kGen=0,speakKey=null;
function updEq(){$('eq').classList.toggle('on',speaking||listening);$('orb').classList.toggle('active',speaking||listening);
 document.querySelectorAll('.spk').forEach(function(b){b.classList.toggle('on',speaking&&b.dataset.read===speakKey)});
 $('bRead').classList.toggle('on',speaking&&speakKey==='all');$('bReadAll').classList.toggle('on',speaking&&speakKey==='below')}
var actx=null,sources=[];
function unlockAudio(){try{if(!actx){var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;actx=new AC()}
 if(actx.state==='suspended')actx.resume();
 if(!unlockAudio.done){var b=actx.createBuffer(1,1,22050),s=actx.createBufferSource();s.buffer=b;s.connect(actx.destination);s.start(0);unlockAudio.done=1}}catch(e){}}
document.addEventListener('pointerdown',unlockAudio,true);
function curRate(){return cfg.rate!=null?+cfg.rate:1.25}

/* browser voices (fallback engine) */
var roVoice=null,autoMale=false,allVoices=[];
var MALE_RE=/\bmale\b|barbat|bărbat|masculin|emil|andrei|ion\b|ioan|mihai|alexandru|bogdan|adrian|marius/i;
function maleScore(v){var n=(v.name+' '+v.voiceURI).toLowerCase(),s=0;
 if(/female|femeie|feminin|ioana|alina|carmen|maria|elena|andreea|irina/.test(n))return -10;
 if(MALE_RE.test(n))s+=10;if(/-x-/.test(n))s+=2;if(!v.default)s+=1;if(/local/.test(n))s+=.5;return s}
function loadVoices(){if(!window.speechSynthesis)return;allVoices=speechSynthesis.getVoices()||[];
 var ro=allVoices.filter(function(v){return /^ro/i.test(v.lang)});roVoice=null;autoMale=false;
 if(cfg.voiceURI)roVoice=allVoices.filter(function(v){return v.voiceURI===cfg.voiceURI})[0]||null;
 if(!roVoice&&ro.length){roVoice=ro.slice().sort(function(a,b){return maleScore(b)-maleScore(a)})[0];autoMale=MALE_RE.test(roVoice.name+' '+roVoice.voiceURI)&&!/female/i.test(roVoice.name)}
 if($('modal').classList.contains('show'))fillVoiceSelect()}
function curPitch(){return cfg.pitch!=null?+cfg.pitch:(autoMale?1:.75)}
if(window.speechSynthesis){loadVoices();if(speechSynthesis.addEventListener)speechSynthesis.addEventListener('voiceschanged',loadVoices);else speechSynthesis.onvoiceschanged=loadVoices;setTimeout(loadVoices,500);setTimeout(loadVoices,2000)}

/* word weight ≈ how long it takes to say (used for timing inside a known-duration chunk) */
function spokenLen(w){var core=w.replace(/[^0-9a-zăâîșțşţáéíóúàèìòùäëïöü%]/gi,'');var n=0;
 core.replace(/\d+/g,function(d){n+=d.length*4.5+1;return ''}).replace(/%/g,function(){n+=6;return ''}).replace(/[a-zăâîșțşţáéíóúàèìòùäëïöü]/gi,function(){n+=1;return ''});
 return Math.max(1,n)}
function pauseW(w){return /[.!?…]$/.test(w)?5:/[,;:]$/.test(w)?3:0}
function wordMs(w,rate){return (110+52*spokenLen(w)+pauseW(w)*65)/rate}

/* --- Piper engine: sentence chunks, exact duration per chunk, words placed proportionally, driven by AudioContext clock --- */
function buildChunks(segs){var out=[];
 segs.forEach(function(seg){var n=seg.words.length,a=0;
  for(var i=0;i<n;i++){var w=seg.words[i].w,len=i-a+1;
   if(/[.!?;…]$/.test(w)||i===n-1||(len>=14&&/[,:]$/.test(w))||len>=22){
    var txt=seg.text.slice(seg.words[a].s,seg.words[i].e);if(!/[.!?…,;:]$/.test(txt))txt+='.';
    out.push({seg:seg,a:a,b:i+1,text:txt});a=i+1}}});
 return out}
function chunkTimes(ch,pcm,sr){var win=Math.max(1,Math.round(sr*.01)),n=Math.floor(pcm.length/win),en=new Float32Array(n),peak=0;
 for(var i=0;i<n;i++){var s=0;for(var j=i*win,e=j+win;j<e;j++)s+=pcm[j]*pcm[j];en[i]=Math.sqrt(s/win);if(en[i]>peak)peak=en[i]}
 var thr=peak*.08,f=0,l=n-1;while(f<n&&en[f]<thr)f++;while(l>f&&en[l]<thr)l--;
 var t0=f*win/sr,t1=(l+1)*win/sr;if(t1-t0<.1){t0=0;t1=pcm.length/sr}
 var ws=[],tot=0;for(var k=ch.a;k<ch.b;k++){var w=ch.seg.words[k].w,x=spokenLen(w)+1.5+(k<ch.b-1?pauseW(w):0);ws.push(x);tot+=x}
 var times=[],c=0;ws.forEach(function(x){times.push(t0+(t1-t0)*c/tot);c+=x});return times}
function waitUntil(t,gen){return new Promise(function(res){(function chk(){if(gen!==kGen||!actx||actx.currentTime>=t)res();else setTimeout(chk,40)})()})}
function selVoice(){return cfg.engine==='browser'?null:(TTS.voice(cfg.engine)||TTS.voice('mihai'))}
function speakNeural(segs,gen,v){
 var chunks=buildChunks(segs);if(!chunks.length)return Promise.resolve();
 unlockAudio();if(!actx)return Promise.reject(new Error('AudioContext indisponibil'));
 var rate=curRate(),tone=+cfg.tone||1,proms=[],timeline=[],cursor=0;
 var nat=rate,post=1;
 function get(i){if(!proms[i])proms[i]=TTS.synth(v.id,chunks[i].text,{speed:nat}).then(function(r){return {pcm:TTS.fx(r.pcm,r.sr,post,tone),sr:r.sr}});return proms[i]}
 function lat(){return (actx.outputLatency||0)+(actx.baseLatency||0)}
 (function anim(){if(gen!==kGen)return;var now=actx.currentTime-lat();
  for(var j=timeline.length-1;j>=0;j--){var e=timeline[j];if(now>=e.start){var rel=now-e.start,k=0;while(k+1<e.times.length&&rel>=e.times[k+1])k++;hl(e.c.seg,e.c.a+k);break}}
  requestAnimationFrame(anim)})();
 var i=0;
 function step(){if(gen!==kGen)return;if(i>=chunks.length)return waitUntil(cursor,gen);
  get(i);if(i+1<chunks.length)get(i+1);                       /* prefetch next chunk while this one plays */
  return get(i).then(function(r){if(gen!==kGen)return;
   var ch=chunks[i],buf=actx.createBuffer(1,r.pcm.length,r.sr);
   if(buf.copyToChannel)buf.copyToChannel(r.pcm,0);else buf.getChannelData(0).set(r.pcm);
   var src=actx.createBufferSource();src.buffer=buf;src.connect(actx.destination);
   var start=Math.max(actx.currentTime+.04,cursor);src.start(start);sources.push(src);
   var dur=r.pcm.length/r.sr;timeline.push({c:ch,start:start,times:chunkTimes(ch,r.pcm,r.sr)});
   var nextSame=chunks[i+1]&&chunks[i+1].seg===ch.seg;cursor=start+dur+(nextSame?0:.12);
   i++;return waitUntil(start,gen).then(step)})}
 return step()}

/* --- phone voice engine (speechSynthesis): boundary events or timer estimate --- */
function speakBrowserSeg(seg,gen){return new Promise(function(resolve){
 if(!window.speechSynthesis||gen!==kGen){resolve();return}
 var u=new SpeechSynthesisUtterance(seg.text);u.lang='ro-RO';if(roVoice){u.voice=roVoice;u.lang=roVoice.lang}
 var rate=curRate();u.rate=rate;u.pitch=curPitch();
 var got=false,started=false,done=false,timer=null,est=0;seg.words.forEach(function(w){est+=wordMs(w.w,rate)});
 function fin(){if(done)return;done=true;clearTimeout(timer);clearTimeout(safety);resolve()}
 function run(i){if(gen!==kGen||got||done||i>=seg.words.length)return;hl(seg,i);timer=setTimeout(function(){run(i+1)},wordMs(seg.words[i].w,rate))}
 function onStart(){if(started||gen!==kGen)return;started=true;hl(seg,0);setTimeout(function(){if(!got&&!done&&gen===kGen)run(Math.max(0,seg.cur))},700)}
 u.onstart=onStart;
 u.onboundary=function(e){if(gen!==kGen||(e.name&&e.name!=='word'))return;if(!got){got=true;clearTimeout(timer)}
  var ci=e.charIndex||0,k=0;while(k<seg.words.length-1&&ci>=seg.words[k].e)k++;hl(seg,k)};
 u.onend=u.onerror=fin;
 speechSynthesis.speak(u);
 setTimeout(function(){if(!started&&!done&&gen===kGen&&speechSynthesis.speaking)onStart()},1200);
 var safety=setTimeout(fin,est*2.5+8000)})}
function speakBrowser(segs,gen){
 if(!window.speechSynthesis){toast('Sinteza vocală nu e disponibilă');return Promise.resolve()}
 var p=Promise.resolve();segs.forEach(function(s){p=p.then(function(){if(gen===kGen)return speakBrowserSeg(s,gen)})});return p}

function stopSpeaking(){kGen++;sources.forEach(function(s){try{s.stop()}catch(e){}});sources=[];
 if(window.speechSynthesis)speechSynthesis.cancel();clearActive();speaking=false;speakKey=null;updEq()}
function speak(segs,key){
 stopSpeaking();var gen=++kGen;speaking=true;speakKey=key||null;updEq();unlockAudio();
 var v=selVoice(),e=v&&v.engine,useN=!!v&&TTS.state(e)==='ready';
 if(v&&!useN){ensureVoice().catch(function(){});
  toast(TTS.state(e)==='loading'?'Vocea '+v.short+' se pregătește ('+Math.round(TTS.progress(e)*100)+'%). Până atunci folosesc vocea telefonului.':'Vocea '+v.short+' nu e disponibilă. Folosesc vocea telefonului.')}
 setStatus(useN?'Vorbesc ('+v.short+')…':'Vorbesc…');
 var p=useN?speakNeural(segs,gen,v).catch(function(err){console.warn(err);if(gen!==kGen)return;
   setStatus('Eroare voce '+v.short+': '+(err&&err.message||err)+'. Folosesc vocea telefonului.',true);return speakBrowser(segs,gen)}):speakBrowser(segs,gen);
 function fin(){if(gen!==kGen)return;speaking=false;speakKey=null;updEq();clearActive();setStatus();if(!greetBusy)renderGreet(true)}
 return p.then(fin,fin)}

/* what each card says */
function segsVoice(){greetBusy=false;return [prepSeg($('greet'),greetFull())]}
function segsWx(){var s=[prepSeg(null,'Vremea în '+cfg.city+'.')];if(wx)s.push(prepSeg($('wxtxt'),wxSentence(wx)));else s.push(prepSeg(null,'Nu am date despre vreme.'));return s}
function segsUrg(open,getEl,emptyMsg){var s=[],urg=open.filter(function(x){return x.urgent}),norm=open.filter(function(x){return !x.urgent});
 if(!open.length){s.push(prepSeg(null,emptyMsg));return s}
 if(urg.length){s.push(prepSeg(null,'Urgent:'));urg.forEach(function(x){s.push(prepSeg(getEl(x),x.text))})}
 norm.forEach(function(x){s.push(prepSeg(getEl(x),x.text))});return s}
function segsTasks(which){var lt=which==='maine'?$('ltMaine'):$('ltAzi'),title=which==='maine'?'Taskuri pentru mâine':'Taskuri pentru azi',ul=which==='maine'?'lMaine':'lAzi';
 return [prepSeg(lt,title)].concat(segsUrg(listFor(which).filter(function(t){return !t.done}),function(t){return document.querySelector('#'+ul+' li[data-id="'+t.id+'"] .t')},'Niciun task deschis.'))}
function segsShop(){return [prepSeg($('ltShop'),'Cumpărături')].concat(segsUrg(shopList().filter(function(x){return !x.bought}),function(x){return document.querySelector('#lShop li[data-id="'+x.id+'"] .t')},'Lista de cumpărături e goală.'))}
function segsTab(tab){var c=$('ct_'+tab.id);return [prepSeg(c&&c.querySelector('.lt'),tab.name)].concat(segsUrg(tabList(tab).filter(function(x){return !x.done}),function(x){return document.querySelector('#ct_'+tab.id+' li[data-id="'+x.id+'"] .t')},'Lista e goală.'))}
function readCard(key){if(speaking&&speakKey===key){stopSpeaking();return}
 if(/^tab:/.test(key)){var tb=findTab(key.slice(4));if(!tb)return;return speak(segsTab(tb),key)}
 if(key==='below')return speak(segsTasks('azi').concat(segsTasks('maine'),segsShop(),[].concat.apply([],visTabs().map(segsTab))),key);
 var segs=key==='voice'?segsVoice():key==='wx'?segsWx():key==='azi'?segsTasks('azi'):key==='maine'?segsTasks('maine'):key==='shop'?segsShop():
  segsWx().concat(segsTasks('azi'),segsTasks('maine'),segsShop(),[].concat.apply([],visTabs().map(segsTab))); /* bottom Citește: weather + tasks only */
 return speak(segs,key)}
function say(text){greetBusy=true;clearTimeout(greetRestoreT);var seg=prepSeg($('greet'),text);
 return speak([seg],'voice').then(function(){greetRestoreT=setTimeout(function(){greetBusy=false;if(!speaking)renderGreet()},10000)})}
document.querySelectorAll('.spk').forEach(function(b){b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
 b.addEventListener('click',function(){readCard(b.dataset.read)})});
$('bRead').onclick=function(){readCard('all')};
$('bReadAll').querySelector('.rai').innerHTML=SPK_SVG;$('bReadAll').onclick=function(){readCard('below')};
$('bHi').onclick=function(){if(speaking&&speakKey==='voice'){stopSpeaking();return}readCard('voice')};

/* ---------- neural voice download / init with progress in the voice card ---------- */
function showProg(frac,phase,v){var p=$('vprog');
 if(phase==='ready'||frac>=1){p.classList.remove('show');return}
 p.classList.add('show');var mb=TTS.sizeMB(v.engine);
 $('vprogTxt').textContent=phase==='init'?'Pregătesc vocea '+v.short+'…':'Descarc vocea '+v.short+'… '+Math.round(frac*100)+'% ('+Math.round(frac*mb)+'/'+mb+' MB)';
 $('vprogBar').style.width=Math.round(frac*100)+'%';if($('modal').classList.contains('show'))updVoiceRow()}
function ensureVoice(id){var v=TTS.voice(id||cfg.engine)||TTS.voice('mihai'),e=v.engine;
 if(TTS.state(e)==='ready'||TTS.state(e)==='loading')return TTS.init(e);
 return TTS.init(e,function(f,ph){showProg(f,ph,v)}).then(function(){showProg(1,'ready',v);if(!speaking){setStatus('Vocea '+v.short+' e gata (funcționează și offline).');setTimeout(function(){if(!speaking)setStatus()},4000)}updVoiceRow()},
  function(err){$('vprog').classList.remove('show');console.warn(err);if(!speaking)setStatus('Nu am putut încărca vocea '+v.short+' ('+(err&&err.message||err)+'). Folosesc vocea telefonului.',true);updVoiceRow();throw err})}
function bootVoice(){var v=selVoice();if(!v)return;
 TTS.isDownloaded(v.engine).then(function(have){var c=navigator.connection;
  if(have||(v.engine==='piper'&&!(c&&c.saveData)))ensureVoice().catch(function(){});
  else setStatus('Vocea '+v.short+' nu e descărcată: Setări → Descarcă.',true)})}

/* ---------- task input: just open the keyboard (dictate with the keyboard's own mic) ---------- */
$('bMic').onclick=function(){var i=$('iTask');i.focus();try{i.click()}catch(e){}};
$('bMicM').onclick=function(){var i=$('iTaskM');i.focus();try{i.click()}catch(e){}};

/* ---------- settings modal ---------- */
var pending=null,draft=null;
function fillVoiceSelect(){var sel=$('sVoice'),cur=sel.value||cfg.voiceURI||'';sel.innerHTML='';
 var o=document.createElement('option');o.value='';o.textContent='Automat'+(roVoice&&!cfg.voiceURI?' ('+roVoice.name+')':'');sel.appendChild(o);
 var ro=allVoices.filter(function(v){return /^ro/i.test(v.lang)}),rest=allVoices.filter(function(v){return !/^ro/i.test(v.lang)});
 function grp(label,list){if(!list.length)return;var g=document.createElement('optgroup');g.label=label;
  list.forEach(function(v){var op=document.createElement('option');op.value=v.voiceURI;op.textContent=v.name+' ('+v.lang+')'+(v.default?' ★':'');g.appendChild(op)});sel.appendChild(g)}
 grp('Română',ro);grp('Toate vocile',rest);sel.value=cur;if(sel.value!==cur)sel.value=''}
function fillEngineSelect(){var sel=$('sEngine');if(sel.options.length)return;
 TTS.VOICES.forEach(function(v){var o=document.createElement('option');o.value=v.id;o.textContent=v.label+' · ~'+TTS.sizeMB(v.engine)+' MB';sel.appendChild(o)});
 var o=document.createElement('option');o.value='browser';o.textContent='Vocea telefonului';sel.appendChild(o)}
var NOTES={piper:TTS.opaque?'Fișier deschis local: vocea poate fi descărcată la fiecare deschidere. Deschide linkul online ca să rămână salvată.':'Rapidă. Se descarcă o singură dată și merge offline.'};
function updVoiceRow(){var id=$('sEngine').value;if(id==='browser')return;var v=TTS.voice(id),e=v.engine,s=TTS.state(e),el=$('pState');
 $('pMB').textContent=TTS.sizeMB(e);$('pNote').textContent=NOTES[e];
 if(s==='ready'){el.textContent='✓ '+TTS.engineName(e)+' e descărcată și gata.';$('pDl').style.display='none';$('pDel').style.display=''}
 else if(s==='loading'){el.textContent='Se descarcă… '+Math.round(TTS.progress(e)*100)+'%';$('pDl').style.display='none';$('pDel').style.display='none'}
 else TTS.isDownloaded(e).then(function(h){if($('sEngine').value!==id)return;el.textContent=h?'Descărcată (se încarcă la nevoie).':(s==='error'?'Eroare la descărcare. Reîncearcă.':'Nedescărcată.');
  $('pDl').style.display='';$('pDl').textContent=h?'Încarcă':'Descarcă';$('pDel').style.display=h?'':'none'})}
function updEngineUI(){var b=$('sEngine').value==='browser';$('fVoice').style.display=b?'':'none';$('fPitch').style.display=b?'':'none';$('fPiper').style.display=b?'none':'';$('fTone').style.display=b?'none':''}
function showVals(){$('vRate').textContent=(+$('sRate').value).toFixed(2)+'×';$('vPitch').textContent=(+$('sPitch').value).toFixed(2);$('vSize').textContent=$('sSize').value+' px';$('vNewsSize').textContent=$('sNewsSize').value+'%';$('vTone').textContent=(+$('sTone').value).toFixed(2)+((+$('sTone').value)<.99?' (mai grav)':(+$('sTone').value)>1.01?' (mai subțire)':' (natural)')}
function buildFontGrid(){var g=$('fontGrid'),d=new Date(),t=pad(d.getHours())+'.'+pad(d.getMinutes());g.innerHTML='';
 FONTS.forEach(function(f){var b=document.createElement('button');b.type='button';b.className='fopt'+(draft.clockFont===f.id?' sel':'');
  b.innerHTML='<b style="font-family:'+esc(f.css)+';font-weight:'+f.w+';font-size:'+Math.round(26*f.k)+'px">'+t+'</b><span>'+esc(f.name)+'</span>';
  b.onclick=function(){draft.clockFont=f.id;applyClock(draft);g.querySelectorAll('.fopt').forEach(function(x){x.classList.remove('sel')});b.classList.add('sel')};g.appendChild(b)})}
var COLORS=['#3fd8ff','#4ade80','#f5b84a','#ff6b6b','#c084fc','#ffffff'];
function buildColors(){var r=$('colorRow');r.innerHTML='';
 COLORS.forEach(function(c){var b=document.createElement('button');b.type='button';b.className='sw'+(draft.clockColor.toLowerCase()===c?' sel':'');b.style.background=c;b.setAttribute('aria-label',c);
  b.onclick=function(){draft.clockColor=c;$('cPick').value=c;applyClock(draft);buildColors()};r.appendChild(b)});
 var p=document.createElement('input');p.type='color';p.id='cPick';p.value=draft.clockColor;p.oninput=function(){draft.clockColor=p.value;applyClock(draft);r.querySelectorAll('.sw').forEach(function(x){x.classList.remove('sel')})};r.appendChild(p)}
$('sRate').oninput=$('sPitch').oninput=$('sTone').oninput=showVals;
$('sSize').oninput=function(){showVals();draft.clockSize=+this.value;applyClock(draft)};
$('sNewsSize').oninput=function(){showVals();draft.newsSize=+this.value;applyNewsSize(draft.newsSize)};
$('sEngine').onchange=function(){updEngineUI();updVoiceRow()};
$('pDl').onclick=function(){ensureVoice($('sEngine').value).catch(function(){});setTimeout(updVoiceRow,50)};
$('pDel').onclick=function(){var v=TTS.voice($('sEngine').value);if(!v||!confirm('Ștergi vocea '+TTS.engineName(v.engine)+' descărcată? (se poate descărca din nou)'))return;TTS.remove(v.engine).then(function(){toast('Vocea a fost ștearsă');updVoiceRow()})};
$('sTest').onclick=function(){var old={engine:cfg.engine,rate:cfg.rate,pitch:cfg.pitch,voiceURI:cfg.voiceURI,tone:cfg.tone};
 cfg.tone=+$('sTone').value;cfg.engine=$('sEngine').value;cfg.rate=+$('sRate').value;cfg.pitch=+$('sPitch').value;cfg.voiceURI=$('sVoice').value||null;loadVoices();
 greetBusy=true;clearTimeout(greetRestoreT);var seg=prepSeg($('greet'),'Salut, '+($('sName').value.trim()||cfg.name)+'. Așa sună vocea mea acum.');
 speak([seg],'voice').then(function(){greetBusy=false});setTimeout(function(){Object.assign(cfg,old);loadVoices()},0)};
$('bSettings').onclick=function(){draft={clockFont:cfg.clockFont,clockColor:cfg.clockColor,clockSize:cfg.clockSize,newsSize:newsScale,newsCats:newsCats.slice()};
 $('sName').value=cfg.name;$('sCity').value=cfg.city;$('cityList').innerHTML='';pending=null;
 fillEngineSelect();$('sEngine').value=cfg.engine;$('sTone').value=cfg.tone;loadVoices();fillVoiceSelect();$('sVoice').value=cfg.voiceURI||'';$('sRate').value=curRate();$('sPitch').value=curPitch();$('sSize').value=cfg.clockSize;$('sNewsSize').value=newsScale;buildNewsCats(draft.newsCats);
 showVals();updEngineUI();updVoiceRow();buildFontGrid();buildColors();$('modal').classList.add('show')};
function closeModal(){applyClock(cfg);applyNewsSize(newsScale);renderNews(newsCats);$('modal').classList.remove('show')}
$('sCancel').onclick=closeModal;
$('modal').addEventListener('click',function(e){if(e.target===this)closeModal()});
function geocode(q){return fetch('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(q)+'&count=5&language=ro&format=json').then(function(r){return r.json()}).then(function(j){return j.results||[]})}
var gT=null;
$('sCity').addEventListener('input',function(){pending=null;clearTimeout(gT);var q=this.value.trim();if(q.length<2){$('cityList').innerHTML='';return}
 gT=setTimeout(function(){geocode(q).then(function(res){var cl=$('cityList');cl.innerHTML='';
  res.forEach(function(c){var b=document.createElement('button');b.type='button';b.className='btn';b.textContent=c.name+(c.admin1?', '+c.admin1:'')+(c.country?', '+c.country:'');
   b.onclick=function(){pending={city:c.name,lat:c.latitude,lon:c.longitude,tz:c.timezone||'auto'};$('sCity').value=c.name;cl.innerHTML=''};cl.appendChild(b)})}).catch(function(){})},400)});
$('sSave').onclick=function(){var name=$('sName').value.trim()||cfg.name,city=$('sCity').value.trim();
 function done(){saveCfg();$('modal').classList.remove('show');applyClock();renderGreet(true);renderWx();loadWx();toast('Setări salvate');if(cfg.engine!=='browser')ensureVoice().catch(function(){})}
 cfg.name=name;cfg.engine=$('sEngine').value;cfg.tone=+$('sTone').value;cfg.voiceURI=$('sVoice').value||null;cfg.rate=+$('sRate').value;cfg.pitch=+$('sPitch').value;
 cfg.clockFont=draft.clockFont;cfg.clockColor=draft.clockColor;cfg.clockSize=draft.clockSize;newsScale=draft.newsSize||100;LS.set('jv_newssize',newsScale);applyNewsSize(newsScale);newsCats=draft.newsCats.slice();LS.set('jv_newscats',newsCats);renderNews(newsCats);loadVoices();
 if(pending){cfg.city=pending.city;cfg.lat=pending.lat;cfg.lon=pending.lon;cfg.tz=pending.tz;wx=null;done()}
 else if(city&&city!==cfg.city){geocode(city).then(function(r){if(!r.length){toast('Orașul nu a fost găsit');return}
   cfg.city=r[0].name;cfg.lat=r[0].latitude;cfg.lon=r[0].longitude;cfg.tz=r[0].timezone||'auto';wx=null;done()}).catch(function(){toast('Fără internet: nu pot căuta orașul')})}
 else done()};

/* ---------- share ---------- */
function summary(){var d=new Date(),tk=dkey(),o=tasks.filter(function(t){return live(t)&&!t.done});
 var L=['JARVIS · '+ZILE[d.getDay()]+', '+d.getDate()+' '+LUNI[d.getMonth()]+' '+d.getFullYear()+' '+pad(d.getHours())+':'+pad(d.getMinutes()),'','Vremea · '+cfg.city+': '+wxSentence(wx),''];
 var az=listFor('azi').filter(function(t){return !t.done}),mn=listFor('maine').filter(function(t){return !t.done});
 if(az.length){L.push('Taskuri pentru azi:');az.forEach(function(t){L.push('• '+t.text+(t.fromDay&&t.fromDay<tk?' ('+shortDate(t.fromDay)+')':''))});L.push('')}
 if(mn.length){L.push('Taskuri pentru mâine:');mn.forEach(function(t){L.push('• '+t.text)})}
 if(!o.length)L.push('Nu ai taskuri deschise.');return L.join('\n')}
function copy(text){if(navigator.clipboard&&window.isSecureContext)return navigator.clipboard.writeText(text);
 return new Promise(function(res,rej){var ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();
  try{document.execCommand('copy')?res():rej()}catch(e){rej(e)}document.body.removeChild(ta)})}
function blankURL(){return 'https://cluj1313.github.io/jarvis/blank.html'}
$('bShare').onclick=function(){var url=blankURL(),text='JARVIS Command Center – aplicația goală (fără date).\n\n👉 Deschide linkul: '+url+'\n\nDin link o poți instala pe telefon ca aplicație (meniu ⋮ → „Instalează aplicația” / „Adaugă pe ecranul de pornire”). Fișierul atașat e doar o copie de rezervă.';
 function shareLink(){if(navigator.share)return navigator.share({title:'JARVIS',text:text,url:url}).catch(function(e){if(e&&e.name!=='AbortError')return copyLink()});return copyLink()}
 function copyLink(){return copy(url).then(function(){toast('Link copiat: '+url)},function(){prompt('Copiază linkul:',url)})}
 if(!/^https?:/.test(location.protocol)){copyLink();return}
 fetch(url,{cache:'no-cache'}).then(function(r){if(!r.ok)throw 0;return r.blob()}).then(function(b){
  var f=new File([b],'jarvis.html',{type:'text/html'});
  if(navigator.canShare&&navigator.canShare({files:[f]}))return navigator.share({files:[f],title:'JARVIS',text:text}).catch(function(e){if(e&&e.name!=='AbortError')return shareLink()});
  return shareLink()}).catch(shareLink)};


/* ---------- PWA: service worker + install helper ---------- */
(function(){
 var standalone=function(){try{return matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: minimal-ui)').matches||navigator.standalone===true}catch(e){return false}};
 if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')&&!TTS.opaque)
  window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(e){console.warn('SW',e)})});
 var deferred=null;
 function upd(){var f=$('fInstall');if(!f)return;f.style.display=standalone()?'none':'';
  $('sInstall').style.display=deferred?'':'none';$('installHint').style.display=deferred?'none':''}
 window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferred=e;upd();
  if(!standalone()&&!LS.get('jv_installTip',false)){LS.set('jv_installTip',true);setTimeout(function(){toast('Poți instala JARVIS ca aplicație: Setări → Instalează aplicația')},2500)}});
 window.addEventListener('appinstalled',function(){deferred=null;upd();toast('JARVIS a fost instalat')});
 $('sInstall').onclick=function(){if(!deferred){upd();return}var d=deferred;d.prompt();
  (d.userChoice||Promise.resolve()).then(function(){deferred=null;upd()})};
 $('bSettings').addEventListener('click',upd);upd();
})();
/* ---------- boot ---------- */
if(wx&&wx.city!==cfg.city)wx=null;
(function(){if(!TTS.opaque)return;var u='https://cluj1313.github.io/jarvis/'+(BLANK?'blank.html':''),n=$('offNote');if(!n)return;
 n.innerHTML='Pentru cea mai bună experiență deschide <a href="'+u+'" target="_blank" rel="noopener">'+u.replace('https://','')+'</a> (vocea rămâne salvată, merge și offline).';n.hidden=false})();

/* ---------- AI news (news.json from GitHub Actions; same-origin) ---------- */
var NEWS_CATS=[{id:'ai',name:'AI'},{id:'general',name:'Știri generale'},{id:'economie',name:'Economie'},{id:'tech',name:'Tehnologie'},{id:'sport',name:'Sport'},{id:'stiinta',name:'Științe / Sănătate'}];
var newsCats=LS.get('jv_newscats',null);if(!Array.isArray(newsCats))newsCats=BLANK?['general','ai']:['ai'];
var newsData=LS.get('jv_news',null);
function newsNorm(j){if(!j)return null;var cats=j.categories;
 if(!Array.isArray(cats)||!cats.length)cats=(j.sources&&j.sources.length)?[{id:'ai',name:'AI',sources:j.sources}]:[];
 return{updated:j.updated,categories:cats,stale:!!j.stale}}
newsData=newsNorm(newsData);
function newsRelTime(iso){if(!iso)return'';
 var t=Date.parse(iso);if(!isFinite(t))return'';
 var s=Math.max(0,Math.round((Date.now()-t)/1000));
 if(s<60)return'acum';if(s<3600)return Math.floor(s/60)+' min';if(s<86400)return Math.floor(s/3600)+' h';
 var d=Math.floor(s/86400);return d===1?'1 zi':d+' zile'}
function newsFmtUpdated(iso){var t=iso?new Date(iso):null;if(!t||!isFinite(t.getTime()))t=new Date();
 return 'Actualizat la '+pad(t.getHours())+':'+pad(t.getMinutes())}
function renderNews(sel){renderNews0(sel);updCardCount('news')}
function renderNews0(sel){sel=sel||newsCats;var card=$('cNews'),body=$('newsBody'),meta=$('newsMeta');if(!body)return;
 if(card)card.style.display=sel.length?'':'none';if(!sel.length)return;
 var cats=(newsData&&newsData.categories)||[];
 var show=NEWS_CATS.filter(function(c){return sel.indexOf(c.id)>=0}).map(function(c){var d=cats.filter(function(x){return x.id===c.id})[0];return{id:c.id,name:c.name,sources:(d&&d.sources)||[]}}).filter(function(c){return c.sources.length});
 if(!show.length){if(meta)meta.textContent=newsData?newsFmtUpdated(newsData.updated):'Fără știri încă';body.innerHTML='<div class="news-empty">'+(newsData?'Nu am încă știri pentru categoriile alese.':'Știrile apar aici când news.json e disponibil.')+'</div>';return}
 if(meta)meta.textContent=newsFmtUpdated(newsData.updated)+(newsData.stale?' (offline)':'');
 body.innerHTML='';
 show.forEach(function(cat){var blk=document.createElement('div');blk.className='news-catblk';blk.dataset.cat=cat.id;
  var cl=document.createElement('div');cl.className='news-cat';cl.textContent=cat.name;blk.appendChild(cl);
  cat.sources.forEach(function(src){
   var sec=document.createElement('div');sec.className='news-src';
   var h=document.createElement('div');h.className='news-ch';h.textContent=(src.name||src.id||'Canal').toUpperCase();sec.appendChild(h);
   (src.items||[]).forEach(function(it){
    var a=document.createElement('a');a.className='news-item';a.href=it.url;a.target='_blank';a.rel='noopener noreferrer';
    var t=document.createElement('div');t.className='news-t';t.textContent=it.title||'';a.appendChild(t);
    if(it.snippet){var s=document.createElement('div');s.className='news-s';s.textContent=it.snippet;a.appendChild(s)}
    var w=newsRelTime(it.published);if(w){var m=document.createElement('div');m.className='news-when';m.textContent=w;a.appendChild(m)}
    sec.appendChild(a)});
   blk.appendChild(sec)});
  body.appendChild(blk)})}
function buildNewsCats(sel){var box=$('newsCats');if(!box)return;box.innerHTML='';
 NEWS_CATS.forEach(function(c){var l=document.createElement('label');l.className='ncat'+(sel.indexOf(c.id)>=0?' on':'');
  var i=document.createElement('input');i.type='checkbox';i.value=c.id;i.checked=sel.indexOf(c.id)>=0;
  i.onchange=function(){var k=sel.indexOf(c.id);if(i.checked&&k<0)sel.push(c.id);if(!i.checked&&k>=0)sel.splice(k,1);l.classList.toggle('on',i.checked);renderNews(sel)};
  l.appendChild(i);l.appendChild(document.createTextNode(c.name));box.appendChild(l)})}
function loadNews(manual){return (manual&&navigator.onLine===false?Promise.reject(new Error('offline')):fetch('news.json?'+(manual?'fresh=':'t=')+Date.now(),{cache:'no-store'})).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()}).then(function(j){
  var n=newsNorm(j);if(!n||!n.categories.length)throw new Error('bad news.json');
  newsData=n;LS.set('jv_news',newsData);renderNews(draft&&$('modal').classList.contains('show')?draft.newsCats:newsCats)
 }).catch(function(){if(newsData){newsData.stale=true;renderNews()}else{renderNews()}if(manual)toast(navigator.onLine?'Nu am putut actualiza știrile':'Ești offline — nu pot actualiza știrile')})}
var newsBusy=false;
$('newsRefresh').onclick=function(){if(newsBusy)return;newsBusy=true;var b=this;b.classList.add('spin');
 var t0=Date.now();loadNews(true).then(function(){setTimeout(function(){b.classList.remove('spin');newsBusy=false},Math.max(0,500-(Date.now()-t0)))})};

renderTasks();renderShop();renderTabs();hCur=snap();histBtns();renderWx();renderNews();tick();setInterval(tick,1000);
loadWx();setInterval(loadWx,15*60*1000);
loadNews();setInterval(loadNews,30*60*1000);
document.addEventListener('visibilitychange',function(){if(!document.hidden){if(!wx||Date.now()-wx.ts>15*60*1000)loadWx();loadNews()}});
bootVoice();

/* test/preview hooks */
window.JARVIS={readCard:readCard,stop:stopSpeaking,say:say,get speaking(){return speaking},get activeWord(){return activeSeg&&activeSeg.cur>=0?activeSeg.words[activeSeg.cur].w:null},
 get activeEl(){return activeSeg&&activeSeg.el?activeSeg.el.id||activeSeg.el.className:null},ensureVoice:ensureVoice,TTS:TTS};
var dm=location.hash.match(/demo-karaoke(?:=(\d+))?/);
if(dm)loadWx().then(function(){speaking=true;speakKey='wx';updEq();setStatus('Vorbesc (Mihai)…');var s=prepSeg($('wxtxt'),wxSentence(wx));setTimeout(function(){hl(s,+(dm[1]||6))},80)});
if(/demo-settings/.test(location.hash))setTimeout(function(){$('bSettings').click()},300);
})();
