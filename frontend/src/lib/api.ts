let csrf = '';
export function setCsrf(value: string) { csrf = value; }
export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
function errorText(data: unknown): string {
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return data.map(errorText).join(' ');
  if (data && typeof data === 'object') return Object.entries(data).map(([key,value]) => (key === 'detail' ? '' : key + ': ') + errorText(value)).join(' ');
  return 'Request failed. Please try again.';
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type','application/json');
  if (options.method && options.method !== 'GET') headers.set('X-CSRFToken', csrf);
  const response = await fetch('/api' + path, {...options, headers, credentials: 'same-origin', cache: 'no-store'});
  if (!response.ok) {
    const data = await response.json().catch(() => ({detail: 'Server unavailable. Please try again.'}));
    if (response.status === 403 && String(data.detail).includes('Authentication credentials')) window.dispatchEvent(new Event('session-expired'));
    throw new ApiError(errorText(data), response.status);
  }
  return response.status === 204 ? undefined as T : response.json();
}
export function send<T>(path: string, data: unknown, method = 'POST') { return api<T>(path, { method, body: JSON.stringify(data) }); }
export const currency = (value: string|number|undefined) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(Number(value || 0));
export const localDate = (date = new Date()) => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export const dateTime = (value: string) => new Date(value).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
export async function download(path: string, filename: string, share = false) {
  const response = await fetch('/api' + path, {credentials:'same-origin'});
  if (!response.ok) throw new Error('Unable to download this document.');
  const blob = await response.blob();
  const file = new File([blob], filename, {type:blob.type});
  if (share && navigator.canShare?.({files:[file]})) { await navigator.share({files:[file],title:filename}); return; }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href=url; link.download=filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
