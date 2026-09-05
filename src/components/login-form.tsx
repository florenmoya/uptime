'use client';
import {useState} from 'react';
import {Activity,ArrowRight,Eye,EyeOff,LoaderCircle} from 'lucide-react';

export default function LoginForm(){
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[visible,setVisible]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy)return;
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error??'Unable to sign in. Please try again.');
      window.location.assign('/');
    }catch(error){setError(error instanceof Error?error.message:'Unable to connect. Please try again.');setBusy(false);}
  }
  return <main className="login-page"><div className="login-container">
    <div className="login-brand"><span className="brand-symbol"><Activity size={23} aria-hidden="true"/></span><span>bayanko<span className="brand-product">uptime</span></span></div>
    <section className="login-panel" aria-labelledby="login-title"><h1 id="login-title">Sign in</h1>
      <form onSubmit={submit} aria-busy={busy}>
        <label htmlFor="login-email">Email address</label><input id="login-email" type="email" name="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={254} value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@example.com" disabled={busy}/>
        <label htmlFor="login-password">Password</label><div className="login-password"><input id="login-password" name="password" type={visible?'text':'password'} autoComplete="current-password" required maxLength={1024} value={password} onChange={event=>setPassword(event.target.value)} disabled={busy}/><button type="button" className="icon-button" aria-label={visible?'Hide password':'Show password'} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
        {error&&<p className="login-error" role="alert">{error}</p>}
        <button className="primary-button login-submit" type="submit" disabled={busy}>{busy?<><LoaderCircle size={17} className="spinning"/>Signing in…</>:<>Sign in<ArrowRight size={17}/></>}</button>
      </form>
    </section>
  </div></main>;
}
