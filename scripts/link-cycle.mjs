// Conta rodadas reais; repetir a mesma chave não consome outra execução.
import {locked,json,atomic} from './project.mjs';
import {maintenanceState,reviewDue,completeMaintenance} from './maintenance-policy.mjs';
const [command,key]=process.argv.slice(2);
await locked(async()=>{
 const file='.local/link-cycle.json';
 const original=await json(file,{version:1,executions:0,nextReview:10,recentKeys:[]});
 const config=await json('editorial/automation-config.json',{broadReviewDays:30});
 const at=command==='tick'&&key?new Date(key).toISOString():new Date().toISOString();
 let state=maintenanceState(original,config.broadReviewDays,at);
 if(command==='tick'){
  if(!key)throw Error('Informe a chave estável da execução: current_time_iso do heartbeat.');
  if(!state.recentKeys.includes(key)){
   state.executions++;state.recentKeys=[...state.recentKeys,key].slice(-100);
  }
 }else if(command==='complete'){
  state=completeMaintenance(state,config.broadReviewDays,at);
 }else if(command!=='status')throw Error('Use tick CHAVE, status ou complete.');
 if(JSON.stringify(original)!==JSON.stringify(state))await atomic(file,state);
 console.log(JSON.stringify({...state,recentKeys:undefined,reviewDue:reviewDue(state,at)}));
});
