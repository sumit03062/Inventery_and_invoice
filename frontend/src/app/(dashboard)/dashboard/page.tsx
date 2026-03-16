'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { DailySalesStats } from '@/types';

interface StatCard {
  title: string;
  value: string;
  icon: JSX.Element;
  bgColor: string;
  textColor: string;
  borderColor?: string;
}

export default function DashboardPage(): JSX.Element {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DailySalesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      fetchStats();
    }
  }, [authLoading]);

  const fetchStats = async (): Promise<void> => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await api.get<DailySalesStats>(
        `/reports/daily-sales/?date=${today}`
      );
      setStats(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setError('Failed to load statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900">Loading Dashboard</h3>
          <p className="text-gray-600 mt-2">Fetching your business data...</p>
        </div>
      </div>
    );
  }

  const statCards: StatCard[] = [
    {
      title: 'Invoices Today',
      value: String(stats?.invoice_count || 0),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600',
    },
    {
      title: 'Subtotal',
      value: `₹${parseFloat(String(stats?.subtotal || 0)).toFixed(0)}`,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      bgColor: 'bg-green-100',
      textColor: 'text-green-600',
    },
    {
      title: 'GST Collected',
      value: `₹${parseFloat(String(stats?.gst_collected || 0)).toFixed(0)}`,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600',
    },
    {
      title: 'Total Sales',
      value: `₹${parseFloat(String(stats?.total_sales || 0)).toFixed(0)}`,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8L5.257 19.393A2 2 0 005 18.21V5a2 2 0 012-2h10a2 2 0 012 2z"
          />
        </svg>
      ),
      bgColor: 'bg-primary',
      textColor: 'text-primary',
    },
    {
      title: 'Average Invoice',
      value: `₹${parseFloat(String(stats?.avg_invoice || 0)).toFixed(0)}`,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-600',
    },
    {
      title: 'Highest Invoice',
      value: `₹${parseFloat(String(stats?.max_invoice || 0)).toFixed(0)}`,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      bgColor: 'bg-red-100',
      textColor: 'text-red-600',
    },
  ];

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      {/* Welcome Header */}
      <div className="mb-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
              Welcome back, <span className="text-primary">{user?.username}!</span>
            </h1>
            <p className="text-gray-600 mt-2 text-lg">
              Here's your business overview for {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v2H4a2 2 0 00-2 2v2h16V7a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v2H7V3a1 1 0 00-1-1zm0 5a2 2 0 002 2h8a2 2 0 002-2H6z" clipRule="evenodd" />
            </svg>
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <svg className="w-5 h-5 text-red-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-red-700 font-medium">{error}</p>
          <button onClick={fetchStats} className="ml-auto text-red-700 underline font-medium">
            Retry
          </button>
        </div>
      )}

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {statCards.map((card, index) => (
          <div
            key={index}
            className={`card ${
              card.bgColor === 'bg-primary'
                ? 'border-2 border-primary bg-gradient-to-br from-primary/5 to-transparent'
                : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">{card.title}</p>
                <p className={`text-4xl font-bold mt-2 ${card.textColor === 'text-primary' ? 'text-primary' : 'text-gray-900'}`}>
                  {card.value}
                </p>
              </div>
              <div className={`p-4 ${card.bgColor} ${card.textColor} rounded-lg`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions Section */}
      <div className="mt-16">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 flex items-center">
            <svg className="w-8 h-8 mr-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Quick Actions
          </h2>
          <p className="text-gray-600 mt-2">Common tasks to manage your business</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Create Invoice Card */}
          <Link
            href="/invoices"
            className="group card hover:shadow-xl hover:translate-y-[-8px] transition-all cursor-pointer"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 group-hover:bg-blue-200 rounded-lg transition">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 group-hover:text-primary transition">
                  Create Invoice
                </h3>
                <p className="text-sm text-gray-600">Generate new invoice</p>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          {/* Add Product Card */}
          <Link
            href="/products"
            className="group card hover:shadow-xl hover:translate-y-[-8px] transition-all cursor-pointer"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 group-hover:bg-green-200 rounded-lg transition">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 group-hover:text-primary transition">
                  Add Product
                </h3>
                <p className="text-sm text-gray-600">Add new product</p>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          {/* View Reports Card */}
          <Link
            href="/reports"
            className="group card hover:shadow-xl hover:translate-y-[-8px] transition-all cursor-pointer"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 group-hover:bg-purple-200 rounded-lg transition">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 group-hover:text-primary transition">
                  View Reports
                </h3>
                <p className="text-sm text-gray-600">Check sales reports</p>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>
      </div>

      {/* Bottom Section - Additional Info */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* System Status Card */}
        <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">System Status</h3>
              <p className="text-green-700 mt-2 font-medium flex items-center">
                <span className="inline-block w-2 h-2 bg-green-600 rounded-full mr-2" />
                All Systems Operational
              </p>
              <p className="text-gray-600 text-sm mt-1">API and database connections active</p>
            </div>
          </div>
        </div>

        {/* Recent Activity Card */}
        <div className="card bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
              <p className="text-blue-700 mt-2 font-medium">
                {stats?.invoice_count} invoices created today
              </p>
              <p className="text-gray-600 text-sm mt-1">
                Total sales: ₹{parseFloat(String(stats?.total_sales || 0)).toFixed(0)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}