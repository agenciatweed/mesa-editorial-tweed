// A pesquisa é feita pelo GPT; este helper controla quota diária e gravação.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {locked,json,atomic,project,validate,briefReady,articleText,root,published,canonical} from './project.mjs';
const [command,instant,file]=process.argv.slice(2);
if(!instant||!Number.isFinite(Date.parse(instant)))throw Error('Informe o instante ISO da execução.');
const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(instant));
const dailyId='pauta-diaria-'+date;
const runId='pauta-reposicao-'+date+'-'+createHash('sha256').update(new Date(instant).toISOString()).digest('hex').slice(0,12);
await locked(async()=>{
 const {doc}=await project();const ledger=await json('editorial/pauta-diaria.json',{version:1,days:{}});
 const count=doc.items.filter(i=>i.status==='Pauta'&&!published(i)).length;
 const existing=doc.items.find(i=>i.id===dailyId);const day=ledger.days[date];
 const created=!!day||!!existing;
 const sameRun=day?.createdAt&&Date.parse(day.createdAt)===Date.parse(instant)||day?.replenishments?.some(x=>Date.parse(x.createdAt)===Date.parse(instant))||doc.items.some(i=>i.id===runId);
 const reason=count>=10?'capacity':sameRun?'already-created-this-run':!created?'daily':count===0?'empty-column':'already-created';
 const shouldResearch=reason==='daily'||reason==='empty-column';
 const mode=reason==='empty-column'?'replenishment':'daily';
 const id=mode==='replenishment'?runId:dailyId;
 if(command==='check'){console.log(JSON.stringify({date,pautas:count,createdToday:created,shouldResearch,reason,mode,itemId:shouldResearch?id:undefined}));return}
 if(command!=='add'||!file)throw Error('Use check ISO ou add ISO RESULTADO.json.');
 if(!shouldResearch){console.log(JSON.stringify({created:false,reason,date,pautas:count}));return}
 const result=JSON.parse(await readFile(file,'utf8'));
 for(const k of ['title','angle','audience','goal'])if(typeof result[k]!=='string'||!result[k].trim())throw Error('Briefing incompleto: '+k);
 if(!Array.isArray(result.researchSources)||!result.researchSources.length)throw Error('Registre as fontes da pesquisa.');
 for(const s of result.researchSources){if(!s.title?.trim()||!/^https:\/\//.test(s.url||'')||!/^\d{4}-\d{2}-\d{2}$/.test(s.publishedAt||''))throw Error('Fonte requer título, URL HTTPS e data de publicação verificada.');}
 const item={id,title:result.title.trim(),edition:result.edition,expert:result.expert,angle:result.angle.trim(),audience:result.audience.trim(),goal:result.goal.trim(),status:'Pauta',submitted:false,workflowVersion:2,voiceVersion:2,checks:{},logo:canonical+'/assets/logo_tweed_teal.svg',author:canonical+'/#agencia',dailyResearch:{date,mode,sources:result.researchSources}};
 briefReady(item);validate({...doc,items:[...doc.items,item]});
 const normalized=t=>t.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 if(doc.items.some(i=>normalized(i.title)===normalized(item.title)))throw Error('Já existe pauta com esse título.');
 const dir=path.join(root,'conteudos',id);await mkdir(dir,{recursive:true});
 await writeFile(path.join(dir,'artigo.md'),articleText(item));
 await writeFile(path.join(dir,'briefing.txt'),'TÍTULO: '+item.title+'\nEDITORIA: '+item.edition+'\nVOZ: '+item.expert+'\nÂNGULO: '+item.angle+'\nLEITOR: '+item.audience+'\nOBJETIVO: '+item.goal+'\n\nFONTES DA PESQUISA:\n'+result.researchSources.map(s=>s.publishedAt+' | '+s.title+' | '+s.url).join('\n')+'\n');
 await atomic('conteudos/'+id+'/metadados.json',item);
 doc.items.unshift(item);await atomic('editorial/pautas.json',doc);
 if(mode==='daily')ledger.days[date]={itemId:id,createdAt:instant};
 else {ledger.days[date]??={itemId:existing?.id||dailyId,createdAt:null};ledger.days[date].replenishments??=[];ledger.days[date].replenishments.push({itemId:id,createdAt:instant});}
 await atomic('editorial/pauta-diaria.json',ledger);
 console.log(JSON.stringify({created:true,date,mode,itemId:id,pautas:count+1,submitted:false}));
});
