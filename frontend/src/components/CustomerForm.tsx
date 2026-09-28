'use client';
import {useAction,Field,Modal} from '@/components/ui';
import {useAuth} from '@/hooks/useAuth';
import {send,localDate} from '@/lib/api';
import type {Customer} from '@/types';
export default function CustomerForm({customer,onClose}:{customer?:Customer|null;onClose:()=>void}){
 const action=useAction();const {can}=useAuth();
 return <Modal title={customer?'Edit customer':'Add customer'} onClose={onClose}><form onSubmit={async e=>{e.preventDefault();const fields=Object.fromEntries(new FormData(e.currentTarget));const data={...fields,opening_due_date:fields.opening_due_date||null};const result=await action.run(()=>send<Customer>(customer?'/customers/'+customer.id+'/':'/customers/',data,customer?'PATCH':'POST'));if(result)onClose();}}><div className="form-grid">
 <Field label="Customer name"><input name="name" defaultValue={customer?.name} required maxLength={150}/></Field><Field label="Mobile number"><input name="phone" type="tel" defaultValue={customer?.phone} required maxLength={20}/></Field><Field label="Email"><input name="email" type="email" defaultValue={customer?.email}/></Field><Field label="GSTIN (optional)"><input name="gstin" defaultValue={customer?.gstin} maxLength={15}/></Field><div className="full"><Field label="Address"><textarea name="address" rows={2} defaultValue={customer?.address}/></Field></div>
 {!customer&&can('ledger.adjust')&&<Field label="Opening balance (₹)" hint="This creates an opening debit in the ledger."><input name="opening_balance" type="number" min={0} step=".01" defaultValue={0}/></Field>}<Field label="Opening balance due date"><input name="opening_due_date" type="date" defaultValue={customer?.opening_due_date||localDate()}/></Field></div><button className="btn primary wide" disabled={action.busy}>Save customer</button></form></Modal>;
}
