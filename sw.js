/* JARVIS service worker: app shell cache. HTML = network-first (updates arrive), static = cache-first.
   Voice model files (Mihai, own cache "jarvis-piper-v1") and weather (Open-Meteo) are NOT touched: passed straight to the network. */
var VERSION='jarvis-shell-v27';
var SHELL=['./','index.html','blank.html','manifest.webmanifest','manifest-blank.webmanifest',
 'icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png','icons/apple-touch-icon.png'];
var FONT_HOSTS=/^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)\//,DSEG=/^https:\/\/cdn\.jsdelivr\.net\/npm\/dseg@/;
self.addEventListener('install',function(e){e.waitUntil(caches.open(VERSION).then(function(c){
 return Promise.all(SHELL.map(function(u){return c.add(new Request(u,{cache:'reload'})).catch(function(){})}))}).then(function(){return self.skipWaiting()}))});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){
 return Promise.all(ks.filter(function(k){return /^jarvis-shell-/.test(k)&&k!==VERSION}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
function strip(u){var x=new URL(u);x.search='';x.hash='';return x.href}
self.addEventListener('fetch',function(e){var r=e.request;var url=r.url;
 if(r.method!=='GET')return;var same=url.indexOf(self.registration.scope)===0;
 if(same){var path=new URL(url).pathname;
  if(r.mode==='navigate'||/\.html$|\/$/.test(path)){ /* network-first */
   e.respondWith(fetch(r).then(function(res){if(res&&res.ok){var cp=res.clone();caches.open(VERSION).then(function(c){c.put(strip(url),cp)})}return res}).catch(function(){
    return caches.open(VERSION).then(function(c){return c.match(strip(url)).then(function(h){return h||c.match(/blank\.html$/.test(path)?'blank.html':'index.html',{ignoreSearch:true})})})}));return}
  if(/\.js$/.test(path)&&/sw\.js$/.test(path))return;
  if(/news\.json$/.test(path)){ /* network-first — never sticky-stale */
   var fresh=/[?&]fresh=/.test(url); /* manual refresh: no cache fallback, so the app can report the failure */
   e.respondWith(fetch(r,fresh?{cache:'no-store'}:undefined).then(function(res){if(res&&res.ok){var cp=res.clone();caches.open(VERSION).then(function(c){c.put(strip(url),cp)})}return res}).catch(function(err){
    if(fresh)throw err;return caches.open(VERSION).then(function(c){return c.match(strip(url))})}));return}
  e.respondWith(caches.open(VERSION).then(function(c){return c.match(strip(url)).then(function(h){return h||fetch(r).then(function(res){if(res&&res.ok)c.put(strip(url),res.clone());return res})})}));return}
 if(FONT_HOSTS.test(url)||DSEG.test(url)){ /* fonts: cache-first */
  e.respondWith(caches.open(VERSION).then(function(c){return c.match(url).then(function(h){return h||fetch(r).then(function(res){if(res&&(res.ok||res.type==='opaque'))c.put(url,res.clone());return res})})}));return}
 /* everything else (Mihai voice files, onnxruntime, Open-Meteo, geocoding…) -> untouched network */
});
