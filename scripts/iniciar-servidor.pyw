"""Inicia a Mesa no Windows sem criar uma janela de console."""
from pathlib import Path
import datetime
import json
import msvcrt
import os
import shutil
import subprocess
import sys
import time
import traceback
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
LOCAL = ROOT / '.local'


def log(message):
    with (LOCAL / 'servidor.log').open('a', encoding='utf8') as stream:
        stream.write(f'[{datetime.datetime.now().astimezone().isoformat()}] {message}\n')


def main():
    LOCAL.mkdir(exist_ok=True)
    with (LOCAL / 'servidor-start.lock').open('a+b') as lock:
        lock.seek(0, os.SEEK_END)
        if not lock.tell():
            lock.write(b'0')
            lock.flush()
        lock.seek(0)
        try:
            msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
        except OSError:
            return 0
        try:
            try:
                with urllib.request.urlopen('http://127.0.0.1:4173/api/project', timeout=3) as response:
                    project = json.load(response)
            except urllib.error.HTTPError:
                raise RuntimeError('A porta 4173 responde por outro aplicativo.')
            except urllib.error.URLError:
                pass
            else:
                if Path(project.get('root', '')).resolve() != ROOT:
                    raise RuntimeError('A porta 4173 pertence a outro projeto.')
                return 0
            node = shutil.which('node')
            if not node:
                raise RuntimeError('Node.js nao encontrado.')
            delay = 2
            while True:
                started = time.monotonic()
                stamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f')
                out_path = LOCAL / f'servidor-{stamp}.stdout.log'
                err_path = LOCAL / f'servidor-{stamp}.stderr.log'
                with out_path.open('ab') as output, err_path.open('ab') as errors:
                    process = subprocess.Popen(
                        [node, str(ROOT / 'scripts/serve.mjs')], cwd=ROOT,
                        env={**os.environ, 'TWEED_PORT': '4173'},
                        stdin=subprocess.DEVNULL, stdout=output, stderr=errors,
                        creationflags=subprocess.CREATE_NO_WINDOW,
                    )
                    log(f'Servidor sem console PID {process.pid}; stdout={out_path}; stderr={err_path}')
                    code = process.wait()
                    log(f'Servidor PID {process.pid} encerrou: {code}')
                # A tarefa continua viva mesmo se o Node for encerrado externamente.
                if time.monotonic() - started >= 60:
                    delay = 2
                log(f'Reiniciando o servidor em {delay} segundos.')
                time.sleep(delay)
                delay = min(delay * 2, 30)
        finally:
            lock.seek(0)
            msvcrt.locking(lock.fileno(), msvcrt.LK_UNLCK, 1)


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception:
        LOCAL.mkdir(exist_ok=True)
        log(traceback.format_exc())
        sys.exit(1)
