'use client';
import Link from 'next/link';
import {Banknote,Wallet,Users,BookOpen,ChevronRight} from 'lucide-react';
import {useData,Heading,Panel,Status,NewInvoice} from '@/components/ui';
import {useAuth} from '@/hooks/useAuth';
import {currency} from '@/lib/api';
import type {DashboardData} from '@/types';
import InvoiceTable from '@/components/InvoiceTable';
import SalesChart from '@/components/SalesChart';
export default function Dashboard(){
 const {can}=useAuth();const q=useData<DashboardData>('/dashboard/',can('reports.view'));
 const data=q.data;
 return <><Heading title="Dashboard" description="A clear view of your shop today."><span className="muted">{new Date().toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata',weekday:'short',day:'numeric',month:'short',year:'numeric'})}</span><NewInvoice/></Heading>
 <Status loading={q.isLoading} error={q.error} retry={q.refetch}/>{data&&<>
 <div className="metrics">{[['Today’s sales',data.stats.sales,Banknote,'Active invoices today'],['Today’s collection',data.stats.collections,Wallet,'Receipts less recorded refunds'],['Today’s Udhar',data.stats.udhar,Users,'Credit given at billing'],['Total outstanding',data.stats.outstanding,BookOpen,'Across all customer ledgers']].map(([label,value,Icon,hint])=>{const I=Icon as typeof Banknote;return <div className="metric" key={String(label)}><div className="metric-icon"><I size={23}/></div><div><label>{String(label)}</label><strong>{currency(String(value||0))}</strong><small>{String(hint)}</small></div></div>;})}</div>
 <div className="dashboard-grid"><Panel title="Sales & collections"><p className="muted" style={{marginBottom:14}}>Daily comparison for the last 7 days</p><SalesChart data={data.trend}/></Panel><Panel title="Needs attention">
 <Link href="/ledger?overdue=true" className="attention"><div><strong>{data.stats.overdue_count} overdue customers</strong><p>Review balances and prepare reminders</p></div><ChevronRight size={18}/></Link>
 <Link href="/products?low=true" className="attention"><div><strong>{data.stats.low_stock_count} products low in stock</strong><p>Stock at or below reorder level</p></div><ChevronRight size={18}/></Link>
 <Link href="/invoices" className="attention"><div><strong>{data.stats.invoice_count} invoices today</strong><p>{data.stats.customer_count} customers in your shop</p></div><ChevronRight size={18}/></Link>
 </Panel></div><Panel title="Recent invoices" action={<Link href="/invoices">View all</Link>}><InvoiceTable invoices={data.invoices}/></Panel></>}</>;
}
