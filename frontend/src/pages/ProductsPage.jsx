import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

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

  const handleCreateProduct = async (formData) => {
    try {
      await api.post('/products/', formData);
      fetchProducts();
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create product:', error);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure?')) {
      try {
        await api.delete(`/products/${productId}/`);
        fetchProducts();
      } catch (error) {
        console.error('Failed to delete product:', error);
      }
    }
  };

  if (loading) return <div>Loading products...</div>;

  return (
    <div className="products-page">
      <div className="header">
        <h1>Products</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          Add Product
        </button>
      </div>

      {showForm && (
        <ProductForm onSubmit={handleCreateProduct} onCancel={() => setShowForm(false)} />
      )}

      <div className="products-grid">
        {products.length === 0 ? (
          <p>No products yet</p>
        ) : (
          products.map((product) => (
            <div key={product.id} className="product-card">
              <h3>{product.name}</h3>
              <p className="price">₹{product.price}</p>
              <p className="stock">Stock: {product.stock_quantity}</p>
              {product.is_low_stock && (
                <p className="warning">⚠️ Low Stock</p>
              )}
              <div className="actions">
                <button className="btn-secondary">Edit</button>
                <button
                  className="btn-danger"
                  onClick={() => handleDeleteProduct(product.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ProductForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    gst_percent: 18,
    stock_quantity: 0,
    low_stock_threshold: 10,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="product-form">
      <input
        type="text"
        name="name"
        placeholder="Product Name"
        value={formData.name}
        onChange={handleChange}
        required
      />

      <input
        type="number"
        name="price"
        placeholder="Price"
        value={formData.price}
        onChange={handleChange}
        step="0.01"
        required
      />

      <input
        type="number"
        name="gst_percent"
        placeholder="GST %"
        value={formData.gst_percent}
        onChange={handleChange}
        min="0"
        max="100"
      />

      <input
        type="number"
        name="stock_quantity"
        placeholder="Stock"
        value={formData.stock_quantity}
        onChange={handleChange}
        min="0"
      />

      <input
        type="number"
        name="low_stock_threshold"
        placeholder="Low Stock Alert"
        value={formData.low_stock_threshold}
        onChange={handleChange}
        min="0"
      />

      <div className="form-actions">
        <button type="submit" className="btn-primary">
          Create Product
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}