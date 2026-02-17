const express = require('express');
const router = express.Router();
const { 
  getProducts, 
  getProduct, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  deduplicateProducts,
  getFeaturedProducts,
  getCategories,
  addProductReview
} = require('../controllers/productController');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/featured', getFeaturedProducts);
router.get('/categories', getCategories);
router.get('/:id', getProduct);
router.get('/', getProducts);

// Protected routes - Admin only
router.post('/', isAuthenticatedUser, authorizeRoles('admin'), upload.single('image'), createProduct);
router.post('/deduplicate', isAuthenticatedUser, authorizeRoles('admin'), deduplicateProducts);
router.put('/:id', isAuthenticatedUser, authorizeRoles('admin'), upload.single('image'), updateProduct);
router.delete('/:id', isAuthenticatedUser, authorizeRoles('admin'), deleteProduct);

// Review - Protected (any logged in user)
router.post('/:id/review', isAuthenticatedUser, addProductReview);

module.exports = router;
