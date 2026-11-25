export function validManualPublication(grant,now=new Date()){
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 return !!(grant?.active===true&&grant.date===day&&grant.authorization?.trim()&&grant.runKey&&Date.parse(grant.runKey)<=+now&&Date.parse(grant.expiresAt)>+now&&Date.parse(grant.expiresAt)-Date.parse(grant.runKey)<=21600000&&Array.isArray(grant.jobs)&&grant.jobs.length===3&&new Set(grant.jobs.map(j=>j.id)).size===3&&grant.jobs.every(j=>j.id&&j.slug&&/^[a-f0-9]{64}$/.test(j.snapshot)));
}
