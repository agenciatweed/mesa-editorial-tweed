"""Regression checks for LinkedIn resumption and content fidelity; no network/UI."""
import importlib.util
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
