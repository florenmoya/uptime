import { pool } from './db';

export type PublicDay={date:string;status:'up'|'down'|'none';total:number;passed:number};
export type PublicMonitor={id:string;name:string;status:'up'|'down'|'unknown'|'paused';days:PublicDay[];total:number;passed:number};
export type PublicIncident={id:string;name:string;startedAt:string;resolvedAt:string|null};
export type PublicStatusPage={id:string;slug:string;title:string;description:string;updatedAt:string;monitors:PublicMonitor[];incidents:PublicIncident[]};

const slugPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function getPublicPage(slug:string):Promise<PublicStatusPage|null>{
  if(!slugPattern.test(slug)||slug.length>60)return null;
  const page=(await pool.query('SELECT id,slug,title,description,updated_at FROM status_pages WHERE slug=$1 AND published=true',[slug])).rows[0];
  if(!page)return null;
  const [monitors,incidents]=await Promise.all([
    pool.query(`SELECT m.id,m.name,m.enabled,m.status,m.last_checked_at,m.interval_seconds,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('date',date,'status',status,'total',total,'passed',passed) ORDER BY day) FROM (
        SELECT to_char(day,'YYYY-MM-DD') AS date,
          CASE WHEN count(c.id)=0 THEN 'none' WHEN bool_and(c.ok) THEN 'up' ELSE 'down' END AS status,
          count(c.id)::int AS total,count(c.id) FILTER(WHERE c.ok)::int AS passed,
          day
        FROM generate_series((now() AT TIME ZONE 'Asia/Manila')::date-29,(now() AT TIME ZONE 'Asia/Manila')::date,interval '1 day') AS day
        LEFT JOIN checks c ON c.monitor_id=m.id AND c.target_url=m.url AND c.checked_at>=day::timestamp AT TIME ZONE 'Asia/Manila' AND c.checked_at<(day::timestamp+interval '1 day') AT TIME ZONE 'Asia/Manila'
        GROUP BY day
      ) day_status),'[]') AS days
      FROM status_page_monitors spm JOIN monitors m ON m.id=spm.monitor_id
      WHERE spm.status_page_id=$1 ORDER BY m.display_order,m.created_at,m.id`,[page.id]),
    pool.query(`SELECT i.id::text,m.name,i.started_at,i.resolved_at
      FROM incidents i
      JOIN status_page_monitors spm ON spm.monitor_id=i.monitor_id
      JOIN monitors m ON m.id=i.monitor_id
      WHERE spm.status_page_id=$1 AND i.started_at>now()-interval '60 days'
      ORDER BY i.started_at DESC LIMIT 30`,[page.id]),
  ]);
  const now=Date.now();
  return JSON.parse(JSON.stringify({
    id:page.id,slug:page.slug,title:page.title,description:page.description,updatedAt:new Date(now).toISOString(),
    monitors:monitors.rows.map(m=>({
      id:m.id,
      name:m.name,
      status:!m.enabled?'paused':!m.last_checked_at||now-new Date(m.last_checked_at).getTime()>m.interval_seconds*2000+10000?'unknown':m.status,
      days:m.days,
      total:(m.days as PublicDay[]).reduce((sum,day)=>sum+day.total,0),
      passed:(m.days as PublicDay[]).reduce((sum,day)=>sum+day.passed,0),
    })),
    incidents:incidents.rows.map(i=>({id:i.id,name:i.name,startedAt:i.started_at,resolvedAt:i.resolved_at})),
  }));
}
