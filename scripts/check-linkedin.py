"""Regression checks for LinkedIn resumption and content fidelity; no network/UI."""
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest import mock
import runpy
import subprocess
import sys
from unittest import mock
import runpy
import subprocess
import sys

spec = importlib.util.spec_from_file_location('linkedin_queue', Path(__file__).with_name('linkedin.py'))
queue = importlib.util.module_from_spec(spec)
spec.loader.exec_module(queue)


class QueueTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        base = Path(self.tmp.name)
        queue.ROOT = base / 'panel'
        queue.STATE = queue.ROOT / '.local/linkedin/estado.json'
        queue.CONFIG = queue.ROOT / 'editorial/linkedin-config.json'
        self.site = base / 'site'
        queue.write(queue.CONFIG, {'enabled': True, 'afterPublishedAt': '2025-09-29T20:08:32Z'})
        queue.write(queue.ROOT / 'editorial/integracao.json', {'siteRoot': '../site'})
        self.article = {'slug': 'artigo-exemplo', 'title': 'Título íntegro', 'published': '2026-11-16T12:00:00-03:00'}
        queue.write(self.site / 'docs/artigos-recuperados.json', [])
        queue.write(self.site / 'docs/artigos-editoriais.json', [self.article])
        public = self.site / 'site/parallax'
        page = public / 'artigo-exemplo/index.html'
        page.parent.mkdir(parents=True)
        self.image = public / 'assets/capa.png'
        self.image.parent.mkdir(parents=True)
        self.image.write_bytes(b'original-image-test')
        page.write_text('<html><head><link rel="canonical" href="https://www.agenciatweed.com.br/artigo-exemplo/"></head><body><h1>Título íntegro</h1><figure class="article-cover"><img src="/assets/capa.png" alt="Cena original"></figure><div class="article-body"><details class="article-toc"><summary>Neste artigo</summary></details><h2>Uma pergunta</h2><p>Texto <em>com ênfase</em> e <a href="https://example.org/fonte">fonte</a>.</p></div><footer>Não copiar rodapé</footer></body></html>', encoding='utf-8')
        self.state = {'version': 1, 'items': []}
        queue.sync(self.state)

    def evidence(self):
        item = self.state['items'][0]
        data = queue.payload(item)
        return {'slug': item['slug'], 'blogUrl': item['blogUrl'], 'articleUrl': 'https://www.linkedin.com/pulse/exemplo/', 'postUrl': '/feed/update/urn:li:ugcPost:123/', 'bodySha256': data['bodySha256'], 'coverSha256': data['coverSha256'], 'confirmedAt': '2026-11-16T23:00:00Z'}

    def policy_item(self, slug, published='2026-11-01T12:00:00-03:00', state='pending', **fields):
        item = {'slug': slug, 'title': slug, 'blogPublishedAt': published,
                'blogUrl': 'https://www.agenciatweed.com.br/'+slug+'/', 'state': state, **fields}
        self.state['items'].append(item)
        return item

    def test_new_article_precedes_saved_backlog_draft(self):
        old = self.state['items'][0]
        old.update(state='draft', draftUrl='https://www.linkedin.com/article/edit/123/')
        new = self.policy_item('novo-no-blog', published='2026-11-17T10:00:00-03:00')
        selection = queue.summarize(self.state, '2026-11-17T18:00:00Z')
        self.assertIs(selection['next'], new)
        self.assertEqual(selection['reason'], 'new-article')
        self.assertEqual(old['draftUrl'], 'https://www.linkedin.com/article/edit/123/')

    def test_one_backlog_a_day_even_with_four_unused_slots(self):
        self.policy_item('antigo-enviado', state='published', confirmedAt='2026-11-17T10:00:00-03:00')
        selection = queue.summarize(self.state, '2026-11-17T18:00:00Z')
        self.assertIsNone(selection['next'])
        self.assertEqual(selection['backlogPublishedToday'], 1)
        self.assertEqual(selection['remainingToday'], 4)
        self.assertEqual(selection['reason'], 'backlog-daily-limit')

    def test_two_new_and_one_old_do_not_trigger_more_backlog(self):
        for suffix in ('um', 'dois'):
            self.policy_item('novo-'+suffix, published='2026-11-17T09:00:00-03:00',
                             state='published', confirmedAt='2026-11-17T10:00:00-03:00')
        self.assertEqual(queue.summarize(self.state, '2026-11-17T18:00:00Z')['reason'], 'backlog-slot')
        self.policy_item('antigo-enviado', state='published', confirmedAt='2026-11-17T15:00:00-03:00')
        selection = queue.summarize(self.state, '2026-11-17T22:00:00Z')
        self.assertIsNone(selection['next'])
        self.assertEqual(selection['publishedToday'], 3)

    def test_five_total_stops_new_and_old_articles(self):
        for suffix in ('um','dois','tres','quatro','cinco'):
            self.policy_item('enviado-'+suffix, published='2026-11-17T08:00:00-03:00',
                             state='published', confirmedAt='2026-11-17T12:00:00-03:00')
        self.policy_item('novo-pendente', published='2026-11-17T16:00:00-03:00')
        selection = queue.summarize(self.state, '2026-11-17T23:00:00Z')
        self.assertIsNone(selection['next'])
        self.assertEqual(selection['reason'], 'daily-limit')
        self.assertEqual(selection['remainingToday'], 0)

    def test_sao_paulo_midnight_not_utc_midnight_releases_backlog(self):
        self.policy_item('antigo-enviado', state='published', confirmedAt='2026-11-18T02:30:00Z')
        before = queue.summarize(self.state, '2026-11-18T02:59:59Z')
        after = queue.summarize(self.state, '2026-11-18T03:00:00Z')
        self.assertEqual(before['date'], '2026-11-17')
        self.assertIsNone(before['next'])
        self.assertEqual(after['date'], '2026-11-18')
        self.assertEqual(after['backlogPublishedToday'], 0)
        self.assertIsNotNone(after['next'])

    def test_new_article_remains_priority_after_failed_day(self):
        new = self.policy_item('novo-pendente', published='2026-11-17T10:00:00-03:00',
                               state='draft', lastError='Conexao caiu')
        self.assertIs(queue.summarize(self.state, '2026-11-19T18:00:00Z')['next'], new)

    def test_uncertain_send_requires_reconciliation_before_priority_or_caps(self):
        uncertain = self.state['items'][0]
        uncertain['state'] = 'publishing'
        self.policy_item('novo-pendente', published='2026-11-17T10:00:00-03:00')
        selection = queue.summarize(self.state, '2026-11-17T18:00:00Z')
        self.assertIs(selection['next'], uncertain)
        self.assertEqual(selection['reason'], 'reconcile')
        with self.assertRaisesRegex(ValueError, 'Envio incerto'):
            queue.require_eligible(self.state, uncertain)

    def test_cli_start_and_publish_cannot_bypass_backlog_quota(self):
        old = self.state['items'][0]
        old.update(state='draft', draftUrl='https://www.linkedin.com/article/edit/123/', bodySha256='a'*64)
        self.policy_item('antigo-enviado', state='published', confirmedAt='2026-11-17T10:00:00-03:00')
        queue.write(queue.STATE, self.state)
        for command in ('start', 'publishing'):
            with mock.patch.object(sys, 'argv', ['linkedin.py',command,old['slug']]), mock.patch.object(queue, 'now', return_value='2026-11-17T18:00:00Z'), mock.patch('sys.stdout', new_callable=io.StringIO):
                with self.assertRaisesRegex(ValueError, 'quota diaria'):
                    queue.main()
            self.assertEqual(queue.read(queue.STATE), self.state)

    def test_cli_blocks_old_draft_when_new_article_has_priority(self):
        old = self.state['items'][0]
        old.update(state='draft', draftUrl='https://www.linkedin.com/article/edit/123/', bodySha256='a'*64)
        self.policy_item('novo-pendente', published='2026-11-17T10:00:00-03:00')
        queue.write(queue.STATE, self.state)
        with mock.patch.object(sys, 'argv', ['linkedin.py','publishing',old['slug']]), mock.patch.object(queue, 'now', return_value='2026-11-17T18:00:00Z'):
            with self.assertRaisesRegex(ValueError, 'new-article'):
                queue.main()

    def test_windows_timezone_fallback_uses_existing_node(self):
        queue.local_date.cache_clear()
        with mock.patch.object(queue, 'ZoneInfo', side_effect=queue.ZoneInfoNotFoundError('fixture')):
            self.assertEqual(queue.local_date('2026-11-18T02:59:59Z','America/Sao_Paulo'),'2026-11-17')
            self.assertEqual(queue.local_date('2026-11-18T03:00:00Z','America/Sao_Paulo'),'2026-11-18')
        queue.local_date.cache_clear()

    def test_sync_idempotent_and_excludes_old(self):
        queue.sync(self.state)
        self.assertEqual(len(self.state['items']), 1)
        self.assertEqual(queue.summarize(self.state)['pending'], 1)

    def test_preserves_rich_body_and_cover_excludes_chrome(self):
        data = queue.payload(self.state['items'][0])
        self.assertIn('<em>com ênfase</em>', data['html'])
        self.assertIn('https://example.org/fonte', data['html'])
        self.assertNotIn('Neste artigo', data['html'])
        self.assertNotIn('rodapé', data['html'])
        self.assertEqual(data['coverSha256'], queue.sha(self.image.read_bytes()))

    def test_confirmation_idempotent_and_not_requeued(self):
        item = self.state['items'][0]
        evidence = self.evidence()
        queue.confirm(item, evidence)
        queue.confirm(item, evidence)
        queue.sync(self.state)
        self.assertEqual(queue.summarize(self.state)['pending'], 0)
        with self.assertRaises(ValueError):
            queue.confirm(item, {**evidence, 'postUrl': '/feed/update/urn:li:ugcPost:999/'})

    def test_changed_content_rejected(self):
        evidence = self.evidence()
        item = self.state['items'][0]
        item['bodySha256'] = 'a' * 64
        with self.assertRaises(ValueError):
            queue.confirm(item, evidence)

    def test_foreign_destinations_rejected(self):
        for value in ('https://evil.example/pulse/a/', 'https://www.linkedin.com.evil.example/pulse/a/', 'https://u:p@www.linkedin.com/pulse/a/', 'https://www.linkedin.com/company/a/'):
            with self.assertRaises(ValueError):
                queue.linkedin_url(value, 'article')

    def test_shared_lock_does_not_steal_or_delete_existing(self):
        with queue.locked():
            with self.assertRaises(FileExistsError):
                with queue.locked():
                    self.fail('Concurrent acquisition succeeded')
            self.assertTrue((queue.ROOT / '.local/project.lock').exists())
        self.assertFalse((queue.ROOT / '.local/project.lock').exists())

    def test_wrong_article_or_missing_evidence_rejected(self):
        item = self.state['items'][0]
        evidence = self.evidence()
        with self.assertRaises(ValueError):
            queue.confirm(item, {**evidence, 'slug': 'outro-artigo'})
        with self.assertRaises(ValueError):
            queue.confirm(item, {**evidence, 'coverSha256': ''})

    def test_blog_wrapper_queues_only_real_success(self):
        wrapper = Path(__file__).with_name('publicar.py')
        if not wrapper.exists():
            self.skipTest('Wrapper tested after installation in the panel')
        for exit_code, dry, should_queue in ((0, False, True), (0, True, False), (1, False, False)):
            argv = [str(wrapper), '--job', 'test'] + (['--dry-run'] if dry else [])
            with mock.patch.object(sys, 'argv', argv), mock.patch.object(subprocess, 'call', return_value=exit_code), mock.patch.object(subprocess, 'run', return_value=mock.Mock(returncode=0)) as run:
                with self.assertRaises(SystemExit) as raised:
                    runpy.run_path(str(wrapper), run_name='__main__')
                self.assertEqual(raised.exception.code, exit_code)
                self.assertEqual(run.called, should_queue)

    def test_linkedin_failure_does_not_rollback_blog_success(self):
        wrapper = Path(__file__).with_name('publicar.py')
        if not wrapper.exists():
            self.skipTest('Wrapper tested after installation in the panel')
        for error in (None, OSError('Node unavailable'), subprocess.TimeoutExpired('node', 30)):
            with mock.patch.object(sys, 'argv', [str(wrapper), '--job', 'test']), mock.patch.object(subprocess, 'call', return_value=0), mock.patch.object(subprocess, 'run', return_value=mock.Mock(returncode=1), side_effect=error):
                with self.assertRaises(SystemExit) as raised:
                    runpy.run_path(str(wrapper), run_name='__main__')
                self.assertEqual(raised.exception.code, 0)

    def test_blog_wrapper_queues_only_real_success(self):
        wrapper = Path(__file__).with_name('publicar.py')
        if not wrapper.exists():
            self.skipTest('Wrapper tested after installation in the panel')
        for exit_code, dry, should_queue in ((0, False, True), (0, True, False), (1, False, False)):
            argv = [str(wrapper), '--job', 'test'] + (['--dry-run'] if dry else [])
            with mock.patch.object(sys, 'argv', argv), mock.patch.object(subprocess, 'call', return_value=exit_code), mock.patch.object(subprocess, 'run', return_value=mock.Mock(returncode=0)) as run:
                with self.assertRaises(SystemExit) as raised:
                    runpy.run_path(str(wrapper), run_name='__main__')
                self.assertEqual(raised.exception.code, exit_code)
                self.assertEqual(run.called, should_queue)

    def test_linkedin_failure_does_not_rollback_blog_success(self):
        wrapper = Path(__file__).with_name('publicar.py')
        if not wrapper.exists():
            self.skipTest('Wrapper tested after installation in the panel')
        with mock.patch.object(sys, 'argv', [str(wrapper), '--job', 'test']), mock.patch.object(subprocess, 'call', return_value=0), mock.patch.object(subprocess, 'run', return_value=mock.Mock(returncode=1)):
            with self.assertRaises(SystemExit) as raised:
                runpy.run_path(str(wrapper), run_name='__main__')
            self.assertEqual(raised.exception.code, 0)


if __name__ == '__main__':
    unittest.main()
