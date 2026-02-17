const express = require('express');
const router = express.Router();
const { 
  createOrder, 
  getMyOrders, 
  getOrder,
  getAllOrders,
  getOrdersForAdmin,
  updateOrderStatus,
  acceptOrder,
  updateOrderTracking,
  deleteOrder,
  getOrdersByUserId,
  getOrderAnalytics,
  requestReturnOrExchange,
  getReturnExchangeRequests,
  updateReturnExchangeStatus
} = require('../controllers/orderController');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');

router.post('/', isAuthenticatedUser, createOrder);
router.get('/my-orders', isAuthenticatedUser, getMyOrders);
router.get('/user/:userId', isAuthenticatedUser, getOrdersByUserId);
router.get('/analytics', isAuthenticatedUser, authorizeRoles('admin'), getOrderAnalytics);
router.get('/returns', isAuthenticatedUser, authorizeRoles('admin'), getReturnExchangeRequests);
router.put('/returns/:requestId/status', isAuthenticatedUser, authorizeRoles('admin'), updateReturnExchangeStatus);

// Admin routes
router.get('/', isAuthenticatedUser, authorizeRoles('admin'), getOrdersForAdmin);
router.get('/all', isAuthenticatedUser, authorizeRoles('admin'), getAllOrders);
router.put('/:id/accept', isAuthenticatedUser, authorizeRoles('admin'), acceptOrder);
router.put('/:id/tracking', isAuthenticatedUser, authorizeRoles('admin'), updateOrderTracking);
router.put('/:id/status', isAuthenticatedUser, authorizeRoles('admin'), updateOrderStatus);
router.delete('/:id', isAuthenticatedUser, authorizeRoles('admin'), deleteOrder);
router.post('/:id/return-exchange', isAuthenticatedUser, requestReturnOrExchange);

// User order
router.get('/:id', isAuthenticatedUser, getOrder);

module.exports = router;
