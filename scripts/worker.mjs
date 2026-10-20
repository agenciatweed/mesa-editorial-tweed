// O GPT entrega redação em Redação e metadados em Revisão; aprovação é humana.
import {readFile} from 'node:fs/promises';
import {locked,json,atomic,project,saveContent,workKey,reconcile,phaseFor} from './project.mjs';
const [command,id,resultFile]=process.argv.slice(2);
try{await locked(async()=>{
 const queue=await json('editorial/fila.json',{version:1,jobs:[]});
 if(command==='sync'){const {doc}=await project();const before=JSON.stringify(doc),oldQueue=JSON.stringify(queue);await reconcile(doc,queue);if(JSON.stringify(doc)!==before)await atomic('editorial/pautas.json',doc);if(JSON.stringify(queue)!==oldQueue)await atomic('editorial/fila.json',queue);console.log(JSON.stringify(queue.jobs.filter(j=>['pending','running'].includes(j.state)),null,2));return}
 if(command==='list'){console.log(JSON.stringify(queue.jobs.filter(j=>['pending','running'].includes(j.state)),null,2));return}
 const job=queue.jobs.find(j=>j.id===id);if(!job)throw Error('Solicitação inexistente.');
 if(command==='claim'){if(job.state!=='pending')throw Error('Solicitação já assumida.');const {doc}=await project();const i=doc.items.find(i=>i.id===job.itemId);if(!i||i.status!==phaseFor(job.action)||workKey(i,job.action)!==job.workKey)throw Error('Pedido obsoleto. Execute sync.');job.state='running';job.startedAt=new Date().toISOString();await atomic('editorial/fila.json',queue);console.log(JSON.stringify(job,null,2));return}
 if(command==='fail'){if(!['pending','running'].includes(job.state))throw Error('Solicitação encerrada.');job.state='failed';job.message=(await readFile(resultFile,'utf8')).slice(0,2000);const {doc}=await project();const i=doc.items.find(i=>i.id===job.itemId);if(i&&!['publicar'].includes(job.action))i.automation={...i.automation,state:'failed',stage:i.status,message:job.message};await saveContent(doc);await atomic('editorial/fila.json',queue);return}
 if(command!=='complete'||job.state!=='running'||!['redigir','revisar','prompt'].includes(job.action))throw Error('Comando ou estado inválido.');
 const result=JSON.parse(await readFile(resultFile,'utf8'));const {doc}=await project();const item=doc.items.find(i=>i.id===job.itemId);
 if(!item||item.status!==phaseFor(job.action)||workKey(item,job.action)!==job.workKey)throw Error('Conteúdo editado durante a automação. Preserve o resultado e execute sync.');
 const allowed=job.action==='prompt'?['prompt']:job.action==='redigir'?['body','sources','prompt']:['keyword','slug','meta','faq'];
 const required=job.action==='prompt'?['prompt']:job.action==='redigir'?['body','prompt']:['keyword','slug','meta'];
 if(['redigir','prompt'].includes(job.action)&&!item.imageAlt?.trim())required.push('imageAlt');
 for(const key of required)if(typeof result[key]!=='string'||!result[key].trim())throw Error('Entrega incompleta: '+key);
 for(const key of allowed)if(result[key]!==undefined){if(typeof result[key]!=='string')throw Error('Resultado inválido.');item[key]=result[key]}
 if(['redigir','prompt'].includes(job.action)&&!item.imageAlt?.trim()){item.imageAlt=result.imageAlt.trim();}
 if(job.action==='redigir'&&/^#{1,6}\s*(?:faq|perguntas frequentes)\b/im.test(item.body))throw Error('O FAQ deve ficar apenas nos metadados, fora da redação.');
 if(job.action==='revisar'&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug))throw Error('Slug inválido.');
 if(job.action==='prompt'&&(!item.prompt.endsWith('--ar 3:2')||((item.prompt.match(/--/g)||[]).length!==1)))throw Error('O prompt deve terminar com --ar 3:2, sem outros parâmetros.');
 item.status=['redigir','prompt'].includes(job.action)?'Redação':'Revisão';if(job.action!=='prompt'){item.checks={};delete item.publication;}
 item.automation={...item.automation,lastJob:job.id,stage:item.status,state:'done',completedAt:new Date().toISOString(),message:job.action==='prompt'?'Prompt de capa preenchido; texto preservado.':job.action==='redigir'?'Redação e prompt prontos para edição.':'SEO revisado; envie a capa e aprove.'};
 if(job.action==='revisar'){item.automation.reviewKey=workKey(item,'revisar');item.url='https://www.agenciatweed.com.br/'+item.slug+'/'}
 if(job.action==='prompt'){const file='conteudos/'+item.id+'/metadados.json';const meta=await json(file,{});await atomic(file,{...meta,prompt:item.prompt,imagePrompt:item.prompt,imageAlt:item.imageAlt,automation:item.automation});await atomic('editorial/pautas.json',doc)}else await saveContent(doc);job.state='done';job.completedAt=new Date().toISOString();await atomic('editorial/fila.json',queue);console.log(item.status+': entrega concluída; aguardando ação humana.');
})}catch(e){console.error(e.message);process.exitCode=1}
