import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './index.css';

// Configure axios base URL
axios.defaults.baseURL = 'http://localhost:5000';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      // Verify token and get user info
      const verifyToken = async () => {
        try {
          const response = await axios.get('/api/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(response.data);
        } catch (err) {
          localStorage.removeItem('token');
          setToken('');
        }
      };
      verifyToken();
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
  };

  if (!token) {
    return <Auth setToken={setToken} setError={setError} loading={loading} setLoading={setLoading} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white">
      <Navbar user={user} onLogout={handleLogout} />
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        <Dashboard user={user} setError={setError} />
      </main>
    </div>
  );
}

function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <a href="#" className="navbar-brand">
          🏥 MedSupply Pro
        </a>
        <div className="navbar-nav">
          <span className="text-white">Welcome, {user?.name || user?.email}</span>
          <span className="badge badge-purple">{user?.role}</span>
          <button onClick={onLogout} className="btn btn-secondary">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

function Auth({ setToken, setError, loading, setLoading }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'facility'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/api/login' : '/api/signup';
      const response = await axios.post(endpoint, formData);

      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        setToken(response.data.token);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-white">
      <div className="card max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-4xl mb-2">🏥</h1>
          <h1>MedSupply Pro</h1>
          <p className="text-gray-600">Medical Supply Management Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="form-input"
                  required={!isLogin}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="facility">Medical Facility</option>
                  <option value="vendor">Vendor/Supplier</option>
                </select>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading ? <div className="spinner"></div> : null}
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <div className="text-center mt-4">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-purple-600 hover:text-purple-700"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ user, setError }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [needs, setNeeds] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

      // Load products
      const productsRes = await axios.get('/api/products', { headers });
      setProducts(productsRes.data);

      // Load orders if facility
      if (user?.role === 'facility') {
        const ordersRes = await axios.get('/api/orders', { headers });
        setOrders(ordersRes.data);

        // Load analytics
        const analyticsRes = await axios.get('/api/analytics/spend', { headers });
        setAnalytics(analyticsRes.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'products', label: 'Products', icon: '📦' },
    { id: 'orders', label: 'Orders', icon: '🛒' },
    { id: 'analytics', label: 'Analytics', icon: '📈' }
  ];

  if (user?.role === 'vendor') {
    tabs.splice(2, 1); // Remove orders tab for vendors
    tabs.splice(2, 1); // Remove analytics tab for vendors
  }

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading && (
        <div className="text-center py-8">
          <div className="spinner mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      )}

      {!loading && (
        <>
          {activeTab === 'overview' && <Overview user={user} products={products} orders={orders} analytics={analytics} />}
          {activeTab === 'products' && <Products user={user} products={products} onProductsChange={setProducts} />}
          {activeTab === 'orders' && <Orders user={user} orders={orders} onOrdersChange={setOrders} />}
          {activeTab === 'analytics' && <Analytics analytics={analytics} />}
        </>
      )}
    </div>
  );
}

function Overview({ user, products, orders, analytics }) {
  const stats = [
    {
      title: 'Total Products',
      value: products.length,
      icon: '📦',
      color: 'text-purple-600'
    },
    {
      title: 'Active Orders',
      value: orders.filter(o => o.status !== 'delivered').length,
      icon: '🛒',
      color: 'text-blue-600'
    },
    {
      title: 'Monthly Spend',
      value: `$${analytics?.total_spend || 0}`,
      icon: '💰',
      color: 'text-green-600'
    },
    {
      title: 'Verified Status',
      value: user?.verified ? 'Verified' : 'Pending',
      icon: user?.verified ? '✅' : '⏳',
      color: user?.verified ? 'text-green-600' : 'text-yellow-600'
    }
  ];

  return (
    <div>
      <h2 className="mb-6">Dashboard Overview</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="card text-center">
            <div className="text-3xl mb-2">{stat.icon}</div>
            <div className={`text-2xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
            <div className="text-gray-600">{stat.title}</div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3>Recent Products</h3>
          </div>
          <div className="space-y-3">
            {products.slice(0, 5).map(product => (
              <div key={product.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">{product.name}</div>
                  <div className="text-sm text-gray-600">${product.price} • Stock: {product.stock}</div>
                </div>
                <div className="badge badge-purple">{product.vendor?.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Recent Orders</h3>
          </div>
          <div className="space-y-3">
            {orders.slice(0, 5).map(order => (
              <div key={order.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">Order #{order.id.slice(0, 8)}</div>
                  <div className="text-sm text-gray-600">${order.total_amount}</div>
                </div>
                <div className={`badge ${order.status === 'delivered' ? 'badge-success' :
                    order.status === 'pending' ? 'badge-warning' : 'badge-info'
                  }`}>
                  {order.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Products({ user, products, onProductsChange }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState(products);

  useEffect(() => {
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [products, searchTerm]);

  const handleAddProduct = async (productData) => {
    try {
      const response = await axios.post('/api/vendor/products', productData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.ok) {
        onProductsChange([...products, { ...productData, id: response.data.product_id }]);
        setShowAddForm(false);
      }
    } catch (err) {
      console.error('Error adding product:', err);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2>Products</h2>
        {user?.role === 'vendor' && (
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary"
          >
            + Add Product
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-input max-w-md"
        />
      </div>

      {/* Add Product Form */}
      {showAddForm && (
        <AddProductForm
          onSubmit={handleAddProduct}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map(product => (
          <div key={product.id} className="card">
            <div className="card-header">
              <h3 className="text-lg">{product.name}</h3>
              <div className="badge badge-purple">{product.vendor?.name}</div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Price:</span>
                <span className="font-semibold text-purple-600">${product.price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Stock:</span>
                <span className={product.stock < 10 ? 'text-red-600' : 'text-green-600'}>
                  {product.stock} units
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={product.vendor?.verified ? 'text-green-600' : 'text-yellow-600'}>
                  {product.vendor?.verified ? 'Verified' : 'Pending'}
                </span>
              </div>
            </div>
            {user?.role === 'facility' && (
              <div className="mt-4">
                <button className="btn btn-primary w-full">
                  Add to Cart
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No products found
        </div>
      )}
    </div>
  );
}

function AddProductForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'general',
    sku: '',
    price: '',
    stock: '',
    unit: 'pcs',
    min_threshold: '10',
    warehouse_lat: '',
    warehouse_lon: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="card mb-6">
      <div className="card-header">
        <h3>Add New Product</h3>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label">Product Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="form-input"
            >
              <option value="general">General</option>
              <option value="surgical">Surgical</option>
              <option value="pharmaceutical">Pharmaceutical</option>
              <option value="equipment">Equipment</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">SKU</label>
            <input
              type="text"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Price ($)</label>
            <input
              type="number"
              step="0.01"
              name="price"
              value={formData.price}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Stock Quantity</label>
            <input
              type="number"
              name="stock"
              value={formData.stock}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Unit</label>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="form-input"
            >
              <option value="pcs">Pieces</option>
              <option value="box">Box</option>
              <option value="kg">Kilogram</option>
              <option value="liter">Liter</option>
            </select>
          </div>
        </div>
        <div className="flex gap-4">
          <button type="submit" className="btn btn-primary">
            Add Product
          </button>
          <button type="button" onClick={onCancel} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function Orders({ user, orders, onOrdersChange }) {
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);

  const handlePlaceOrder = async (orderData) => {
    try {
      const response = await axios.post('/api/orders', orderData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.ok) {
        onOrdersChange([...orders, { ...orderData, id: response.data.order_id }]);
        setShowOrderForm(false);
        setSelectedProducts([]);
      }
    } catch (err) {
      console.error('Error placing order:', err);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2>Orders</h2>
        <button
          onClick={() => setShowOrderForm(true)}
          className="btn btn-primary"
        >
          + New Order
        </button>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {orders.map(order => (
          <div key={order.id} className="card">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg">Order #{order.id.slice(0, 8)}</h3>
                <p className="text-gray-600">Total: ${order.total_amount}</p>
                <p className="text-sm text-gray-500">
                  Created: {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <div className={`badge ${order.status === 'delivered' ? 'badge-success' :
                    order.status === 'pending' ? 'badge-warning' : 'badge-info'
                  }`}>
                  {order.status}
                </div>
                {order.emergency && (
                  <div className="badge badge-error mt-2">Emergency</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {orders.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No orders found
        </div>
      )}
    </div>
  );
}

function Analytics({ analytics }) {
  return (
    <div>
      <h2>Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card text-center">
          <div className="text-3xl mb-2">💰</div>
          <div className="text-2xl font-bold text-green-600 mb-1">
            ${analytics?.total_spend || 0}
          </div>
          <div className="text-gray-600">Total Spend</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl mb-2">📦</div>
          <div className="text-2xl font-bold text-blue-600 mb-1">
            {analytics?.orders_count || 0}
          </div>
          <div className="text-gray-600">Orders This Month</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl mb-2">📅</div>
          <div className="text-2xl font-bold text-purple-600 mb-1">
            {analytics?.month || new Date().getMonth() + 1}
          </div>
          <div className="text-gray-600">Current Month</div>
        </div>
      </div>
    </div>
  );
}

export default App;