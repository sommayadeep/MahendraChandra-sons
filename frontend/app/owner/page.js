'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { authAPI, productsAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const initialForm = {
  name: '',
  price: '',
  salePrice: '',
  category: 'handbags',
  stock: '',
  image: '',
  description: '',
};

const initialSellerForm = {
  name: '',
  email: '',
  phone: '',
  address: '',
  storeName: '',
  city: '',
  state: '',
  pincode: '',
  gstNumber: '',
};

const OwnerPage = () => {
  const router = useRouter();
  const { user, loading: authLoading, updateUser } = useAuth();

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [sellerForm, setSellerForm] = useState(initialSellerForm);
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [accessGranted, setAccessGranted] = useState(false);

  const normalizeEmail = (email) => (email || '').trim().toLowerCase().replace(/&/g, '@');
  const ownerEmails = (process.env.NEXT_PUBLIC_OWNER_EMAILS || 'mahendrachandra.sons@gmail.com,mahendrachandra.sons&gmail.com')
    .split(',')
    .map((email) => normalizeEmail(email))
    .filter(Boolean);

  const isOwner =
    !!user && (user.role === 'admin' || ownerEmails.includes(normalizeEmail(user.email)));
  const ownerAccessCode =
    process.env.NEXT_PUBLIC_OWNER_ACCESS_CODE || 'mahendrachandra&sons790275@gmail.com';

  useEffect(() => {
    if (authLoading) return;

    if (!isOwner) {
      toast.error('Access denied');
      router.replace('/');
      return;
    }

    fetchProducts();
  }, [authLoading, isOwner, router]);

  useEffect(() => {
    if (!user) return;
    setSellerForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      address: user.address || '',
      storeName: user.storeName || '',
      city: user.city || '',
      state: user.state || '',
      pincode: user.pincode || '',
      gstNumber: user.gstNumber || '',
    });
  }, [user]);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await productsAPI.getAll({ limit: 100, sort: 'newest' });
      setProducts(res.data.products || []);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSellerChange = (e) => {
    const { name, value } = e.target;
    setSellerForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSellerSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const payload = {
        name: sellerForm.name.trim(),
        phone: sellerForm.phone.trim(),
        address: sellerForm.address.trim(),
        storeName: sellerForm.storeName.trim(),
        city: sellerForm.city.trim(),
        state: sellerForm.state.trim(),
        pincode: sellerForm.pincode.trim(),
        gstNumber: sellerForm.gstNumber.trim(),
      };

      const res = await authAPI.updateProfile(payload);
      updateUser(res.data.user);
      toast.success('Seller profile updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const regularPrice = Number(formData.price);
      const salePriceNum = formData.salePrice === '' ? undefined : Number(formData.salePrice);

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: regularPrice,
        salePrice: salePriceNum,
        category: formData.category,
        stock: Number(formData.stock),
        images: [formData.image.trim()],
      };

      if (editingProductId) {
        await productsAPI.update(editingProductId, payload);
        toast.success('Product updated');
      } else {
        await productsAPI.create(payload);
        toast.success('Product added');
      }

      setFormData(initialForm);
      setEditingProductId(null);
      await fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProductId(product._id);
    setFormData({
      name: product.name || '',
      price: String(product.price ?? ''),
      salePrice: product.salePrice == null ? '' : String(product.salePrice),
      category: product.category || 'handbags',
      stock: String(product.stock ?? ''),
      image: product.images?.[0] || '',
      description: product.description || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await productsAPI.delete(id);
      toast.success('Product deleted');
      await fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete product');
    }
  };

  const handleCancelEdit = () => {
    setEditingProductId(null);
    setFormData(initialForm);
  };

  if (authLoading || !isOwner) return null;

  const unlockOwnerPage = (e) => {
    e.preventDefault();
    if (accessCodeInput === ownerAccessCode) {
      setAccessGranted(true);
      setAccessCodeInput('');
    } else {
      toast.error('Wrong owner access password');
    }
  };

  if (!accessGranted) {
    return (
      <div className="pt-24 pb-16 min-h-screen bg-luxury-black">
        <div className="max-w-md mx-auto px-4">
          <h1 className="font-serif text-2xl text-white mb-3">Owner Access</h1>
          <p className="text-gray-400 mb-4">Enter owner access password.</p>
          <form onSubmit={unlockOwnerPage} className="space-y-3">
            <input
              type="password"
              value={accessCodeInput}
              onChange={(e) => setAccessCodeInput(e.target.value)}
              className="input-field"
              placeholder="Owner password"
              required
            />
            <button type="submit" className="btn-primary">Unlock</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 min-h-screen bg-luxury-black">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div>
          <h1 className="font-serif text-3xl text-white">Seller Dashboard</h1>
          <p className="text-gray-400">Manage your seller profile and products from one place.</p>
        </div>

        <div className="card p-6">
          <h2 className="font-serif text-xl text-white mb-4">Seller Profile</h2>
          <form onSubmit={handleSellerSave} className="grid md:grid-cols-2 gap-4">
            <input
              name="name"
              value={sellerForm.name}
              onChange={handleSellerChange}
              required
              className="input-field"
              placeholder="Seller name"
            />
            <input
              name="storeName"
              value={sellerForm.storeName}
              onChange={handleSellerChange}
              className="input-field"
              placeholder="Store name"
            />
            <input
              name="email"
              value={sellerForm.email}
              disabled
              className="input-field opacity-60 cursor-not-allowed"
              placeholder="Email"
            />
            <input
              name="phone"
              value={sellerForm.phone}
              onChange={handleSellerChange}
              className="input-field"
              placeholder="Phone"
            />
            <input
              name="address"
              value={sellerForm.address}
              onChange={handleSellerChange}
              className="input-field md:col-span-2"
              placeholder="Address"
            />
            <input
              name="city"
              value={sellerForm.city}
              onChange={handleSellerChange}
              className="input-field"
              placeholder="City"
            />
            <input
              name="state"
              value={sellerForm.state}
              onChange={handleSellerChange}
              className="input-field"
              placeholder="State"
            />
            <input
              name="pincode"
              value={sellerForm.pincode}
              onChange={handleSellerChange}
              className="input-field"
              placeholder="Pincode"
            />
            <input
              name="gstNumber"
              value={sellerForm.gstNumber}
              onChange={handleSellerChange}
              className="input-field"
              placeholder="GST number"
            />
            <div className="md:col-span-2">
              <button type="submit" disabled={savingProfile} className="btn-primary disabled:opacity-50">
                {savingProfile ? 'Saving Profile...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>

        <div className="card p-6">
          <h2 className="font-serif text-xl text-white mb-4">
            {editingProductId ? 'Update Product' : 'Add Product'}
          </h2>

          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="input-field"
              placeholder="Product name"
            />

            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="input-field"
              required
            >
              <option value="handbags">Handbags</option>
              <option value="trolley-luggage">Trolley Luggage</option>
              <option value="travel-bags">Travel Bags</option>
              <option value="backpacks">Backpacks</option>
            </select>

            <input
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={handleChange}
              required
              className="input-field"
              placeholder="Regular price"
            />

            <input
              name="salePrice"
              type="number"
              min="0"
              step="0.01"
              value={formData.salePrice}
              onChange={handleChange}
              className="input-field"
              placeholder="Sale price (optional)"
            />

            <input
              name="stock"
              type="number"
              min="0"
              step="1"
              value={formData.stock}
              onChange={handleChange}
              required
              className="input-field"
              placeholder="Stock quantity"
            />

            <input
              name="image"
              value={formData.image}
              onChange={handleChange}
              required
              className="input-field"
              placeholder="Image URL"
            />

            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              className="input-field md:col-span-2"
              rows={3}
              placeholder="Product description"
            />

            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? 'Saving...' : editingProductId ? 'Update Product' : 'Add Product'}
              </button>
              {editingProductId && (
                <button type="button" onClick={handleCancelEdit} className="btn-secondary">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="card p-6">
          <h2 className="font-serif text-xl text-white mb-4">Products</h2>

          {loadingProducts ? (
            <p className="text-gray-400">Loading products...</p>
          ) : products.length === 0 ? (
            <p className="text-gray-400">No products found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="text-left py-2 pr-3">Name</th>
                    <th className="text-left py-2 pr-3">Type</th>
                    <th className="text-left py-2 pr-3">Price</th>
                    <th className="text-left py-2 pr-3">Sale Price</th>
                    <th className="text-left py-2 pr-3">Stock</th>
                    <th className="text-left py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product._id} className="border-b border-gray-900 text-white">
                      <td className="py-3 pr-3">{product.name}</td>
                      <td className="py-3 pr-3 capitalize">{product.category}</td>
                      <td className="py-3 pr-3">₹{product.price?.toLocaleString()}</td>
                      <td className="py-3 pr-3">
                        {product.salePrice != null ? `₹${product.salePrice.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-3 pr-3">{product.stock}</td>
                      <td className="py-3 flex gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="text-gold-500 border border-gold-500/30 px-3 py-1"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(product._id)}
                          className="text-red-500 border border-red-500/30 px-3 py-1"
                        >
                          Delete
                        </button>
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
};

export default OwnerPage;
