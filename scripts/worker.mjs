// CLI para o GPT agendado. Nenhuma chave de API é necessária neste fluxo.
import {readFile} from 'node:fs/promises';
import {locked,json,atomic,project,saveContent,snapshot} from './project.mjs';
const [command,id,resultFile]=process.argv.slice(2);
try{await locked(async()=>{const queue=await json('editorial/fila.json',{version:1,jobs:[]});const job=queue.jobs.find(j=>j.id===id);
 if(command==='list'){console.log(JSON.stringify(queue.jobs.filter(j=>['pending','running'].includes(j.state)),null,2));return}
 if(!job)throw Error('Solicitação inexistente.');
 if(command==='claim'){if(job.state!=='pending')throw Error('Solicitação já assumida.');job.state='running';job.startedAt=new Date().toISOString();await atomic('editorial/fila.json',queue);console.log(JSON.stringify(job,null,2));return}
 if(command==='fail'){if(!['pending','running'].includes(job.state))throw Error('Solicitação encerrada.');job.state='failed';job.message=(await readFile(resultFile,'utf8')).slice(0,2000);await atomic('editorial/fila.json',queue);return}
 if(command!=='complete'||job.state!=='running'||job.action==='publicar')throw Error('Comando ou estado inválido. Publicações usam publicar.py.');
 const result=JSON.parse(await readFile(resultFile,'utf8'));const {doc}=await project();const item=doc.items.find(i=>i.id===job.itemId);
 if(!item||snapshot(item)!==job.snapshot)throw Error('A pauta foi editada enquanto o GPT trabalhava. Resultado não aplicado; preserve-o para conciliação.');
 const allowed=job.action==='pauta'?['title','angle','audience','goal','sources']:['title','angle','audience','goal','body','sources','keyword','slug','meta','prompt','faq'];
 for(const key of allowed)if(result[key]!==undefined){if(typeof result[key]!=='string')throw Error('Resultado inválido.');item[key]=result[key]}
 if(!item.angle?.trim()||(job.action!=='pauta'&&(!item.body?.trim()||!item.prompt?.trim()||!item.meta?.trim()||!item.sources?.trim())))throw Error('Entrega incompleta.');
 item.status=job.action==='pauta'?'Pauta':'Revisão';item.checks={};delete item.publication;item.automation={lastJob:job.id,completedAt:new Date().toISOString(),message:'Material pronto para sua revisão.'};await saveContent(doc);job.state='done';job.completedAt=new Date().toISOString();await atomic('editorial/fila.json',queue);console.log('Material aplicado; aprovação humana pendente.');
})}catch(e){console.error(e.message);process.exitCode=1}
