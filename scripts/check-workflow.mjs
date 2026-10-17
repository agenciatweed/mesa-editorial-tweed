import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
await mkdir(path.join(root,'.local'),{recursive:true});const fixture=await mkdtemp(path.join(root,'.local/workflow-'));
await mkdir(path.join(fixture,'editorial'));await mkdir(path.join(fixture,'studio'));await writeFile(path.join(fixture,'studio/index.html'),'test');await writeFile(path.join(fixture,'editorial/pautas.json'),JSON.stringify({version:1,items:[]}));
const env={...process.env,TWEED_EDITORIAL_ROOT:fixture,TWEED_PORT:'47237'};const server=spawn(process.execPath,[path.join(root,'scripts/serve.mjs')],{env,stdio:'pipe'});const base='http://127.0.0.1:47237';let token;
async function api(url,input,status=200){const res=await fetch(base+url,{method:input?'POST':'GET',headers:input?{'Content-Type':'application/json','Origin':base,'X-Tweed-Token':token}:{},body:input?JSON.stringify(input):undefined});assert.equal(res.status,status,await res.clone().text());return res.json()}
function worker(...args){return spawnSync(process.execPath,[path.join(root,'scripts/worker.mjs'),...args],{env,encoding:'utf8'})}
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Servidor terminou: '+code)))});
 let s=await api('/api/project');token=s.token;s.doc.items=[{id:'teste',title:'Uma pauta de teste',edition:0,status:'Pauta',expert:'Lorenzo',angle:'Clareza de oferta',checks:{}}];await api('/api/project',{revision:s.revision,doc:s.doc});s=await api('/api/project');assert.equal(s.doc.items.length,1);
 await api('/api/project',{revision:'obsoleto',doc:s.doc},409);
 let queued=await api('/api/request',{revision:s.revision,itemId:'teste',action:'pauta'});let job=queued.job;assert.equal(worker('claim',job.id).status,0);await api('/api/request',{revision:s.revision,itemId:'teste',action:'pauta'},400);
 const result=path.join(fixture,'.local/result.json');await writeFile(result,JSON.stringify({title:'A oferta precisa ser compreendida',angle:'Explicar o escopo antes de comparar propostas.',audience:'Gestores',goal:'Identificar dúvidas da proposta',sources:'Ensaio editorial.'}));assert.equal(worker('complete',job.id,result).status,0);s=await api('/api/project');assert.equal(s.doc.items[0].status,'Pauta');assert.equal(s.doc.items[0].title,'A oferta precisa ser compreendida');
 queued=await api('/api/request',{revision:s.revision,itemId:'teste',action:'redigir'});job=queued.job;assert.equal(worker('claim',job.id).status,0);await writeFile(result,JSON.stringify({body:'Uma oferta clara começa pela compreensão do problema.\n\n## Um exemplo hipotético\n\nDescreva o escopo antes do preço.',meta:'Como explicar uma oferta com clareza.',prompt:'Editorial image of a thoughtful work desk --ar 3:2',sources:'Ensaio com exemplo hipotético.',keyword:'oferta clara',slug:'oferta-clara'}));assert.equal(worker('complete',job.id,result).status,0);s=await api('/api/project');assert.equal(s.doc.items[0].status,'Revisão');assert.deepEqual(s.doc.items[0].checks,{});
 s.doc.items[0].status='Pronto';await api('/api/project',{revision:s.revision,doc:s.doc,approve:'teste'},400);s=await api('/api/project');assert.equal(s.doc.items[0].status,'Revisão');
 queued=await api('/api/request',{revision:s.revision,itemId:'teste',action:'revisar'});job=queued.job;assert.equal(worker('claim',job.id).status,0);s.doc.items[0].angle='Edição humana durante a revisão';await api('/api/project',{revision:s.revision,doc:s.doc});assert.notEqual(worker('complete',job.id,result).status,0);s=await api('/api/project');assert.equal(s.doc.items[0].angle,'Edição humana durante a revisão');assert.equal(s.queue.jobs.at(-1).state,'cancelled');
 const original=await readFile(path.join(fixture,'conteudos/teste/artigo.md'),'utf8');await writeFile(path.join(fixture,'conteudos/teste/artigo.md'),original+'\nEdição externa');await api('/api/project',null,409);assert((await readFile(path.join(fixture,'conteudos/teste/artigo.md'),'utf8')).endsWith('Edição externa'));
 const invalid=await fetch(base+'/api/request',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://example.org','X-Tweed-Token':token},body:'{}'});assert.equal(invalid.status,403);
 console.log('PASS: persistência real, fila GPT, aprovações, resultado obsoleto, alteração externa e proteção de origem.');
}finally{server.kill();await new Promise(resolve=>server.once('exit',resolve));await rm(fixture,{recursive:true,force:true})}
