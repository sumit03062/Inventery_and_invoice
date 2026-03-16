'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DailySalesStats } from '@/types';

export default function ReportsPage(): JSX.Element {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [stats, setStats] = useState<DailySalesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDailyStats();
  }, [selectedDate]);

  const fetchDailyStats = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<DailySalesStats>(
        `/reports/daily-sales/?date=${selectedDate}`
      );
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setError('Failed to load report data');
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900">Loading Report</h3>
        </div>
      </div>
    );
  }

  const dateObj = new Date(selectedDate);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Sales Reports</h1>
          <p className="text-gray-600 mt-2">Daily sales analytics and insights</p>
        </div>

        <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-300">
          <label htmlFor="date" className="text-gray-700 font-medium whitespace-nowrap">
            📅 Select Date:
          </label>
          <input
            id="date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input-field max-w-max p-2 border-0 focus:ring-0"
          />
        </div>
      </div>

      {/* Date Display */}
      <div className="mb-8 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
        <p className="text-lg text-gray-700">
          📊 Showing data for{' '}
          <span className="font-bold text-primary">{formattedDate}</span>
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <svg className="w-5 h-5 text-red-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-red-700 font-medium flex-1">{error}</p>
          <button onClick={fetchDailyStats} className="text-red-700 underline font-medium">
            Retry
          </button>
        </div>
      )}

      {/* Statistics Grid */}
      {stats ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {/* Total Invoices Card */}
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Invoices</p>
                  <p className="text-4xl font-bold text-gray-900 mt-2">
                    {stats.invoice_count || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Invoices created</p>
                </div>
                <div className="p-4 bg-blue-100 rounded-lg">
                  <svg
                    className="w-8 h-8 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Subtotal Card */}
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Subtotal</p>
                  <p className="text-4xl font-bold text-gray-900 mt-2">
                    ₹{parseFloat(String(stats.subtotal || 0)).toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Before tax</p>
                </div>
                <div className="p-4 bg-green-100 rounded-lg">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* GST Collected Card */}
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">GST Collected</p>
                  <p className="text-4xl font-bold text-gray-900 mt-2">
                    ₹{parseFloat(String(stats.gst_collected || 0)).toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Tax collected</p>
                </div>
                <div className="p-4 bg-purple-100 rounded-lg">
                  <svg
                    className="w-8 h-8 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Total Sales Card - Featured */}
            <div className="card border-2 border-primary bg-gradient-to-br from-primary/5 to-transparent md:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Sales</p>
                  <p className="text-4xl font-bold text-primary mt-2">
                    ₹{parseFloat(String(stats.total_sales || 0)).toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">With GST included</p>
                </div>
                <div className="p-4 bg-primary text-white rounded-lg shadow-lg">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8L5.257 19.393A2 2 0 005 18.21V5a2 2 0 012-2h10a2 2 0 012 2z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Average Invoice Card */}
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Average Invoice</p>
                  <p className="text-4xl font-bold text-gray-900 mt-2">
                    ₹{parseFloat(String(stats.avg_invoice || 0)).toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Per invoice</p>
                </div>
                <div className="p-4 bg-orange-100 rounded-lg">
                  <svg
                    className="w-8 h-8 text-orange-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Highest Invoice Card */}
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Highest Invoice</p>
                  <p className="text-4xl font-bold text-gray-900 mt-2">
                    ₹{parseFloat(String(stats.max_invoice || 0)).toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Maximum value</p>
                </div>
                <div className="p-4 bg-red-100 rounded-lg">
                  <svg
                    className="w-8 h-8 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Summary Table */}
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <svg className="w-6 h-6 mr-2 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
              Detailed Summary
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="table-cell text-gray-600 font-medium">Total Invoices Created</td>
                    <td className="table-cell text-right font-semibold text-gray-900">
                      {stats.invoice_count || 0}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <td className="table-cell text-gray-600 font-medium">Subtotal (before GST)</td>
                    <td className="table-cell text-right font-semibold text-gray-900">
                      ₹{parseFloat(String(stats.subtotal || 0)).toFixed(2)}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="table-cell text-gray-600 font-medium">GST Collected (Tax)</td>
                    <td className="table-cell text-right font-semibold text-gray-900">
                      ₹{parseFloat(String(stats.gst_collected || 0)).toFixed(2)}
                    </td>
                  </tr>
                  <tr className="bg-primary/5 border-2 border-primary">
                    <td className="table-cell text-gray-900 font-bold">Grand Total (with GST)</td>
                    <td className="table-cell text-right font-bold text-primary text-lg">
                      ₹{parseFloat(String(stats.total_sales || 0)).toFixed(2)}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="table-cell text-gray-600 font-medium">Average Invoice Value</td>
                    <td className="table-cell text-right font-semibold text-gray-900">
                      ₹{parseFloat(String(stats.avg_invoice || 0)).toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="table-cell text-gray-600 font-medium">Highest Invoice Value</td>
                    <td className="table-cell text-right font-semibold text-gray-900">
                      ₹{parseFloat(String(stats.max_invoice || 0)).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Summary Stats at Bottom */}
            <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-transparent rounded-lg border border-primary/20">
              <h3 className="font-semibold text-gray-900 mb-2">Key Insights</h3>
              <div className="space-y-1 text-sm text-gray-700">
                <p>
                  📈 {stats.invoice_count} invoices generated ₹{parseFloat(String(stats.total_sales || 0)).toFixed(0)} in total sales
                </p>
                <p>
                  💰 Average invoice value is ₹{parseFloat(String(stats.avg_invoice || 0)).toFixed(0)}
                </p>
                <p>
                  🏆 Highest invoice was worth ₹{parseFloat(String(stats.max_invoice || 0)).toFixed(0)}
                </p>
                <p>
                  🧾 Collected ₹{parseFloat(String(stats.gst_collected || 0)).toFixed(0)} in GST
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="card text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No data available</h3>
          <p className="text-gray-600">No invoices were created on the selected date</p>
        </div>
      )}
    </div>
  );
}