'use client';
import {useState} from 'react';
import {Field} from '@/components/ui';
import type {Product} from '@/types';

export const unitLabel = (unit:string) => ({PCS:'pieces',KG:'kg',LTR:'litres'}[unit] || unit);
export const quantityStep = (unit:string) => ['KG','LTR'].includes(unit) ? 0.001 : 1;

export function StockQuantity({unit,piecesPerBox,opening=false,current=0}:{unit:string;piecesPerBox:number;opening?:boolean;current?:number}) {
 const [mode,setMode]=useState('DIRECT');
 const [boxes,setBoxes]=useState('0');
 const boxMode=unit==='PCS'&&mode==='BOX';
 const total=Number(boxes)*piecesPerBox;
 return <>
  {unit==='PCS'&&<Field label={opening?'Opening stock entry':'Stock entry'}><select value={mode} onChange={e=>setMode(e.target.value)}><option value="DIRECT">Pieces</option><option value="BOX">Boxes</option></select></Field>}
  <input type="hidden" name="stock_mode" value={boxMode?'BOX':'DIRECT'}/>
  {boxMode?<><Field label="Number of boxes" hint={opening?'Whole boxes only.':'Positive to add; negative to remove.'}><input name="boxes" type="number" min={opening?0:-Math.floor(current/piecesPerBox)} max={Math.floor(1000000/piecesPerBox)} step={1} value={boxes} onChange={e=>setBoxes(e.target.value)} required/></Field><div className="notice" role="status">{boxes||0} boxes × {piecesPerBox} pieces = <strong>{Number.isFinite(total)?total:0} pieces</strong></div></>:<Field label={(opening?'Opening stock':'Stock change')+' ('+unitLabel(unit)+')'} hint={opening?undefined:'Positive to add; negative to remove.'}><input name={opening?'opening_stock':'quantity'} type="number" min={opening?0:-current} max={1000000} step={quantityStep(unit)} defaultValue={opening?0:undefined} required/></Field>}
 </>;
}

export function ProductStockFields({product}:{product:Product|null}) {
 const [unit,setUnit]=useState(product?.unit||'PCS');
 const [tracking,setTracking]=useState(product?.tracking||'NONE');
 const [pieces,setPieces]=useState(String(product?.pieces_per_box||1));
 return <>
  <Field label="Stock unit" hint="Purchase and selling prices are per piece, kg or litre. A unit with stock history cannot be changed."><select name="unit" value={unit} onChange={e=>setUnit(e.target.value)}><option value="PCS">Pieces</option><option value="KG">Kilograms (kg)</option><option value="LTR">Litres (L)</option>{!['PCS','KG','LTR'].includes(unit)&&<option value={unit}>{unit}</option>}</select></Field>
  {unit==='PCS'&&<Field label="Pieces per box" hint="Used to convert box entries into total pieces."><input name="pieces_per_box" type="number" min={1} max={1000000} step={1} value={pieces} onChange={e=>setPieces(e.target.value)} required/></Field>}
  <Field label="Stock tracking" hint="Choose before receiving stock. Batch stock sells earliest expiry first; serial stock requires serial numbers at billing."><select name="tracking" value={tracking} onChange={e=>setTracking(e.target.value as 'NONE'|'BATCH'|'SERIAL')}><option value="NONE">Normal stock</option><option value="BATCH">Batch numbers & expiry</option><option value="SERIAL">Serial numbers & warranty</option></select></Field>
  {tracking==='SERIAL'&&<Field label="Warranty period (days)"><input name="warranty_days" type="number" min={0} max={36500} step={1} defaultValue={product?.warranty_days||0}/></Field>}
  <Field label="Variant group (optional)"><input name="variant_group" defaultValue={product?.variant_group} maxLength={100} placeholder="For example, Cotton T-shirt"/></Field>
  <Field label="Size (optional)"><input name="size" defaultValue={product?.size} maxLength={50}/></Field>
  <Field label="Colour (optional)"><input name="colour" defaultValue={product?.colour} maxLength={50}/></Field>
  {!product&&tracking!=='NONE'&&<p className="notice">Create this product with zero stock. Receive stock with batch or serial details under Shop operations, or enter a purchase bill.</p>}
  {!product&&tracking==='NONE'&&<StockQuantity key={unit} unit={unit} piecesPerBox={Number(pieces)||0} opening/>}
  <Field label={'Low-stock threshold ('+unitLabel(unit)+')'}><input name="low_stock_threshold" type="number" min={0} max={1000000} step={quantityStep(unit)} defaultValue={product?.low_stock_threshold??5} required/></Field>
 </>;
}
