cd /workspace/jarvis/src
{ cat head.html; printf '<script>\n'; cat tts.js; printf '</script>\n<script>\n'; cat app.js; printf '</script>\n</body>\n</html>\n'; } > ../jarvis.html
sed -e 's#<meta name="jarvis-version" content="\([^"]*\)">#<meta name="jarvis-version" content="\1-blank">\n<script>window.JARVIS_BLANK=true</script>#' -e 's#href="manifest.webmanifest"#href="manifest-blank.webmanifest"#' ../jarvis.html > ../blank.html
cd .. && node -e "for(const f of ['jarvis.html','blank.html']){const h=require('fs').readFileSync(f,'utf8');[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m)=>new Function(m[1]));console.log(f,'syntax OK')}"
