import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {root,digest} from './project.mjs';
import {summarizeJobs} from './queue-summary.mjs';
import {maintenanceState,reviewDue,completeMaintenance} from './maintenance-policy.mjs';
import {verificationFingerprint,reusable} from './verification-cache.mjs';
import {focusedScope} from './focused-links.mjs';

test('resumo não expõe texto, fontes, capas ou todos os aprovados',()=>{
 const jobs=Array.from({length:22},(_,i)=>({id:String(i),action:'publicar',state:'pending',input:{body:'x'.repeat(100000)}}));
 jobs.push({id:'redigir',action:'redigir',state:'pending',input:{title:'Uma pauta',body:'PRIVATE',sources:'PRIVATE'}});
 const data=summarizeJobs(jobs);assert.equal(data.publicationQueued,22);assert.equal(data.jobs.length,1);assert(!JSON.stringify(data).includes('PRIVATE'));assert(JSON.stringify(data).length<300);
});
test('calendário mensal preserva revisão já vencida e só conclui quando devida',()=>{
 const at='2026-11-23T12:00:00Z';
 const state=maintenanceState({executions:148,nextReview:150,lastReviewedAt:'2026-11-20T12:00:00Z'},30,at);
 assert.equal(state.nextReviewAt,'2026-12-20T12:00:00.000Z');assert(!reviewDue(state,at));
 assert.throws(()=>completeMaintenance(state,30,at),/não venceu/);
 const due=maintenanceState({executions:150,nextReview:150},30,at);assert(reviewDue(due,at));
 assert.equal(completeMaintenance(due,30,at).nextReviewAt,'2026-12-23T12:00:00.000Z');
});
test('cache exige entradas, evidência íntegra e prazo válido',async()=>{
 const tmp=await mkdtemp(path.join(os.tmpdir(),'tweed-cache-'));
 try{
  await writeFile(path.join(tmp,'input.txt'),'original');const manifest={files:['input.txt'],context:{source:'https://example.org/news'}};
  const sha=await verificationFingerprint(manifest,tmp),at=Date.parse('2026-11-23T12:00:00Z');
  const entry={inputSha256:sha,evidenceSha256:'proof',checkedAt:'2026-11-23T11:00:00Z',maxAgeHours:24};
  assert(reusable(entry,sha,'proof',at));assert(!reusable(entry,sha,'changed',at));assert(!reusable(entry,sha,'proof',at+86400000));
  await writeFile(path.join(tmp,'input.txt'),'editado');assert.notEqual(await verificationFingerprint(manifest,tmp),sha);
 }finally{assert(path.resolve(tmp).startsWith(path.resolve(os.tmpdir())+path.sep));await rm(tmp,{recursive:true,force:true})}
});
test('escopo pontual ignora acervo intacto e detecta artigo novo ou alterado',()=>{
 const old={slug:'antigo',title:'Antigo',published:'2026-10-01T12:00:00Z'},fresh={slug:'novo',title:'Novo',published:'2026-11-22T12:00:00Z'};
 assert.deepEqual(focusedScope([old,fresh],{},'2026-11-20T12:00:00Z').slugs,['novo']);
 const checkpoint={signatures:{antigo:digest(old),novo:digest(fresh)}};
 assert.deepEqual(focusedScope([old,fresh],checkpoint,'2026-11-20T12:00:00Z').slugs,[]);
 assert.deepEqual(focusedScope([{...old,title:'Alterado'},fresh],checkpoint,'2026-11-20T12:00:00Z').slugs,['antigo']);
});
test('CLI do cache grava prova íntegra e invalida alterações, sem cache de envio',async()=>{
 const tmp=await mkdtemp(path.join(os.tmpdir(),'tweed-cache-cli-'));
 try{
  const input=path.join(tmp,'input.txt'),manifest=path.join(tmp,'manifest.json'),proof=path.join(tmp,'proof.json');
  await writeFile(input,'original');await writeFile(manifest,JSON.stringify({files:[input]}));
  const run=(...args)=>spawnSync(process.execPath,[path.join(root,'scripts/verification-cache.mjs'),...args],{encoding:'utf8',env:{...process.env,TWEED_EDITORIAL_ROOT:tmp}});
  const first=run('check','local-test',manifest);assert.equal(first.status,0,first.stderr);const check=JSON.parse(first.stdout);assert(!check.reuse);
  await writeFile(proof,JSON.stringify({status:'passed',inputSha256:check.inputSha256,checkedAt:new Date().toISOString()}));
  assert.equal(run('record','local-test',manifest,proof).status,0);
  assert(JSON.parse(run('check','local-test',manifest).stdout).reuse);
  await writeFile(input,'alterado');assert(!JSON.parse(run('check','local-test',manifest).stdout).reuse);
  assert.notEqual(run('check','ftp-confirmation',manifest).status,0);
 }finally{assert(path.resolve(tmp).startsWith(path.resolve(os.tmpdir())+path.sep));await rm(tmp,{recursive:true,force:true})}
});
test('triagem completa em fixture é compacta e retomar a chave não conta duas vezes',async()=>{
 const tmp=await mkdtemp(path.join(os.tmpdir(),'tweed-round-'));
 const put=async(name,value)=>{const p=path.join(tmp,name);await mkdir(path.dirname(p),{recursive:true});await writeFile(p,JSON.stringify(value))};
 const at=new Date().toISOString();
 try{
  await put('editorial/pautas.json',{version:1,items:[]});await put('editorial/fila.json',{version:1,jobs:[]});
  await put('editorial/integracao.json',{siteRoot:'site'});await put('editorial/editorias.json',{editorias:Array.from({length:6},(_,i)=>({name:'Editoria '+i}))});
  await put('editorial/linkedin-config.json',{enabled:true,afterPublishedAt:'2025-09-29T20:08:32Z',backlogAuthorized:false,backlogDailyLimit:0,newDailyLimit:1});
  await put('site/docs/artigos-recuperados.json',[]);await put('site/docs/artigos-editoriais.json',[]);
  const run=()=>{const p=spawnSync(process.execPath,[path.join(root,'scripts/round-summary.mjs'),at],{encoding:'utf8',env:{...process.env,TWEED_EDITORIAL_ROOT:tmp}});assert.equal(p.status,0,p.stderr);assert(p.stdout.length<2500);return JSON.parse(p.stdout)};
  const result=run();assert(result.pauta.shouldResearch);assert.equal(result.publication.job,null);assert.equal(result.linkedin.next,null);run();
  assert.equal(JSON.parse(await readFile(path.join(tmp,'.local/link-cycle.json'),'utf8')).executions,1);
 }finally{assert(path.resolve(tmp).startsWith(path.resolve(os.tmpdir())+path.sep));await rm(tmp,{recursive:true,force:true})}
});
