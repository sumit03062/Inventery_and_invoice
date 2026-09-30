'use client';

import {useData,useAction,Heading,Panel,Field,Status} from '@/components/ui';

import {useAuth} from '@/hooks/useAuth';

import {send,api} from '@/lib/api';

import StateSelect from '@/components/StateSelect';

import IntegrationSettings from '@/components/IntegrationSettings';

import type {Shop} from '@/types';

export default function Settings(){

 const {can}=useAuth();const q=useData<Shop>('/shop/',can('settings.manage'));

 return <><Heading title="Shop settings" description="Your business profile, invoice numbering and payment preferences."/><Status loading={q.isLoading} error={q.error} retry={q.refetch}/>{q.data&&<SettingsForm shop={q.data}/>}</>;

}

function SettingsForm({shop}:{shop:Shop}){

 const action=useAction();

 return <><form onSubmit={async e=>{e.preventDefault();const form=new FormData(e.currentTarget);const data={...Object.fromEntries(form),payment_methods:form.getAll('payment_methods'),tax_enabled:form.get('tax_enabled')==='on'};await action.run(()=>send('/shop/',data,'PATCH'),'Shop settings updated');}}>

 <Panel title="Shop & owner"><div className="form-grid"><Field label="Shop name"><input name="name" defaultValue={shop.name} required maxLength={150}/></Field><Field label="Owner name"><input name="owner_name" defaultValue={shop.owner_name} required maxLength={150}/></Field><Field label="Phone"><input name="phone" type="tel" defaultValue={shop.phone} maxLength={20}/></Field><Field label="Email"><input name="email" type="email" defaultValue={shop.email}/></Field><Field label="Shop state"><StateSelect name="state_code" defaultValue={shop.state_code}/></Field><Field label="Tax calculation"><select name="gst_mode" defaultValue={shop.gst_mode}><option value="BASIC">Basic tax (existing calculation)</option><option value="DOMESTIC">Domestic GST · CGST / SGST / UTGST / IGST</option></select></Field><Field label="GSTIN"><input name="gstin" defaultValue={shop.gstin} maxLength={15}/></Field><Field label="Business hours"><input name="business_hours" defaultValue={shop.business_hours} maxLength={500}/></Field><div className="full"><Field label="Address"><textarea name="address" defaultValue={shop.address} rows={3}/></Field></div></div></Panel>

 <Panel title="Invoice settings"><div className="form-grid"><Field label="Invoice prefix"><input name="invoice_prefix" defaultValue={shop.invoice_prefix} pattern="[A-Za-z0-9-]+" maxLength={20} required/></Field><Field label="Next invoice number" hint="Numbers can move forward only. Never reuse an invoice number."><input name="next_invoice_number" type="number" defaultValue={shop.next_invoice_number} min={shop.next_invoice_number} step={1} required/></Field><Field label="Default credit period (days)"><input name="credit_days" type="number" min={0} max={365} step={1} defaultValue={shop.credit_days} required/></Field><Field label="Invoice footer"><input name="invoice_footer" defaultValue={shop.invoice_footer} maxLength={500}/></Field></div><label className="check"><input name="tax_enabled" type="checkbox" defaultChecked={shop.tax_enabled}/>Calculate GST using each product’s tax rate</label><p className="muted">Each product can use inclusive or exclusive prices. Discounts apply to the taxable value before GST. Domestic GST requires GSTIN, state, address and product HSN codes; it covers ordinary domestic retail goods. Saved invoice amounts and business details remain unchanged when settings change.</p></Panel>

 <Panel title="Enabled payment methods"><div className="actions">{['CASH','UPI','CARD','CREDIT'].map(method=><label className="check" key={method} style={{marginRight:22}}><input type="checkbox" name="payment_methods" value={method} defaultChecked={shop.payment_methods.includes(method)}/>{method==='CREDIT'?'Credit / Udhar':method}</label>)}</div></Panel><button className="btn primary" disabled={action.busy}>Save settings</button></form>

 <IntegrationSettings/><Panel title="Shop logo"><p className="muted" style={{marginBottom:15}}>PNG, JPEG or WebP, up to 2 MB. Used on printed invoices.</p>{shop.logo&&<img src="/api/shop/logo/image/" alt="Shop logo" style={{maxWidth:160,maxHeight:90,objectFit:'contain',marginBottom:16}}/>}<form className="toolbar" onSubmit={async e=>{e.preventDefault();const form=new FormData(e.currentTarget);await action.run(()=>api('/shop/logo/',{method:'POST',body:form}),'Logo uploaded');}}><input type="file" name="logo" accept="image/png,image/jpeg,image/webp" required aria-label="Upload shop logo"/><button className="btn" disabled={action.busy}>Upload logo</button></form></Panel></>;

}
