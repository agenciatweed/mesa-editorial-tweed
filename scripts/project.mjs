import {readFile,writeFile,mkdir,rename,open,unlink} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
export const root=process.env.TWEED_EDITORIAL_ROOT||path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const canonical='https://www.agenciatweed.com.br';
export const digest=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
export const snapshot=i=>digest(Object.fromEntries(Object.entries(i).filter(([k])=>!['automation','publication'].includes(k))));
export const workKey=(i,action)=>action==='publicar'?snapshot(i):digest((action==='redigir'?['title','edition','expert','angle','audience','goal']:['title','edition','expert','angle','audience','goal','body','sources','prompt']).map(k=>i[k]??''));
export const phaseFor=action=>({redigir:'Pauta',prompt:'Redação',revisar:'Revisão',publicar:'Pronto'}[action]);
export const published=i=>i.publication?.state==='published';
export const reviewReady=i=>i.automation?.reviewKey===workKey(i,'revisar')&&['keyword','slug','meta'].every(k=>typeof i[k]==='string'&&i[k].trim())&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(i.slug);
export async function json(file,fallback){try{return JSON.parse(await readFile(path.join(root,file),'utf8'))}catch(e){if(e.code==='ENOENT'&&fallback!==undefined)return fallback;throw e}}
export async function atomic(file,data){const target=path.join(root,file);await mkdir(path.dirname(target),{recursive:true});const tmp=target+'.'+randomUUID()+'.tmp';await writeFile(tmp,JSON.stringify(data,null,2)+'\n');await rename(tmp,target)}
export async function locked(fn){await mkdir(path.join(root,'.local'),{recursive:true});const file=path.join(root,'.local/project.lock');let handle;try{handle=await open(file,'wx')}catch(e){if(e.code==='EEXIST')throw Object.assign(Error('Projeto em gravação. Tente novamente.'),{status:409});throw e}try{return await fn()}finally{await handle.close();await unlink(file)}}
export const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(id);
export function validate(doc){if(doc?.version!==1||!Array.isArray(doc.items)||doc.items.length>1000||new Set(doc.items.map(i=>i.id)).size!==doc.items.length)throw Error('Projeto inválido.');for(const i of doc.items){if(!validId(i.id)||typeof i.title!=='string'||!Number.isInteger(i.edition)||i.edition<0||i.edition>5||!['Pauta','Redação','Revisão','Pronto'].includes(i.status)||!['Lorenzo','Mauro','Dupla'].includes(i.expert))throw Error('Pauta inválida.');for(const k of ['title','body','angle','audience','goal','sources','keyword','slug','meta','prompt','date','image','imageAlt','faq'])if(i[k]!==undefined&&(typeof i[k]!=='string'||i[k].length>1000000))throw Error('Campo inválido.');}}
export function briefReady(i){if(!['title','angle','audience','goal'].every(k=>i[k]?.trim()))throw Error('Preencha título, ângulo e tese, quem precisa ler e mudança de percepção.');}
export function ready(i){if(i.status!=='Pronto'||!reviewReady(i)||!i.body?.trim()||!i.title?.trim()||!i.imageAlt?.trim()||!i.sources?.trim()||!i.prompt?.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(i.date||'')||!['thesis','facts','voice','privacy'].every(k=>i.checks?.[k]===true)||!new RegExp('^conteudos/'+i.id+'/imagens/[a-f0-9]{64}\\.(png|jpg|webp)$').test(i.imageFile||''))throw Error('Aguarde a revisão do GPT, envie a capa com descrição e aprove a publicação.');}
export function faq(i){return(i.faq||'').trim().split(/\n\s*\n/).map(b=>{const[q,...a]=b.split('\n');return{q:q.trim(),a:a.join(' ').trim()}}).filter(f=>f.q&&f.a)}
// FAQ é metadado exclusivo do JSON-LD; nunca entra no Markdown visível.
export function articleText(i){return '# '+i.title+'\n\n'+(i.body||'')+'\n'}
export async function saveContent(doc){for(const i of doc.items){const dir=path.join(root,'conteudos',i.id);await mkdir(dir,{recursive:true});await writeFile(path.join(dir,'artigo.md'),articleText(i));await writeFile(path.join(dir,'briefing.txt'),'TÍTULO: '+i.title+'\nEDITORIA: '+i.edition+'\nÂNGULO: '+(i.angle||'')+'\nLEITOR: '+(i.audience||'')+'\nOBJETIVO: '+(i.goal||'')+'\n\nConsultar editorial/diretrizes.md, especialistas.md e editorias.json antes de escrever.\n');await atomic('conteudos/'+i.id+'/metadados.json',i);}await atomic('editorial/pautas.json',doc)}
export async function enqueue(queue,item,action){if(queue.jobs.some(j=>j.itemId===item.id&&['pending','running'].includes(j.state)))throw Error('Esta pauta já tem uma solicitação pendente.');const job={id:randomUUID(),itemId:item.id,action,state:'pending',workKey:workKey(item,action),snapshot:snapshot(item),input:structuredClone(item),createdAt:new Date().toISOString()};queue.jobs.push(job);return job}
export async function reconcile(doc,queue,{retryId}={}){
 for(const job of queue.jobs.filter(j=>['pending','running'].includes(j.state))){const i=doc.items.find(i=>i.id===job.itemId);const phase=phaseFor(job.action);if(!i||published(i)||i.status!==phase||workKey(i,job.action)!==(job.workKey||job.snapshot)){job.state='cancelled';job.message='Etapa ou conteúdo mudou; solicitação substituída.';}}
 for(const i of doc.items){const needsPrompt=i.status==='Redação'&&!!i.body?.trim()&&!i.prompt?.trim();if(published(i)||(!needsPrompt&&(!i.submitted||i.workflowVersion!==2)))continue;let action=needsPrompt?'prompt':i.status==='Pauta'?'redigir':i.status==='Revisão'&&!reviewReady(i)?'revisar':i.status==='Pronto'?'publicar':null;
  if(i.status==='Revisão'&&reviewReady(i)){i.automation={...i.automation,stage:i.status,state:'done'};continue}
  if(!action)continue;
  if(action==='publicar')ready(i);
  const key=workKey(i,action);const same=queue.jobs.filter(j=>j.itemId===i.id&&j.action===action&&(j.workKey||j.snapshot)===key&&j.state!=='cancelled').at(-1);
  if(same&&(['pending','running'].includes(same.state)||(same.state==='done'&&!['revisar','prompt'].includes(action))))continue;
  if(same?.state==='failed'&&retryId!==i.id)continue;
  await enqueue(queue,i,action);if(action!=='publicar')i.automation={...i.automation,stage:i.status,state:'pending'};
 }
}
export async function project(){const doc=await json('editorial/pautas.json');validate(doc);for(const i of doc.items){try{const text=await readFile(path.join(root,'conteudos',i.id,'artigo.md'),'utf8');if(text.replace(/\r\n/g,'\n')!==articleText(i).replace(/\r\n/g,'\n'))throw Object.assign(Error('Markdown externo alterado em '+i.id+'. Concilie o artigo com pautas.json antes de salvar.'),{status:409})}catch(e){if(e.code!=='ENOENT')throw e}}return{doc,revision:digest(doc)}}
