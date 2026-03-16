import type { Metadata } from 'next';
import { AuthProvider } from '@/hooks/useAuth';
import '@/styles/globals.css';

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
}): JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#667eea" />
      </head>
      <body className="bg-gray-50">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}