const DAY=86400000;
export function maintenanceState(original,days,at){
 if(!Number.isInteger(days)||days<1||!Number.isFinite(Date.parse(at)))throw Error('Intervalo de manutenção inválido.');
 const state=structuredClone(original);
 if(!state.nextReviewAt){
  const pending=state.executions>=state.nextReview;
  state.nextReviewAt=pending?at:new Date(Date.parse(state.lastReviewedAt||at)+days*DAY).toISOString();
  state.legacyNextReview=state.nextReview;delete state.nextReview;
 }
 state.reviewIntervalDays=days;
 return state;
}
export const reviewDue=(state,at)=>Date.parse(at)>=Date.parse(state.nextReviewAt);
export function completeMaintenance(state,days,at){
 if(!reviewDue(state,at))throw Error('A revisão periódica ainda não venceu.');
 return {...state,lastReviewedExecution:state.executions,lastReviewedAt:at,nextReviewAt:new Date(Date.parse(at)+days*DAY).toISOString()};
}
