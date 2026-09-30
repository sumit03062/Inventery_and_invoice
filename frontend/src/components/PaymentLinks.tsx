'use client';
import {useRef} from 'react';
import {useData,useAction,Panel,Status} from '@/components/ui';
import {send,currency} from '@/lib/api';
import toast from 'react-hot-toast';
interface PaymentLink {id:number;amount:string;status:string;url:string;detail:string}
export default function PaymentLinks({invoiceId,canCreate}:{invoiceId:string;canCreate:boolean}){
 const q=useData<PaymentLink[]>('/invoices/'+invoiceId+'/payment-links/'); const action=useAction(); const key=useRef(crypto.randomUUID());
 return <Panel title="Online payment link"><p className="muted">The balance updates after Razorpay confirms a captured payment. Link creation does not send a message.</p><Status loading={q.isLoading} error={q.error} retry={q.refetch}/>{canCreate&&<button className="btn" disabled={action.busy} onClick={()=>action.run(async()=>{const result=await send<PaymentLink>('/invoices/'+invoiceId+'/payment-links/',{request_key:key.current});if(['FAILED','CANCELLED','EXPIRED'].includes(result.status))key.current=crypto.randomUUID();return result;},'Payment link request saved')}>Create Razorpay link</button>}{q.data?.map(link=><div className="notice" key={link.id}><strong>{currency(link.amount)} · {link.status}</strong><p>{link.detail}</p>{link.url&&<div className="actions"><a href={link.url} target="_blank" rel="noreferrer" className="table-link">Open payment link</a><button className="btn small" onClick={async()=>{try{await navigator.clipboard.writeText(link.url);toast.success('Payment link copied');}catch{toast.error('Copy the link from the opened page.');}}}>Copy link</button></div>}</div>)}</Panel>;
}
