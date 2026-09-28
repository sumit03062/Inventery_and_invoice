'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, send, setCsrf } from '@/lib/api';
import type { User } from '@/types';
interface Session { user: User|null; csrf: string; needs_setup?: boolean }
interface Auth { user: User|null; loading: boolean; needsSetup: boolean; error: string; login: (username:string,password:string)=>Promise<void>; setup: (data:unknown)=>Promise<void>; logout: ()=>Promise<void>; can:(permission:string)=>boolean }
const Context = createContext<Auth|null>(null);
export function AuthProvider({children}:{children:React.ReactNode}) {
 const [user,setUser]=useState<User|null>(null);
 const [loading,setLoading]=useState(true);
 const [needsSetup,setNeedsSetup]=useState(false);
 const [error,setError]=useState('');
 const client=useQueryClient();
 const accept=useCallback(async (s:Session) => {
   await client.cancelQueries(); client.clear(); setCsrf(s.csrf); setUser(s.user); setNeedsSetup(!!s.needs_setup); setError('');
 },[client]);
 useEffect(() => {
   let active=true;
   api<Session>('/session/').then(s=>{if(active){setCsrf(s.csrf);setUser(s.user);setNeedsSetup(!!s.needs_setup);}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
   const expire=()=>{client.cancelQueries();client.clear();setUser(null);};
   window.addEventListener('session-expired',expire);
   return ()=>{active=false;window.removeEventListener('session-expired',expire);};
 },[client]);
 const login=async(username:string,password:string)=>{await accept(await send<Session>('/login/',{username,password}));};
 const setup=async(data:unknown)=>{await accept(await send<Session>('/setup/',data));};
 const logout=async()=>{await send('/logout/',{});await accept({user:null,csrf:''});const s=await api<Session>('/session/');setCsrf(s.csrf);};
 return <Context.Provider value={{user,loading,needsSetup,error,login,setup,logout,can:p=>!!user?.permissions.includes(p)}}>{children}</Context.Provider>;
}
export function useAuth(){const value=useContext(Context);if(!value)throw new Error('AuthProvider required');return value;}
