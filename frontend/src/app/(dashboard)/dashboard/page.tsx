'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { DailySalesStats } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { 
  FileText, 
  IndianRupee, 
  Building2, 
  TrendingUp, 
  BarChart3, 
  Trophy, 
  Plus, 
  Package, 
  BarChart2, 
  Clock, 
  ArrowRight 
} from 'lucide-react';

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
    { title: 'Invoices', value: stats?.invoice_count || 0, icon: <FileText size={24} className="text-blue-500" />, color: 'blue' },
    { title: 'Subtotal', value: `₹${stats?.subtotal || 0}`, icon: <IndianRupee size={24} className="text-green-500" />, color: 'green' },
    { title: 'GST', value: `₹${stats?.gst_collected || 0}`, icon: <Building2 size={24} className="text-purple-500" />, color: 'purple' },
    { title: 'Total Sales', value: `₹${stats?.total_sales || 0}`, icon: <TrendingUp size={24} className="text-primary" />, color: 'primary' },
    { title: 'Average', value: `₹${stats?.avg_invoice?.toFixed(2) || 0}`, icon: <BarChart3 size={24} className="text-orange-500" />, color: 'orange' },
    { title: 'Highest', value: `₹${stats?.max_invoice?.toFixed(2) || 0}`, icon: <Trophy size={24} className="text-red-500" />, color: 'red' },
  ];

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tight">
            Hello, <span className="text-primary">{user?.username}!</span>
          </h1>
          <p className="text-gray-500 mt-2 text-lg">Your business metrics for today.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full border border-green-100 self-start">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-xs font-bold uppercase tracking-wider">System Online</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {statCards.map((card, i) => (
          <div key={i} className={`card p-6 border-b-4 ${card.color === 'primary' ? 'border-primary' : 'border-gray-200'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-gray-50 rounded-xl">
                {card.icon}
              </div>
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{card.title}</p>
            <p className={`text-3xl font-black mt-1 ${card.color === 'primary' ? 'text-primary' : 'text-gray-900'}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <QuickAction title="New Invoice" icon={<Plus size={28} />} href="/invoices" desc="Generate sales bill" />
        <QuickAction title="Add Product" icon={<Package size={28} />} href="/products" desc="Update inventory" />
        <QuickAction title="View Reports" icon={<BarChart2 size={28} />} href="/reports" desc="Deep-dive analytics" />
      </div>

      <div className="card p-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Clock className="text-primary" /> Recent Activity
        </h2>
        <div className="space-y-4">
          <p className="text-gray-500 italic text-sm">Dashboard displays real-time metrics. Visit the Invoices or Products pages to see latest transactions and stock updates.</p>
          <div className="flex gap-4">
            <Link href="/invoices" className="text-primary font-bold hover:underline flex items-center gap-1">View All Invoices <ArrowRight size={16} /></Link>
            <Link href="/products" className="text-primary font-bold hover:underline flex items-center gap-1">View All Products <ArrowRight size={16} /></Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ title, icon, href, desc }: { title: string; icon: React.ReactNode; href: string; desc: string }) {
  return (
    <Link href={href} className="card p-6 hover:shadow-2xl transition-all group border-transparent hover:border-primary/20">
      <div className="flex items-center gap-4">
        <div className="bg-gray-50 p-4 rounded-2xl group-hover:bg-primary/10 group-hover:scale-110 transition-all text-gray-700 group-hover:text-primary">{icon}</div>
        <div>
          <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors">{title}</h3>
          <p className="text-sm text-gray-500">{desc}</p>
        </div>
      </div>
    </Link>
  );
}