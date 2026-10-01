'use client';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {useEffect,useState} from 'react';
import {LayoutDashboard,Receipt,FileText,Package,Users,BookOpen,BarChart3,UserCog,Settings,LogOut,Menu,X} from 'lucide-react';
import {useAuth} from '@/hooks/useAuth';
import {useData} from '@/components/ui';
import type {Shop} from '@/types';
import toast from 'react-hot-toast';
const links=[['/dashboard','Dashboard',LayoutDashboard,'reports.view'],['/billing','Billing',Receipt,'billing.create'],['/invoices','Invoices',FileText,''],['/products','Products',Package,''],['/customers','Customers',Users,''],['/ledger','Udhar Ledger',BookOpen,''],['/reports','Reports',BarChart3,'reports.view'],['/staff','Staff',UserCog,'staff.manage'],['/operations','Shop operations',Package,''],['/account','My account',UserCog,''],['/settings','Settings',Settings,'settings.manage']] as const;
export default function Shell({children}:{children:React.ReactNode}){
 const {user,loading,logout,can,error}=useAuth();const pathname=usePathname();const router=useRouter();const [open,setOpen]=useState(false);
 const shop=useData<Shop>('/shop/');
 useEffect(()=>{if(!loading&&!user&&!error)router.replace('/login');},[loading,user,error,router]);
 if(loading)return <div className="empty">Opening your shop…</div>;
 if(error)return <div className="empty"><h1>Cannot connect to your shop</h1><p>{error}</p><button className="btn" onClick={()=>location.reload()}>Retry</button></div>;
 if(!user)return null;
 const rule=links.find(([path])=>pathname===path || pathname.startsWith(path+'/'))?.[3];
 return <div className="app-shell"><div className="mobile-bar"><Link href="/dashboard">Shopbook</Link><button className="icon-btn" aria-label="Toggle navigation" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button></div>
 {open&&<button className="nav-scrim" aria-label="Close navigation" onClick={()=>setOpen(false)}/>}
 <aside className={'sidebar '+(open?'is-open':'')}><div className="brand"><Link href="/dashboard">Shopbook</Link><p>{shop.data?.name || 'Your shop. Simplified.'}</p></div>
 <nav>{links.filter(([, , ,permission])=>!permission||can(permission)).map(([path,label,Icon])=><Link key={path} href={path} onClick={()=>setOpen(false)} className={'nav-link '+(pathname===path || pathname.startsWith(path+'/')?'active':'')}><Icon size={20}/>{label}</Link>)}</nav>
 <div className="account"><div className="avatar">{(user.name||user.username).slice(0,2).toUpperCase()}</div><div><strong>{user.name||user.username}</strong><small>{user.role.toLowerCase()}</small></div></div>
 <button className="nav-link signout" onClick={async()=>{try{await logout();router.replace('/login');}catch(e){toast.error(e instanceof Error?e.message:'Sign out failed');}}}><LogOut size={19}/>Sign out</button>
 </aside><main className="workspace">{rule&&!can(rule)?<div className="notice danger"><h1>Access restricted</h1><p>Your role does not have permission to open this page.</p><Link className="btn" href="/invoices">View invoices</Link></div>:children}</main></div>;
}
