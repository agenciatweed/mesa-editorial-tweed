"""Entrada do publicador do site institucional. Nenhuma senha em argumentos."""
from pathlib import Path
import json,subprocess,sys
root=Path(__file__).resolve().parents[1]
config=json.loads((root/'editorial/integracao.json').read_text(encoding='utf-8-sig'))
site=(root/config['siteRoot']).resolve()
raise SystemExit(subprocess.call([sys.executable,str(site/'tools/publicar_editorial.py'),'--editorial-root',str(root),*sys.argv[1:]]))
