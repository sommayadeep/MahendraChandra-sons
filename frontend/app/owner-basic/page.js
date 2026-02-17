'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { productsAPI } from '@/lib/api';

const initialForm = {
  name: '',
  category: 'handbags',
  price: '',
  salePrice: '',
  stock: '',
  image: '',
  description: '',
};

export default function OwnerBasicPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [accessGranted, setAccessGranted] = useState(false);

  const normalizeEmail = (email) => (email || '').trim().toLowerCase().replace(/&/g, '@');
  const ownerEmails = (process.env.NEXT_PUBLIC_OWNER_EMAILS || 'mahendrachandra.sons@gmail.com,mahendrachandra.sons&gmail.com')
    .split(',')
    .map((email) => normalizeEmail(email))
    .filter(Boolean);
  const ownerAccessCode =
    process.env.NEXT_PUBLIC_OWNER_ACCESS_CODE || 'Owner@12345';
  const adminPanelUrl =
    process.env.NEXT_PUBLIC_ADMIN_PANEL_URL ||
    `${(process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/, '')}/admin/login.html`;

  const isOwner =
    !!user && (user.role === 'admin' || ownerEmails.includes(normalizeEmail(user.email)));

  useEffect(() => {
    if (loading) return;
    if (!isOwner) {
      router.replace('/');
      return;
    }
    if (user?.role !== 'admin') {
      setMessage('Your account is not admin. Login with owner admin account.');
      return;
    }
    setAccessGranted(true);
    fetchProducts();
  }, [loading, isOwner, router, user]);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await productsAPI.getAll({ limit: 100, sort: 'newest' });
      setProducts(res.data.products || []);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to load products');
    } finally {
      setLoadingProducts(false);
    }
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    const price = Number(form.price);
    const salePrice = form.salePrice === '' ? undefined : Number(form.salePrice);

    if (salePrice != null && salePrice > price) {
      setMessage('Sale price cannot be greater than regular price');
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category,
      price,
      salePrice,
      stock: Number(form.stock),
      image: form.image.trim(),
      images: [form.image.trim()],
    };

    try {
      if (editingId) {
        await productsAPI.update(editingId, payload);
        setMessage('Product updated');
      } else {
        await productsAPI.create(payload);
        setMessage('Product added');
      }
      setForm(initialForm);
      setEditingId(null);
      await fetchProducts();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to save product');
    }
  };

  const onEdit = (product) => {
    setEditingId(product._id);
    setForm({
      name: product.name || '',
      category: product.category || 'handbags',
      price: String(product.price ?? ''),
      salePrice: product.salePrice == null ? '' : String(product.salePrice),
      stock: String(product.stock ?? ''),
      image: product.images?.[0] || '',
      description: product.description || '',
    });
    setMessage('Editing product');
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await productsAPI.delete(id);
      setMessage('Product deleted');
      await fetchProducts();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to delete product');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(initialForm);
    setMessage('Edit cancelled');
  };

  if (loading || !isOwner) return null;

  const unlockOwnerPage = (e) => {
    e.preventDefault();
    if (accessCodeInput === ownerAccessCode) {
      setAccessGranted(true);
      setAccessCodeInput('');
    } else {
      setMessage('Wrong owner access password');
    }
  };

  if (!accessGranted && user?.role === 'admin') {
    return (
      <div className="pt-24 pb-16 min-h-screen bg-luxury-black">
        <div className="max-w-md mx-auto px-4">
          <h1 className="font-serif text-2xl text-white mb-3">Owner Basic Access</h1>
          <p className="text-gray-400 mb-4">Enter owner access password (same as owner admin password).</p>
          <form onSubmit={unlockOwnerPage} className="space-y-3 card p-4">
            <input
              type="password"
              value={accessCodeInput}
              onChange={(e) => setAccessCodeInput(e.target.value)}
              required
              placeholder="Owner password"
              className="input-field"
            />
            <button type="submit" className="btn-primary w-full">Unlock</button>
          </form>
          {message && <p className="text-red-400 mt-3">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 min-h-screen bg-luxury-black">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div>
          <h1 className="font-serif text-3xl text-white">Owner Basic Page</h1>
          <p className="text-gray-400">Plain product management page.</p>
          <p className="text-gray-400 mt-2">
            Full panel: <a className="text-gold-500 hover:text-gold-400" href={adminPanelUrl} target="_blank" rel="noreferrer">Open Admin Panel</a>
          </p>
        </div>

        <div className="card p-6">
          <form onSubmit={onSubmit} className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-300">Product Name</label>
              <input name="name" value={form.name} onChange={onChange} required className="input-field mt-1" />
            </div>

            <div>
              <label className="text-gray-300">Type / Category</label>
              <select name="category" value={form.category} onChange={onChange} required className="input-field mt-1">
                <option value="handbags">Handbags</option>
                <option value="trolley-luggage">Trolley Luggage</option>
                <option value="travel-bags">Travel Bags</option>
                <option value="backpacks">Backpacks</option>
              </select>
            </div>

            <div>
              <label className="text-gray-300">Regular Price</label>
              <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={onChange} required className="input-field mt-1" />
            </div>

            <div>
              <label className="text-gray-300">Discount Price (Sale Price)</label>
              <input name="salePrice" type="number" min="0" step="0.01" value={form.salePrice} onChange={onChange} className="input-field mt-1" />
            </div>

            <div>
              <label className="text-gray-300">Stock</label>
              <input name="stock" type="number" min="0" step="1" value={form.stock} onChange={onChange} required className="input-field mt-1" />
            </div>

            <div>
              <label className="text-gray-300">Image URL</label>
              <input name="image" value={form.image} onChange={onChange} required className="input-field mt-1" />
            </div>

            <div className="md:col-span-2">
              <label className="text-gray-300">Description</label>
              <textarea name="description" rows={3} value={form.description} onChange={onChange} required className="input-field mt-1" />
            </div>

            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="btn-primary">{editingId ? 'Update Product' : 'Add Product'}</button>
              {editingId && (
                <button type="button" onClick={cancelEdit} className="px-4 py-2 border border-gray-600 text-gray-200 hover:bg-gray-800">
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
          {message && <p className="text-gold-400 mt-3">{message}</p>}
        </div>

        <div className="card p-6">
          <h2 className="font-serif text-xl text-white mb-4">Products</h2>
          {loadingProducts ? (
            <p className="text-gray-400">Loading...</p>
          ) : products.length === 0 ? (
            <p className="text-gray-400">No products available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-300">
                    <th className="text-left py-2">Name</th>
                    <th className="text-left py-2">Type</th>
                    <th className="text-left py-2">Price</th>
                    <th className="text-left py-2">Discount Price</th>
                    <th className="text-left py-2">Stock</th>
                    <th className="text-left py-2">Image</th>
                    <th className="text-left py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product._id} className="border-b border-gray-800 text-gray-200">
                      <td className="py-2">{product.name}</td>
                      <td className="py-2">{product.category}</td>
                      <td className="py-2">{product.price}</td>
                      <td className="py-2">{product.salePrice ?? '-'}</td>
                      <td className="py-2">{product.stock}</td>
                      <td className="py-2">
                        <a className="text-gold-500 hover:text-gold-400" href={product.images?.[0]} target="_blank" rel="noreferrer">
                          View Image
                        </a>
                      </td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <button onClick={() => onEdit(product)} className="px-3 py-1 border border-gray-600 hover:bg-gray-800">Edit</button>
                          <button onClick={() => onDelete(product._id)} className="px-3 py-1 border border-red-700 text-red-300 hover:bg-red-900/30">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
