import type {MonitorView} from './dashboard';
import {statusOf} from '../components/format';

const symbols:Record<string,string>={up:'🟢',down:'🔴',checking:'🟡',unknown:'⚪',paused:'⏸️',setup:'⚙️'};
function plain(value:string){return value.replace(/[\\`*_~|<>\[\]@]/g,'').slice(0,120);}
export function overviewHistory(monitor:MonitorView,now:string){
  const end=Math.floor(Date.parse(now)/60000)*60000+60000,start=end-3600000;
  return Array.from({length:12},(_,i)=>{
    const checks=monitor.history.filter(h=>Date.parse(h.minute)>=start+i*300000&&Date.parse(h.minute)<start+(i+1)*300000);
    return checks.some(h=>!h.ok)?'🟥':checks.length?'🟩':'⬜';
  }).join('');
}
export function buildOverview(monitors:MonitorView[],now:string,dashboardUrl:string){
  const states=monitors.map(m=>statusOf(m,now));
  const healthy=states.filter(s=>s.key==='up').length,down=states.filter(s=>s.key==='down').length;
  const headline=!monitors.length?'No monitors configured':healthy===monitors.length?`✅ All ${healthy} services operational`:`🟢 ${healthy} operational · 🔴 ${down} down · ⚪ ${monitors.length-healthy-down} other`;
  const fields=monitors.slice(0,20).map((monitor,index)=>{
    const state=states[index],response=monitor.last_latency_ms!=null&&state.key==='up'?` · ${monitor.last_latency_ms.toLocaleString('en-PH')} ms`:'';
    const passed=monitor.total?`${(monitor.passed/monitor.total*100).toFixed(2)}%`:'No data';
    return {name:`${symbols[state.key]??'⚪'} ${plain(monitor.name)}`,value:`${state.label}${response}\n24h checks: ${passed} · ${monitor.coverage}% coverage\n${overviewHistory(monitor,now)}`,inline:false};
  });
  const updated=new Intl.DateTimeFormat('en-PH',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'Asia/Manila'}).format(new Date(now));
  return {username:'Mang Tani',allowed_mentions:{parse:[]},embeds:[{title:'📡 Service overview',url:dashboardUrl,color:down?0xb3293e:healthy===monitors.length?0x17734d:0xa56916,description:headline+(monitors.length>20?`\nShowing 20 of ${monitors.length} services; open the dashboard for all.`:''),fields,footer:{text:`Past hour · 5 min/block · 🟩 Passed 🟥 Failed ⬜ No data\nUpdated ${updated} PHT`}}]};
}
