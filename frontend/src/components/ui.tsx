'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { LoaderCircle, X, Plus } from 'lucide-react';
import Link from 'next/link';
export function useData<T>(path:string, enabled=true) {
 const {user}=useAuth();
 return useQuery({queryKey:[user?.id,path],queryFn:()=>api<T>(path),enabled:!!user && enabled});
}
export function useAction() {
 const client=useQueryClient(); const [busy,setBusy]=useState(false);
 const run=async<T,>(fn:()=>Promise<T>,message='Saved successfully'):Promise<T|undefined>=>{
  setBusy(true);
  try {const result=await fn();await client.invalidateQueries();toast.success(message);return result;}
  catch(e){toast.error(e instanceof Error?e.message:'Unable to save.');return undefined;}
  finally{setBusy(false);}
 };
 return {run,busy};
}
export function Heading({title,description,children}:{title:string;description:string;children?:React.ReactNode}){
 return <header className="page-heading"><div><h1>{title}</h1><p>{description}</p></div><div className="actions">{children}</div></header>;
}
export function Field({label,children,hint}:{label:string;children:React.ReactNode;hint?:string}){
 return <label className="field"><span>{label}</span><span className="field-control">{children}</span>{hint&&<small>{hint}</small>}</label>;
}
export function Status({loading,error,retry}:{loading:boolean;error:Error|null;retry:()=>unknown}){
 if(loading)return <div className="empty"><LoaderCircle className="spin" size={24}/><p>Loading your shop…</p></div>;
 if(error)return <div className="notice danger" role="alert"><strong>Unable to load</strong><p>{error.message}</p><button className="btn" onClick={()=>retry()}>Try again</button></div>;
 return null;
}
export function Empty({text='No records yet.'}:{text?:string}){return <div className="empty">{text}</div>;}
export function Badge({children,tone='green'}:{children:React.ReactNode;tone?:string}){return <span className={'badge '+tone}>{children}</span>;}
export function Panel({title,children,action}:{title?:string;children:React.ReactNode;action?:React.ReactNode}){return <section className="panel">{title&&<div className="panel-heading"><h2>{title}</h2>{action}</div>}{children}</section>;}
export function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){
 const ref=useRef<HTMLElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';ref.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus();return()=>{document.body.style.overflow=overflow;previous?.focus();};},[]);
 const trapFocus = (event: React.KeyboardEvent) => {
   if (event.key === 'Escape') onClose();
   if (event.key !== 'Tab') return;
   const items = ref.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)');
   if (!items?.length) return;
   const first = items[0], last = items[items.length - 1];
   if (event.shiftKey && document.activeElement === first) {
     event.preventDefault(); last.focus();
   } else if (!event.shiftKey && document.activeElement === last) {
     event.preventDefault(); first.focus();
   }
 };
 return <div className="modal-backdrop" onKeyDown={trapFocus}><section ref={ref} className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="panel-heading"><h2>{title}</h2><button className="icon-btn" aria-label="Close dialog" onClick={onClose}><X size={20}/></button></div>{children}</section></div>;
}
export function NewInvoice(){return <Link className="btn primary" href="/billing"><Plus size={18}/>New invoice</Link>;}
