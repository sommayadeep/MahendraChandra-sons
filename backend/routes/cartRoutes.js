const express = require('express');
const router = express.Router();
const { 
  getCart, 
  addToCart, 
  updateCartItem, 
  removeFromCart,
  clearCart
} = require('../controllers/cartController');
const { isAuthenticatedUser } = require('../middleware/auth');

router.get('/', isAuthenticatedUser, getCart);
router.post('/add', isAuthenticatedUser, addToCart);
router.put('/update', isAuthenticatedUser, updateCartItem);
router.delete('/remove', isAuthenticatedUser, removeFromCart);
router.delete('/clear', isAuthenticatedUser, clearCart);

module.exports = router;

