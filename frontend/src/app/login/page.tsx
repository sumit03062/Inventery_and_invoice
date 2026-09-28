'use client';
import {useState,useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {useAuth} from '@/hooks/useAuth';
import {Field} from '@/components/ui';
import {Store,ArrowRight} from 'lucide-react';
export default function Login(){
 const auth=useAuth();const router=useRouter();const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 useEffect(()=>{if(auth.user)router.replace(auth.can('reports.view')?'/dashboard':'/billing');},[auth.user,auth,router]);
 if(auth.loading)return <div className="empty">Opening Shopbook…</div>;
 return <main className="auth-page"><section className="auth-story"><Store size={40}/><h1>Your shop.<br/>Everything in order.</h1><p>Billing, stock, customers and Udhar.<br/>One place to run your day.</p><div className="auth-note">Every sale recorded.<br/>Every balance accounted for.</div></section><section className="auth-form"><div className="brand">Shopbook</div><h2>{auth.needsSetup?'Set up your shop':'Welcome back'}</h2><p>{auth.needsSetup?'Create the owner account for this shop.':'Sign in with your owner or staff account.'}</p>
 {(error||auth.error)&&<div className="notice danger" role="alert">{error||auth.error}{auth.error&&<button className="btn" onClick={()=>location.reload()}>Retry connection</button>}</div>}
 <form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');const data=Object.fromEntries(new FormData(e.currentTarget));try{if(auth.needsSetup)await auth.setup(data);else await auth.login(String(data.username),String(data.password));}catch(e){setError(e instanceof Error?e.message:'Unable to sign in');}finally{setBusy(false);}}}>
 {auth.needsSetup&&<><Field label="Shop name"><input name="shop_name" required maxLength={150} autoComplete="organization"/></Field><Field label="Owner name"><input name="owner_name" required maxLength={150} autoComplete="name"/></Field></>}
 <Field label="Username"><input name="username" required autoComplete="username" maxLength={150}/></Field><Field label="Password" hint={auth.needsSetup?'At least 8 characters. Avoid common or numeric-only passwords.':undefined}><input name="password" type="password" required minLength={auth.needsSetup?8:1} autoComplete={auth.needsSetup?'new-password':'current-password'}/></Field>
 <button className="btn primary wide" disabled={busy||!!auth.error}>{busy?'Please wait…':auth.needsSetup?'Create shop':'Sign in'}<ArrowRight size={17}/></button></form><small className="muted">Staff accounts are created by the shop owner.</small></section></main>;
}
