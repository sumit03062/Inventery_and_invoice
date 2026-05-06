'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Product, CreateProductInput } from '@/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface ProductFormState extends CreateProductInput {
  errors: Record<string, string>;
}

export default function ProductsPage(): React.ReactNode {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formState, setFormState] = useState<ProductFormState>({
    name: '',
    price: 0,
    gst_percent: 18,
    stock_quantity: 0,
    low_stock_threshold: 10,
    errors: {},
  });

  // 1. Data Fetching with useQuery
  const { data: products = [], isLoading, isError, error } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get<{ results: Product[] }>('/products/');
      return response.data.results || [];
    },
  });

  // 2. Low Stock Alerts
  useEffect(() => {
    if (products.length > 0) {
      const lowStockItems = products.filter(p => p.is_low_stock);
      if (lowStockItems.length > 0) {
        toast.error(`⚠️ ${lowStockItems.length} items are low on stock!`, {
          id: 'low-stock-alert',
          duration: 5000,
        });
      }
    }
  }, [products]);

  // 3. Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateProductInput) => api.post('/products/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully!');
      handleCancelEdit();
    },
    onError: () => toast.error('Failed to create product'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateProductInput }) => 
      api.patch(`/products/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product updated successfully!');
      handleCancelEdit();
    },
    onError: () => toast.error('Failed to update product'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/products/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted successfully!');
      setDeleteConfirm(null);
    },
    onError: () => toast.error('Failed to delete product'),
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormState((prev) => ({
      ...prev,
      [name]: name === 'name' ? value : name === 'price' ? parseFloat(value) || 0 : parseInt(value) || 0,
      errors: { ...prev.errors, [name]: '' },
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formState.name.trim()) newErrors.name = 'Product name is required';
    if (formState.price <= 0) newErrors.price = 'Price must be greater than 0';
    if (formState.gst_percent < 0 || formState.gst_percent > 100) newErrors.gst_percent = 'GST must be 0-100';
    if (formState.stock_quantity < 0) newErrors.stock_quantity = 'Stock cannot be negative';

    setFormState((prev) => ({ ...prev, errors: newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const data = {
      name: formState.name,
      price: formState.price,
      gst_percent: formState.gst_percent,
      stock_quantity: formState.stock_quantity,
      low_stock_threshold: formState.low_stock_threshold,
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEditClick = (product: Product): void => {
    setEditingProduct(product);
    setFormState({
      name: product.name,
      price: product.price,
      gst_percent: product.gst_percent,
      stock_quantity: product.stock_quantity,
      low_stock_threshold: product.low_stock_threshold,
      errors: {},
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = (): void => {
    setEditingProduct(null);
    setFormState({
      name: '',
      price: 0,
      gst_percent: 18,
      stock_quantity: 0,
      low_stock_threshold: 10,
      errors: {},
    });
    setShowForm(false);
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
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
          <h1 className="text-4xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-600 mt-2">Manage products and track stock levels</p>
        </div>
        <button
          onClick={() => (showForm ? handleCancelEdit() : setShowForm(true))}
          className="btn-primary self-start sm:self-auto"
        >
          {showForm ? 'Cancel' : '+ Add Product'}
        </button>
      </div>

      {/* Product Form */}
      {showForm && (
        <div className="card mb-8 p-6 bg-gradient-to-br from-indigo-50 to-white">
          <h2 className="text-2xl font-bold mb-6">{editingProduct ? 'Edit Product' : 'New Product'}</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="form-label">Product Name</label>
              <input name="name" value={formState.name} onChange={handleInputChange} className="input-field" />
              {formState.errors.name && <p className="form-error">{formState.errors.name}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Price (₹)</label>
                <input type="number" name="price" value={formState.price} onChange={handleInputChange} className="input-field" />
              </div>
              <div>
                <label className="form-label">GST %</label>
                <input type="number" name="gst_percent" value={formState.gst_percent} onChange={handleInputChange} className="input-field" />
              </div>
              <div>
                <label className="form-label">Stock</label>
                <input type="number" name="stock_quantity" value={formState.stock_quantity} onChange={handleInputChange} className="input-field" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary flex-1">
                {editingProduct ? 'Update Product' : 'Save Product'}
              </button>
              <button type="button" onClick={handleCancelEdit} className="btn-secondary flex-1">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Grid */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="🔍 Search inventory..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field max-w-md shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <div key={product.id} className="card hover:shadow-2xl transition-all group border-transparent hover:border-primary/20">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{product.name}</h3>
              {product.is_low_stock && (
                <span className="animate-pulse px-2 py-1 bg-red-100 text-red-600 text-[10px] font-bold rounded-full uppercase">Low Stock</span>
              )}
            </div>

            <div className="space-y-3 mb-6 bg-gray-50/50 p-4 rounded-xl">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Price:</span>
                <span className="font-bold">₹{product.price}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Stock:</span>
                <span className={`font-bold ${product.is_low_stock ? 'text-red-600' : 'text-green-600'}`}>{product.stock_quantity} units</span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between">
                <span className="text-gray-500 text-xs">Final Price:</span>
                <span className="font-bold text-primary">₹{product.price_with_gst}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => handleEditClick(product)} className="btn-secondary btn-small flex-1 text-xs py-2">Edit</button>
              <button 
                onClick={() => setDeleteConfirm(product.id)} 
                className={`btn-small flex-1 text-xs py-2 ${deleteConfirm === product.id ? 'btn-danger' : 'text-red-600 hover:bg-red-50'}`}
              >
                {deleteConfirm === product.id ? 'Confirm?' : 'Delete'}
              </button>
              {deleteConfirm === product.id && (
                <button onClick={() => setDeleteConfirm(null)} className="p-2 text-gray-400 hover:text-gray-600">✕</button>
              )}
            </div>
            
            {deleteConfirm === product.id && (
              <button 
                onClick={() => deleteMutation.mutate(product.id)}
                className="w-full mt-2 btn-danger text-xs py-2"
              >
                Yes, Delete permanently
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}