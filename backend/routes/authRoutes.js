const express = require('express');
const router = express.Router();
const { 
  registerUser, 
  loginUser, 
  loginAdminUser,
  verifyUserOtps,
  resendUserOtps,
  getUserProfile,
  updateUserProfile,
  deleteUserAccount
} = require('../controllers/authController');
const { isAuthenticatedUser } = require('../middleware/auth');

router.post('/register', registerUser);
router.post('/verify-otp', verifyUserOtps);
router.post('/resend-otp', resendUserOtps);
router.post('/login', loginUser);
router.post('/admin/login', loginAdminUser);
router.get('/profile', isAuthenticatedUser, getUserProfile);
router.put('/profile', isAuthenticatedUser, updateUserProfile);
router.delete('/profile', isAuthenticatedUser, deleteUserAccount);
router.post('/delete-account', isAuthenticatedUser, deleteUserAccount);
router.delete('/delete-account', isAuthenticatedUser, deleteUserAccount);
router.post('/profile/delete', isAuthenticatedUser, deleteUserAccount);

module.exports = router;
