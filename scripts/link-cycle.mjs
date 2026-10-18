// Conta rodadas reais; repetir a mesma chave não consome outra execução.
import {locked,json,atomic} from './project.mjs';
const [command,key]=process.argv.slice(2);
await locked(async()=>{
 const file='.local/link-cycle.json';
 const state=await json(file,{version:1,executions:0,nextReview:10,recentKeys:[]});
 if(command==='tick'){
  if(!key)throw Error('Informe a chave estável da execução: current_time_iso do heartbeat.');
  if(!state.recentKeys.includes(key)){
   state.executions++;state.recentKeys=[...state.recentKeys,key].slice(-100);
   await atomic(file,state);
  }
 }else if(command==='complete'){
  if(state.executions<state.nextReview)throw Error('A revisão periódica ainda não venceu.');
  state.lastReviewedExecution=state.executions;
  state.lastReviewedAt=new Date().toISOString();
  state.nextReview=(Math.floor(state.executions/10)+1)*10;
  await atomic(file,state);
 }else if(command!=='status')throw Error('Use tick CHAVE, status ou complete.');
 console.log(JSON.stringify({...state,recentKeys:undefined,reviewDue:state.executions>=state.nextReview}));
});
