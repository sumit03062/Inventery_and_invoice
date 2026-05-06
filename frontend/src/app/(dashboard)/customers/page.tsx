'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Customer } from '@/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  // 1. Data Fetching
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await api.get<{ results: Customer[] }>('/customers/');
      return res.data.results || [];
    },
  });

  // 2. Mutations
  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingCustomer) return api.patch(`/customers/${editingCustomer.id}/`, data);
      return api.post('/customers/', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(editingCustomer ? 'Customer updated!' : 'Customer added!');
      handleCloseForm();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.phone?.[0] || 'Failed to save customer';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/customers/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer removed');
    },
    onError: () => toast.error('Failed to delete customer'),
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', email: '', address: '' });
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><div className="spinner"></div></div>;

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">CRM</h1>
          <p className="text-gray-600 mt-2">Manage customer relationships and history</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : '+ Add Customer'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-8 p-6 bg-gradient-to-br from-indigo-50 to-white">
          <h2 className="text-2xl font-bold mb-6">{editingCustomer ? 'Edit Details' : 'New Customer'}</h2>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(formData); }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="name" placeholder="Full Name" value={formData.name} onChange={handleInputChange} className="input-field" required />
              <input name="phone" placeholder="Phone Number" value={formData.phone} onChange={handleInputChange} className="input-field" required />
              <input name="email" placeholder="Email" value={formData.email} onChange={handleInputChange} className="input-field" />
              <textarea name="address" placeholder="Physical Address" value={formData.address} onChange={handleInputChange} className="input-field md:col-span-2 h-24" />
            </div>
            <button type="submit" disabled={saveMutation.isPending} className="btn-primary w-full">
              {saveMutation.isPending ? 'Saving...' : 'Save Customer'}
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers.map((customer) => (
          <div key={customer.id} className="card p-6 hover:shadow-2xl transition-all border-l-4 border-primary">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold">{customer.name}</h3>
                <p className="text-primary font-bold text-sm">{customer.phone}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(customer)} className="p-2 hover:bg-gray-100 rounded-lg">✏️</button>
                <button 
                  onClick={() => { if(confirm('Delete customer?')) deleteMutation.mutate(customer.id); }} 
                  className="p-2 hover:bg-red-50 text-red-500 rounded-lg"
                >
                  🗑️
                </button>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500 space-y-2">
              {customer.email && <p>📧 {customer.email}</p>}
              {customer.address && <p className="line-clamp-2">📍 {customer.address}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
