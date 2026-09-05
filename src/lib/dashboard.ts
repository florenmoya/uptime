import { pool } from './db';
import { settings } from './config';
import {getNotificationSettings,notificationReadiness,notificationSettingsView,type NotificationSettingsView} from './notification-settings';

export type MonitorView={id:string;name:string;project:string;url:string|null;enabled:boolean;status:string;failures:number;successes:number;interval_seconds:number;last_checked_at:string|null;last_http_status:number|null;last_latency_ms:number|null;last_error:string|null;created_at:string;total:number;passed:number;coverage:number;history:{minute:string;ok:boolean}[];recent:{checked_at:string;ok:boolean;latency_ms:number;http_status:number|null;error:string|null}[]};
export type IncidentView={id:string;monitor_id:string;name:string;started_at:string;resolved_at:string|null;reason:string;resolution:string|null};
export type DeliveryView={id:string;channel:'discord'|'email';status:string;attempts:number;last_error:string|null;created_at:string;sent_at:string|null;payload:{title:string;kind:string}};
export type StatusPageView={id:string;slug:string;title:string;description:string;published:boolean;monitorIds:string[];updatedAt:string};
export type DashboardData={monitors:MonitorView[];incidents:IncidentView[];deliveries:DeliveryView[];statusPages:StatusPageView[];worker:{heartbeat_at:string;started_at:string}|null;config:{discord:boolean;email:boolean;alertsEnabled:boolean;probeLabel:string;mailRecipients:number;notifications:NotificationSettingsView};now:string};

export async function getDashboard():Promise<DashboardData> {
  const [monitors,incidents,deliveries,statusPages,worker,app,notifications]=await Promise.all([
    pool.query(`SELECT m.*,
      (SELECT count(*)::int FROM checks c WHERE c.monitor_id=m.id AND c.target_url=m.url AND c.checked_at>now()-interval '24 hours') AS total,
      (SELECT count(*)::int FROM checks c WHERE c.monitor_id=m.id AND c.target_url=m.url AND c.ok AND c.checked_at>now()-interval '24 hours') AS passed,
      (SELECT count(DISTINCT date_trunc('minute',c.checked_at))::int FROM checks c WHERE c.monitor_id=m.id AND c.target_url=m.url AND c.checked_at>now()-interval '24 hours') AS covered_minutes,
      COALESCE((SELECT jsonb_agg(h ORDER BY minute) FROM (SELECT date_trunc('minute',checked_at) AS minute,bool_and(ok) AS ok FROM checks c WHERE c.monitor_id=m.id AND c.target_url=m.url AND c.checked_at>now()-interval '1 hour' GROUP BY 1) h),'[]') AS history,
      COALESCE((SELECT jsonb_agg(r ORDER BY checked_at) FROM (SELECT checked_at,ok,latency_ms,http_status,error FROM checks c WHERE c.monitor_id=m.id AND c.target_url=m.url ORDER BY checked_at DESC LIMIT 30) r),'[]') AS recent
      FROM monitors m ORDER BY m.created_at,m.id`),
    pool.query('SELECT i.*,m.name FROM incidents i JOIN monitors m ON m.id=i.monitor_id ORDER BY i.started_at DESC LIMIT 60'),
    pool.query('SELECT id,channel,status,attempts,last_error,created_at,sent_at,jsonb_build_object(\'title\',payload->>\'title\',\'kind\',payload->>\'kind\') AS payload FROM deliveries ORDER BY created_at DESC LIMIT 40'),
    pool.query(`SELECT sp.id,sp.slug,sp.title,sp.description,sp.published,sp.updated_at,
      COALESCE(array_agg(spm.monitor_id ORDER BY spm.display_order) FILTER(WHERE spm.monitor_id IS NOT NULL),'{}') AS monitor_ids
      FROM status_pages sp LEFT JOIN status_page_monitors spm ON spm.status_page_id=sp.id
      GROUP BY sp.id ORDER BY sp.created_at,sp.id`),
    pool.query('SELECT heartbeat_at,started_at FROM worker_health WHERE id=true'),
    pool.query('SELECT alerts_enabled FROM app_settings WHERE id=true'),
    getNotificationSettings(),
  ]);
  const config=settings();
  return JSON.parse(JSON.stringify({
    monitors:monitors.rows.map(m=>{
      const elapsed=Math.max(1,Math.min(1440,Math.ceil((Date.now()-new Date(m.created_at).getTime())/60000)));
      return {...m,coverage:Math.min(100,Math.round(m.covered_minutes/elapsed*100))};
    }),
    incidents:incidents.rows,deliveries:deliveries.rows,statusPages:statusPages.rows.map(p=>({id:p.id,slug:p.slug,title:p.title,description:p.description,published:p.published,monitorIds:p.monitor_ids,updatedAt:p.updated_at})),worker:worker.rows[0]??null,
    config:{...notificationReadiness(notifications),alertsEnabled:app.rows[0]?.alerts_enabled??false,probeLabel:config.probeLabel,mailRecipients:notifications.email.to.length,notifications:notificationSettingsView(notifications)},now:new Date().toISOString(),
  }));
}
