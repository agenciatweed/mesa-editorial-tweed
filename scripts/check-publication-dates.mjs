import test from 'node:test';
import assert from 'node:assert/strict';
import {nextPublicationDate} from './project.mjs';
const now=new Date('2026-10-30T15:00:00Z');
test('reserva Revisão e Pronto até 08/11, inclusive com datas repetidas',()=>{
 const items=Array.from({length:9},(_,n)=>({id:String(n),status:n%2?'Revisão':'Pronto',date:new Date(Date.UTC(2026,9,31+n)).toISOString().slice(0,10)}));
 assert.equal(nextPublicationDate(items,'novo',now),'2026-10-31');
 items.push(...items.map(i=>({...i,id:'segunda-'+i.id})));
 assert.equal(nextPublicationDate(items,'novo',now),'2026-11-09');
 items.splice(3,1);assert.equal(nextPublicationDate(items,'novo',now),'2026-11-03');
});
test('ignora outros estágios, histórico publicado e o próprio item',()=>{
 const items=[{id:'self',status:'Revisão',date:'2026-10-31'},{id:'draft',status:'Redação',date:'2026-10-31'},{id:'old',status:'Pronto',date:'2026-10-31',publication:{state:'published'}}];
 assert.equal(nextPublicationDate(items,'self',now),'2026-10-31');
});
test('usa calendário de São Paulo na virada UTC, mês, ano e ano bissexto',()=>{
 assert.equal(nextPublicationDate([],null,new Date('2026-10-31T01:00:00Z')),'2026-10-31');
 assert.equal(nextPublicationDate([],null,new Date('2026-12-31T15:00:00Z')),'2027-01-01');
 assert.equal(nextPublicationDate([],null,new Date('2028-02-28T15:00:00Z')),'2028-02-29');
});
