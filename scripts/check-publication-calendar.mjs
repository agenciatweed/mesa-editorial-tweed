import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyPublicationPlan} from './reschedule-publications.mjs';
test('espalha duplicatas sem antecipar datas futuras nem tocar publicados',()=>{
 const items=[{id:'pub',publication:{state:'published',publishedAt:'2026-11-23T10:00:00-03:00'}},...['a','b','c'].map(id=>({id,status:'Pronto',date:'2026-11-23'})),{id:'future',status:'Revisão',date:'2026-12-01'}];
 const saved=structuredClone(items);const plan=dailyPublicationPlan(items,[],'2026-11-23');
 assert.deepEqual(plan.map(p=>p.date),['2026-11-24','2026-11-25','2026-11-26']);assert.deepEqual(items,saved);
 for(const p of plan)items.find(i=>i.id===p.itemId).date=p.date;
 assert.deepEqual(dailyPublicationPlan(items,[],'2026-11-23'),[]);
});
