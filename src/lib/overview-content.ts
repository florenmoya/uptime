import type {MonitorView} from './dashboard';
import {statusOf} from '../components/format';

const symbols:Record<string,string>={up:'✓',down:'✕',checking:'!',unknown:'?',paused:'Ⅱ',setup:'!'};
function plain(value:string){return value.replace(/[\\`*_~|<>\[\]@]/g,'').slice(0,120);}
export function buildOverview(monitors:MonitorView[],now:string,dashboardUrl:string){
  const states=monitors.map(m=>statusOf(m,now));
  const healthy=states.filter(s=>s.key==='up').length,down=states.filter(s=>s.key==='down').length;
  const other=monitors.length-healthy-down;
  const headline=!monitors.length?'No monitors configured':healthy===monitors.length?`All ${healthy} ${healthy===1?'service':'services'} operational`:[`${healthy} operational`,down?`${down} down`:null,other?`${other} pending or inactive`:null].filter(Boolean).join(' · ');
  const fields=monitors.slice(0,20).map((monitor,index)=>{
    const state=states[index];
    const current=monitor.last_latency_ms!=null&&state.key==='up'?`${monitor.last_latency_ms.toLocaleString('en-PH')} ms`:state.label;
    const passed=monitor.total?`${(monitor.passed/monitor.total*100).toFixed(2)}% passed (24h)`:'No checks in 24h';
    return {name:`${symbols[state.key]??'?'} ${plain(monitor.name)}`,value:`${current} · ${passed}`,inline:false};
  });
  const updated=new Intl.DateTimeFormat('en-PH',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'Asia/Manila'}).format(new Date(now));
  return {username:'Mang Tani',allowed_mentions:{parse:[]},embeds:[{title:'Service overview',url:dashboardUrl,color:down?0xb3293e:monitors.length>0&&healthy===monitors.length?0x17734d:0xa56916,description:headline+(monitors.length>20?`\nShowing 20 of ${monitors.length} services; open the dashboard for all.`:''),fields,footer:{text:`Updated ${updated} PHT`}}]};
}
