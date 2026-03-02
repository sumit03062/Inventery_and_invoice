import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/auth';
import api from '../services/api';

export default function DashboardPage() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch today's sales
      const today = new Date().toISOString().split('T')[0];
      const response = await api.get(`/reports/daily-sales/?date=${today}`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="dashboard">
      <h1>Welcome, {user?.username}!</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Invoices Today</h3>
          <p className="stat-value">{stats?.invoice_count || 0}</p>
        </div>

        <div className="stat-card">
          <h3>Total Sales</h3>
          <p className="stat-value">₹{stats?.total_sales?.toFixed(2) || 0}</p>
        </div>

        <div className="stat-card">
          <h3>Total GST</h3>
          <p className="stat-value">₹{stats?.gst_collected?.toFixed(2) || 0}</p>
        </div>

        <div className="stat-card">
          <h3>Avg Invoice</h3>
          <p className="stat-value">₹{stats?.avg_invoice?.toFixed(2) || 0}</p>
        </div>
      </div>

      <div className="actions">
        <button className="btn-primary">Create Invoice</button>
        <button className="btn-secondary">View Products</button>
        <button className="btn-secondary">View Reports</button>
      </div>
    </div>
  );
}