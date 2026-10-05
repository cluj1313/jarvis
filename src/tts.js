/* ===== Neural TTS in-browser (no API keys): Piper Mihai only. onnxruntime-web 1.18 WASM.
   Runs in a Web Worker; script code is passed as text and eval'd (no importScripts of blob: URLs), so it also works
   when the page is opened from file:// or content:// (null origin). Falls back to the main thread if the worker fails.
   Storage: Cache API -> IndexedDB -> memory (download each time). ===== */
var TTS=(function(){
 'use strict';
 var ORT='https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/';
 var PH='https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize';
 var HFP='https://huggingface.co/rhasspy/piper-voices/resolve/main/ro/ro_RO/mihai/medium/ro_RO-mihai-medium';
 var CACHE='jarvis-piper-v1'; /* same cache as v3–v9, so Mihai is not downloaded again */
 var OPAQUE=false;try{OPAQUE=self.origin==='null'||location.origin==='null'||!/^https?:$/.test(location.protocol)}catch(e){OPAQUE=true}
 function simdOK(){try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11]))}catch(e){return false}}
 var SIMD=typeof WebAssembly==='object'&&simdOK();
 var ORTWASM=SIMD?'ort-wasm-simd.wasm':'ort-wasm.wasm';
 var ENG={piper:{name:'Mihai',files:[{k:'ortjs',url:ORT+'ort.wasm.min.js',size:142930},{k:'ortwasm',url:ORT+ORTWASM,size:SIMD?10595041:9758086},
   {k:'cfg',url:HFP+'.onnx.json',size:5000},{k:'phjs',url:PH+'.js',size:120714},{k:'phwasm',url:PH+'.wasm',size:635212},
   {k:'phdata',url:PH+'.data',size:18077249},{k:'model',url:HFP+'.onnx',size:63201294}]}};
 var VOICES=[{id:'mihai',engine:'piper',short:'Mihai',label:'Mihai (Piper)'}];
 function voice(id){for(var i=0;i<VOICES.length;i++)if(VOICES[i].id===id)return VOICES[i];return null}
 function total(e){return ENG[e].files.reduce(function(a,f){return a+f.size},0)}

 /* ----- storage: Cache API, else IndexedDB, else memory ----- */
 var mem={},store=null;
 function cacheStore(){try{if(typeof caches==='undefined')return Promise.reject();return caches.open(CACHE).then(function(c){
   return {kind:'cache',get:function(u){return c.match(u).then(function(r){return r?r.arrayBuffer():null})},
    put:function(u,b){return c.put(u,new Response(b,{headers:{'Content-Type':'application/octet-stream'}}))},
    has:function(u){return c.match(u).then(Boolean)},del:function(u){return c.delete(u)}}})}catch(e){return Promise.reject(e)}}
 function idbStore(){return new Promise(function(res,rej){try{var rq=indexedDB.open('jarvis-tts',1);
   rq.onupgradeneeded=function(){rq.result.createObjectStore('files')};rq.onerror=function(){rej(rq.error)};
   rq.onsuccess=function(){var db=rq.result;function tx(m,fn){return new Promise(function(r2,j2){try{var t=db.transaction('files',m),q=fn(t.objectStore('files'));t.oncomplete=function(){r2(q&&q.result)};t.onerror=t.onabort=function(){j2(t.error)}}catch(e){j2(e)}})}
    res({kind:'idb',get:function(u){return tx('readonly',function(s){return s.get(u)}).then(function(v){return v||null})},
     put:function(u,b){return tx('readwrite',function(s){return s.put(b,u)})},
     has:function(u){return tx('readonly',function(s){return s.count(u)}).then(function(n){return n>0})},
     del:function(u){return tx('readwrite',function(s){return s.delete(u)})}})}}catch(e){rej(e)}})}
 var memStore={kind:'memory',get:function(u){return Promise.resolve(mem[u]||null)},put:function(){return Promise.resolve()},
  has:function(){return Promise.resolve(false)},del:function(u){delete mem[u];return Promise.resolve()}};
 function getStore(){if(!store)store=cacheStore().catch(function(){return idbStore()}).catch(function(){return memStore});return store}
 function getFile(f,onBytes){
  return getStore().then(function(S){
   return S.get(f.url).catch(function(){return null}).then(function(hit){
    if(hit){onBytes(f,hit.byteLength);return hit}
    return fetch(f.url,{mode:'cors'}).then(function(r){
     if(!r.ok)throw new Error('HTTP '+r.status+' '+f.url.split('/').pop());
     var got=0,chunks=[];
     if(!r.body||!r.body.getReader)return r.arrayBuffer().then(function(b){onBytes(f,b.byteLength);return b});
     var rd=r.body.getReader();
     return (function pump(){return rd.read().then(function(x){
      if(x.done){var u=new Uint8Array(got),o=0;chunks.forEach(function(ch){u.set(ch,o);o+=ch.length});return u.buffer}
      chunks.push(x.value);got+=x.value.length;onBytes(f,got);return pump()})})();
    }).then(function(buf){return S.put(f.url,S.kind==='memory'?null:buf.slice(0)).then(function(){return buf},function(){return buf})})})})}
 function isDownloaded(e){return getStore().then(function(S){return Promise.all(ENG[e].files.map(function(f){return S.has(f.url)})).then(function(r){return r.every(Boolean)})}).catch(function(){return false})}
 function remove(e){release(e);return getStore().then(function(S){return Promise.all(ENG[e].files.filter(function(f){return f.k!=='ortjs'&&f.k!=='ortwasm'}).map(function(f){return S.del(f.url)}))})}
 /* v10: Supertonic + MMS removed -> free their cached files */
 function cleanupOld(){try{if(typeof caches==='undefined')return;caches.open(CACHE).then(function(c){return c.keys().then(function(ks){
   return Promise.all(ks.filter(function(r){return /supertonic|mms-tts-ron/i.test(r.url)}).map(function(r){return c.delete(r)}))})}).catch(function(){})}catch(e){}}
 setTimeout(cleanupOld,3000);

 /* ----- engine (same code runs inside the worker or on the main thread) ----- */
 var ENGINE=function(G){
  var ort=null,P=null;
  function run(code){(0,eval)(code)}
  function ensureOrt(m){if(ort)return;if(!G.ort)run(m.ortJS+'\n;globalThis.ort=ort;');ort=G.ort;
   ort.env.wasm.numThreads=1;ort.env.wasm.simd=m.simd;ort.env.wasm.proxy=false;ort.env.wasm.wasmPaths=m.wasmPaths}
  function I64(a){return BigInt64Array.from(a,function(x){return BigInt(x)})}
  var phResolve=null;
  function getPh(){if(P.ph)return Promise.resolve(P.ph);
   return G.createPiperPhonemize({print:function(d){if(phResolve){var r=phResolve;phResolve=null;try{r(JSON.parse(d).phoneme_ids)}catch(e){}}},printErr:function(){},
    wasmBinary:P.phWasm,getPreloadedPackage:function(){return P.phData.slice(0)},locateFile:function(u){return u},noInitialRun:true}).then(function(m){P.ph=m;return m})}
  function phonemize(text){return getPh().then(function(m){return new Promise(function(res,rej){
   var done=false;phResolve=function(ids){done=true;res(ids)};
   try{m.callMain(['-l',P.cfg.espeak.voice,'--input',JSON.stringify([{text:text}]),'--espeak_data','/espeak-ng-data'])}catch(e){if(!done){P.ph=null;phResolve=null;rej(e);return}}
   if(!done){P.ph=null;phResolve=null;rej(new Error('phonemizer returned nothing'))}})})}
  function J(buf){return JSON.parse(new TextDecoder().decode(buf))}
  return async function(m){
   if(m.type==='ping'){run('void 0');return {ok:true}}
   if(m.type==='init'){ensureOrt(m);var B=m.bufs;if(!G.createPiperPhonemize)run(m.phJS+'\n;globalThis.createPiperPhonemize=createPiperPhonemize;');
    P={cfg:J(B.cfg),phWasm:B.phwasm,phData:B.phdata};
    P.s=await ort.InferenceSession.create(new Uint8Array(B.model),{executionProviders:['wasm'],graphOptimizationLevel:'all'});await phonemize('test');return {ok:true}}
   if(m.type==='release'){if(P&&P.s)try{await P.s.release()}catch(_){};P=null;return {ok:true}}
   if(m.type==='synth'){var t0=Date.now(),ids;try{ids=await phonemize(m.text)}catch(err){P.ph=null;ids=await phonemize(m.text)}
    var feeds={input:new ort.Tensor('int64',I64(ids),[1,ids.length]),input_lengths:new ort.Tensor('int64',I64([ids.length]),[1]),
     scales:new ort.Tensor('float32',Float32Array.from([P.cfg.inference.noise_scale,1/m.speed,P.cfg.inference.noise_w]),[3])};
    var out=await P.s.run(feeds),pcm=new Float32Array(out.output.data);return {ok:true,pcm:pcm,sr:P.cfg.audio.sample_rate,ms:Date.now()-t0,transfer:[pcm.buffer]}}
   throw new Error('unknown '+m.type)}};

 var worker=null,mainH=null,mode=null,seq=0,cbs={},st={piper:'idle'},prog={piper:0},ready={},workerFailed=false;
 function td(b){return new TextDecoder().decode(b)}
 function b64(buf){var u=new Uint8Array(buf),s='',C=0x8000;for(var i=0;i<u.length;i+=C)s+=String.fromCharCode.apply(null,u.subarray(i,i+C));return btoa(s)}
 function startWorker(){return new Promise(function(res,rej){var w;
  try{var src='var H=('+ENGINE.toString()+')(self);onmessage=function(ev){var m=ev.data;H(m).then(function(r){var tr=r.transfer||[];delete r.transfer;r.id=m.id;postMessage(r,tr)},function(err){postMessage({id:m.id,ok:false,error:String(err&&err.message||err)})})}';
   w=new Worker(URL.createObjectURL(new Blob([src],{type:'text/javascript'})))}catch(e){rej(e);return}
  var to=setTimeout(function(){try{w.terminate()}catch(_){}rej(new Error('worker timeout'))},5000);
  w.onmessage=function(e){var d=e.data;if(d.id===0){clearTimeout(to);w.onmessage=onMsg;res(w);return}onMsg(e)};
  w.onerror=function(e){clearTimeout(to);try{w.terminate()}catch(_){}rej(new Error(e.message||'worker error'))};
  w.postMessage({type:'ping',id:0})})}
 function onMsg(e){var d=e.data,c=cbs[d.id];if(!c)return;delete cbs[d.id];d.ok?c.res(d):c.rej(new Error(d.error))}
 function useMain(){if(!mainH)mainH=ENGINE(window);mode='main';if(worker){try{worker.terminate()}catch(_){}worker=null}}
 function ensureRunner(){if(mode)return Promise.resolve(mode);
  return startWorker().then(function(w){worker=w;mode='worker';w.onerror=function(e){for(var id in cbs){cbs[id].rej(new Error(e.message||'worker error'));delete cbs[id]}};return mode},
   function(err){console.warn('TTS worker unavailable, using main thread:',err);useMain();return mode})}
 function call(msg,transfer){return ensureRunner().then(function(){
  if(mode==='main')return mainH(msg).then(function(r){delete r.transfer;return r});
  return new Promise(function(res,rej){msg.id=++seq;cbs[msg.id]={res:res,rej:rej};worker.postMessage(msg,transfer||[])})})}
 function release(e){if(st[e]==='ready'){call({type:'release',engine:e}).catch(function(){})}st[e]='idle';ready[e]=null}
 function init(e,onProgress){e='piper';if(ready[e])return ready[e];onProgress=onProgress||function(){};
  var files=ENG[e].files,T=total(e),loaded={};st[e]='loading';prog[e]=0;
  function onBytes(f,n){loaded[f.k]=Math.min(n,f.size*1.05);var s=0;for(var k in loaded)s+=loaded[k];prog[e]=Math.min(.99,s/T);onProgress(prog[e],'download')}
  ready[e]=Promise.all(files.map(function(f){return getFile(f,onBytes)})).then(function(bufs){
   var B={};files.forEach(function(f,i){B[f.k]=bufs[i]});onProgress(.99,'init');
   /* wasm for onnxruntime: blob URL normally; data: URL on null origin (blob:null fetches fail there) */
   var wp={};wp[ORTWASM]=OPAQUE?'data:application/octet-stream;base64,'+b64(B.ortwasm):URL.createObjectURL(new Blob([B.ortwasm],{type:'application/wasm'}));
   var msg={type:'init',engine:e,ortJS:td(B.ortjs),phJS:td(B.phjs),wasmPaths:wp,simd:SIMD,bufs:{cfg:B.cfg,phwasm:B.phwasm,phdata:B.phdata,model:B.model}};
   function viaMain(err){if(mode==='main')throw err;console.warn('TTS worker init failed, retrying on main thread:',err);useMain();return call(msg)}
   return ensureRunner().then(function(){
    if(mode==='main')return call(msg);
    /* keep our copies (no transfer) so the main-thread fallback can reuse them without downloading again */
    return call(msg).catch(viaMain)})
  }).then(function(){st[e]='ready';prog[e]=1;onProgress(1,'ready');try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(function(){})}catch(_){}},
   function(err){st[e]='error';ready[e]=null;throw err});
  return ready[e]}
 function synth(voiceId,text,opts){opts=opts||{};
  return init('piper').then(function(){return call({type:'synth',engine:'piper',text:text,speed:opts.speed||1})})}
 function pcmToWav(pcm,sr){var b=new ArrayBuffer(44+pcm.length*2),v=new DataView(b);
  function w(o,s){for(var i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))}
  w(0,'RIFF');v.setUint32(4,36+pcm.length*2,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
  v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,pcm.length*2,true);
  for(var i=0;i<pcm.length;i++){var s=Math.max(-1,Math.min(1,pcm[i]));v.setInt16(44+i*2,s<0?s*32768:s*32767,true)}return b}
 /* WSOLA time-stretch + resampling: tempo (>1 faster) and pitch factor (<1 deeper), keeps the other one */
 function wsola(x,tempo,sr){if(Math.abs(tempo-1)<.01)return x;
  var N=Math.round(sr*.03),Hs=N>>1,Ha=Hs*tempo,tol=Math.round(sr*.008),win=new Float32Array(N);for(var i=0;i<N;i++)win[i]=.5-.5*Math.cos(2*Math.PI*i/(N-1));
  var outLen=Math.ceil(x.length/tempo)+N,y=new Float32Array(outLen),ws=new Float32Array(outLen),prev=0,out=0,step=Math.max(1,Math.round(sr/8000)),dstep=Math.max(1,step>>1);
  for(var k=0;;k++,out+=Hs){var ideal=Math.round(k*Ha);if(ideal+N+tol>=x.length||out+N>=outLen)break;var best=ideal;
   if(k>0){var ref=prev+Hs,bc=-Infinity;if(ref+N<x.length)for(var d=-tol;d<=tol;d+=dstep){var p=ideal+d;if(p<0)continue;var c=0;for(var j=0;j<N;j+=step)c+=x[p+j]*x[ref+j];if(c>bc){bc=c;best=p}}}
   for(i=0;i<N;i++){y[out+i]+=x[best+i]*win[i];ws[out+i]+=win[i]}prev=best}
  var end=out+N;for(i=0;i<end;i++)if(ws[i]>1e-3)y[i]/=ws[i];return y.subarray(0,end)}
 function resample(x,factor){var n=Math.floor(x.length/factor),y=new Float32Array(n);for(var i=0;i<n;i++){var p=i*factor,k=Math.floor(p),f=p-k;y[i]=(x[k]||0)*(1-f)+(x[k+1]||0)*f}return y}
 function fx(pcm,sr,tempo,pitch){tempo=tempo||1;pitch=pitch||1;if(Math.abs(tempo-1)<.01&&Math.abs(pitch-1)<.01)return pcm;
  var z=wsola(pcm,tempo/pitch,sr);return Math.abs(pitch-1)<.01?z:resample(z,pitch)}
 return {VOICES:VOICES,voice:voice,init:init,synth:synth,isDownloaded:isDownloaded,remove:remove,release:release,pcmToWav:pcmToWav,fx:fx,opaque:OPAQUE,
  storage:function(){return getStore().then(function(S){return S.kind})},runner:function(){return mode},
  state:function(e){return st[e]},progress:function(e){return prog[e]},sizeMB:function(e){return Math.round(total(e)/1048576)},engineName:function(e){return ENG[e].name}};
})();
