import type { Metadata } from 'next';
import { AuthProvider } from '@/hooks/useAuth';
import { Inter } from "next/font/google";
import '@/styles/globals.css';
import QueryProvider from "@/providers/QueryProvider";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Invoice Manager',
  description: 'Professional Invoice Management System - Create, manage, and track invoices effortlessly',
  keywords: ['invoice', 'management', 'billing', 'sales', 'accounting'],
  authors: [{ name: 'Invoice Manager Team' }],
  creator: 'Invoice Manager',
  publisher: 'Invoice Manager',
  formatDetection: {
    email: false,
    telephone: false,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#667eea" />
      </head>
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#333',
                  color: '#fff',
                  borderRadius: '10px',
                },
              }}
            />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}