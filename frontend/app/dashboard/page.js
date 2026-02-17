'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { authAPI, ordersAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const DashboardPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, updateUser, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('orders');
  const [savingProfile, setSavingProfile] = useState(false);
  const [requestingOrderId, setRequestingOrderId] = useState('');
  const [requestForms, setRequestForms] = useState({});
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchOrders();
  }, [user, router]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'profile' || tab === 'orders' || tab === 'address') {
      setActiveSection(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    setProfileForm({
      name: user.name || '',
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
      state: user.state || '',
      pincode: user.pincode || '',
    });
  }, [user]);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'}/orders/user/${user.id}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || 'Failed to fetch orders');
      }
      setOrders(data.orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Processing': return 'text-yellow-500';
      case 'Shipped': return 'text-blue-500';
      case 'Delivered': return 'text-green-500';
      case 'Cancelled': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getLatestReturnExchangeRequest = (order) => {
    const requests = order.returnExchangeRequests || [];
    if (requests.length === 0) return null;
    return [...requests].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  };

  const updateRequestForm = (orderId, field, value) => {
    setRequestForms((prev) => ({
      ...prev,
      [orderId]: {
        requestType: 'Return',
        reason: '',
        refundMode: 'UPI',
        upiId: '',
        accountHolderName: '',
        accountNumber: '',
        ifscCode: '',
        bankName: '',
        ...(prev[orderId] || {}),
        [field]: value
      }
    }));
  };

  const submitReturnExchangeRequest = async (orderId) => {
    const form = requestForms[orderId] || {};
    setRequestingOrderId(orderId);
    try {
      await ordersAPI.requestReturnExchange(orderId, {
        requestType: form.requestType || 'Return',
        reason: form.reason || '',
        refundMode: form.refundMode || 'UPI',
        upiId: form.refundMode === 'UPI' ? (form.upiId || '') : '',
        accountHolderName: form.refundMode === 'Bank' ? (form.accountHolderName || '') : '',
        accountNumber: form.refundMode === 'Bank' ? (form.accountNumber || '') : '',
        ifscCode: form.refundMode === 'Bank' ? (form.ifscCode || '') : '',
        bankName: form.refundMode === 'Bank' ? (form.bankName || '') : ''
      });
      toast.success('Request submitted');
      await fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit request');
    } finally {
      setRequestingOrderId('');
    }
  };

  if (!user) {
    return null;
  }

  const handleProfileChange = (e) => {
    setProfileForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const payload = {
        name: profileForm.name.trim(),
        phone: profileForm.phone.trim(),
        address: profileForm.address.trim(),
        city: profileForm.city.trim(),
        state: profileForm.state.trim(),
        pincode: profileForm.pincode.trim(),
      };
      const res = await authAPI.updateProfile(payload);
      updateUser(res.data.user);
      toast.success('Profile updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmation = window.prompt('Type DELETE to confirm account deletion');
    if (confirmation !== 'DELETE') {
      toast.error('Account deletion cancelled');
      return;
    }

    try {
      const token = localStorage.getItem('token') || '';
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
      const attempts = [
        { url: `${baseUrl}/auth/delete-account`, method: 'POST' },
        { url: `${baseUrl}/auth/delete-account`, method: 'DELETE' },
        { url: `${baseUrl}/auth/profile/delete`, method: 'POST' },
        { url: `${baseUrl}/auth/profile`, method: 'DELETE' },
      ];

      let lastError = 'Delete failed';
      let deleted = false;

      for (const attempt of attempts) {
        const res = await fetch(attempt.url, {
          method: attempt.method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok && data.success !== false) {
          deleted = true;
          break;
        }

        // Try next route only when endpoint not found
        if (res.status === 404) {
          lastError = `Delete failed (404): endpoint not found ${attempt.method} ${attempt.url}`;
          continue;
        }

        lastError = data.message || `Delete failed (${res.status})`;
        break;
      }

      if (!deleted) {
        throw new Error(lastError);
      }

      toast.success('Your account has been deleted');
      logout();
    } catch (error) {
      toast.error(error.message || 'Failed to delete account');
    }
  };

  return (
    <div className="pt-24 pb-20 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-serif text-3xl lg:text-4xl text-white mb-2">My Account</h1>
          <p className="text-gray-400">Welcome back, {user.name}</p>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="card p-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-luxury-charcoal rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-gold-500 font-serif text-3xl">{user.name?.charAt(0)}</span>
                </div>
                <h3 className="text-white font-medium">{user.name}</h3>
                <p className="text-gray-400 text-sm">{user.email}</p>
              </div>
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveSection('orders')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    activeSection === 'orders'
                      ? 'bg-luxury-charcoal text-gold-500'
                      : 'text-gray-400 hover:text-white transition-colors'
                  }`}
                >
                  My Orders
                </button>
                <button
                  onClick={() => setActiveSection('profile')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    activeSection === 'profile'
                      ? 'bg-luxury-charcoal text-gold-500'
                      : 'text-gray-400 hover:text-white transition-colors'
                  }`}
                >
                  Profile Settings
                </button>
                <button
                  onClick={() => setActiveSection('address')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    activeSection === 'address'
                      ? 'bg-luxury-charcoal text-gold-500'
                      : 'text-gray-400 hover:text-white transition-colors'
                  }`}
                >
                  Addresses
                </button>
              </nav>
            </div>
          </div>

          {/* Orders */}
          <div className="lg:col-span-3">
            {activeSection === 'orders' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h2 className="font-serif text-xl text-white mb-6">My Orders</h2>

                {loading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="card p-6 animate-pulse">
                        <div className="h-4 bg-luxury-charcoal rounded w-1/4 mb-4"></div>
                        <div className="h-20 bg-luxury-charcoal rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : orders.length === 0 ? (
                  <div className="card p-12 text-center">
                    <p className="text-gray-400 mb-4">You haven't placed any orders yet</p>
                    <Link href="/shop" className="btn-primary inline-block">
                      Start Shopping
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order._id} className="card p-6">
                        <div className="flex flex-wrap justify-between items-start mb-4">
                          <div>
                            <p className="text-gray-400 text-sm">Order ID</p>
                            <p className="text-white font-medium">#{order._id.slice(-8).toUpperCase()}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-sm">Date</p>
                            <p className="text-white">{new Date(order.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-sm">Status</p>
                            <p className={`font-medium ${getStatusColor(order.orderStatus)}`}>
                              {order.orderStatus}
                            </p>
                            {order.trackingId && (
                              <p className="text-gray-400 text-xs mt-1">Tracking: {order.trackingId}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-gray-400 text-sm">Total</p>
                            <p className="text-white font-semibold">₹{order.totalPrice.toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="border-t border-gray-800 pt-4">
                          <p className="text-gray-400 text-sm mb-3">Items:</p>
                          <div className="flex flex-wrap gap-3">
                            {order.orderItems.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2 bg-luxury-charcoal px-3 py-2 rounded">
                                <img
                                  src={item.image || '/images/placeholder.jpg'}
                                  alt={item.name}
                                  className="w-10 h-10 object-cover rounded"
                                />
                                <div>
                                  <p className="text-white text-sm">{item.name}</p>
                                  <p className="text-gray-500 text-xs">Qty: {item.quantity}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {order.orderStatus === 'Delivered' && (
                          <div className="mt-4 pt-4 border-t border-gray-800">
                            <p className="text-gray-400 text-sm mb-2">Return / Exchange</p>
                            {(() => {
                              const latestRequest = getLatestReturnExchangeRequest(order);
                              if (latestRequest) {
                                return (
                                  <p className="text-sm text-gray-300 mb-3">
                                    Latest Request: <span className="text-gold-500">{latestRequest.requestType}</span> | Status: <span className="text-gold-500">{latestRequest.status}</span>
                                  </p>
                                );
                              }

                              return <p className="text-sm text-gray-500 mb-3">No return/exchange request raised.</p>;
                            })()}
                            <div className="grid md:grid-cols-2 gap-3">
                              <select
                                value={(requestForms[order._id] || {}).requestType || 'Return'}
                                onChange={(e) => updateRequestForm(order._id, 'requestType', e.target.value)}
                                className="input-field"
                                disabled={
                                  requestingOrderId === order._id ||
                                  ['Requested', 'Approved'].includes((getLatestReturnExchangeRequest(order) || {}).status)
                                }
                              >
                                <option value="Return">Return</option>
                                <option value="Exchange">Exchange</option>
                              </select>
                              <select
                                value={(requestForms[order._id] || {}).refundMode || 'UPI'}
                                onChange={(e) => updateRequestForm(order._id, 'refundMode', e.target.value)}
                                className="input-field"
                                disabled={
                                  requestingOrderId === order._id ||
                                  ['Requested', 'Approved'].includes((getLatestReturnExchangeRequest(order) || {}).status)
                                }
                              >
                                <option value="UPI">UPI ID</option>
                                <option value="Bank">Bank Details</option>
                              </select>
                              <textarea
                                value={(requestForms[order._id] || {}).reason || ''}
                                onChange={(e) => updateRequestForm(order._id, 'reason', e.target.value)}
                                className="input-field md:col-span-2"
                                rows={2}
                                placeholder="Reason for return/exchange"
                                disabled={
                                  requestingOrderId === order._id ||
                                  ['Requested', 'Approved'].includes((getLatestReturnExchangeRequest(order) || {}).status)
                                }
                              />
                              {((requestForms[order._id] || {}).refundMode || 'UPI') === 'UPI' ? (
                                <input
                                  value={(requestForms[order._id] || {}).upiId || ''}
                                  onChange={(e) => updateRequestForm(order._id, 'upiId', e.target.value)}
                                  className="input-field md:col-span-2"
                                  placeholder="UPI ID (example@upi)"
                                  disabled={
                                    requestingOrderId === order._id ||
                                    ['Requested', 'Approved'].includes((getLatestReturnExchangeRequest(order) || {}).status)
                                  }
                                />
                              ) : (
                                <>
                                  <input
                                    value={(requestForms[order._id] || {}).accountHolderName || ''}
                                    onChange={(e) => updateRequestForm(order._id, 'accountHolderName', e.target.value)}
                                    className="input-field"
                                    placeholder="Account Holder Name"
                                    disabled={
                                      requestingOrderId === order._id ||
                                      ['Requested', 'Approved'].includes((getLatestReturnExchangeRequest(order) || {}).status)
                                    }
                                  />
                                  <input
                                    value={(requestForms[order._id] || {}).bankName || ''}
                                    onChange={(e) => updateRequestForm(order._id, 'bankName', e.target.value)}
                                    className="input-field"
                                    placeholder="Bank Name"
                                    disabled={
                                      requestingOrderId === order._id ||
                                      ['Requested', 'Approved'].includes((getLatestReturnExchangeRequest(order) || {}).status)
                                    }
                                  />
                                  <input
                                    value={(requestForms[order._id] || {}).accountNumber || ''}
                                    onChange={(e) => updateRequestForm(order._id, 'accountNumber', e.target.value)}
                                    className="input-field"
                                    placeholder="Account Number"
                                    disabled={
                                      requestingOrderId === order._id ||
                                      ['Requested', 'Approved'].includes((getLatestReturnExchangeRequest(order) || {}).status)
                                    }
                                  />
                                  <input
                                    value={(requestForms[order._id] || {}).ifscCode || ''}
                                    onChange={(e) => updateRequestForm(order._id, 'ifscCode', e.target.value)}
                                    className="input-field"
                                    placeholder="IFSC Code"
                                    disabled={
                                      requestingOrderId === order._id ||
                                      ['Requested', 'Approved'].includes((getLatestReturnExchangeRequest(order) || {}).status)
                                    }
                                  />
                                </>
                              )}
                            </div>
                            <div className="mt-3">
                              <button
                                type="button"
                                onClick={() => submitReturnExchangeRequest(order._id)}
                                disabled={
                                  requestingOrderId === order._id ||
                                  ['Requested', 'Approved'].includes((getLatestReturnExchangeRequest(order) || {}).status)
                                }
                                className="bg-luxury-charcoal text-white px-3 py-2 text-sm border border-gray-700 hover:border-gold-500 disabled:opacity-50"
                              >
                                Submit Request
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-gray-800 flex justify-end">
                          <Link
                            href={`/order-confirmation/${order._id}`}
                            className="text-gold-500 hover:text-gold-400 text-sm"
                          >
                            View Details →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeSection === 'profile' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="font-serif text-xl text-white mb-6">Profile Settings</h2>
                <form onSubmit={handleProfileSubmit} className="card p-6 grid md:grid-cols-2 gap-4">
                  <input name="name" value={profileForm.name} onChange={handleProfileChange} required className="input-field" placeholder="Full name" />
                  <input value={user.email} disabled className="input-field opacity-60 cursor-not-allowed" placeholder="Email" />
                  <input name="phone" value={profileForm.phone} onChange={handleProfileChange} className="input-field" placeholder="Phone number" />
                  <input name="pincode" value={profileForm.pincode} onChange={handleProfileChange} className="input-field" placeholder="Pincode" />
                  <input name="city" value={profileForm.city} onChange={handleProfileChange} className="input-field" placeholder="City" />
                  <input name="state" value={profileForm.state} onChange={handleProfileChange} className="input-field" placeholder="State" />
                  <textarea name="address" value={profileForm.address} onChange={handleProfileChange} rows={3} className="input-field md:col-span-2" placeholder="Address" />
                  <div className="md:col-span-2">
                    <button type="submit" disabled={savingProfile} className="btn-primary disabled:opacity-50">
                      {savingProfile ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                  <div className="md:col-span-2 pt-4 border-t border-gray-800">
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      className="bg-red-600 text-white px-4 py-2 hover:bg-red-700 transition-colors"
                    >
                      Delete My Account
                    </button>
                    <p className="text-gray-500 text-xs mt-2">
                      This will permanently remove your account and cart data.
                    </p>
                  </div>
                </form>
              </motion.div>
            )}

            {activeSection === 'address' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
                <h2 className="font-serif text-xl text-white mb-4">Saved Address</h2>
                <p className="text-gray-300 mb-2">{profileForm.address || 'No address saved yet.'}</p>
                <p className="text-gray-400">
                  {[profileForm.city, profileForm.state, profileForm.pincode].filter(Boolean).join(', ') || 'Add city/state/pincode in Profile Settings.'}
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
