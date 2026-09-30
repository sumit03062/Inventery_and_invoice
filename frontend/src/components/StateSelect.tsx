import {states} from '@/lib/states';
export default function StateSelect(props:React.SelectHTMLAttributes<HTMLSelectElement>){
 return <select {...props}><option value="">Select state / territory</option>{Object.entries(states).sort(([a],[b])=>a.localeCompare(b)).map(([code,name])=><option key={code} value={code}>{code} · {name}</option>)}</select>;
}
