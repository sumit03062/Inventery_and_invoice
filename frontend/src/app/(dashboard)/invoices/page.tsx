'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Invoice, Product, InvoiceItem } from '@/types';

export default function InvoicesPage(): JSX.Element {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { product_id: '', quantity: 1 },
  ]);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
    fetchProducts();
  }, []);

  const fetchInvoices = async (): Promise<void> => {
    try {
      const response = await api.get<{ results: Invoice[] }>('/invoices/');
      setInvoices(response.data.results || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
      setError('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (): Promise<void> => {
    try {
      const response = await api.get<{ results: Product[] }>('/products/');
      setProducts(response.data.results || []);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);

    try {
      const validItems = items.filter((item) => item.product_id);
      if (validItems.length === 0) {
        setError('Please select at least one product');
        setFormLoading(false);
        return;
      }

      await api.post('/invoices/create/', { items: validItems });
      fetchInvoices();
      setShowForm(false);
      setItems([{ product_id: '', quantity: 1 }]);
      alert('✅ Invoice created successfully!');
    } catch (err) {
      console.error('Failed to create invoice:', err);
      setError('Failed to create invoice. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const downloadPDF = async (invoiceId: number): Promise<void> => {
    try {
      const response = await api.get(`/invoices/${invoiceId}/pdf/`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      alert('Failed to download PDF');
    }
  };

  const filteredInvoices = invoices.filter((invoice) =>
    invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900">Loading Invoices</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600 mt-2">Manage all your invoices here</p>
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
              Create Invoice
            </>
          )}
        </button>
      </div>

      {/* Create Invoice Form */}
      {showForm && (
        <div className="card mb-8 bg-gradient-to-br from-blue-50 to-cyan-50">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Invoice</h2>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateInvoice} className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.5 1.5H3.75A2.25 2.25 0 001.5 3.75v12.5A2.25 2.25 0 003.75 18.5h12.5a2.25 2.25 0 002.25-2.25V9.5m-15-6h12m-12 4h12m-12 4h9" />
                </svg>
                Select Items
              </h3>

              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-4 items-end flex-wrap sm:flex-nowrap bg-gray-50 p-4 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <label className="form-label">Product</label>
                      <select
                        value={item.product_id}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].product_id = e.target.value;
                          setItems(newItems);
                        }}
                        className="input-field"
                        required
                      >
                        <option value="">-- Select Product --</option>
                        {products.length > 0 ? (
                          products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} - ₹{parseFloat(String(product.price)).toFixed(2)}
                            </option>
                          ))
                        ) : (
                          <option disabled>No products available</option>
                        )}
                      </select>
                    </div>

                    <div className="w-24">
                      <label className="form-label">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].quantity = parseInt(e.target.value) || 1;
                          setItems(newItems);
                        }}
                        className="input-field"
                        required
                      />
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setItems(items.filter((_, i) => i !== index))}
                        className="btn-danger btn-small"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setItems([...items, { product_id: '', quantity: 1 }])}
                className="btn-secondary btn-small mt-4"
              >
                + Add Item
              </button>
            </div>

            <div className="flex gap-3 flex-col sm:flex-row">
              <button
                type="submit"
                disabled={formLoading || products.length === 0}
                className="btn-primary flex-1 flex items-center justify-center"
              >
                {formLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating...
                  </>
                ) : (
                  'Create Invoice'
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Bar */}
      {invoices.length > 0 && (
        <div className="mb-6">
          <input
            type="text"
            placeholder="🔍 Search by invoice number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field max-w-md"
          />
          {filteredInvoices.length < invoices.length && (
            <p className="text-sm text-gray-600 mt-2">
              Found {filteredInvoices.length} of {invoices.length} invoices
            </p>
          )}
        </div>
      )}

      {/* Invoices Table */}
      {filteredInvoices.length === 0 ? (
        <div className="card text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No invoices yet</h3>
          <p className="text-gray-600 mb-6">Create your first invoice to get started</p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary inline-flex"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create First Invoice
          </button>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-300 bg-gray-50">
                <th className="table-header text-left">Invoice #</th>
                <th className="table-header text-right">Subtotal</th>
                <th className="table-header text-right">GST</th>
                <th className="table-header text-right">Total</th>
                <th className="table-header text-left">Date</th>
                <th className="table-header text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="table-row-hover border-b border-gray-100 hover:bg-blue-50/50">
                  <td className="table-cell font-bold text-primary">
                    {invoice.invoice_number}
                  </td>
                  <td className="table-cell text-right text-gray-700">
                    ₹{parseFloat(String(invoice.subtotal)).toFixed(2)}
                  </td>
                  <td className="table-cell text-right text-gray-700">
                    ₹{parseFloat(String(invoice.gst_amount)).toFixed(2)}
                  </td>
                  <td className="table-cell text-right font-bold text-gray-900">
                    ₹{parseFloat(String(invoice.grand_total)).toFixed(2)}
                  </td>
                  <td className="table-cell text-gray-700">
                    {new Date(invoice.created_at).toLocaleDateString('en-IN')}
                  </td>
                  <td className="table-cell text-center">
                    <button
                      onClick={() => downloadPDF(invoice.id)}
                      className="btn-primary btn-small inline-flex items-center"
                      title="Download PDF"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3v-6" />
                      </svg>
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Info */}
      {invoices.length > 0 && (
        <div className="mt-6 text-sm text-gray-600 text-center">
          <p>Showing {filteredInvoices.length} of {invoices.length} invoices</p>
        </div>
      )}
    </div>
  );
}