import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthContext } from './context/auth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InvoicePage from './pages/InvoicePage';
import ProductsPage from './pages/ProductsPage';
import ReportsPage from './pages/ReportsPage';

function ProtectedRoute({ children }) {
  const { token, loading } = useContext(AuthContext);
  if (loading) return <div>Loading...</div>;
  return token ? children : <Navigate to="/login" />;
}

function Layout({ children }) {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="nav-brand">Invoice Manager</div>
        <div className="nav-links">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/invoices">Invoices</Link>
          <Link to="/products">Products</Link>
          <Link to="/reports">Reports</Link>
          <span className="user-info">{user?.username}</span>
          <button onClick={logout} className="btn-logout">Logout</button>
        </div>
      </nav>
      <div className="main-content">
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const { token } = useContext(AuthContext);

  if (!token) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/invoices" element={<InvoicePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}