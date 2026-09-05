export type Status = 'unknown' | 'up' | 'down';
export type MonitorState = {status:Status; failures:number; successes:number};
export const initialState: MonitorState = {status:'unknown', failures:0, successes:0};

export function transition(previous:MonitorState, ok:boolean, gap=false): {state:MonitorState; event:'down'|'recovered'|null} {
  const state = {...previous};
  if (gap) { state.failures=0; state.successes=0; }
  let event:'down'|'recovered'|null = null;
  if (ok) {
    state.failures=0;
    state.successes=Math.min(2,state.successes+1);
    if (state.status==='down' && state.successes>=2) { state.status='up'; event='recovered'; }
    else if (state.status!=='down') state.status='up';
  } else {
    state.successes=0;
    state.failures=Math.min(2,state.failures+1);
    if (state.failures>=2 && state.status!=='down') { state.status='down'; event='down'; }
  }
  return {state,event};
}
