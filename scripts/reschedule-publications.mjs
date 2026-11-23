import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {root,locked,project,json,atomic,published,snapshot,workKey} from './project.mjs';

export function dailyPublicationPlan(items,jobs,today){
 const active=new Map(jobs.filter(j=>j.action==='publicar'&&['pending','running'].includes(j.state)).map(j=>[j.itemId,j]));
 const queue=items.filter(i=>!published(i)&&['Pronto','Revisão'].includes(i.status)&&/^\d{4}-\d{2}-\d{2}$/.test(i.date||''));
 queue.sort((a,b)=>a.date.localeCompare(b.date)||(a.publication?.scheduledRound??2)-(b.publication?.scheduledRound??2)||(active.get(a.id)?.createdAt||a.id).localeCompare(active.get(b.id)?.createdAt||b.id)||a.id.localeCompare(b.id));
 const calendar=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'});
 const busy=new Set(items.filter(published).map(i=>calendar.format(new Date(i.publication.publishedAt))));
 const next=date=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10)};
 let cursor=today;const plan=[];
 for(const item of queue){
  let date=item.date>cursor?item.date:cursor;
  while(busy.has(date))date=next(date);
  busy.add(date);cursor=next(date);
  if(date!==item.date)plan.push({itemId:item.id,before:item.date,date});
 }
 return plan;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 await locked(async()=>{
  const {doc}=await project();const queue=await json('editorial/fila.json');
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const plan=dailyPublicationPlan(doc.items,queue.jobs,today);
  if(!process.argv.includes('--apply')){console.log(JSON.stringify({today,changes:plan},null,2));return}
  const save=[];
  for(const change of plan){
   const item=doc.items.find(i=>i.id===change.itemId),before=structuredClone(item);
   const jobs=queue.jobs.filter(j=>j.itemId===item.id&&j.action==='publicar'&&['pending','running'].includes(j.state));
   for(const job of jobs){
    if((job.workKey||job.snapshot)!==workKey(before,'publicar'))throw Error('Aprovação divergente: '+item.id);
    try{await access(path.join(root,'.local/publicacoes',job.id+'.json'));throw Error('Envio iniciado: preserve o journal de '+job.id)}catch(e){if(e.code!=='ENOENT')throw e}
   }
   item.date=change.date;
   for(const job of jobs){job.input.date=change.date;job.snapshot=snapshot(item);job.workKey=workKey(item,'publicar')}
   const file='conteudos/'+item.id+'/metadados.json';
   const metadata=await json(file);
   if(metadata.date!==before.date)throw Error('Data concorrente nos metadados: '+item.id);
   metadata.date=change.date;save.push([file,metadata]);
  }
  if(plan.length){
   save.push(['editorial/pautas.json',doc],['editorial/fila.json',queue]);
   const backup=path.join(root,'backups/cadencia-diaria-'+Date.now());
   for(const [file] of save){const target=path.join(backup,file);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,await readFile(path.join(root,file)))}
   for(const [file,value] of save)await atomic(file,value);
  }
  console.log(JSON.stringify({today,applied:plan.length,changes:plan},null,2));
 });
}
