'use client';
import {useRef,useState} from 'react';
import {useData,useAction,Panel,Status,Modal} from '@/components/ui';
import {send,currency,dateTime} from '@/lib/api';
interface Reminder {id:number;amount:string;status:string;detail:string;created_at:string;template:string}
export default function WhatsAppReminders({customerId,name,amount,consent}:{customerId:string;name:string;amount:string;consent:boolean}){
 const q=useData<Reminder[]>('/customers/'+customerId+'/reminders/'); const action=useAction(); const key=useRef(crypto.randomUUID()); const [confirm,setConfirm]=useState(false);
 return <Panel title="WhatsApp reminders"><p className="muted">{consent?'Customer consent is recorded.':'Record customer consent in Edit customer before sending.'}</p><button className="btn" disabled={!consent||Number(amount)<=0||action.busy} onClick={()=>{key.current=crypto.randomUUID();setConfirm(true);}}>Send approved WhatsApp template</button><Status loading={q.isLoading} error={q.error} retry={q.refetch}/>{q.data?.map(r=><div className="total-row" key={r.id}><span>{dateTime(r.created_at)}<small> · {currency(r.amount)} · {r.template}</small><p>{r.detail}</p></span><strong>{r.status}</strong></div>)}{confirm&&<Modal title="Send payment reminder" onClose={()=>setConfirm(false)}><p className="notice">Send the configured approved template to {name}, using the current outstanding balance of {currency(amount)}. Provider messaging charges may apply.</p><button className="btn primary" disabled={action.busy} onClick={async()=>{const result=await action.run(()=>send('/customers/'+customerId+'/reminders/',{request_key:key.current}),'Reminder status updated');if(result)setConfirm(false);}}>Send reminder now</button></Modal>}</Panel>;
}
