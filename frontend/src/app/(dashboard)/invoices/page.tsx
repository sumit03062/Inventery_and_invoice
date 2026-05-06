'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Invoice, Product, InvoiceItem, Customer } from '@/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export default function InvoicesPage(): React.ReactNode {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([{ product_id: '', quantity: 1 }]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [manualCustomerName, setManualCustomerName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // 1. Data Fetching
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const res = await api.get<{ results: Invoice[] }>('/invoices/');
      return res.data.results || [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await api.get<{ results: Product[] }>('/products/');
      return res.data.results || [];
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await api.get<{ results: Customer[] }>('/customers/');
      return res.data.results || [];
    },
  });

  // 2. Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/invoices/create/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Stock changed
      toast.success('Invoice created successfully!');
      setShowForm(false);
      resetForm();
    },
    onError: () => toast.error('Failed to create invoice'),
  });

  const voidMutation = useMutation({
    mutationFn: (id: number) => api.post(`/invoices/${id}/void/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Stock reverted
      toast.success('Invoice voided and stock reverted!');
    },
    onError: () => toast.error('Failed to void invoice'),
  });

  const resetForm = () => {
    setItems([{ product_id: '', quantity: 1 }]);
    setSelectedCustomerId('');
    setManualCustomerName('');
    setNotes('');
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter((item) => item.product_id);
    if (validItems.length === 0) {
      toast.error('Please select at least one product');
      return;
    }

    createMutation.mutate({
      items: validItems,
      customer_id: selectedCustomerId || null,
      customer_name: selectedCustomerId ? '' : manualCustomerName,
      notes: notes,
    });
  };

  const downloadPDF = async (invoiceId: number) => {
    try {
      const response = await api.get(`/invoices/${invoiceId}/pdf/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      toast.error('Failed to download PDF');
    }
  };

  const filteredInvoices = invoices.filter((invoice) =>
    invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loadingInvoices) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600 mt-2">Create and manage your sales records</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : '+ New Invoice'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card mb-8 p-6 bg-gradient-to-br from-blue-50 to-white shadow-lg border-blue-100">
          <h2 className="text-2xl font-bold mb-6">New Invoice</h2>
          <form onSubmit={handleCreateInvoice} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-blue-100">
              <div>
                <label className="form-label">Select Customer</label>
                <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="input-field">
                  <option value="">Manual Entry</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                </select>
              </div>
              {!selectedCustomerId && (
                <div>
                  <label className="form-label">Customer Name</label>
                  <input value={manualCustomerName} onChange={(e) => setManualCustomerName(e.target.value)} className="input-field" placeholder="Full name" />
                </div>
              )}
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="flex gap-4 items-end bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex-1">
                    <label className="form-label text-xs">Product</label>
                    <select
                      value={item.product_id}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index].product_id = e.target.value;
                        setItems(newItems);
                      }}
                      className="input-field"
                    >
                      <option value="">Select product...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} - ₹{p.price}</option>)}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="form-label text-xs">Qty</label>
                    <input type="number" value={item.quantity} onChange={(e) => {
                      const newItems = [...items];
                      newItems[index].quantity = parseInt(e.target.value) || 1;
                      setItems(newItems);
                    }} className="input-field" />
                  </div>
                  {items.length > 1 && (
                    <button type="button" onClick={() => setItems(items.filter((_, i) => i !== index))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">🗑️</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setItems([...items, { product_id: '', quantity: 1 }])} className="text-primary text-sm font-bold">+ Add Item</button>
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1">
                {createMutation.isPending ? 'Processing...' : 'Generate Invoice'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="mb-6">
        <input type="text" placeholder="🔍 Search by invoice #..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-field max-w-md" />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">Invoice #</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-primary">{inv.invoice_number}</td>
                  <td className="px-6 py-4 text-gray-700">{inv.customer_name}</td>
                  <td className="px-6 py-4 text-right font-bold">₹{inv.grand_total}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${inv.status === 'VOID' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {inv.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex justify-center gap-2">
                    <button onClick={() => downloadPDF(inv.id)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg" title="PDF">📄</button>
                    {inv.status !== 'VOID' && (
                      <button 
                        onClick={() => {
                          if (confirm('Void this invoice?')) voidMutation.mutate(inv.id);
                        }} 
                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg" 
                        title="Void"
                      >
                        🚫
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}