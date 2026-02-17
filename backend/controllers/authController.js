const User = require('../models/User');
const Cart = require('../models/Cart');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendVerificationOtpEmail } = require('../utils/sendEmail');
const { sendVerificationOtpSms } = require('../utils/sendSms');

const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  address: user.address,
  storeName: user.storeName,
  city: user.city,
  state: user.state,
  pincode: user.pincode,
  gstNumber: user.gstNumber
  ,
  isEmailVerified: user.isEmailVerified,
  isPhoneVerified: user.isPhoneVerified
});

const normalizeEmail = (email) =>
  String(email || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, '@');
const normalizePhone = (phone) =>
  String(phone || '')
    .replace(/\s+/g, '')
    .replace(/^\+91/, '')
    .replace(/[^\d]/g, '');

const getOwnerPasswordCandidates = () =>
  [
    process.env.OWNER_PASSWORD || '',
    ...(process.env.OWNER_PASSWORD_LEGACY || '')
      .split(',')
      .map((p) => String(p || '').trim())
  ].filter(Boolean);

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

const generateNumericOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const hashOtp = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');
const OTP_WINDOW_MS = 10 * 60 * 1000;

const createAndStoreOtps = async (user) => {
  const emailOtp = generateNumericOtp();
  const expiry = new Date(Date.now() + OTP_WINDOW_MS);

  user.emailOtpHash = hashOtp(emailOtp);
  user.emailOtpExpires = expiry;
  await user.save();

  return { emailOtp };
};

const sendOtps = async (user, emailOtp) => {
  await sendVerificationOtpEmail({
    toEmail: user.email,
    otp: emailOtp,
    name: user.name
  });
};

const sendJsonError = (res, status, message) =>
  res.status(status).json({ success: false, message });

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, address, storeName, city, state, pincode, gstNumber } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);

    // If user exists and is verified, block duplicate registration.
    // If user exists but unverified, refresh profile/password and continue OTP flow.
    let user = await User.findOne({ email: normalizedEmail }).select('+password +emailOtpHash +phoneOtpHash');
    if (user && user.isEmailVerified && user.isPhoneVerified) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    if (!user) {
      user = await User.create({
        name,
        email: normalizedEmail,
        password,
      phone: normalizedPhone,
        address,
        storeName,
        city,
        state,
        pincode,
        gstNumber,
        isEmailVerified: false,
        isPhoneVerified: false
      });
    } else {
      user.name = name;
      user.password = password;
      user.phone = normalizedPhone;
      user.address = address || '';
      user.storeName = storeName || '';
      user.city = city || '';
      user.state = state || '';
      user.pincode = pincode || '';
      user.gstNumber = gstNumber || '';
      user.isEmailVerified = false;
      user.isPhoneVerified = false;
      await user.save();
    }

    const { emailOtp } = await createAndStoreOtps(user);
    await sendOtps(user, emailOtp);

    const response = {
      success: true,
      message: 'Account created. Verify email OTP to continue.',
      requiresVerification: true,
      email: user.email
    };

    if (process.env.NODE_ENV !== 'production') {
      response.devOtps = { emailOtp };
    }

    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const ownerEmail = normalizeEmail(process.env.OWNER_EMAIL || '');
    const ownerPasswords = getOwnerPasswordCandidates();

    // Validate email & password
    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    const ownerLegacyMatch =
      normalizedEmail === ownerEmail && ownerPasswords.includes(String(password || '').trim());

    if (!isMatch && !ownerLegacyMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (user.role !== 'admin' && !user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before login',
        code: 'VERIFICATION_REQUIRED'
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: formatUser(user)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Verify signup OTPs (email + phone)
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyUserOtps = async (req, res) => {
  try {
    const { email, emailOtp } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !emailOtp) {
      return res.status(400).json({
        success: false,
        message: 'Email OTP is required'
      });
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+emailOtpHash +emailOtpExpires +password'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const now = Date.now();
    const isEmailValid =
      user.emailOtpHash &&
      user.emailOtpExpires &&
      user.emailOtpExpires.getTime() > now &&
      user.emailOtpHash === hashOtp(emailOtp);
    if (!isEmailValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    user.isEmailVerified = true;
    user.emailOtpHash = '';
    user.emailOtpExpires = undefined;
    await user.save();

    const token = generateToken(user._id);
    return res.json({
      success: true,
      token,
      user: formatUser(user)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Resend signup OTPs
// @route   POST /api/auth/resend-otp
// @access  Public
exports.resendUserOtps = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: normalizedEmail }).select('+emailOtpHash +phoneOtpHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'User is already verified' });
    }

    const { emailOtp } = await createAndStoreOtps(user);
    await sendOtps(user, emailOtp);

    const response = {
      success: true,
      message: 'OTP sent successfully'
    };

    if (process.env.NODE_ENV !== 'production') {
      response.devOtps = { emailOtp };
    }

    return res.json(response);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Login admin user
// @route   POST /api/auth/admin/login
// @access  Public
exports.loginAdminUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const ownerEmail = normalizeEmail(process.env.OWNER_EMAIL || '');
    const ownerPasswords = getOwnerPasswordCandidates();

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Permanent owner fallback: if env owner credentials match, ensure admin account exists and use it.
    if (
      ownerEmail &&
      normalizedEmail === ownerEmail &&
      ownerPasswords.includes(String(password || '').trim())
    ) {
      let ownerUser = await User.findOne({ email: ownerEmail }).select('+password');
      if (!ownerUser) {
        ownerUser = await User.create({
          name: process.env.OWNER_NAME || 'Owner',
          email: ownerEmail,
          password: process.env.OWNER_PASSWORD || String(password || '').trim(),
          role: 'admin',
          phone: '',
          address: ''
        });
      } else if (ownerUser.role !== 'admin') {
        ownerUser.role = 'admin';
        await ownerUser.save();
      }

      const token = generateToken(ownerUser._id);
      return res.json({
        success: true,
        token,
        user: formatUser(ownerUser)
      });
    }

    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin can login to owner panel'
      });
    }

    const token = generateToken(user._id);
    return res.json({
      success: true,
      token,
      user: formatUser(user)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      success: true,
      user: formatUser(user)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
  try {
    const { name, phone, address, storeName, city, state, pincode, gstNumber } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, phone: normalizePhone(phone), address, storeName, city, state, pincode, gstNumber },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      user: formatUser(user)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Login with Google popup token
// @route   POST /api/auth/google-login
// @access  Public
exports.googleLogin = async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return sendJsonError(res, 400, 'Google access token is required');
    }

    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      return sendJsonError(res, 401, 'Invalid Google token');
    }

    const googleUser = await response.json();
    const normalizedEmail = normalizeEmail(googleUser.email);

    if (!normalizedEmail || googleUser.email_verified !== true) {
      return sendJsonError(res, 401, 'Google email is not verified');
    }

    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      const randomPassword = crypto.randomBytes(24).toString('hex');
      user = await User.create({
        name: googleUser.name || 'Google User',
        email: normalizedEmail,
        password: randomPassword,
        role: 'user',
        phone: '',
        isEmailVerified: true,
        isPhoneVerified: false
      });
    } else if (!user.isEmailVerified) {
      user.isEmailVerified = true;
      await user.save();
    }

    const token = generateToken(user._id);
    return res.json({
      success: true,
      token,
      user: formatUser(user)
    });
  } catch (error) {
    return sendJsonError(res, 500, error.message);
  }
};

// @desc    Send OTP for phone login
// @route   POST /api/auth/login-phone/send-otp
// @access  Public
exports.sendPhoneLoginOtp = async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    if (!phone) {
      return sendJsonError(res, 400, 'Phone number is required');
    }

    const user = await User.findOne({ phone }).select('+phoneLoginOtpHash +phoneLoginOtpExpires');
    if (!user) {
      return sendJsonError(res, 404, 'No account found with this phone number');
    }

    const phoneOtp = generateNumericOtp();
    user.phoneLoginOtpHash = hashOtp(phoneOtp);
    user.phoneLoginOtpExpires = new Date(Date.now() + OTP_WINDOW_MS);
    await user.save();

    const smsResult = await sendVerificationOtpSms({ phone, otp: phoneOtp });
    const response = { success: true, message: 'Phone OTP sent' };
    if (process.env.NODE_ENV !== 'production' && smsResult?.devOtp) {
      response.devOtp = phoneOtp;
    }

    return res.json(response);
  } catch (error) {
    return sendJsonError(res, 500, error.message);
  }
};

// @desc    Verify OTP for phone login
// @route   POST /api/auth/login-phone/verify-otp
// @access  Public
exports.verifyPhoneLoginOtp = async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const otp = String(req.body.otp || '').trim();
    if (!phone || !otp) {
      return sendJsonError(res, 400, 'Phone and OTP are required');
    }

    const user = await User.findOne({ phone }).select('+phoneLoginOtpHash +phoneLoginOtpExpires');
    if (!user) {
      return sendJsonError(res, 404, 'No account found with this phone number');
    }

    const isValid =
      user.phoneLoginOtpHash &&
      user.phoneLoginOtpExpires &&
      user.phoneLoginOtpExpires.getTime() > Date.now() &&
      user.phoneLoginOtpHash === hashOtp(otp);

    if (!isValid) {
      return sendJsonError(res, 400, 'Invalid or expired OTP');
    }

    user.phoneLoginOtpHash = '';
    user.phoneLoginOtpExpires = undefined;
    user.isPhoneVerified = true;
    await user.save();

    const token = generateToken(user._id);
    return res.json({
      success: true,
      token,
      user: formatUser(user)
    });
  } catch (error) {
    return sendJsonError(res, 500, error.message);
  }
};

// @desc    Delete current user account
// @route   DELETE /api/auth/profile
// @access  Private
exports.deleteUserAccount = async (req, res) => {
  try {
    const userId = req?.user?._id || req?.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized request'
      });
    }

    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await Cart.deleteMany({ user: userId });

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
