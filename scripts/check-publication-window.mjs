import test from 'node:test';
import assert from 'node:assert/strict';
import {publicationWindow} from './publication-window.mjs';
import {nextPublicationDate} from './project.mjs';

test('apenas um artigo por dia de São Paulo, inclusive terceira rodada e retomadas',()=>{
 const keys=['2026-11-15T02:11:00Z','2026-11-15T08:11:00Z','2026-11-15T14:11:00Z','2026-11-15T20:11:00Z','2026-11-16T02:11:00Z'];
 const items=[1,3].map(slot=>({id:String(slot),status:'Pronto',date:'2026-11-15',publication:{state:'queued',scheduledRound:slot}}));
 const jobs=items.map(i=>({id:'job'+i.id,itemId:i.id,action:'publicar',state:'pending',createdAt:keys[0]})).reverse();
 const select=(n)=>publicationWindow(keys.slice(0,n+1),keys[n],items,jobs,new Date(keys[n]));
 assert.equal(select(1).job,'job1');
 assert.equal(publicationWindow([...keys.slice(0,2),keys[1]],keys[1],items,jobs,new Date(keys[1])).round,1);
 items[0].publication={state:'published',runKey:keys[1],publishedAt:keys[1]};
 assert.equal(select(1).job,null);
 assert.equal(select(2).job,null);
 assert.equal(select(3).job,null);
 assert.equal(publicationWindow(keys.slice(0,4),keys[1],items,jobs,new Date(keys[3])).job,null);
 items[1].publication={state:'published',runKey:keys[3],publishedAt:keys[3]};
 assert.equal(select(3).job,null);
 assert.equal(select(4).job,null);
});

test('nova data local libera uma vaga e falha anterior não perde a vaga do dia',()=>{
 const keys=['2026-11-15T08:00:00Z','2026-11-15T14:00:00Z','2026-11-16T02:59:59Z','2026-11-16T03:00:00Z'];
 const items=[{id:'a',status:'Pronto',date:'2026-11-15',publication:{state:'queued'}},{id:'b',status:'Pronto',date:'2026-11-16',publication:{state:'queued'}}];
 const jobs=items.map(i=>({id:'job'+i.id,itemId:i.id,action:'publicar',state:'pending',createdAt:keys[0]}));
 assert.equal(publicationWindow(keys.slice(0,2),keys[1],items,jobs,new Date(keys[1])).job,'joba');
 items[0].publication={state:'published',publishedAt:keys[1]};
 assert.equal(publicationWindow(keys.slice(0,3),keys[2],items,jobs,new Date(keys[2])).job,null);
 assert.equal(publicationWindow(keys,keys[3],items,jobs,new Date(keys[3])).job,'jobb');
 items[1].status='Revisão';assert.equal(publicationWindow(keys,keys[3],items,jobs,new Date(keys[3])).job,null);
});
test('sugestão reserva somente um artigo por dia a partir de amanhã',()=>{
 const now=new Date('2026-11-15T12:00:00Z');
 assert.equal(nextPublicationDate([{id:'a',status:'Revisão',date:'2026-11-16'},{id:'b',status:'Pronto',date:'2026-11-17'}],'outro',now),'2026-11-18');
 assert.equal(nextPublicationDate([{id:'a',status:'Pronto',date:'2026-11-16',publication:{state:'published'}}],'outro',now),'2026-11-16');
});
