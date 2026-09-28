'use client';
import {useState} from 'react';
import {useData,Heading,Panel,Status,NewInvoice} from '@/components/ui';
import InvoiceTable from '@/components/InvoiceTable';
import type {Invoice} from '@/types';
export default function Invoices(){
 const [search,setSearch]=useState('');const q=useData<Invoice[]>('/invoices/');
 const rows=(q.data||[]).filter(i=>(i.number+' '+i.customer_snapshot.name).toLowerCase().includes(search.toLowerCase()));
 return <><Heading title="Invoices" description="Every sale, payment and cancellation in one place."><NewInvoice/></Heading><div className="toolbar"><input className="search" aria-label="Search invoices" placeholder="Search invoice number or customer…" value={search} onChange={e=>setSearch(e.target.value)}/></div><Status loading={q.isLoading} error={q.error} retry={q.refetch}/>{q.data&&<Panel><InvoiceTable invoices={rows}/></Panel>}</>;
}
