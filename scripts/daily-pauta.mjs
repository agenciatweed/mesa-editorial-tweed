// A pesquisa é feita pelo GPT; este helper controla quota diária e gravação.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {locked,json,atomic,project,validate,briefReady,articleText,root,published,canonical} from './project.mjs';
const [command,instant,file]=process.argv.slice(2);
if(!instant||!Number.isFinite(Date.parse(instant)))throw Error('Informe o instante ISO da execução.');
const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(instant));
const id='pauta-diaria-'+date;
await locked(async()=>{
 const {doc}=await project();const ledger=await json('editorial/pauta-diaria.json',{version:1,days:{}});
 const count=doc.items.filter(i=>i.status==='Pauta'&&!published(i)).length;
 const existing=doc.items.find(i=>i.id===id);const created=!!ledger.days[date]||!!existing;
 if(command==='check'){console.log(JSON.stringify({date,pautas:count,createdToday:created,shouldResearch:!created&&count<10}));return}
 if(command!=='add'||!file)throw Error('Use check ISO ou add ISO RESULTADO.json.');
 if(created){console.log(JSON.stringify({created:false,reason:'already-created',date,itemId:existing?.id||ledger.days[date].itemId}));return}
 if(count>=10){console.log(JSON.stringify({created:false,reason:'capacity',pautas:count}));return}
 const result=JSON.parse(await readFile(file,'utf8'));
 for(const k of ['title','angle','audience','goal'])if(typeof result[k]!=='string'||!result[k].trim())throw Error('Briefing incompleto: '+k);
 if(!Array.isArray(result.researchSources)||!result.researchSources.length)throw Error('Registre as fontes da pesquisa.');
 for(const s of result.researchSources){if(!s.title?.trim()||!/^https:\/\//.test(s.url||'')||!/^\d{4}-\d{2}-\d{2}$/.test(s.publishedAt||''))throw Error('Fonte requer título, URL HTTPS e data de publicação verificada.');}
 const item={id,title:result.title.trim(),edition:result.edition,expert:result.expert,angle:result.angle.trim(),audience:result.audience.trim(),goal:result.goal.trim(),status:'Pauta',submitted:false,workflowVersion:2,voiceVersion:2,checks:{},logo:canonical+'/assets/logo_tweed_teal.svg',author:canonical+'/#agencia',dailyResearch:{date,sources:result.researchSources}};
 briefReady(item);validate({...doc,items:[...doc.items,item]});
 const normalized=t=>t.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 if(doc.items.some(i=>normalized(i.title)===normalized(item.title)))throw Error('Já existe pauta com esse título.');
 const dir=path.join(root,'conteudos',id);await mkdir(dir,{recursive:true});
 await writeFile(path.join(dir,'artigo.md'),articleText(item));
 await writeFile(path.join(dir,'briefing.txt'),'TÍTULO: '+item.title+'\nEDITORIA: '+item.edition+'\nVOZ: '+item.expert+'\nÂNGULO: '+item.angle+'\nLEITOR: '+item.audience+'\nOBJETIVO: '+item.goal+'\n\nFONTES DA PESQUISA:\n'+result.researchSources.map(s=>s.publishedAt+' | '+s.title+' | '+s.url).join('\n')+'\n');
 await atomic('conteudos/'+id+'/metadados.json',item);
 doc.items.unshift(item);await atomic('editorial/pautas.json',doc);
 ledger.days[date]={itemId:id,createdAt:instant};await atomic('editorial/pauta-diaria.json',ledger);
 console.log(JSON.stringify({created:true,date,itemId:id,pautas:count+1,submitted:false}));
});
