import test from 'node:test';
import assert from 'node:assert/strict';
import {editorialBalance} from './editorial-balance.mjs';
const editions=Array.from({length:6},(_,i)=>({name:'Editoria '+i}));
const article=(slug,n)=>({slug,categories:['Editoria '+n]});
test('conta o catálogo sem duplicar slugs e prioriza menos publicações',()=>{
 const catalog=[article('a',0),article('a',0),...Array.from({length:5},(_,i)=>article('b'+i,i+1)),article('c',0)];
 const result=editorialBalance({editions,catalog,items:[{id:'pendente',edition:1,createdAt:'2026-11-22T12:00:00Z'}]});
 assert.equal(result.editorias[0].published,2);assert.equal(result.selectedEdition,2);
 assert.equal(result.editorias[1].pending,1);
});
test('desempata pela criação da pauta, sem confundir publicação ou edição',()=>{
 const items=editions.map((e,i)=>({id:'p'+i,edition:i,createdAt:`2026-11-${20+i}T12:00:00Z`,date:'2027-01-01',publication:{state:'published'}}));
 assert.equal(editorialBalance({editions,catalog:[],items}).selectedEdition,0);
 items.push({id:'nova',edition:0,createdAt:'2026-11-26T12:00:00Z'});
 assert.equal(editorialBalance({editions,catalog:[],items}).selectedEdition,1);
});
test('recupera a criação do ledger e rejeita categoria desconhecida',()=>{
 const items=[{id:'antiga',edition:0},{id:'recente',edition:1}];
 const ledger={days:{a:{itemId:'antiga',createdAt:'2026-11-01T12:00:00Z'},b:{itemId:'recente',createdAt:'2026-11-22T12:00:00Z'}}};
 const result=editorialBalance({editions,items,ledger,catalog:[]});
 assert.equal(result.editorias[0].lastPautaAt,'2026-11-01T12:00:00.000Z');assert.equal(result.selectedEdition,2);
 assert.throws(()=>editorialBalance({editions,items:[],catalog:[{slug:'x',categories:['Outra']}]}),/sem editoria/);
});
