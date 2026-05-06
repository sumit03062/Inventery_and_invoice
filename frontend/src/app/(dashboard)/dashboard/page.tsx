'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { DailySalesStats } from '@/types';
import { useQuery } from '@tanstack/react-query';

export default function DashboardPage(): React.ReactNode {
  const { user, loading: authLoading } = useAuth();
  
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const res = await api.get<DailySalesStats>(`/reports/daily-sales/?date=${today}`);
      return res.data;
    },
    enabled: !authLoading && !!user,
  });

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  const statCards = [
    { title: 'Invoices', value: stats?.invoice_count || 0, icon: '📄', color: 'blue' },
    { title: 'Subtotal', value: `₹${stats?.subtotal || 0}`, icon: '💰', color: 'green' },
    { title: 'GST', value: `₹${stats?.gst_collected || 0}`, icon: '🏛️', color: 'purple' },
    { title: 'Total Sales', value: `₹${stats?.total_sales || 0}`, icon: '🚀', color: 'primary' },
  ];

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-12">
        <h1 className="text-5xl font-black text-gray-900 tracking-tight">
          Hello, <span className="text-primary">{user?.username}!</span>
        </h1>
        <p className="text-gray-500 mt-2 text-lg">Your business metrics for today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {statCards.map((card, i) => (
          <div key={i} className={`card p-6 border-b-4 ${card.color === 'primary' ? 'border-primary' : 'border-gray-200'}`}>
            <div className="flex justify-between items-start mb-4">
              <span className="text-3xl">{card.icon}</span>
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{card.title}</p>
            <p className={`text-3xl font-black mt-1 ${card.color === 'primary' ? 'text-primary' : 'text-gray-900'}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickAction title="New Invoice" icon="➕" href="/invoices" desc="Generate sales bill" />
        <QuickAction title="Add Product" icon="📦" href="/products" desc="Update inventory" />
        <QuickAction title="View Reports" icon="📈" href="/reports" desc="Deep-dive analytics" />
      </div>
    </div>
  );
}

function QuickAction({ title, icon, href, desc }: { title: string; icon: string; href: string; desc: string }) {
  return (
    <Link href={href} className="card p-6 hover:shadow-2xl transition-all group border-transparent hover:border-primary/20">
      <div className="flex items-center gap-4">
        <div className="text-3xl bg-gray-50 p-4 rounded-2xl group-hover:bg-primary/10 group-hover:scale-110 transition-all">{icon}</div>
        <div>
          <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors">{title}</h3>
          <p className="text-sm text-gray-500">{desc}</p>
        </div>
      </div>
    </Link>
  );
}