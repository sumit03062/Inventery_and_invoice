'use client';
import Link from 'next/link';
import {Suspense,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {useData,Heading,Panel,Status,Badge,Empty} from '@/components/ui';
import {currency} from '@/lib/api';
import type {Customer} from '@/types';
function LedgerContent(){
 const params=useSearchParams();const q=useData<Customer[]>('/customers/');const [search,setSearch]=useState('');const [overdue,setOverdue]=useState(params.get('overdue')==='true');
 const rows=(q.data||[]).filter(c=>Number(c.outstanding)>0&&(!overdue||c.overdue)&&(c.name+' '+c.phone).toLowerCase().includes(search.toLowerCase()));
 return <><Heading title="Udhar ledger" description="Track credit, collect payments and follow up on overdue balances."/><div className="metrics"><div className="metric"><div><label>Total outstanding</label><strong>{currency(q.data?.reduce((s,c)=>s+Number(c.outstanding),0))}</strong><small>Calculated from ledger entries</small></div></div><div className="metric"><div><label>Customers with dues</label><strong>{q.data?.filter(c=>Number(c.outstanding)>0).length||0}</strong><small>Open customer balances</small></div></div><div className="metric"><div><label>Overdue customers</label><strong>{q.data?.filter(c=>c.overdue).length||0}</strong><small>Past their due date</small></div></div></div>
 <div className="toolbar"><input aria-label="Search outstanding customers" placeholder="Search customer or mobile…" value={search} onChange={e=>setSearch(e.target.value)}/><label className="check"><input type="checkbox" checked={overdue} onChange={e=>setOverdue(e.target.checked)}/>Overdue only</label><Link className="btn" href="/customers">All customer ledgers</Link></div><Status loading={q.isLoading} error={q.error} retry={q.refetch}/>{q.data&&<Panel title="Outstanding balances"><div className="table-wrap"><table><thead><tr><th>Customer</th><th>Mobile</th><th className="number">Outstanding</th><th>Status</th><th/></tr></thead><tbody>{rows.map(c=><tr key={c.id}><td><Link className="table-link" href={'/customers/'+c.id}>{c.name}</Link></td><td>{c.phone}</td><td className="number"><strong>{currency(c.outstanding)}</strong></td><td><Badge tone={c.overdue?'red':'amber'}>{c.overdue?'Overdue':'Due'}</Badge></td><td><Link className="btn small" href={'/customers/'+c.id}>View ledger / Receive payment</Link></td></tr>)}</tbody></table></div>{!rows.length&&<Empty text="No outstanding balances match this filter."/>}</Panel>}</>;
}
export default function Ledger(){return <Suspense fallback={<Empty text="Loading ledgers…"/>}><LedgerContent/></Suspense>;}
