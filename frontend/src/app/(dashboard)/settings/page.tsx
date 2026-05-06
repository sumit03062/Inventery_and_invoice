'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Shop } from '@/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export default function SettingsPage(): React.ReactNode {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<Shop>>({});

  // 1. Data Fetching
  const { data: shop, isLoading } = useQuery({
    queryKey: ['shop-settings'],
    queryFn: async () => {
      const res = await api.get<Shop>('/shops/my_shop/');
      setFormData(res.data);
      return res.data;
    },
  });

  // 2. Mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<Shop>) => api.patch<Shop>('/shops/my_shop/', data),
    onSuccess: (res) => {
      queryClient.setQueryData(['shop-settings'], res.data);
      toast.success('Settings updated!');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><div className="spinner"></div></div>;

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-gray-600 mt-2">Configure your business profile and tax details</p>
      </div>

      <div className="card p-8 bg-white shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="form-label">Business Name</label>
              <input name="name" value={formData.name || ''} onChange={handleChange} className="input-field" required />
            </div>
            <div>
              <label className="form-label">Owner Name</label>
              <input name="owner_name" value={formData.owner_name || ''} onChange={handleChange} className="input-field" required />
            </div>
            <div>
              <label className="form-label">GSTIN</label>
              <input name="gst_number" value={formData.gst_number || ''} onChange={handleChange} className="input-field font-mono uppercase" placeholder="GST Number" />
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input name="phone" value={formData.phone || ''} onChange={handleChange} className="input-field" />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input name="email" value={formData.email || ''} onChange={handleChange} className="input-field" />
            </div>
            <div className="md:col-span-2">
              <label className="form-label">Address</label>
              <textarea name="address" value={formData.address || ''} onChange={handleChange} rows={3} className="input-field" />
            </div>
          </div>
          <div className="pt-6 border-t flex justify-end">
            <button type="submit" disabled={updateMutation.isPending} className="btn-primary min-w-[200px]">
              {updateMutation.isPending ? 'Saving Changes...' : 'Update Settings'}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-4">
        <span className="text-2xl">💡</span>
        <p className="text-sm text-gray-600 leading-relaxed">
          These details are used to generate your <b>Invoice PDFs</b>. Make sure your GSTIN and Business Address are legally accurate for tax compliance.
        </p>
      </div>
    </div>
  );
}
