'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { cartAPI } from '@/lib/api';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [], totalItems: 0, totalPrice: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchCart();
    }
  }, []);

  const fetchCart = async () => {
    try {
      const res = await cartAPI.getCart();
      updateCartState(res.data.cart);
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  };

  const updateCartState = (cartData) => {
    const totalItems = cartData.items.reduce((acc, item) => acc + item.quantity, 0);
    const totalPrice = cartData.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    setCart({
      items: cartData.items,
      totalItems,
      totalPrice
    });
  };

  const addToCart = async (productId, quantity = 1) => {
    setLoading(true);
    try {
      const res = await cartAPI.addToCart({ productId, quantity });
      updateCartState(res.data.cart);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error adding to cart' };
    } finally {
      setLoading(false);
    }
  };

  const updateCartItem = async (productId, quantity) => {
    setLoading(true);
    try {
      const res = await cartAPI.updateCart({ productId, quantity });
      updateCartState(res.data.cart);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error updating cart' };
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (productId) => {
    setLoading(true);
    try {
      const res = await cartAPI.removeFromCart({ productId });
      updateCartState(res.data.cart);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error removing from cart' };
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    try {
      await cartAPI.clearCart();
      setCart({ items: [], totalItems: 0, totalPrice: 0 });
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  return (
    <CartContext.Provider value={{ cart, loading, addToCart, updateCartItem, removeFromCart, clearCart, fetchCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

