'use client';
import type {Trend} from '@/types';
import {currency} from '@/lib/api';
export default function SalesChart({data}:{data:Trend[]}){
 const interval=Math.ceil(data.length/31)||1;
 const rows=Array.from({length:Math.ceil(data.length/interval)},(_,i)=>{
  const group=data.slice(i*interval,(i+1)*interval);
  return {date:group[0].date,end:group[group.length-1].date,sales:group.reduce((sum,d)=>sum+Number(d.sales),0),collections:group.reduce((sum,d)=>sum+Number(d.collections),0)};
 });
 const maximum=Math.max(...rows.flatMap(d=>[d.sales,Math.abs(d.collections)]),1);
 return <><div className="legend"><span>Sales</span><span>Collections (net refunds)</span></div>{interval>1&&<small>Each bar totals up to {interval} days, starting on the date shown.</small>}<div className="chart" role="img" aria-label="Sales and collections by date. Hover bars for values; report totals are shown above.">{rows.map(d=><div className="chart-day" key={d.date}><div className="bar" style={{height:(d.sales/maximum*100)+'%'}} title={d.date+' to '+d.end+' Sales '+currency(d.sales)}/><div className="bar collection" style={{height:(Math.abs(d.collections)/maximum*100)+'%',background:d.collections<0?'#bd3d45':undefined}} title={d.date+' to '+d.end+' Collections '+currency(d.collections)}/><small>{rows.length<=10?new Date(d.date+'T12:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'}):d.date.slice(8)}</small></div>)}</div></>;
}
