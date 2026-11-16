"""Entrada do publicador do site institucional. Nenhuma senha em argumentos."""
from pathlib import Path
import json,subprocess,sys
root=Path(__file__).resolve().parents[1]
config=json.loads((root/'editorial/integracao.json').read_text(encoding='utf-8-sig'))
site=(root/config['siteRoot']).resolve()
# linkedin-after-blog: reconcile only after the real blog publisher succeeds.
code=subprocess.call([sys.executable,str(site/'tools/publicar_editorial.py'),'--editorial-root',str(root),*sys.argv[1:]])
if code==0 and '--dry-run' not in sys.argv[1:]:
    try:
        queued=subprocess.run(['node',str(root/'scripts/linkedin.mjs'),'sync'],cwd=root,capture_output=True,text=True,encoding='utf-8',timeout=30)
        if queued.returncode:
            print('Blog confirmado; fila LinkedIn precisa ser reconciliada na proxima rodada.',file=sys.stderr)
        else:
            print('Fila LinkedIn reconciliada apos confirmacao do blog.',file=sys.stderr)
    except (OSError,subprocess.TimeoutExpired):
        print('Blog confirmado; fila LinkedIn pendente para a proxima rodada.',file=sys.stderr)
raise SystemExit(code)
