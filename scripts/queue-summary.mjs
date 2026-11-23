export function summarizeJobs(jobs){
 const active=jobs.filter(j=>['pending','running'].includes(j.state)),counts={};
 for(const j of active)counts[j.action]=(counts[j.action]||0)+1;
 return {counts,publicationQueued:counts.publicar||0,jobs:active.filter(j=>j.action!=='publicar').map(j=>({id:j.id,itemId:j.itemId,action:j.action,state:j.state,title:j.input.title,edition:j.input.edition,workKey:j.workKey}))};
}
