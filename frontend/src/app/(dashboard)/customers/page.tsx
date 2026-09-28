'use client';
import Link from 'next/link';
import {useState} from 'react';
import {Plus} from 'lucide-react';
import {useData,useAction,Heading,Panel,Status,Badge,Empty} from '@/components/ui';
import {useAuth} from '@/hooks/useAuth';
import {currency,api} from '@/lib/api';
import type {Customer} from '@/types';
import CustomerForm from '@/components/CustomerForm';
export default function Customers(){
 const q=useData<Customer[]>('/customers/');const [search,setSearch]=useState('');const [edit,setEdit]=useState<Customer|null|undefined>(undefined);const {can}=useAuth();const action=useAction();
 const rows=(q.data||[]).filter(c=>(c.name+' '+c.phone).toLowerCase().includes(search.toLowerCase()));
 return <><Heading title="Customers" description="Purchase histories, contact details and balances.">{can('customers.write')&&<button className="btn primary" onClick={()=>setEdit(null)}><Plus size={17}/>Add customer</button>}</Heading><div className="toolbar"><input aria-label="Search customers" placeholder="Search name or mobile…" value={search} onChange={e=>setSearch(e.target.value)}/></div><Status loading={q.isLoading} error={q.error} retry={q.refetch}/>{q.data&&<Panel><div className="table-wrap"><table><thead><tr><th>Customer</th><th>Contact</th><th className="number">Total purchases</th><th className="number">Outstanding</th><th>Actions</th></tr></thead><tbody>{rows.map(c=><tr key={c.id}><td><Link className="table-link" href={'/customers/'+c.id}>{c.name}</Link><small>{c.gstin||c.address}</small></td><td>{c.phone}<small>{c.email}</small></td><td className="number">{currency(c.total_purchases)}</td><td className="number">{currency(c.outstanding)}{c.overdue&&<small><Badge tone="red">Overdue</Badge></small>}</td><td><div className="actions"><Link className="btn small" href={'/customers/'+c.id}>Ledger</Link>{can('customers.write')&&<><button className="btn small" onClick={()=>setEdit(c)}>Edit</button><button className="btn small danger" onClick={()=>{if(confirm('Archive this customer? History will be retained.'))action.run(()=>api('/customers/'+c.id+'/',{method:'DELETE'}),'Customer archived');}}>Archive</button></>}</div></td></tr>)}</tbody></table></div>{!rows.length&&<Empty text="No matching customers. Add a customer to start a ledger."/>}</Panel>}{edit!==undefined&&<CustomerForm customer={edit} onClose={()=>setEdit(undefined)}/>}</>;
}
