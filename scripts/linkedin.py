"""Fila local de artigos LinkedIn. O envio e sua verificacao pertencem ao agente no Chrome."""
import argparse
import contextlib
import datetime as dt
import hashlib
from functools import lru_cache
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
from urllib.parse import urljoin, urlparse
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from bs4 import BeautifulSoup

ROOT = Path(os.environ.get('TWEED_EDITORIAL_ROOT', Path(__file__).resolve().parents[1]))
STATE = ROOT / '.local/linkedin/estado.json'
CONFIG = ROOT / 'editorial/linkedin-config.json'


def read(path, default=None):
    try:
        return json.loads(path.read_text(encoding='utf-8-sig'))
    except FileNotFoundError:
        if default is not None:
            return default
        raise


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=path.name + '.', suffix='.tmp', dir=path.parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8', newline='\n') as stream:
            json.dump(value, stream, ensure_ascii=False, indent=2)
            stream.write('\n')
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


@contextlib.contextmanager
def locked():
    lock = ROOT / '.local/project.lock'
    lock.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    try:
        yield
    finally:
        os.close(fd)
        lock.unlink()


def instant(value):
    result = dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
    if result.tzinfo is None:
        raise ValueError('Instante requer fuso horario')
    return result


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def sha(data):
    return hashlib.sha256(data).hexdigest()


def valid_slug(slug):
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', slug):
        raise ValueError('Slug invalido')
    return slug


def linkedin_url(value, kind):
    url = urlparse(urljoin('https://www.linkedin.com', value))
    if url.scheme != 'https' or url.hostname != 'www.linkedin.com' or url.username or url.password:
        raise ValueError('URL LinkedIn invalida')
    prefixes = {'article': ('/pulse/',), 'post': ('/feed/update/',), 'draft': ('/article/edit/',)}
    if not url.path.startswith(prefixes[kind]):
        raise ValueError('Tipo de URL LinkedIn incorreto')
    return url._replace(query='', fragment='').geturl()


def site_root():
    return (ROOT / read(ROOT / 'editorial/integracao.json')['siteRoot']).resolve()


def sync(state):
    config = read(CONFIG)
    if not config.get('enabled'):
        raise ValueError('Etapa LinkedIn desabilitada')
    site = site_root()
    catalog = read(site / 'docs/artigos-recuperados.json') + read(site / 'docs/artigos-editoriais.json')
    candidates = [a for a in catalog if instant(a['published']) > instant(config['afterPublishedAt'])]
    candidates.sort(key=lambda a: instant(a['published']))
    known = {i['slug']: i for i in state['items']}
    for a in candidates:
        slug = valid_slug(a['slug'])
        if slug not in known:
            if not (site / 'site/parallax' / slug / 'index.html').is_file():
                raise ValueError('Artigo do catalogo sem pagina: ' + slug)
            item = {'slug': slug, 'title': a['title'], 'blogPublishedAt': a['published'],
                    'blogUrl': 'https://www.agenciatweed.com.br/' + slug + '/', 'state': 'pending'}
            state['items'].append(item)
            known[slug] = item
    # Stable order for articles sharing the same publication instant.
    state['items'].sort(key=lambda a: instant(a['blogPublishedAt']))
    return state


def payload(item):
    public = site_root() / 'site/parallax'
    page = public / valid_slug(item['slug']) / 'index.html'
    soup = BeautifulSoup(page.read_bytes(), 'html.parser')
    canonical = soup.select_one('link[rel=canonical]')
    if not canonical or canonical['href'] != item['blogUrl']:
        raise ValueError('Canonical divergente')
    body, title, cover = soup.select_one('.article-body'), soup.h1, soup.select_one('.article-cover img')
    if not body or not title or not cover:
        raise ValueError('Pagina sem corpo, titulo ou capa')
    for node in body.select('.article-toc, script, style'):
        node.decompose()
    image = (public / cover['src'].lstrip('/')).resolve()
    image.relative_to(public.resolve())
    if not image.is_file():
        raise ValueError('Capa ausente')
    content = ''.join(str(n) for n in body.contents)
    name = title.get_text(strip=True)
    return {'slug': item['slug'], 'title': name, 'url': item['blogUrl'], 'html': content,
            'bodyText': body.get_text(' ', strip=True), 'cover': str(image),
            'bodySha256': sha(str(body).encode()), 'coverSha256': sha(image.read_bytes()),
            'imageAlt': cover.get('alt', ''),
            'caption': f'"{name}"\nArtigo originalmente publicado no blog da Agência Tweed:\n{item["blogUrl"]}'}


@lru_cache(maxsize=256)
def local_date(value, timezone):
    moment = instant(value)
    try:
        return moment.astimezone(ZoneInfo(timezone)).date().isoformat()
    except ZoneInfoNotFoundError:
        # Windows may have no Python tzdata. Node/ICU is already part of the panel.
        script = ('const [value, zone] = process.argv.slice(1);'
                  'process.stdout.write(new Intl.DateTimeFormat("en-CA",'
                  '{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit"})'
                  '.format(new Date(value)));')
        result = subprocess.run(['node', '-e', script, moment.isoformat(), timezone],
                                capture_output=True, text=True, check=True, timeout=10)
        date = result.stdout.strip()
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', date):
            raise ValueError('Nao foi possivel determinar a data local')
        return date


def queue_class(item, config):
    return 'new' if instant(item['blogPublishedAt']) >= instant(config['prioritySince']) else 'backlog'


def summarize(state, at=None):
    config = read(CONFIG)
    timezone = config.get('timeZone', 'America/Sao_Paulo')
    # Defaults keep pre-policy configurations usable without changing old records.
    config.setdefault('prioritySince', '2026-11-17T00:00:00-03:00')
    daily_limit = config.get('dailyLimit', 5)
    backlog_limit = config.get('backlogDailyLimit', 1)
    new_limit = config.get('newDailyLimit', 1)
    if not isinstance(daily_limit, int) or not 1 <= daily_limit <= 5:
        raise ValueError('Limite diario LinkedIn invalido')
    if not isinstance(backlog_limit, int) or not 0 <= backlog_limit <= 1:
        raise ValueError('Limite diario do acervo invalido')
    if not isinstance(new_limit, int) or new_limit != 1:
        raise ValueError('Limite diario de artigos novos deve ser um')
    day = local_date(at or now(), timezone)
    pending = [i for i in state['items'] if i['state'] != 'published']
    pending.sort(key=lambda i: instant(i['blogPublishedAt']))
    sent = [i for i in state['items'] if i['state'] == 'published'
            and local_date(i['confirmedAt'], timezone) == day]
    backlog_sent = sum(queue_class(i, config) == 'backlog' for i in sent)
    new_sent = sum(queue_class(i, config) == 'new' for i in sent)
    uncertain = [i for i in pending if i['state'] == 'publishing']
    new = [i for i in pending if queue_class(i, config) == 'new']
    old = [i for i in pending if queue_class(i, config) == 'backlog']
    selected, reason = None, 'queue-empty'
    # An uncertain send must be reconciled even when all slots are exhausted.
    if uncertain:
        selected, reason = uncertain[0], 'reconcile'
    elif len(sent) >= daily_limit:
        reason = 'daily-limit'
    elif new:
        if new_sent < new_limit:
            selected, reason = new[0], 'new-article'
        else:
            reason = 'new-daily-limit'
    elif old and backlog_sent < backlog_limit:
        selected, reason = old[0], 'backlog-slot'
    elif old:
        reason = 'backlog-daily-limit'
    return {'total': len(state['items']), 'published': len(state['items']) - len(pending),
            'pending': len(pending), 'date': day, 'timeZone': timezone,
            'dailyLimit': daily_limit, 'publishedToday': len(sent),
            'remainingToday': max(0, daily_limit - len(sent)),
            'backlogDailyLimit': backlog_limit, 'backlogPublishedToday': backlog_sent,
            'newDailyLimit': new_limit, 'newPublishedToday': new_sent,
            'reason': reason, 'nextClass': queue_class(selected, config) if selected else None,
            'next': selected}


def require_eligible(state, item):
    selection = summarize(state)
    if selection['reason'] == 'reconcile':
        raise ValueError('Envio incerto: conferir publicacoes antes de iniciar outro envio')
    if not selection['next'] or selection['next']['slug'] != item['slug']:
        raise ValueError('Artigo fora da vez ou da quota diaria: ' + selection['reason'])


def get_item(state, slug):
    valid_slug(slug)
    return next(i for i in state['items'] if i['slug'] == slug)


def confirm(item, evidence):
    if evidence.get('slug') != item['slug'] or evidence.get('blogUrl') != item['blogUrl']:
        raise ValueError('Evidencia pertence a outro artigo')
    article = linkedin_url(evidence['articleUrl'], 'article')
    post = linkedin_url(evidence['postUrl'], 'post')
    instant(evidence['confirmedAt'])
    for field in ('bodySha256', 'coverSha256'):
        if not re.fullmatch(r'[a-f0-9]{64}', evidence.get(field, '')):
            raise ValueError('Hash de evidencia ausente')
        if item.get(field) and item[field] != evidence[field]:
            raise ValueError('Conteudo mudou durante o envio')
    if item['state'] == 'published':
        if item['articleUrl'] != article or item['postUrl'] != post:
            raise ValueError('Artigo ja confirmado com outro destino')
        return
    item.update({k: evidence[k] for k in ('bodySha256', 'coverSha256', 'confirmedAt')})
    item.update(state='published', articleUrl=article, postUrl=post)
    item.pop('lastError', None)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['sync', 'status', 'next', 'payload', 'start', 'draft', 'publishing', 'confirm', 'import-confirmations', 'blocked'])
    parser.add_argument('args', nargs='*')
    args = parser.parse_args()
    with locked():
        state = read(STATE, {'version': 1, 'items': []})
        if state.get('version') != 1 or len({i['slug'] for i in state['items']}) != len(state['items']):
            raise ValueError('Registro LinkedIn invalido')
        before = json.dumps(state, sort_keys=True)
        command, values = args.command, args.args
        result = None
        if command == 'sync':
            sync(state)
        elif command == 'import-confirmations':
            sync(state)
            for evidence in read(Path(values[0])):
                confirm(get_item(state, evidence['slug']), evidence)
        elif command not in ('status', 'next'):
            item = get_item(state, values[0])
            if command == 'confirm':
                confirm(item, read(Path(values[1])))
            else:
                if item['state'] == 'published':
                    raise ValueError('Artigo ja publicado; nao criar duplicata')
                if command in ('payload', 'start'):
                    if command == 'start':
                        require_eligible(state, item)
                    data = payload(item)
                    target = ROOT / '.local/linkedin' / (item['slug'] + '.json')
                    write(target, data)
                    result = {'payloadFile': str(target), 'item': item}
                    if command == 'start':
                        if item['state'] == 'publishing':
                            raise ValueError('Envio incerto: conferir publicacoes antes de repetir')
                        for key in ('bodySha256', 'coverSha256'):
                            if item.get('draftUrl') and item.get(key) and item[key] != data[key]:
                                raise ValueError('Origem mudou; conciliar o rascunho existente')
                            item[key] = data[key]
                        item.setdefault('startedAt', now())
                        item['state'] = 'draft'
                elif command == 'draft':
                    item['draftUrl'] = linkedin_url(values[1], 'draft')
                    item['state'] = 'draft'
                elif command == 'publishing':
                    if not item.get('draftUrl') or not item.get('bodySha256'):
                        raise ValueError('Registrar e conferir rascunho antes de enviar')
                    require_eligible(state, item)
                    item['state'] = 'publishing'
                    item['publishingAt'] = now()
                elif command == 'blocked':
                    # Keep draft/publishing state: a network error does not prove failure to publish.
                    item['lastError'] = ' '.join(values[1:])[:500]
                    item['lastErrorAt'] = now()
        if json.dumps(state, sort_keys=True) != before:
            state['updatedAt'] = now()
            write(STATE, state)
        print(json.dumps(result or summarize(state), ensure_ascii=True))


if __name__ == '__main__':
    main()
