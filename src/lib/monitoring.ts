import { pool,transaction } from './db';
import { channelConfig } from './config';
import { transition,type Status } from './state';
import { probe,type ProbeResult } from './probe';
import type { NotificationPayload } from './notifications';

export async function recordObservation(id:string,scheduledAt:Date,version:number,result:ProbeResult,channels=channelConfig()):Promise<boolean> {
  return transaction(async client=>{
    const found=await client.query('SELECT * FROM monitors WHERE id=$1 FOR UPDATE',[id]);
    const monitor=found.rows[0];
    if(!monitor||!monitor.enabled||monitor.version!==version) return false;
    const inserted=await client.query('INSERT INTO checks(monitor_id,target_url,scheduled_at,ok,http_status,latency_ms,error) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING RETURNING id',[id,monitor.url,scheduledAt,result.ok,result.httpStatus,result.latencyMs,result.error]);
    if(!inserted.rowCount) return false;
    const gap=monitor.last_checked_at&&Date.now()-new Date(monitor.last_checked_at).getTime()>monitor.interval_seconds*2500;
    const {state,event}=transition({status:monitor.status as Status,failures:monitor.failures,successes:monitor.successes},result.ok,Boolean(gap));
    await client.query('UPDATE monitors SET status=$2,failures=$3,successes=$4,last_checked_at=now(),last_http_status=$5,last_latency_ms=$6,last_error=$7 WHERE id=$1',[id,state.status,state.failures,state.successes,result.httpStatus,result.latencyMs,result.error]);
    if(!event) return true;
    let incidentId:string;
    let message:string;
    if(event==='down') {
      const incident=await client.query('INSERT INTO incidents(monitor_id,reason) VALUES($1,$2) RETURNING id',[id,result.error??'Two consecutive checks failed.']);
      incidentId=incident.rows[0].id;
      message=`Two consecutive checks failed. ${result.error??'The target did not respond successfully.'}`;
    }else{
      const incident=await client.query("UPDATE incidents SET resolved_at=now(),resolution='Recovered after two healthy checks' WHERE monitor_id=$1 AND resolved_at IS NULL RETURNING id,started_at",[id]);
      if(!incident.rowCount) return true;
      incidentId=incident.rows[0].id;
      const minutes=Math.max(1,Math.round((Date.now()-new Date(incident.rows[0].started_at).getTime())/60000));
      message=`Two consecutive checks passed. The confirmed incident lasted approximately ${minutes} minute${minutes===1?'':'s'}.`;
    }
    const enabled=await client.query('SELECT alerts_enabled FROM app_settings WHERE id=true');
    if(enabled.rows[0]?.alerts_enabled) {
      const payload:NotificationPayload={title:`${event==='down'?'Down':'Recovered'}: ${monitor.name}`,message:`${message}\nIncident #${incidentId}`,monitorName:monitor.name,url:monitor.url,kind:event,occurredAt:new Date().toISOString()};
      for(const channel of ['discord','email'] as const) if(channels[channel]) await client.query('INSERT INTO deliveries(incident_id,event_key,channel,payload) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[incidentId,`${incidentId}:${event}`,channel,JSON.stringify(payload)]);
    }
    return true;
  });
}

export async function runDueChecks():Promise<number> {
  const due=await pool.query('SELECT * FROM monitors WHERE enabled AND url IS NOT NULL AND next_check_at<=now() ORDER BY next_check_at LIMIT 12');
  await Promise.all(due.rows.map(async monitor=>{
    const claim=await pool.query("UPDATE monitors SET next_check_at=now()+(interval_seconds*interval '1 second') WHERE id=$1 AND version=$2 AND enabled AND url IS NOT NULL AND next_check_at<=now() RETURNING id",[monitor.id,monitor.version]);
    if(!claim.rowCount)return;
    const result=await probe(monitor.url);
    await recordObservation(monitor.id,new Date(monitor.next_check_at),monitor.version,result);
    console.log(`${monitor.name}: ${result.ok?'healthy':result.error} (${result.latencyMs} ms)`);
  }));
  return due.rowCount??0;
}

export async function cleanupHistory() {
  await pool.query("DELETE FROM checks WHERE checked_at<now()-interval '30 days'");
  await pool.query("DELETE FROM deliveries WHERE created_at<now()-interval '90 days' AND status!='pending'");
  await pool.query("DELETE FROM incidents WHERE resolved_at<now()-interval '90 days'");
}
