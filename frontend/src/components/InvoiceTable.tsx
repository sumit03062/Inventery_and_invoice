'use client';
import Link from 'next/link';
import {currency,dateTime} from '@/lib/api';
import type {Invoice} from '@/types';
import {Badge,Empty} from '@/components/ui';
export default function InvoiceTable({invoices}:{invoices:Invoice[]}){
 if(!invoices.length)return <Empty text="No invoices yet. Create your first sale from Billing."/>;
 return <div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Customer</th><th>Payment</th><th className="number">Total</th><th>Status</th><th>Date</th></tr></thead><tbody>{invoices.map(i=><tr key={i.id}><td><Link className="table-link" href={'/invoices/'+i.id}>{i.number}</Link></td><td>{i.customer_snapshot.name}</td><td>{i.payment_method==='CREDIT'?'Udhar':i.payment_method}</td><td className="number">{currency(i.grand_total)}</td><td><Badge tone={i.status==='VOID'?'gray':Number(i.outstanding)>0?'amber':'green'}>{i.status==='VOID'?'Void':Number(i.outstanding)>0?'Due '+currency(i.outstanding):'Paid'}</Badge></td><td className="nowrap">{dateTime(i.created_at)}</td></tr>)}</tbody></table></div>;
}
