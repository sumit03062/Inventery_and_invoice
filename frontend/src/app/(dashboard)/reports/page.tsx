'use client';
import {unitLabel} from '@/components/StockQuantity';

import {useState} from 'react';

import {Download,Printer} from 'lucide-react';

import {useData,Heading,Panel,Status,Field,Empty} from '@/components/ui';

import {useAuth} from '@/hooks/useAuth';

import {currency,localDate,dateTime,download} from '@/lib/api';

import type {ReportData} from '@/types';

import SalesChart from '@/components/SalesChart';

import Link from 'next/link';

import toast from 'react-hot-toast';

export default function Reports(){

 const {can}=useAuth();const [from,setFrom]=useState(localDate());const [to,setTo]=useState(localDate());const [tab,setTab]=useState('sales');

 const query='?from='+from+'&to='+to;const q=useData<ReportData>('/reports/'+query,can('reports.view')&&!!from&&!!to);

 const preset=(period:string)=>{const today=localDate();setTo(today);if(period==='daily')setFrom(today);else if(period==='weekly'){const date=new Date(today+'T12:00:00');date.setDate(date.getDate()-6);setFrom(localDate(date));}else setFrom(today.slice(0,8)+'01');};

 const data=q.data;

 return <><Heading title="Reports" description="Sales, collections, GST and outstanding balances."><button className="btn" onClick={()=>window.print()}><Printer size={16}/>Print</button><button className="btn" onClick={async()=>{try{await download('/reports/export/'+query,'sales-'+from+'-'+to+'.csv');}catch(e){toast.error(e instanceof Error?e.message:'Export failed');}}}><Download size={16}/>Export invoices</button></Heading>

 <div className="toolbar"><Field label="From"><input type="date" value={from} onChange={e=>setFrom(e.target.value)} max={to}/></Field><Field label="To"><input type="date" value={to} onChange={e=>setTo(e.target.value)} min={from}/></Field>{['daily','weekly','monthly'].map(p=><button className="btn small" key={p} onClick={()=>preset(p)}>{p==='daily'?'Today':p==='weekly'?'Last 7 days':'This month'}</button>)}</div>

 <div className="tabs">{['sales','gst','inventory','staff','customers','udhar','payments'].map(t=><button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t==='gst'?'GST':t.charAt(0).toUpperCase()+t.slice(1)}</button>)}</div><Status loading={q.isLoading} error={q.error} retry={q.refetch}/>

 {data&&<><div className="metrics">{[['Sales',data.stats.sales],['Collections (net)',data.stats.collections],['Udhar given',data.stats.udhar],['Outstanding now',data.total_outstanding]].map(([label,value])=><div className="metric" key={label}><div><label>{label}</label><strong>{currency(value)}</strong></div></div>)}</div>

 {tab==='sales'&&<><Panel title="Sales vs collections"><SalesChart data={data.trend}/><p className="muted">Sales use active invoices issued in this period. Collections use payment dates, less recorded refunds. Outstanding is the current all-time ledger balance.</p></Panel><Panel title="Payment-method breakdown"><ReportTable headers={['Method','Receipts','Refunds','Net collection']} rows={data.methods.map(m=>[m.method,currency(m.receipts),currency(m.refunds),currency(m.net)])}/></Panel><Panel title="Daily totals"><ReportTable headers={['Date','Invoices','Sales','Collections','Udhar given']} rows={data.trend.map(d=>[d.date,d.invoice_count,currency(d.sales),currency(d.collections),currency(d.udhar)])}/></Panel></>}

 {tab==='gst'&&<Panel title="GST document register"><p className="muted">Invoices are listed on their issue date; credit notes reduce tax on their own issue date. Basic-tax invoices may have no component split. This register does not submit a tax return.</p><button className="btn" onClick={async()=>{try{await download('/reports/gst-export/'+query,'gst-register.csv');}catch{toast.error('Export failed');}}}>Export GST register</button><ReportTable headers={['Document','Date','Original invoice','Taxable','CGST','SGST','UTGST','IGST','GST total']} rows={data.gst_register.map(r=>[r.number,r.date,r.original_invoice||'—',currency(r.taxable),currency(r.cgst),currency(r.sgst),currency(r.utgst),currency(r.igst),currency(r.gst_amount)])}/><div className="total-row"><span>Net GST in document period</span><strong>{currency(data.gst_register.reduce((sum,r)=>sum+Number(r.gst_amount),0))}</strong></div></Panel>}

 {tab==='inventory'&&<><Panel title="Top-selling products"><ReportTable headers={['Product','Units sold','Sales total']} rows={data.top_products.map(p=>[p.name,p.quantity+' '+unitLabel(p.unit),currency(p.total)])}/></Panel><Panel title="Current low-stock products"><ReportTable headers={['Product','SKU','Stock','Threshold']} rows={data.low_stock.map(p=>[p.name,p.sku,p.stock_quantity+' '+unitLabel(p.unit),p.low_stock_threshold+' '+unitLabel(p.unit)])}/></Panel></>}

 {tab==='staff'&&<Panel title="Staff-wise sales"><ReportTable headers={['Staff','Sales']} rows={data.staff.map(s=>[s.created_by__username,currency(s.total)])}/></Panel>}

 {tab==='customers'&&<Panel title="Customer-wise purchases"><ReportTable headers={['Customer','Purchases in period']} rows={data.customers.map(c=>[c.customer_snapshot__name,currency(c.total)])}/></Panel>}

 {tab==='udhar'&&<Panel title="Customer balances now"><ReportTable headers={['Customer','Outstanding','Status']} rows={data.outstanding.filter(c=>Number(c.outstanding)>0).map(c=>[<Link key={c.id} className="table-link" href={'/customers/'+c.id}>{c.name}</Link>,currency(c.outstanding),c.overdue?'Overdue':'Due'])}/></Panel>}

 {tab==='payments'&&<Panel title="Collection and refund register"><ReportTable headers={['Date','Customer','Method','Type','Amount','Recorded by']} rows={data.payments.map(p=>[dateTime(p.transaction_date),p.customer_name,p.method,p.direction,currency(p.amount),p.created_by_name])}/></Panel>}</>}</>;

}

function ReportTable({headers,rows}:{headers:string[];rows:React.ReactNode[][]}){return rows.length?<div className="table-wrap"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>)}</tbody></table></div>:<Empty text="No records in this period."/>;}
