'use client';
import {useState} from 'react';
import {LogOut} from 'lucide-react';
export default function LogoutButton(){
  const [busy,setBusy]=useState(false),[error,setError]=useState(false);
  async function logout(){
    setBusy(true);setError(false);
    try{const response=await fetch('/api/auth/logout',{method:'POST'});if(!response.ok)throw new Error();window.location.assign('/login');}
    catch{setError(true);setBusy(false);}
  }
  return <div className="logout-control"><button className="small-button" disabled={busy} onClick={logout}><LogOut size={14}/>{busy?'Signing out…':'Sign out'}</button>{error&&<span role="alert">Sign out failed. Try again.</span>}</div>;
}
