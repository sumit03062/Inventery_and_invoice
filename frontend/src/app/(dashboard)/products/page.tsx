'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Product, CreateProductInput } from '@/types';

interface ProductFormState extends CreateProductInput {
  loading: boolean;
  errors: Record<string, string>;
}

export default function ProductsPage(): JSX.Element {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formState, setFormState] = useState<ProductFormState>({
    name: '',
    price: 0,
    gst_percent: 18,
    stock_quantity: 0,
    low_stock_threshold: 10,
    loading: false,
    errors: {},
  });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async (): Promise<void> => {
    try {
      const response = await api.get<{ results: Product[] }>('/products/');
      setProducts(response.data.results || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormState((prev) => ({
      ...prev,
      [name]:
        name === 'name'
          ? value
          : name === 'price'
          ? parseFloat(value) || 0
          : parseInt(value) || 0,
      errors: { ...prev.errors, [name]: '' },
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formState.name.trim()) {
      newErrors.name = 'Product name is required';
    }
    if (formState.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }
    if (formState.gst_percent < 0 || formState.gst_percent > 100) {
      newErrors.gst_percent = 'GST must be between 0 and 100';
    }
    if (formState.stock_quantity < 0) {
      newErrors.stock_quantity = 'Stock cannot be negative';
    }

    setFormState((prev) => ({ ...prev, errors: newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateProduct = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!validateForm()) return;

    setFormState((prev) => ({ ...prev, loading: true }));

    try {
      await api.post('/products/', {
        name: formState.name,
        price: formState.price,
        gst_percent: formState.gst_percent,
        stock_quantity: formState.stock_quantity,
        low_stock_threshold: formState.low_stock_threshold,
      });

      fetchProducts();
      setShowForm(false);
      setFormState({
        name: '',
        price: 0,
        gst_percent: 18,
        stock_quantity: 0,
        low_stock_threshold: 10,
        loading: false,
        errors: {},
      });
      alert('✅ Product created successfully!');
    } catch (error) {
      console.error('Failed to create product:', error);
      alert('Failed to create product');
    } finally {
      setFormState((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleDeleteProduct = async (productId: number): Promise<void> => {
    try {
      await api.delete(`/products/${productId}/`);
      fetchProducts();
      setDeleteConfirm(null);
      alert('✅ Product deleted successfully!');
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('Failed to delete product');
    }
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900">Loading Products</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-2">Manage your product inventory</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary self-start sm:self-auto flex items-center"
        >
          {showForm ? (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Product
            </>
          )}
        </button>
      </div>

      {/* Add Product Form */}
      {showForm && (
        <div className="card mb-8 bg-gradient-to-br from-green-50 to-emerald-50">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Product</h2>

          <form onSubmit={handleCreateProduct} className="space-y-6">
            <div>
              <label htmlFor="name" className="form-label">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                name="name"
                placeholder="e.g., Laptop, Monitor, Keyboard"
                value={formState.name}
                onChange={handleInputChange}
                className={`input-field ${
                  formState.errors.name ? 'border-red-500' : ''
                }`}
                required
              />
              {formState.errors.name && (
                <p className="form-error">{formState.errors.name}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="price" className="form-label">
                  Price (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  id="price"
                  type="number"
                  name="price"
                  placeholder="0.00"
                  value={formState.price}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className={`input-field ${
                    formState.errors.price ? 'border-red-500' : ''
                  }`}
                  required
                />
                {formState.errors.price && (
                  <p className="form-error">{formState.errors.price}</p>
                )}
              </div>

              <div>
                <label htmlFor="gst_percent" className="form-label">
                  GST % <span className="text-red-500">*</span>
                </label>
                <input
                  id="gst_percent"
                  type="number"
                  name="gst_percent"
                  placeholder="18"
                  value={formState.gst_percent}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  className={`input-field ${
                    formState.errors.gst_percent ? 'border-red-500' : ''
                  }`}
                />
                {formState.errors.gst_percent && (
                  <p className="form-error">{formState.errors.gst_percent}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="stock_quantity" className="form-label">
                  Stock Quantity
                </label>
                <input
                  id="stock_quantity"
                  type="number"
                  name="stock_quantity"
                  placeholder="0"
                  value={formState.stock_quantity}
                  onChange={handleInputChange}
                  min="0"
                  className={`input-field ${
                    formState.errors.stock_quantity ? 'border-red-500' : ''
                  }`}
                />
                {formState.errors.stock_quantity && (
                  <p className="form-error">{formState.errors.stock_quantity}</p>
                )}
              </div>

              <div>
                <label htmlFor="low_stock_threshold" className="form-label">
                  Low Stock Alert (units)
                </label>
                <input
                  id="low_stock_threshold"
                  type="number"
                  name="low_stock_threshold"
                  placeholder="10"
                  value={formState.low_stock_threshold}
                  onChange={handleInputChange}
                  min="0"
                  className="input-field"
                />
              </div>
            </div>

            <div className="flex gap-3 flex-col sm:flex-row pt-4 border-t border-green-200">
              <button
                type="submit"
                disabled={formState.loading}
                className="btn-primary flex-1 flex items-center justify-center"
              >
                {formState.loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating...
                  </>
                ) : (
                  'Create Product'
                )}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Bar */}
      {products.length > 0 && (
        <div className="mb-6">
          <input
            type="text"
            placeholder="🔍 Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field max-w-md"
          />
          {filteredProducts.length < products.length && (
            <p className="text-sm text-gray-600 mt-2">
              Found {filteredProducts.length} of {products.length} products
            </p>
          )}
        </div>
      )}

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="card text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4m0 0L4 7m16 0v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7m16 0L12 3m0 0L4 7m0 0v10a2 2 0 002 2h12a2 2 0 002-2V7" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No products yet</h3>
          <p className="text-gray-600 mb-6">Add your first product to get started</p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary inline-flex"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add First Product
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="card hover:shadow-xl hover:translate-y-[-4px] transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex-1">{product.name}</h3>
                {product.is_low_stock && (
                  <span className="inline-block px-2 py-1 bg-warning text-white text-xs font-semibold rounded whitespace-nowrap ml-2">
                    ⚠️ Low Stock
                  </span>
                )}
              </div>

              <div className="space-y-3 mb-6 bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm font-medium">Price:</span>
                  <span className="font-bold text-gray-900">
                    ₹{parseFloat(String(product.price)).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm font-medium">GST:</span>
                  <span className="font-bold text-gray-900">{product.gst_percent}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm font-medium">Stock:</span>
                  <span
                    className={`font-bold ${
                      product.stock_quantity < product.low_stock_threshold
                        ? 'text-warning'
                        : 'text-success'
                    }`}
                  >
                    {product.stock_quantity} units
                  </span>
                </div>
                <div className="border-t border-gray-300 pt-3 flex justify-between items-center">
                  <span className="text-gray-600 text-sm font-medium">With GST:</span>
                  <span className="font-bold text-primary text-lg">
                    ₹{parseFloat(String(product.price_with_gst)).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="relative">
                {deleteConfirm === product.id ? (
                  <div className="space-y-2">
                    <p className="text-sm text-red-700 font-medium text-center">
                      Delete this product?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="btn-danger flex-1 text-sm py-2"
                      >
                        Yes, Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="btn-secondary flex-1 text-sm py-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(product.id)}
                    className="btn-danger w-full"
                  >
                    🗑️ Delete Product
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {products.length > 0 && (
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card bg-gradient-to-br from-blue-50 to-cyan-50 border-l-4 border-primary">
            <h3 className="font-semibold text-gray-900 mb-2">Total Products</h3>
            <p className="text-3xl font-bold text-primary">{products.length}</p>
          </div>
          <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-l-4 border-success">
            <h3 className="font-semibold text-gray-900 mb-2">Total Stock Value</h3>
            <p className="text-3xl font-bold text-success">
              ₹{products
                .reduce((sum, p) => sum + p.price * p.stock_quantity, 0)
                .toFixed(0)}
            </p>
          </div>
          <div className="card bg-gradient-to-br from-yellow-50 to-orange-50 border-l-4 border-warning">
            <h3 className="font-semibold text-gray-900 mb-2">Low Stock Items</h3>
            <p className="text-3xl font-bold text-warning">
              {products.filter((p) => p.is_low_stock).length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}