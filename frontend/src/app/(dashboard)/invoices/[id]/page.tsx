'use client';
import InvoiceReturns from '@/components/InvoiceReturns';

import {use,useState} from 'react';

import Link from 'next/link';

import {Download,Printer,Share2} from 'lucide-react';

import {useData,useAction,Heading,Panel,Status,Badge,Modal,Field} from '@/components/ui';

import {useAuth} from '@/hooks/useAuth';

import {currency,dateTime,download,send} from '@/lib/api';

import type {Invoice,Shop} from '@/types';

import PaymentLinks from '@/components/PaymentLinks';

import {states} from '@/lib/states';

import toast from 'react-hot-toast';

export default function InvoiceDetail({params}:{params:Promise<{id:string}>}){

 const {id}=use(params);const q=useData<Invoice>('/invoices/'+id+'/');const shop=useData<Shop>('/shop/');const [voiding,setVoiding]=useState(false);const {can}=useAuth();const action=useAction();const i=q.data;

 const save=async(share=false)=>{try{await download('/invoices/'+id+'/pdf/',(i?.number||'invoice')+'.pdf',share);}catch(e){toast.error(e instanceof Error?e.message:'Download failed');}};

 return <><Heading title={i?.number||'Invoice'} description="Invoice details and the original sale amounts."><Link className="btn" href="/invoices">All invoices</Link>{i&&<><button className="btn" onClick={()=>save()}><Download size={16}/>PDF</button><a className="btn" href={'/api/invoices/'+id+'/pdf/'} target="_blank" rel="noreferrer"><Printer size={16}/>Print</a><a className="btn" href={'/api/invoices/'+id+'/pdf/?layout=thermal'} target="_blank" rel="noreferrer">80 mm receipt</a><button className="btn" onClick={()=>save(true)}><Share2 size={16}/>Share</button></>}</Heading><Status loading={q.isLoading} error={q.error} retry={q.refetch}/>{i&&<>

 <Panel><div className="panel-heading"><div><h2>{i.shop_snapshot.name}</h2><p className="muted">{dateTime(i.created_at)} · Issued by {i.created_by_name}</p></div><Badge tone={i.status==='VOID'?'gray':Number(i.outstanding)>0?'amber':'green'}>{i.status==='VOID'?'Void':Number(i.outstanding)>0?'Payment due':'Paid'}</Badge></div><div className="form-grid"><div><small>BILL TO</small><h3>{i.customer_snapshot.name}</h3><p>{i.customer_snapshot.phone}</p><p>{i.customer_snapshot.address}</p><p className="muted">{i.customer_snapshot.gstin&&'GSTIN: '+i.customer_snapshot.gstin}</p></div><div><small>PAYMENT</small><p>{i.payment_method==='CREDIT'?'Udhar':i.payment_method}</p><p>Due {i.due_date}</p>{i.place_of_supply&&<p>Place of supply: {states[i.place_of_supply]} ({i.place_of_supply})</p>}{i.customer&&<Link className="table-link" href={'/customers/'+i.customer}>Open customer ledger →</Link>}</div></div>

 <div className="table-wrap" style={{marginTop:24}}><table><thead><tr><th>Product</th><th className="number">Qty</th><th className="number">Price</th><th className="number">Discount</th><th className="number">GST</th><th className="number">Total</th></tr></thead><tbody>{i.items.map(l=><tr key={l.id}><td>{l.name}<small>{l.sku} · {l.hsn_code||'No HSN'} · {l.unit}{l.price_includes_tax?' · Rate incl. GST':''}</small>{l.serial_numbers?.length>0&&<small>Serials: {l.serial_numbers.join(', ')}</small>}</td><td className="number">{l.quantity}</td><td className="number">{currency(l.price)}</td><td className="number">{currency(l.discount)}</td><td className="number">{currency(l.tax)}<small>{l.gst_percent}%</small></td><td className="number">{currency(l.total)}</td></tr>)}</tbody></table></div>

 <div style={{maxWidth:370,marginLeft:'auto',marginTop:18}}><div className="total-row"><span>Subtotal</span><span>{currency(i.subtotal)}</span></div><div className="total-row"><span>Discount</span><span>{currency(i.discount)}</span></div><div className="total-row"><span>GST</span><span>{currency(i.gst_amount)}</span></div>{(['cgst','sgst','utgst','igst'] as const).filter(k=>Number(i[k])>0).map(k=><div className="total-row" key={k}><span>{k.toUpperCase()}</span><span>{currency(i[k])}</span></div>)}<div className="total-row grand"><span>Grand total</span><span>{currency(i.grand_total)}</span></div><div className="total-row"><span>Outstanding</span><strong>{currency(i.outstanding)}</strong></div></div>{Number(i.returned_total)>0&&<p className="notice">Returned goods: {currency(i.returned_total)}. Original invoice totals are preserved.</p>}{i.notes&&<p className="notice">{i.notes}</p>}

 </Panel>{can('ledger.payment')&&<PaymentLinks invoiceId={id} canCreate={i.status==='ACTIVE'&&Number(i.outstanding)>0}/>} {i.credit_note_number&&<a className="btn" href={'/api/invoices/'+id+'/credit-note/'} target="_blank" rel="noreferrer">Credit note {i.credit_note_number}</a>}{i.status==='VOID'?<div className="notice">Voided: {i.void_reason}. Stock restoration and ledger reversals are recorded.</div>:can('invoices.void')&&Number(i.returned_total)===0&&<button className="btn danger" onClick={()=>setVoiding(true)}>Void invoice</button>}

 {can('returns.create')&&<InvoiceReturns invoice={i}/>}
 {voiding&&<Modal title="Void this invoice" onClose={()=>setVoiding(false)}><div className="notice danger">This restores stock and reverses this invoice’s ledger entries. {Number(i.grand_total)-Number(i.outstanding)>0&&<>It also records a refund of <strong>{currency(Number(i.grand_total)-Number(i.outstanding))}</strong>. Return that amount to the customer separately; this app does not transfer money.</>}</div><form onSubmit={async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));const res=await action.run(()=>send<Invoice>('/invoices/'+id+'/void/',data),'Invoice voided');if(res)setVoiding(false);}}><Field label="Reason"><textarea name="reason" required minLength={3} maxLength={500}/></Field><Field label="Refund method"><select name="refund_method">{(shop.data?.payment_methods||['CASH','UPI','CARD']).filter(m=>m!=='CREDIT').map(m=><option key={m}>{m}</option>)}</select></Field><button className="btn danger wide" disabled={action.busy}>Confirm void and refund record</button></form></Modal>}</>}</>;

}
