import axios from 'axios';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = String(error.config?.url || '');
    const isAuthLoginRequest =
      requestUrl.includes('/auth/login') || requestUrl.includes('/auth/admin/login');

    if (status === 401 && !isAuthLoginRequest) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  verifyOtp: (data) => api.post('/auth/verify-otp', data),
  resendOtp: (data) => api.post('/auth/resend-otp', data),
  login: (data) => api.post('/auth/login', data),
  adminLogin: (data) => api.post('/auth/admin/login', data),
  googleLogin: (data) => api.post('/auth/google-login', data),
  sendPhoneLoginOtp: (data) => api.post('/auth/login-phone/send-otp', data),
  verifyPhoneLoginOtp: (data) => api.post('/auth/login-phone/verify-otp', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  deleteAccount: () => api.post('/auth/delete-account'),
};

// Products API
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getFeatured: () => api.get('/products/featured'),
  getOne: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  getCategories: () => api.get('/products/categories'),
  addReview: (id, data) => api.post(`/products/${id}/review`, data),
};

// Cart API
export const cartAPI = {
  getCart: () => api.get('/cart'),
  addToCart: (data) => api.post('/cart/add', data),
  updateCart: (data) => api.put('/cart/update', data),
  removeFromCart: (data) => api.delete('/cart/remove', { data }),
  clearCart: () => api.delete('/cart/clear'),
};

// Orders API
export const ordersAPI = {
  createOrder: (data) => api.post('/orders', data),
  getMyOrders: () => api.get('/orders/my-orders'),
  getOrder: (id) => api.get(`/orders/${id}`),
  getAllOrders: (params) => api.get('/orders/all', { params }),
  updateOrderStatus: (id, data) => api.put(`/orders/${id}/status`, data),
  requestReturnExchange: (id, data) => api.post(`/orders/${id}/return-exchange`, data),
  getReturnExchangeRequests: () => api.get('/orders/returns'),
  updateReturnExchangeStatus: (requestId, data) => api.put(`/orders/returns/${requestId}/status`, data),
  getAnalytics: () => api.get('/orders/analytics'),
};

// Contact API
export const contactAPI = {
  sendMessage: (data) => api.post('/contact', data),
};

export default api;
