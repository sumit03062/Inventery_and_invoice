'use client';
import {quantityStep,unitLabel} from '@/components/StockQuantity';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {Barcode,Plus,Trash2} from 'lucide-react';
import {useData,useAction,Heading,Panel,Field,Status,Empty} from '@/components/ui';
import {useAuth} from '@/hooks/useAuth';
import {send,currency,localDate} from '@/lib/api';
import type {Product,Customer,Shop,Invoice} from '@/types';
import StateSelect from '@/components/StateSelect';
import toast from 'react-hot-toast';
interface CartLine{product:Product;quantity:number}
export default function Billing(){
 const {can}=useAuth();const products=useData<Product[]>('/products/');const customers=useData<Customer[]>('/customers/');const shop=useData<Shop>('/shop/');
 const [place,setPlace]=useState('');
 const [search,setSearch]=useState('');const [cart,setCart]=useState<CartLine[]>([]);const [customer,setCustomer]=useState('');const [method,setMethod]=useState('CASH');const [paid,setPaid]=useState('');const [discount,setDiscount]=useState('0');const [notes,setNotes]=useState('');const [due,setDue]=useState('');
 const key=useRef(crypto.randomUUID());const action=useAction();const router=useRouter();
 useEffect(()=>{const methods=shop.data?.payment_methods;if(methods?.length&&!methods.includes(method)){setMethod(methods[0]);setPaid('');}},[shop.data?.payment_methods,method]);
 const add=(p:Product)=>{setCart(prev=>{const existing=prev.find(x=>x.product.id===p.id);if((existing?.quantity||0)>=p.stock_quantity){toast.error('No more stock available for '+p.name);return prev;}return existing?prev.map(x=>x.product.id===p.id?{...x,quantity:Math.min(p.stock_quantity,Math.round((x.quantity+1)*1000)/1000)}:x):[...prev,{product:p,quantity:Math.min(1,p.stock_quantity)}].sort((a,b)=>a.product.id-b.product.id);});setSearch('');};
 const destination=place||customers.data?.find(c=>String(c.id)===customer)?.state_code||shop.data?.state_code||'';
 const cents=(n:number)=>Math.round((n+Number.EPSILON)*100);
 const bases=cart.map(l=>cents(Number(l.product.price)*l.quantity/(l.product.price_includes_tax?1+(shop.data?.tax_enabled?Number(l.product.gst_percent):0)/100:1)));
 const subtotalCents=bases.reduce((sum,value)=>sum+value,0);
 const discountCents=Math.min(Math.max(cents(Number(discount)||0),0),subtotalCents);
 const raw=bases.map(base=>subtotalCents?discountCents*base/subtotalCents:0);
 const allocated=raw.map(Math.floor);let remainder=discountCents-allocated.reduce((a,b)=>a+b,0);
 [...raw.keys()].sort((a,b)=>(raw[b]-allocated[b])-(raw[a]-allocated[a])).forEach(i=>{if(remainder>0){allocated[i]++;remainder--;}});
 const taxCents=cart.reduce((sum,l,i)=>{const base=bases[i]-allocated[i];const rate=shop.data?.tax_enabled?Number(l.product.gst_percent):0;
 return sum+(shop.data?.gst_mode==='DOMESTIC'&&shop.data.state_code===destination?2*Math.round(base*rate/200+1e-8):Math.round(base*rate/100+1e-8));},0);
 const total=(subtotalCents-discountCents+taxCents)/100;const collection=method==='CREDIT'?0:paid===''?total:Number(paid);const outstanding=Math.max(0,total-collection);
 const choices=(products.data||[]).filter(p=>(p.name+' '+p.sku+' '+(p.barcode||'')).toLowerCase().includes(search.toLowerCase())).slice(0,15);
 return <><Heading title="New invoice" description="Scan a barcode, add products and complete the sale."/>
 <Status loading={products.isLoading||customers.isLoading||shop.isLoading} error={products.error||customers.error||shop.error} retry={()=>{products.refetch();customers.refetch();shop.refetch();}}/>
 {products.data&&customers.data&&shop.data&&<form onSubmit={async e=>{e.preventDefault();if(!cart.length){toast.error('Add at least one product.');return;}if(outstanding>0&&!customer){toast.error('Select a customer for Udhar.');return;}const invoice=await action.run(()=>send<Invoice>('/invoices/',{request_key:key.current,items:cart.map(l=>({product_id:l.product.id,quantity:l.quantity})),customer_id:customer||null,place_of_supply:destination,payment_method:method,paid_amount:collection.toFixed(2),discount:Number(discount).toFixed(2),notes,due_date:due||undefined}),'Invoice saved; stock and ledger updated');if(invoice)router.push('/invoices/'+invoice.id);}}>
 <div className="split"><div><Panel title="Products"><div className="toolbar"><Barcode size={20}/><input aria-label="Search or scan barcode" autoFocus placeholder="Search name, SKU or scan barcode + Enter" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();const p=products.data.find(p=>p.barcode===search.trim()||p.sku===search.trim());if(p)add(p);else toast.error('No exact barcode or SKU match. Select a product below.');}}}/></div>
 <div className="table-wrap"><table><thead><tr><th>Product</th><th className="number">Price</th><th className="number">Stock</th><th/></tr></thead><tbody>{choices.map(p=><tr key={p.id}><td>{p.name}<small>{p.sku} · GST {p.gst_percent}%</small></td><td className="number">{currency(p.price)} / {unitLabel(p.unit)}</td><td className="number">{p.stock_quantity} {unitLabel(p.unit)}</td><td><button type="button" aria-label={'Add '+p.name} className="btn small" disabled={p.stock_quantity<=0} onClick={()=>add(p)}><Plus size={16}/>Add</button></td></tr>)}</tbody></table></div>{!choices.length&&<Empty text="No matching products. Add inventory from Products."/>}</Panel>
 <Panel title="Invoice items">{!cart.length?<Empty text="Add products above or use your barcode scanner."/>:<div className="table-wrap"><table className="bill-cart"><thead><tr><th>Item</th><th>Quantity</th><th className="number">At product rate</th><th/></tr></thead><tbody>{cart.map(line=><tr key={line.product.id}><td>{line.product.name}<small>{currency(line.product.price)} / {unitLabel(line.product.unit)}{line.product.price_includes_tax?' (incl. GST)':' (excl. GST)'}</small></td><td><input type="number" aria-label={'Quantity for '+line.product.name} min={quantityStep(line.product.unit)} max={line.product.stock_quantity} step={quantityStep(line.product.unit)} required value={line.quantity} onChange={e=>setCart(prev=>prev.map(l=>l.product.id===line.product.id?{...l,quantity:Number(e.target.value)}:l))}/></td><td className="number">{currency(Number(line.product.price)*line.quantity)}</td><td><button type="button" aria-label={'Remove '+line.product.name} className="icon-btn" onClick={()=>setCart(prev=>prev.filter(l=>l.product.id!==line.product.id))}><Trash2 size={16}/></button></td></tr>)}</tbody></table></div>}</Panel></div>
 <Panel title="Complete sale"><Field label="Customer"><select value={customer} onChange={e=>{setCustomer(e.target.value);setPlace('');}} required={outstanding>0}><option value="">Walk-in customer</option>{customers.data.map(c=><option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}</select></Field>
 <Field label="Place of supply" hint="Select where the goods are delivered. Defaults to the customer state, then shop state."><StateSelect value={destination} required={shop.data.gst_mode==='DOMESTIC'} onChange={e=>setPlace(e.target.value)}/></Field><Field label="Payment method"><select value={method} onChange={e=>{setMethod(e.target.value);setPaid('');}}>{shop.data.payment_methods.map(m=><option key={m} value={m}>{m==='CREDIT'?'Credit / Udhar':m}</option>)}</select></Field>
 {can('billing.discount')&&<Field label="Discount (₹, before tax)"><input type="number" min={0} max={subtotalCents/100} step=".01" value={discount} onChange={e=>setDiscount(e.target.value)}/></Field>}
 {method!=='CREDIT'&&<Field label="Amount received (₹)" hint="Leave blank for full payment. Enter a smaller amount for partial payment."><input type="number" min={0} max={total} step=".01" placeholder={total.toFixed(2)} value={paid} onChange={e=>setPaid(e.target.value)}/></Field>}
 {outstanding>0&&<Field label="Due date" hint={'Default: '+shop.data.credit_days+' days from today.'}><input type="date" min={localDate()} value={due} onChange={e=>setDue(e.target.value)}/></Field>}
 <div className="total-row"><span>Subtotal</span><strong>{currency(subtotalCents/100)}</strong></div><div className="total-row"><span>Discount</span><span>âˆ’{currency(discountCents/100)}</span></div><div className="total-row"><span>GST</span><span>{currency(taxCents/100)}</span></div><div className="total-row grand"><span>Grand total</span><span>{currency(total)}</span></div><div className="total-row"><span>Udhar to ledger</span><strong>{currency(outstanding)}</strong></div>
 <Field label="Invoice note"><textarea maxLength={1000} rows={2} value={notes} onChange={e=>setNotes(e.target.value)}/></Field><button className="btn primary wide" disabled={action.busy||!cart.length||!can('billing.create')}>{action.busy?'Saving invoice…':'Create invoice'}</button><small>Prices and stock are checked again when you save.</small></Panel></div></form>}</>;
}
