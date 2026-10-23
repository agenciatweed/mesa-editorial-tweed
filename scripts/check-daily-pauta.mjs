import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
await mkdir(path.join(root,'.local'),{recursive:true});
const fixture=await mkdtemp(path.join(root,'.local/daily-test-'));
const env={...process.env,TWEED_EDITORIAL_ROOT:fixture};
async function doc(){return JSON.parse(await readFile(path.join(fixture,'editorial/pautas.json'),'utf8'));}
async function put(d){await writeFile(path.join(fixture,'editorial/pautas.json'),JSON.stringify(d));}
function run(...args){const p=spawnSync(process.execPath,[path.join(root,'scripts/daily-pauta.mjs'),...args],{env,encoding:'utf8'});assert.equal(p.status,0,p.stderr);return JSON.parse(p.stdout);}
const first='2026-10-23T12:00:00Z',second='2026-10-23T17:00:00Z',third='2026-10-23T22:00:00Z';
const result=path.join(fixture,'result.json');let serial=0;
async function add(instant){await writeFile(result,JSON.stringify({title:'Pauta teste '+(++serial),edition:0,expert:'Lorenzo',angle:'Tese de teste',audience:'Leitor',goal:'Percepcao',researchSources:[{title:'Fonte',url:'https://example.org/news',publishedAt:'2026-10-22'}]}));return run('add',instant,result);}
try{
 await mkdir(path.join(fixture,'editorial'));await put({version:1,items:[]});
 assert.equal(run('check',first).reason,'daily');assert.equal((await add(first)).created,true);
 assert.equal(run('check',second).shouldResearch,false);
 let d=await doc();d.items[0].status='Redação';await put(d);
 assert.equal(run('check',first).reason,'already-created-this-run');
 assert.equal(run('check',second).reason,'empty-column');const replenish=await add(second);assert.equal(replenish.mode,'replenishment');assert(replenish.itemId.startsWith('pauta-reposicao-'));assert.equal(replenish.submitted,false);
 d=await doc();d.items[0].status='Redação';await put(d);assert.equal((await add(second)).created,false);
 // A pauta manual criada entre check/add impede reposição redundante.
 assert.equal(run('check',third).shouldResearch,true);d=await doc();d.items.push({id:'manual',title:'Manual',edition:0,expert:'Lorenzo',status:'Pauta'});await put(d);assert.equal((await add(third)).created,false);
 d=await doc();d.items=d.items.filter(i=>i.id!=='manual');await put(d);assert.equal((await add(third)).created,true);
 assert.equal(run('check','2026-10-24T12:00:00Z').reason,'daily');assert.equal((await add('2026-10-24T12:00:00Z')).mode,'daily');
 d=await doc();for(let n=0;n<11;n++)d.items.push({id:'manual-'+n,title:'Manual '+n,edition:0,expert:'Lorenzo',status:'Pauta'});await put(d);assert.equal(run('check','2026-10-25T12:00:00Z').reason,'capacity');assert.equal((await doc()).items.filter(i=>i.id.startsWith('manual-')).length,11);
 console.log('PASS: diaria, reposicao vazia, retomada idempotente, concorrencia humana, novo dia, limite e criacao manual preservada.');
}finally{
 const resolved=path.resolve(fixture);assert(resolved.startsWith(path.resolve(root,'.local')+path.sep));await rm(resolved,{recursive:true,force:true});
}
