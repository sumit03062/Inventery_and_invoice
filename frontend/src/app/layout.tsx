import type {Metadata} from 'next';
import {AuthProvider} from '@/hooks/useAuth';
import QueryProvider from '@/providers/QueryProvider';
import {Toaster} from 'react-hot-toast';
import '@/styles/globals.css';
export const metadata:Metadata={title:'Shopbook · Shop management',description:'Inventory, billing and customer ledgers for your shop.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><QueryProvider><AuthProvider>{children}<Toaster position="top-right"/></AuthProvider></QueryProvider></body></html>;}
