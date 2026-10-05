/* ---------- AI assistant (Gemini) — key only in localStorage, never in repo ---------- */
var AI_MODELS=[
 {id:'gemini-2.5-flash',label:'Gemini 2.5 Flash (recomandat)'},
 {id:'gemini-2.5-flash-lite',label:'Gemini 2.5 Flash-Lite'},
 {id:'gemini-2.0-flash',label:'Gemini 2.0 Flash'},
 {id:'gemini-flash-latest',label:'Flash latest'}
];
var AI_MAX=100,aiBusy=false,aiKey=LS.get('jv_gkey','')||'',aiModel=LS.get('jv_gmodel',AI_MODELS[0].id)||AI_MODELS[0].id,aiAuto=!!LS.get('jv_gauto',false);
var chat=LS.get('jv_chat',[]);if(!Array.isArray(chat))chat=[];
function saveChat(){if(chat.length>AI_MAX)chat=chat.slice(-AI_MAX);LS.set('jv_chat',chat)}
function saveAiKey(k){aiKey=k||'';if(aiKey)LS.set('jv_gkey',aiKey);else try{localStorage.removeItem(PFX+'jv_gkey')}catch(e){}}
function aiHasKey(){return !!(aiKey&&String(aiKey).trim())}
function aiNowRO(){var d=new Date();try{return d.toLocaleString('ro-RO',{timeZone:cfg.tz||'Europe/Bucharest',weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})}catch(e){return d.toISOString()}}
function aiCtxLists(){var L=[],tk=dkey();
 listFor('azi').forEach(function(t){L.push('- [azi'+(t.urgent?' URGENT':'')+(t.done?' DONE':'')+'] '+t.text)});
 listFor('maine').forEach(function(t){L.push('- [maine'+(t.urgent?' URGENT':'')+(t.done?' DONE':'')+'] '+t.text)});
 shopList().forEach(function(s){L.push('- [cumpărături'+(s.urgent?' URGENT':'')+(s.bought?' LUAT':'')+'] '+s.text)});
 visTabs().forEach(function(tab){tabList(tab).forEach(function(it){L.push('- [tab:'+tab.name+(it.urgent?' URGENT':'')+(it.done?' DONE':'')+'] '+it.text)})});
 return L.length?L.join('\n'):'(liste goale)'}
function aiSystem(){return 'Ești Jarvis, asistentul personal al lui '+(cfg.name||'utilizator')+'. Răspunzi concis, prietenos, în română. Data/ora curentă: '+aiNowRO()+' (Europe/Bucharest). Oraș: '+(cfg.city||'?')+'.\n'+
 'Poți folosi uneltele pentru a adăuga taskuri, cumpărături, elemente în taburi, a bifa elemente și a citi vremea locală.\n'+
 'Listele curente:\n'+aiCtxLists()+'\n'+
 'Când adaugi ceva, confirmă scurt: „Am pus «…» la …”. Nu inventa acțiuni pe care nu le-ai făcut prin unelte.'}
var AI_FUNCS=[{name:'add_task',description:'Adaugă un task la Taskuri azi sau Taskuri mâine',parameters:{type:'OBJECT',properties:{text:{type:'STRING'},day:{type:'STRING',enum:['azi','maine']},urgent:{type:'BOOLEAN'}},required:['text','day']}},
 {name:'add_shopping',description:'Adaugă produse la lista de cumpărături',parameters:{type:'OBJECT',properties:{items:{type:'ARRAY',items:{type:'STRING'}}},required:['items']}},
 {name:'add_to_tab',description:'Adaugă un element într-un tab personalizat (după nume)',parameters:{type:'OBJECT',properties:{tab_name:{type:'STRING'},text:{type:'STRING'}},required:['tab_name','text']}},
 {name:'complete_item',description:'Bifează ca făcut/cumpărat un element după potrivire de text',parameters:{type:'OBJECT',properties:{list:{type:'STRING',description:'azi, maine, shop, sau tab:<nume>'},text_match:{type:'STRING'}},required:['list','text_match']}},
 {name:'get_weather',description:'Returnează vremea curentă din aplicație pentru orașul configurat',parameters:{type:'OBJECT',properties:{}} }];
function aiNorm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim()}
function aiFindTab(name){var n=aiNorm(name),best=null,vis=visTabs();
 for(var i=0;i<vis.length;i++){if(aiNorm(vis[i].name)===n)return vis[i];if(!best&&aiNorm(vis[i].name).indexOf(n)>=0)best=vis[i]}
 return best}
function aiRunFn(name,args){args=args||{};
 try{
  if(name==='add_task'){var t=(args.text||'').trim();if(!t)return{ok:false,msg:'Text lipsă'};var which=args.day==='maine'?'maine':'azi';
   addTask(t,which);var last=tasks[tasks.length-1];if(last&&args.urgent){last.urgent=true;last.ord=0;last.ordK=which+':u';save();renderTasks()}
   return{ok:true,msg:'Am pus «'+t+'» la Taskuri '+(which==='maine'?'mâine':'azi')+(args.urgent?' (urgent)':'')+'.'}}
  if(name==='add_shopping'){var items=args.items||[];if(typeof items==='string')items=[items];var added=[];
   items.forEach(function(it){if(addShop(it))added.push(String(it).trim())});
   return{ok:!!added.length,msg:added.length?'Am adăugat la Cumpărături: '+added.map(function(x){return '«'+x+'»'}).join(', ')+'.':'Nimic de adăugat.'}}
  if(name==='add_to_tab'){var tab=aiFindTab(args.tab_name);if(!tab)return{ok:false,msg:'Nu am găsit tabul «'+(args.tab_name||'')+'».'};
   if(!addTI(tab,args.text))return{ok:false,msg:'Text invalid'};return{ok:true,msg:'Am pus «'+String(args.text).trim()+'» în «'+tab.name+'».'}}
  if(name==='complete_item'){var list=String(args.list||'').toLowerCase(),m=aiNorm(args.text_match),hit=null;
   function score(txt){var n=aiNorm(txt);if(n===m)return 3;if(n.indexOf(m)>=0||m.indexOf(n)>=0)return 2;return 0}
   if(list==='shop'||list==='cumparaturi'||list==='cumpărături'){shopList().forEach(function(s){var sc=score(s.text);if(sc&&(!hit||sc>hit.sc))hit={sc:sc,run:function(){if(!s.bought){s.bought=true;s.boughtDate=dkey();s.boughtAt=new Date().toISOString();saveShop();renderShop()}},txt:s.text}})}
   else if(list.indexOf('tab:')===0){var tb=aiFindTab(list.slice(4));if(tb)tabList(tb).forEach(function(it){var sc=score(it.text);if(sc&&(!hit||sc>hit.sc))hit={sc:sc,run:function(){if(!it.done){it.done=true;it.doneDate=dkey();it.doneAt=new Date().toISOString();saveTabs();renderTabItems(tb)}},txt:it.text}})}
   else{var which=list==='maine'?'maine':'azi';listFor(which).forEach(function(t){var sc=score(t.text);if(sc&&(!hit||sc>hit.sc))hit={sc:sc,run:function(){if(!t.done){t.done=true;t.doneDate=dkey();t.doneAt=new Date().toISOString();save();renderTasks()}},txt:t.text}})}
   if(!hit)return{ok:false,msg:'Nu am găsit «'+(args.text_match||'')+'».'};hit.run();return{ok:true,msg:'Am bifat «'+hit.txt+'».'}}
  if(name==='get_weather'){return{ok:true,msg:wx?wxSentence(wx):'Nu am încă date despre vreme.'}}
  return{ok:false,msg:'Unealtă necunoscută: '+name}
 }catch(e){return{ok:false,msg:'Eroare: '+(e&&e.message||e)}}
}
function aiNeedSearch(text){return /(caut[aă]|pe net|google|știri|stiri|cine a|c[aâ]nd (e|are)|(ce|care) (e|este) |preț|pret|curs(ul)? (valutar|euro|dolar)|rezultat|ultimele noutăți| pe web|farmacie|unde (pot|găsesc|gasesc))/i.test(text||'')}
function aiEndpoint(model){return 'https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent'}
function aiFetch(model,body){return fetch(aiEndpoint(model),{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':aiKey},body:JSON.stringify(body)}).then(function(r){
 return r.json().then(function(j){return{ok:r.ok,status:r.status,json:j,model:model}}).catch(function(){return{ok:r.ok,status:r.status,json:null,model:model}})})}
function aiParseErr(status,j){var err=(j&&j.error)||{},m=err.message||'',details=err.details||[],metric='',limit='',reason='',retryMs=0,kind='other';
 details.forEach(function(d){var t=d['@type']||d.type||'';
  if(/RetryInfo/i.test(t)){var rd=d.retryDelay||d.retry_delay||'';var sec=parseFloat(String(rd).replace(/s$/,''));if(isFinite(sec))retryMs=Math.round(sec*1000)}
  if(/ErrorInfo/i.test(t)){reason=d.reason||reason;var md=d.metadata||{};metric=md.quota_metric||md.quotaMetric||metric;limit=md.quota_limit||md.quotaLimit||metric}});
 var blob=(m+' '+reason+' '+metric+' '+limit).toLowerCase();
 if(status===401||status===403||/API[_ ]key|PERMISSION_DENIED|invalid/i.test(blob))kind='key';
 else if(status===404||/NOT_FOUND|not found/i.test(blob))kind='model';
 else if(status===429||/RESOURCE_EXHAUSTED|quota|rate/i.test(blob)){
  if(/grounding|google_search|search_queries|search_request/i.test(blob))kind='search';
  else if(/per[_-]?day|PerDay|rpd|daily/i.test(blob))kind='daily';
  else if(/per[_-]?minute|PerMinute|rpm|per_min/i.test(blob))kind='minute';
  else kind='quota'}
 else if(!navigator.onLine)kind='offline';
 var text=kind==='key'?'Cheia Gemini pare invalidă. Verific-o în Setări.'
  :kind==='model'?'Modelul nu e disponibil. Alege alt model în Setări.'
  :kind==='search'?'Căutarea web Google a atins limita gratuită (grounding). Încerc fără căutare…'
  :kind==='daily'?'Ai atins limita zilnică gratuită Gemini. Încearcă mâine sau treci pe plan plătit.'
  :kind==='minute'?'Prea multe cereri pe minut. Așteaptă câteva secunde și reîncearcă.'
  :kind==='quota'?'Limită Gemini atinsă (RESOURCE_EXHAUSTED). Încearcă mai târziu.'
  :kind==='offline'?'Fără internet — nu pot vorbi cu Gemini acum.'
  :(m?('Gemini: '+m):('Eroare Gemini ('+status+').'));
 var detail=[];if(reason)detail.push(reason);if(metric)detail.push(metric);if(limit&&limit!==metric)detail.push(limit);if(retryMs)detail.push('retry ~'+Math.round(retryMs/1000)+'s');
 if(m&&kind!=='key'&&kind!=='offline')detail.push(m.slice(0,160));
 return{kind:kind,text:text,detail:detail.join(' · '),retryMs:retryMs||0,raw:m}}
function aiErrMsg(status,j){return aiParseErr(status,j).text}
function aiPartsText(parts){if(!parts)return'';return parts.map(function(p){return p.text||''}).filter(Boolean).join('\n').trim()}
function aiGroundLinks(cand){var gm=cand&&(cand.groundingMetadata||cand.grounding_metadata);if(!gm)return[];
 var out=[],seen={},chunks=gm.groundingChunks||gm.grounding_chunks||[];
 chunks.forEach(function(c){var w=c.web||{};var u=w.uri||w.url,t=w.title||u;if(u&&!seen[u]){seen[u]=1;out.push({title:t||u,url:u})}});
 return out}
function aiExtractFns(parts){var fns=[];(parts||[]).forEach(function(p){var fc=p.functionCall||p.function_call;if(fc){
  var args=fc.args;if(typeof args==='string')try{args=JSON.parse(args)}catch(e){args={}}
  fns.push({name:fc.name,args:args||{}})}});return fns}
function aiHistContents(limit){limit=limit||12;var slice=chat.filter(function(m){return m.role==='user'||m.role==='model'}).slice(-limit);
 return slice.map(function(m){return{role:m.role==='model'?'model':'user',parts:[{text:m.text||''}]}})}
function aiBody(tools,extraContents){return{system_instruction:{parts:[{text:aiSystem()}]},contents:(extraContents||aiHistContents()),tools:tools,generationConfig:{temperature:.6,maxOutputTokens:1024}}}
function aiSleep(ms){return new Promise(function(r){setTimeout(r,ms)})}
function aiSearchModels(){var prefer=['gemini-2.0-flash','gemini-2.5-flash-lite','gemini-2.5-flash'],out=[],seen={};
 [aiModel].concat(prefer).forEach(function(id){if(id&&!seen[id]){seen[id]=1;out.push(id)}});return out}
function aiSearchBlocked(){var until=+LS.get('jv_gnosearch',0)||0;return Date.now()<until}
function aiBlockSearch(hours){LS.set('jv_gnosearch',Date.now()+Math.round((hours||6)*3600*1000))}
function aiCallModel(model,tools,extraContents){return aiFetch(model,aiBody(tools,extraContents))}
function aiCallOnce(tools,extraContents){return aiCallModel(aiModel,tools,extraContents).then(function(res){
  if(res.status===404){var alt=AI_MODELS.map(function(m){return m.id}).filter(function(id){return id!==aiModel});
   if(alt.length){return aiCallModel(alt[0],tools,extraContents)}}
  return res})}
function aiPushBot(text,opt){opt=opt||{};chat.push({role:'model',text:text,links:opt.links||[],err:!!opt.err,detail:opt.detail||'',ts:Date.now()});saveChat();aiRender();if(aiAuto&&!opt.err)aiSpeakLast()}
function aiHandleSuccess(res,note){var cand=(res.json&&res.json.candidates&&res.json.candidates[0])||{};
 var parts=(cand.content&&cand.content.parts)||[],fns=aiExtractFns(parts);
 if(fns.length){var notes=[],frParts=[];fns.forEach(function(fn){var r=aiRunFn(fn.name,fn.args);notes.push(r.msg);frParts.push({functionResponse:{name:fn.name,response:r}})});
  var contents=aiHistContents(10);contents.push({role:'model',parts:parts});contents.push({role:'user',parts:frParts});
  return aiCallOnce([{function_declarations:AI_FUNCS}],contents).then(function(res2){
   if(!res2.ok){aiPushBot((note?note+'\n':'')+notes.join(' '));return}
   var c2=(res2.json.candidates&&res2.json.candidates[0])||{};
   var txt=aiPartsText(c2.content&&c2.content.parts)||notes.join(' ');
   if(note)txt=note+'\n'+txt;
   aiPushBot(txt,{links:aiGroundLinks(c2)})})}
 var txt=aiPartsText(parts);if(!txt)txt='Nu am un răspuns clar acum.';
 if(note)txt=note+'\n'+txt;
 aiPushBot(txt,{links:aiGroundLinks(cand)})}
function aiTrySearchThenFallback(userText){/* 1 grounded model (+ optional short retry), then plain — don't burn free search RPD */
 var models=aiSearchModels(),model=models[0],alt=models[1],lastErr=null,retried=false;
 function plain(){return aiCallOnce([{function_declarations:AI_FUNCS}]).then(function(res){
   var note='(fără căutare web acum — limită Google)';
   var det=lastErr&&(lastErr.detail||lastErr.text);
   if(!res.ok){var e=aiParseErr(res.status,res.json);aiPushBot(e.text+(det?'\n'+det:''),{err:true,detail:e.detail});return}
   return aiHandleSuccess(res,note+(det?'\n'+det:''))})}
 function tryGround(m){aiSetStatus('Caut pe web ('+m+')…');
  return aiCallModel(m,[{google_search:{}}]).then(function(res){
   if(res.ok)return aiHandleSuccess(res);
   var e=aiParseErr(res.status,res.json);lastErr=e;
   if(e.kind==='model'&&alt&&m!==alt)return tryGround(alt);
   if(!retried&&e.retryMs>0&&e.retryMs<10000){retried=true;aiSetStatus('Reîncerc peste '+Math.ceil(e.retryMs/1000)+'s…');
    return aiSleep(e.retryMs).then(function(){return tryGround(m)})}
   if(e.kind==='search'||e.kind==='daily')aiBlockSearch(e.kind==='daily'?20:6);
   if(e.kind==='search'||e.kind==='quota'||e.kind==='daily'||e.kind==='minute'||e.kind==='model')return plain();
   aiPushBot(e.text,{err:true,detail:e.detail})})}
 return tryGround(model)}
function aiSend(userText){if(aiBusy)return Promise.resolve();userText=(userText||'').trim();if(!userText)return Promise.resolve();
 if(!aiHasKey()){aiShowNokey();return Promise.resolve()}
 chat.push({role:'user',text:userText,ts:Date.now()});saveChat();aiRender();aiBusy=true;aiSetStatus('Jarvis se gândește…');
 var wantSearch=aiNeedSearch(userText)&&!aiSearchBlocked();
 var p=wantSearch?aiTrySearchThenFallback(userText):aiCallOnce([{function_declarations:AI_FUNCS}]).then(function(res){
  if(!res.ok){var e=aiParseErr(res.status,res.json);aiPushBot(e.text,{err:true,detail:e.detail});return}
  return aiHandleSuccess(res)});
 return p.catch(function(e){if(e){aiPushBot(!navigator.onLine?'Fără internet — nu pot vorbi cu Gemini acum.':'Nu am putut contacta Gemini.',{err:true})}}).then(function(){aiBusy=false;aiSetStatus('')})}
function aiSetStatus(t){var el=$('aiStatus');if(el)el.textContent=t||''}
function aiSpeakMsg(i,el){if(speaking&&speakKey==='ai:'+i){stopSpeaking();return}
 unlockAudio();var msg=chat[i];if(!msg)return;
 var node=el||document.querySelector('#aiPanel.show .ai-msg[data-i="'+i+'"] .ai-b')||document.querySelector('.ai-msg[data-i="'+i+'"] .ai-b');
 return speak([prepSeg(node,msg.text)],'ai:'+i)}
function aiSpeakLast(){for(var i=chat.length-1;i>=0;i--)if(chat[i].role==='model'&&!chat[i].err)return aiSpeakMsg(i)}
function aiBubble(m,i){var div=document.createElement('div');div.className='ai-msg '+(m.role==='user'?'me':'bot')+(m.err?' err':'');div.dataset.i=i;
 var b=document.createElement('div');b.className='ai-b kw';b.textContent=m.text||'';div.appendChild(b);
 if(m.detail){var d=document.createElement('div');d.className='ai-detail';d.textContent=m.detail;div.appendChild(d)}
 if(m.links&&m.links.length){var s=document.createElement('div');s.className='ai-src';m.links.slice(0,5).forEach(function(l){var a=document.createElement('a');a.href=l.url;a.target='_blank';a.rel='noopener';a.textContent=l.title||l.url;s.appendChild(a)});div.appendChild(s)}
 if(m.role==='model'&&!m.err){var sp=document.createElement('button');sp.type='button';sp.className='ai-spk';sp.dataset.read='ai:'+i;sp.setAttribute('aria-label','Citește');sp.innerHTML=SPK_SVG;
  sp.addEventListener('pointerdown',function(e){e.stopPropagation();unlockAudio()});
  sp.onclick=function(e){e.preventDefault();e.stopPropagation();aiSpeakMsg(i,b)};div.appendChild(sp)}
 return div}
function aiRender(){var prev=$('aiPreview'),full=$('aiFullList'),nok=$('aiNokey'),box=$('aiChatBox');
 if(!aiHasKey()){if(nok)nok.hidden=false;if(box)box.hidden=true;if(prev)prev.innerHTML='';if(full)full.innerHTML='';return}
 if(nok)nok.hidden=true;if(box)box.hidden=false;
 function fill(el,n){if(!el)return;el.innerHTML='';var start=Math.max(0,chat.length-n);for(var i=start;i<chat.length;i++)el.appendChild(aiBubble(chat[i],i));el.scrollTop=el.scrollHeight}
 fill(prev,4);fill(full,AI_MAX)}
function aiShowNokey(){aiRender();toast('Adaugă cheia Gemini în Setări')}
function aiOpenSettings(){$('bSettings').click();setTimeout(function(){var s=$('aiSec');if(s)s.scrollIntoView({block:'nearest'})},50)}
function aiFillModels(){var sel=$('sAiModel');if(!sel)return;sel.innerHTML='';AI_MODELS.forEach(function(m){var o=document.createElement('option');o.value=m.id;o.textContent=m.label;sel.appendChild(o)});sel.value=aiModel;if(sel.value!==aiModel)sel.value=AI_MODELS[0].id}
function aiLoadSettings(){aiFillModels();var inp=$('sAiKey');if(inp)inp.value=aiKey||'';inp.type='password';
 var t=$('sAiShow');if(t)t.textContent='Arată';var a=$('sAiAuto');if(a)a.checked=aiAuto;var st=$('sAiKeyState');if(st)st.textContent=aiHasKey()?'Cheie salvată pe acest telefon.':'Nicio cheie salvată.'}
function aiTestKey(){if(!aiHasKey()&&$('sAiKey')){var v=$('sAiKey').value.trim();if(v){aiKey=v}}
 if(!aiHasKey()){toast('Lipsește cheia');return}
 var st=$('sAiTestState');if(st)st.textContent='Testez…';
 var body={contents:[{role:'user',parts:[{text:'Răspunde doar cu: OK'}]}],generationConfig:{maxOutputTokens:8,temperature:0}};
 aiFetch(aiModel,body).then(function(res){
  if(res.status===404){var next=AI_MODELS.map(function(m){return m.id}).filter(function(id){return id!==aiModel})[0];
   if(next){aiModel=next;LS.set('jv_gmodel',aiModel);aiFillModels();return aiFetch(aiModel,body)}}
  return res}).then(function(res){
  if(!res||!res.ok){if(st)st.textContent=aiErrMsg(res&&res.status,res&&res.json);toast('Test eșuat');return}
  var t=aiPartsText((((res.json.candidates||[])[0]||{}).content||{}).parts);if(st)st.textContent='OK — '+aiModel+(t?' („'+t.slice(0,40)+'”)':'');toast('Cheia funcționează')
 }).catch(function(){if(st)st.textContent='Fără internet sau eroare de rețea';toast('Test eșuat')})}
/* wire UI */
(function(){
 var aiRec=null,aiRecTarget=null;
 function aiFocusInput(inp){if(!inp)return;try{inp.scrollIntoView({block:'nearest',behavior:'smooth'})}catch(e){}
  inp.focus();try{var n=inp.value.length;inp.setSelectionRange(n,n)}catch(e){}}
 function aiBindMic(btn,inp){if(!btn||!inp)return;
  /* Android: focus() must run sync in the gesture — pointerdown, not after await/setTimeout */
  btn.addEventListener('pointerdown',function(e){
   if(e.pointerType==='mouse'&&e.button!==0)return;
   aiFocusInput(inp);
  });
  btn.addEventListener('click',function(e){e.preventDefault();
   aiFocusInput(inp); /* also sync on click (desktop / full-screen panel) */
   var SR=window.webkitSpeechRecognition||window.SpeechRecognition;
   if(!SR){toast('Apasă microfonul de pe tastatură ca să dictezi');return}
   try{
    if(aiRec){try{aiRec.stop()}catch(_){}aiRec=null;btn.classList.remove('on');if(aiRecTarget===inp)return}
    var rec=new SR();aiRec=rec;aiRecTarget=inp;rec.lang='ro-RO';rec.interimResults=true;rec.continuous=false;
    btn.classList.add('on');toast('Ascult… vorbește acum');
    var base=inp.value.replace(/\s+$/,'');
    rec.onresult=function(ev){var t='';for(var i=ev.resultIndex;i<ev.results.length;i++)t+=ev.results[i][0].transcript;
     inp.value=(base?(base+' '):'')+t.trim();};
    rec.onerror=function(){btn.classList.remove('on');aiRec=null;toast('Apasă microfonul de pe tastatură ca să dictezi');aiFocusInput(inp)};
    rec.onend=function(){btn.classList.remove('on');aiRec=null};
    rec.start();
   }catch(err){btn.classList.remove('on');aiRec=null;toast('Apasă microfonul de pe tastatură ca să dictezi');aiFocusInput(inp)}
  })}
 var form=$('fAi');if(form)form.addEventListener('submit',function(e){e.preventDefault();var i=$('iAi');aiSend(i.value).then(function(){i.value=''})});
 var fm=$('fAiFull');if(fm)fm.addEventListener('submit',function(e){e.preventDefault();var i=$('iAiFull');aiSend(i.value).then(function(){i.value='';$('iAi').value=''})});
 aiBindMic($('bAiMic'),$('iAi'));aiBindMic($('bAiMicFull'),$('iAiFull'));
 if($('aiExpand'))$('aiExpand').onclick=function(){unlockAudio();$('aiPanel').classList.add('show');aiRender();try{ensureVoice().catch(function(){})}catch(e){}};
 if($('aiClose'))$('aiClose').onclick=function(){$('aiPanel').classList.remove('show')};
 if($('aiPanel'))$('aiPanel').addEventListener('click',function(e){if(e.target===this)$('aiPanel').classList.remove('show')});
 if($('aiClear'))$('aiClear').onclick=function(){if(!confirm('Ștergi conversația?'))return;chat=[];saveChat();aiRender();toast('Conversație ștearsă')};
 if($('aiOpenSet'))$('aiOpenSet').onclick=aiOpenSettings;
 if($('sAiShow'))$('sAiShow').onclick=function(){var i=$('sAiKey');if(!i)return;var show=i.type==='password';i.type=show?'text':'password';this.textContent=show?'Ascunde':'Arată'};
 if($('sAiSaveKey'))$('sAiSaveKey').onclick=function(){var v=$('sAiKey').value.trim();saveAiKey(v);LS.set('jv_gmodel',$('sAiModel').value||aiModel);aiModel=$('sAiModel').value||aiModel;aiAuto=!!$('sAiAuto').checked;LS.set('jv_gauto',aiAuto);aiLoadSettings();aiRender();toast(v?'Cheie salvată':'Cheie ștearsă')};
 if($('sAiDelKey'))$('sAiDelKey').onclick=function(){if(!confirm('Ștergi cheia Gemini de pe acest telefon?'))return;$('sAiKey').value='';saveAiKey('');aiLoadSettings();aiRender();toast('Cheie ștearsă')};
 if($('sAiTest'))$('sAiTest').onclick=function(){var v=$('sAiKey').value.trim();if(v)aiKey=v;aiModel=$('sAiModel').value||aiModel;aiTestKey()};
 var _bs=$('bSettings').onclick;
 $('bSettings').onclick=function(){_bs();aiLoadSettings()};
 var _sv=$('sSave').onclick;
 $('sSave').onclick=function(){var v=$('sAiKey')&&$('sAiKey').value.trim();if(v!==undefined){if(v)saveAiKey(v);aiModel=$('sAiModel').value||aiModel;LS.set('jv_gmodel',aiModel);aiAuto=!!$('sAiAuto').checked;LS.set('jv_gauto',aiAuto)}
  _sv();aiRender()};
 aiRender();
 /* expose for tests */
 window.JARVIS_AI={send:aiSend,runFn:aiRunFn,render:aiRender,hasKey:aiHasKey,setKey:saveAiKey,get chat(){return chat},setChat:function(c){chat=c;saveChat()},needSearch:aiNeedSearch,models:AI_MODELS,funcs:AI_FUNCS,system:aiSystem,parseErr:aiParseErr,searchBlocked:aiSearchBlocked,blockSearch:aiBlockSearch,buildBody:function(tools){return aiBody(tools||[{function_declarations:AI_FUNCS}])}};
})();
