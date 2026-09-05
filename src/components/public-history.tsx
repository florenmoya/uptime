'use client';
import {useEffect,useId,useState} from 'react';
import type {PublicDay} from '@/lib/public-status';
export default function PublicHistory({days,name}:{days:PublicDay[];name:string}){
  const [active,setActive]=useState<number|null>(null);
  const [selected,setSelected]=useState(days.length-1);
  const tooltipId=useId();
  const selectId=useId();
  const day=active===null?null:days[active];
  const selectedDay=days[selected];
  const formatDate=(date:string)=>new Intl.DateTimeFormat('en-PH',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T00:00:00Z'));
  useEffect(()=>{
    if(active===null)return;
    const dismiss=(event:KeyboardEvent)=>{if(event.key==='Escape')setActive(null);};
    document.addEventListener('keydown',dismiss);
    return()=>document.removeEventListener('keydown',dismiss);
  },[active]);
  function move(event:React.KeyboardEvent){
    if(event.key==='Escape'){setActive(null);return;}
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();
    setActive(index=>event.key==='Home'?0:event.key==='End'?days.length-1:Math.max(0,Math.min(days.length-1,(index??days.length-1)+(event.key==='ArrowLeft'?-1:1))));
  }
  return <div className="public-history-wrap"><div className="public-history" tabIndex={0} role="group" aria-label={`${name}: 30 days of recorded checks. Use left and right arrow keys for daily details.`} aria-describedby={day?tooltipId:undefined} onKeyDown={move} onFocus={()=>setActive(days.length-1)} onBlur={event=>{if(!event.currentTarget.matches(':hover'))setActive(null);}} onMouseLeave={event=>{if(document.activeElement!==event.currentTarget)setActive(null);}}>
    {days.map((d,index)=><span key={d.date} className={`public-day ${!d.total?'unobserved':d.passed===d.total?'healthy':d.passed?'mixed':'failed'} ${active===index?'active':''}`} aria-hidden="true" onMouseEnter={()=>setActive(index)} onPointerDown={event=>{event.preventDefault();event.currentTarget.parentElement?.focus({preventScroll:true});setActive(index);}}/>)}
    {day&&<div id={tooltipId} role="tooltip" className="public-day-tooltip" style={{left:`clamp(88px,${((active??0)+.5)/days.length*100}%,calc(100% - 88px))`}}><span>{formatDate(day.date)}</span><strong>{day.total?`${(day.passed/day.total*100).toFixed(3)}%`:'No observations'}</strong>{day.total>0&&<small>{day.passed.toLocaleString()} of {day.total.toLocaleString()} checks passed</small>}</div>}
  </div><div className="public-history-labels"><span>Past 30 days</span><span>Today</span></div>
    <details className="public-day-details"><summary aria-label={`Daily details for ${name}`}>Daily details</summary><label htmlFor={selectId}>Select a date</label><select id={selectId} value={selected} onChange={event=>setSelected(Number(event.target.value))}>{days.map((d,index)=><option key={d.date} value={index}>{formatDate(d.date)}</option>)}</select><p aria-live="polite">{selectedDay?.total?<><strong>{(selectedDay.passed/selectedDay.total*100).toFixed(3)}% checks passed</strong><span>{selectedDay.passed.toLocaleString()} of {selectedDay.total.toLocaleString()} checks passed</span></>:<>No observations for this date.</>}</p></details>
  </div>;
}
