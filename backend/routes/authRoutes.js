const express = require('express');
const router = express.Router();
const { 
  registerUser, 
  loginUser, 
  loginAdminUser,
  googleLogin,
  sendPhoneLoginOtp,
  verifyPhoneLoginOtp,
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
router.post('/google-login', googleLogin);
router.post('/login-phone/send-otp', sendPhoneLoginOtp);
router.post('/login-phone/verify-otp', verifyPhoneLoginOtp);
router.post('/admin/login', loginAdminUser);
router.get('/profile', isAuthenticatedUser, getUserProfile);
router.put('/profile', isAuthenticatedUser, updateUserProfile);
router.delete('/profile', isAuthenticatedUser, deleteUserAccount);
router.post('/delete-account', isAuthenticatedUser, deleteUserAccount);
router.delete('/delete-account', isAuthenticatedUser, deleteUserAccount);
router.post('/profile/delete', isAuthenticatedUser, deleteUserAccount);

module.exports = router;
