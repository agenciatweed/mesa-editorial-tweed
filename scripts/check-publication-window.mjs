import test from 'node:test';
import assert from 'node:assert/strict';
import {publicationWindow} from './publication-window.mjs';

test('apenas um envio por vaga, em dias de São Paulo e com retomadas idempotentes',()=>{
 const keys=['2026-11-15T02:11:00Z','2026-11-15T08:11:00Z','2026-11-15T14:11:00Z','2026-11-15T20:11:00Z','2026-11-16T02:11:00Z'];
 const items=[1,3].map(slot=>({id:String(slot),status:'Pronto',date:'2026-11-15',publication:{state:'queued',scheduledRound:slot}}));
 const jobs=items.map(i=>({id:'job'+i.id,itemId:i.id,action:'publicar',state:'pending',createdAt:keys[0]})).reverse();
 const select=(n)=>publicationWindow(keys.slice(0,n+1),keys[n],items,jobs,new Date(keys[n]));
 assert.equal(select(1).job,'job1');
 assert.equal(publicationWindow([...keys.slice(0,2),keys[1]],keys[1],items,jobs,new Date(keys[1])).round,1);
 items[0].publication={state:'published',runKey:keys[1],publishedAt:keys[1]};
 assert.equal(select(1).job,null);
 assert.equal(select(2).job,null);
 assert.equal(select(3).job,'job3');
 assert.equal(publicationWindow(keys.slice(0,4),keys[1],items,jobs,new Date(keys[3])).job,null);
 items[1].publication={state:'published',runKey:keys[3],publishedAt:keys[3]};
 assert.equal(select(3).job,null);
 assert.equal(select(4).job,null);
});
