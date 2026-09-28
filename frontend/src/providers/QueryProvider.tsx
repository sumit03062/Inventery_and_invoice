'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
export default function QueryProvider({children}:{children:React.ReactNode}) {
 const [client]=useState(()=>new QueryClient({defaultOptions:{queries:{staleTime:15000,retry:1,refetchOnWindowFocus:true},mutations:{retry:false}}}));
 return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
