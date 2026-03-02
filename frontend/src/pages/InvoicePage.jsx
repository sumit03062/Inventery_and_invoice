import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function InvoicePage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await api.get('/invoices/');
      setInvoices(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async (formData) => {
    try {
      await api.post('/invoices/create/', formData);
      fetchInvoices();
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create invoice:', error);
    }
  };

  const downloadPDF = async (invoiceId) => {
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
    } catch (error) {
      console.error('Failed to download PDF:', error);
    }
  };

  if (loading) return <div>Loading invoices...</div>;

  return (
    <div className="invoice-page">
      <div className="header">
        <h1>Invoices</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          Create Invoice
        </button>
      </div>

      {showForm && (
        <InvoiceForm onSubmit={handleCreateInvoice} onCancel={() => setShowForm(false)} />
      )}

      <div className="invoice-list">
        {invoices.length === 0 ? (
          <p>No invoices yet</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.invoice_number}</td>
                  <td>{invoice.customer_name}</td>
                  <td>₹{invoice.grand_total}</td>
                  <td>{new Date(invoice.created_at).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => downloadPDF(invoice.id)}>
                      Download PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Invoice Form Component
function InvoiceForm({ onSubmit, onCancel }) {
  const [customerName, setCustomerName] = useState('');
  const [items, setItems] = useState([{ product_id: '', quantity: 1 }]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products/');
      setProducts(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setItems([...items, { product_id: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      customer_name: customerName,
      items: items.filter(item => item.product_id),
    });
  };

  if (loading) return <div>Loading products...</div>;

  return (
    <form onSubmit={handleSubmit} className="invoice-form">
      <div className="form-group">
        <label>Customer Name</label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />
      </div>

      <div className="items-section">
        <h3>Items</h3>
        {items.map((item, index) => (
          <div key={index} className="item-row">
            <select
              value={item.product_id}
              onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
            >
              <option value="">Select Product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} - ₹{product.price}
                </option>
              ))}
            </select>

            <input
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
              placeholder="Qty"
            />

            {items.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemoveItem(index)}
                className="btn-danger"
              >
                Remove
              </button>
            )}
          </div>
        ))}

        <button type="button" onClick={handleAddItem} className="btn-secondary">
          Add Item
        </button>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary">
          Create Invoice
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}