import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function ReportsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDailyStats();
  }, [selectedDate]);

  const fetchDailyStats = async () => {
    try {
      const response = await api.get(`/reports/daily-sales/?date=${selectedDate}`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading reports...</div>;

  return (
    <div className="reports-page">
      <h1>Daily Sales Report</h1>

      <div className="date-selector">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      {stats && (
        <div className="report-stats">
          <div className="stat-card">
            <h3>Invoices</h3>
            <p className="value">{stats.invoice_count}</p>
          </div>

          <div className="stat-card">
            <h3>Subtotal</h3>
            <p className="value">₹{stats.subtotal?.toFixed(2)}</p>
          </div>

          <div className="stat-card">
            <h3>GST Collected</h3>
            <p className="value">₹{stats.gst_collected?.toFixed(2)}</p>
          </div>

          <div className="stat-card">
            <h3>Total Sales</h3>
            <p className="value">₹{stats.total_sales?.toFixed(2)}</p>
          </div>

          <div className="stat-card">
            <h3>Avg Invoice</h3>
            <p className="value">₹{stats.avg_invoice?.toFixed(2)}</p>
          </div>
        </div>
      )}
    </div>
  );
}