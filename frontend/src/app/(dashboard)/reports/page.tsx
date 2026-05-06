'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { DailySalesStats } from '@/types';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface TrendData {
  label: string;
  total: number;
  count: number;
}

export default function ReportsPage(): React.ReactNode {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [period, setPeriod] = useState<'daily' | 'monthly'>('daily');
  const [statsPeriod, setStatsPeriod] = useState<'daily' | 'monthly' | 'yearly'>('daily');

  // 1. Data Fetching with useQuery
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['reports', 'stats', selectedDate, statsPeriod],
    queryFn: async () => {
      const res = await api.get<DailySalesStats>(`/reports/daily-sales/?date=${selectedDate}&period=${statsPeriod}`);
      return res.data;
    },
  });

  const { data: trends = [], isLoading: loadingTrends } = useQuery({
    queryKey: ['reports', 'trends', period],
    queryFn: async () => {
      const res = await api.get<{ results: TrendData[] }>(`/reports/sales-trend/?period=${period}`);
      return res.data.results || [];
    },
  });

  const handleExportCSV = async () => {
    const toastId = toast.loading('Generating CSV...');
    try {
      const response = await api.get('/reports/export-csv/', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sales_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success('Export complete!', { id: toastId });
    } catch (err) {
      toast.error('Export failed', { id: toastId });
    }
  };

  if (loadingStats && !stats) return <div className="flex items-center justify-center min-h-screen"><div className="spinner"></div></div>;

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-2">Data-driven insights for your shop</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button onClick={handleExportCSV} className="btn-secondary flex items-center gap-2">
            📥 Export CSV
          </button>
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-300">
            <select value={statsPeriod} onChange={(e) => setStatsPeriod(e.target.value as any)} className="border-0 focus:ring-0 text-sm font-semibold bg-transparent">
              <option value="daily">Day</option>
              <option value="monthly">Month</option>
              <option value="yearly">Year</option>
            </select>
            <div className="w-[1px] h-4 bg-gray-300 mx-1"></div>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="border-0 focus:ring-0 text-sm" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Invoices" value={stats?.invoice_count || 0} icon="📄" color="blue" />
        <StatCard title="Revenue" value={`₹${stats?.total_sales || 0}`} icon="💰" color="green" />
        <StatCard title="GST" value={`₹${stats?.gst_collected || 0}`} icon="🏛️" color="purple" />
        <StatCard title="Average" value={`₹${stats?.avg_invoice || 0}`} icon="📊" color="orange" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Sales Performance</h2>
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
              {['daily', 'monthly'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p as any)}
                  className={`px-4 py-1 rounded-md text-xs font-bold transition-all ${period === p ? 'bg-white shadow text-primary' : 'text-gray-500'}`}
                >
                  {p === 'daily' ? '30 Days' : '12 Months'}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.1)'}} />
                <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={3} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-bold mb-6">Transaction Volume</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none'}} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Data Summary</h2>
          <span className="text-xs font-bold uppercase bg-primary/10 text-primary px-3 py-1 rounded-full">{statsPeriod} Aggregation</span>
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-left">
            <tbody className="divide-y divide-gray-100">
              <TableRow label="Gross Sales" value={`₹${stats?.subtotal || 0}`} />
              <TableRow label="Total Tax (GST)" value={`₹${stats?.gst_collected || 0}`} />
              <TableRow label="Net Revenue" value={`₹${stats?.total_sales || 0}`} isBold />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: string | number; icon: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };
  return (
    <div className="card p-6 flex items-center gap-4">
      <div className={`p-4 rounded-2xl text-2xl ${colorMap[color]}`}>{icon}</div>
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-black text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function TableRow({ label, value, isBold }: { label: string; value: string | number; isBold?: boolean }) {
  return (
    <tr className={isBold ? 'bg-primary/5' : ''}>
      <td className={`px-6 py-4 text-sm ${isBold ? 'font-bold text-primary' : 'text-gray-600'}`}>{label}</td>
      <td className={`px-6 py-4 text-sm text-right ${isBold ? 'font-bold text-primary text-lg' : 'font-semibold text-gray-900'}`}>{value}</td>
    </tr>
  );
}