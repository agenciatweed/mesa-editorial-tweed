import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {root,json} from './project.mjs';
import {validManualPublication} from './manual-publication.mjs';
const instant=process.argv[2];
const scripts=path.dirname(fileURLToPath(import.meta.url));
if(!instant||!Number.isFinite(Date.parse(instant)))throw Error('Informe o current_time_iso estável da rodada.');
function run(script,...args){
 const p=spawnSync(process.execPath,[path.join(scripts,script),...args],{cwd:root,encoding:'utf8',env:process.env,maxBuffer:2000000});
 if(p.error||p.status!==0)throw Error(script+': '+(p.error?.message||p.stderr).slice(0,500));
 return JSON.parse(p.stdout);
}
const maintenance=run('link-cycle.mjs','tick',instant);
const manual=await json('.local/manual-publication.json',null);
if(validManualPublication(manual)&&manual.runKey!==instant){console.log(JSON.stringify({runKey:instant,needsWork:false,reason:'manual-publication-in-progress'}));process.exit(0)}
const queue=run('worker.mjs','sync');
const publication=run('publication-window.mjs',instant);
const pauta=run('daily-pauta.mjs','check',instant);
run('linkedin.mjs','sync');
const linkedin=run('linkedin.mjs','next');
const focused=run('focused-links.mjs','check');
const needsWork=!!(queue.jobs.length||publication.job||pauta.shouldResearch||linkedin.next||maintenance.reviewDue||focused.slugs.length);
console.log(JSON.stringify({runKey:instant,needsWork,queue,publication,pauta,linkedin:{reason:linkedin.reason,nextClass:linkedin.nextClass,next:linkedin.next?{slug:linkedin.next.slug,title:linkedin.next.title,state:linkedin.next.state,draftUrl:linkedin.next.draftUrl,lastError:linkedin.next.lastError}:null},maintenance:{reviewDue:maintenance.reviewDue,nextReviewAt:maintenance.nextReviewAt,scope:maintenance.reviewDue?'broad':'focused',focused}}));
