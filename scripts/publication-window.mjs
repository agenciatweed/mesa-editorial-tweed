import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {json} from './project.mjs';

const calendar = new Intl.DateTimeFormat('en-CA', {
 timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
});
function day(value) {
 const time = Date.parse(value);
 return Number.isFinite(time) ? calendar.format(time) : '';
}

// Uma retomada usa a mesma chave. Só a última rodada registrada pode publicar.
export function publicationWindow(keys, key, items, jobs, now = new Date()) {
 const date = day(key);
 const distinct = [...new Set(keys.filter(k => day(k) === date))];
 const round = distinct.indexOf(key) + 1;
 const result = {date, round, runKey: key, job: null};
 if (!date || calendar.format(now) !== date || keys.at(-1) !== key || round < 1) return result;
 const completed = items.filter(i => i.publication?.state === 'published' && day(i.publication.publishedAt) === date);
 if (completed.length >= 1) return result;
 const byId = new Map(items.map(i => [i.id, i]));
 const candidates = jobs.filter(j => {
  const i = byId.get(j.itemId);
  return j.action === 'publicar' && ['running', 'pending'].includes(j.state) && i?.status === 'Pronto' && i.publication?.state === 'queued' && i.date && i.date <= date;
 });
 candidates.sort((a,b) => {
  const left = byId.get(a.itemId), right = byId.get(b.itemId);
  return left.date.localeCompare(right.date) || (left.publication.scheduledRound ?? 2) - (right.publication.scheduledRound ?? 2) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
 });
 result.job = candidates[0]?.id ?? null;
 return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 const cycle = await json('.local/link-cycle.json', {recentKeys: []});
 const key = process.argv[2] ?? cycle.recentKeys.at(-1);
 const doc = await json('editorial/pautas.json');
 const queue = await json('editorial/fila.json');
 console.log(JSON.stringify(publicationWindow(cycle.recentKeys, key, doc.items, queue.jobs)));
}
