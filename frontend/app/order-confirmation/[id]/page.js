'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ordersAPI } from '@/lib/api';

const OrderConfirmationPage = () => {
  const params = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await ordersAPI.getOrder(params.id);
        setOrder(res.data.order);
      } catch (error) {
        console.error('Error fetching order:', error);
      } finally {
        setLoading(false);
      }
    };
    if (params.id) {
      fetchOrder();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="pt-24 pb-20 min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-white">Loading...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="pt-24 pb-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">Order not found</h1>
          <Link href="/" className="btn-primary inline-block">Go Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-serif text-3xl lg:text-4xl text-white mb-4">Order Confirmed!</h1>
          <p className="text-gray-400">Thank you for your order. We will process it soon.</p>
          <p className="text-gold-500 mt-2">Order ID: #{order._id.slice(-8).toUpperCase()}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6 mb-8"
        >
          <h2 className="font-serif text-xl text-white mb-6">Order Details</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-400">Status</span>
              <span className="text-yellow-500">{order.orderStatus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Payment Method</span>
              <span className="text-white">{order.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total Amount</span>
              <span className="text-white font-semibold">₹{order.totalPrice.toLocaleString()}</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-6 mb-8"
        >
          <h2 className="font-serif text-xl text-white mb-6">Shipping Address</h2>
          <div className="text-gray-400">
            <p className="text-white">{order.shippingAddress.fullName}</p>
            <p>{order.shippingAddress.address}</p>
            <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
            <p className="mt-2">Phone: {order.phone}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-6 mb-8"
        >
          <h2 className="font-serif text-xl text-white mb-6">Order Items</h2>
          <div className="space-y-4">
            {order.orderItems.map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <img
                  src={item.image || '/images/placeholder.jpg'}
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1">
                  <p className="text-white">{item.name}</p>
                  <p className="text-gray-400 text-sm">Qty: {item.quantity} × ₹{item.price.toLocaleString()}</p>
                </div>
                <p className="text-white font-semibold">₹{(item.price * item.quantity).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="text-center space-y-4">
          <Link href="/dashboard" className="btn-primary inline-block">
            View All Orders
          </Link>
          <br />
          <Link href="/shop" className="text-gold-500 hover:underline">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmationPage;

