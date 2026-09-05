'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
export default function PublicAutoRefresh({updatedAt}:{updatedAt:string}){
  const router=useRouter();
  const base=new Date(updatedAt).getTime();
  const [now,setNow]=useState(base);
  useEffect(()=>{
    let lastAttempt=base;
    const tick=()=>{
      const time=Date.now();setNow(time);
      if(!document.hidden&&time-lastAttempt>=30000){lastAttempt=time;router.refresh();}
    };
    const visible=()=>{if(!document.hidden){lastAttempt=Date.now();router.refresh();}tick();};
    const timer=setInterval(tick,1000);
    document.addEventListener('visibilitychange',visible);
    return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
  },[base,router]);
  const remaining=Math.max(0,Math.min(30,Math.ceil((base+30000-now)/1000)));
  const delayed=now-base>45000;
  const time=new Intl.DateTimeFormat('en-PH',{hour:'numeric',minute:'2-digit',second:'2-digit',timeZone:'Asia/Manila'}).format(new Date(updatedAt));
  return <div className="public-refresh"><span>Last refreshed <time dateTime={updatedAt}>{time}</time> PHT</span><span className={delayed?'refresh-delayed':''}>{delayed?'Updates delayed':remaining?`Next refresh in ${remaining}s`:'Refreshing…'}</span></div>;
}
