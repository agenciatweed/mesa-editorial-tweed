import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {root,json,published} from './project.mjs';

const key=s=>s.normalize('NFC').trim().toLocaleLowerCase('pt-BR');
const validTime=value=>Number.isFinite(Date.parse(value))?new Date(value).toISOString():null;

// Publicações são a prioridade. O estoque é informativo, sem reclassificar pautas.
export function editorialBalance({editions,items,catalog,ledger={days:{}},jobs=[]}){
 const rows=editions.map((e,edition)=>({edition,name:e.name,published:0,pending:0,lastPautaAt:null}));
 const byName=new Map(rows.map(r=>[key(r.name),r]));
 for(const article of new Map(catalog.map(a=>[a.slug,a])).values()){
  const matched=new Set((article.categories||[]).map(c=>byName.get(key(c))).filter(Boolean));
  if(!matched.size)throw Error('Artigo sem editoria reconhecida: '+article.slug);
  for(const row of matched)row.published++;
 }
 const creation=new Map();
 for(const day of Object.values(ledger.days||{}))for(const entry of [day,...(day.replenishments||[])]){
  const time=validTime(entry.createdAt);if(time)creation.set(entry.itemId,time);
 }
 for(const item of items){
  const row=rows[item.edition];if(!row)throw Error('Editoria inválida na contagem.');
  if(!published(item))row.pending++;
  const job=jobs.find(j=>j.itemId===item.id&&j.action==='redigir');
  const date=item.dailyResearch?.date||item.id.match(/^pauta-(?:diaria|reposicao)-(\d{4}-\d{2}-\d{2})/)?.[1];
  const time=validTime(item.createdAt)||creation.get(item.id)||validTime(date?date+'T00:00:00-03:00':null)||validTime(job?.createdAt);
  if(time&&(!row.lastPautaAt||time>row.lastPautaAt))row.lastPautaAt=time;
 }
 const ranked=[...rows].sort((a,b)=>a.published-b.published||(a.lastPautaAt||'').localeCompare(b.lastPautaAt||'')||a.edition-b.edition);
 return {selectedEdition:ranked[0].edition,selectionReason:'least-published-then-oldest-pauta',editorias:rows};
}

export async function currentEditorialBalance(doc,ledger){
 const config=await json('editorial/integracao.json');
 const site=path.resolve(root,config.siteRoot);
 const read=async file=>JSON.parse(await readFile(path.join(site,'docs',file),'utf8'));
 const catalog=[...await read('artigos-recuperados.json'),...await read('artigos-editoriais.json')];
 return editorialBalance({editions:(await json('editorial/editorias.json')).editorias,items:doc.items,catalog,ledger,jobs:(await json('editorial/fila.json',{jobs:[]})).jobs});
}
