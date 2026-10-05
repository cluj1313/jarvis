cd /workspace/jarvis/src
python3 -c "
from pathlib import Path
app=Path('app.js').read_text(); ai=Path('ai.js').read_text()
idx=app.rfind('})();')
assert idx>0
Path('/tmp/app-built.js').write_text(app[:idx]+chr(10)+ai+chr(10)+'})();'+chr(10))
print('merged', Path('/tmp/app-built.js').stat().st_size)
"
{ cat head.html; printf '<script>\n'; cat tts.js; printf '</script>\n<script>\n'; cat /tmp/app-built.js; printf '</script>\n</body>\n</html>\n'; } > ../jarvis.html
sed -e 's#<meta name="jarvis-version" content="\([^"]*\)">#<meta name="jarvis-version" content="\1-blank">\n<script>window.JARVIS_BLANK=true</script>#' -e 's#href="manifest.webmanifest"#href="manifest-blank.webmanifest"#' ../jarvis.html > ../blank.html
cd .. && node -e "for(const f of ['jarvis.html','blank.html']){const h=require('fs').readFileSync(f,'utf8');[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m)=>new Function(m[1]));console.log(f,'syntax OK')}"
