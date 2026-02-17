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
  const phoneOtp = generateNumericOtp();
  const expiry = new Date(Date.now() + OTP_WINDOW_MS);

  user.emailOtpHash = hashOtp(emailOtp);
  user.phoneOtpHash = hashOtp(phoneOtp);
  user.emailOtpExpires = expiry;
  user.phoneOtpExpires = expiry;
  await user.save();

  return { emailOtp, phoneOtp };
};

const sendOtps = async (user, emailOtp, phoneOtp) => {
  await sendVerificationOtpEmail({
    toEmail: user.email,
    otp: emailOtp,
    name: user.name
  });
  const smsResult = await sendVerificationOtpSms({
    phone: user.phone,
    otp: phoneOtp
  });

  return smsResult;
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, address, storeName, city, state, pincode, gstNumber } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = String(phone || '').trim();

    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user
    const user = await User.create({
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

    const { emailOtp, phoneOtp } = await createAndStoreOtps(user);
    const smsResult = await sendOtps(user, emailOtp, phoneOtp);

    const response = {
      success: true,
      message: 'Account created. Verify email OTP and phone OTP to continue.',
      requiresVerification: true,
      email: user.email
    };

    if (process.env.NODE_ENV !== 'production' && smsResult?.devOtp) {
      response.devOtps = { emailOtp, phoneOtp };
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

    if (user.role !== 'admin' && (!user.isEmailVerified || !user.isPhoneVerified)) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email and phone number before login',
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
    const { email, emailOtp, phoneOtp } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !emailOtp || !phoneOtp) {
      return res.status(400).json({
        success: false,
        message: 'Email OTP and phone OTP are required'
      });
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+emailOtpHash +emailOtpExpires +phoneOtpHash +phoneOtpExpires +password'
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
    const isPhoneValid =
      user.phoneOtpHash &&
      user.phoneOtpExpires &&
      user.phoneOtpExpires.getTime() > now &&
      user.phoneOtpHash === hashOtp(phoneOtp);

    if (!isEmailValid || !isPhoneValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    user.isEmailVerified = true;
    user.isPhoneVerified = true;
    user.emailOtpHash = '';
    user.phoneOtpHash = '';
    user.emailOtpExpires = undefined;
    user.phoneOtpExpires = undefined;
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

    if (user.isEmailVerified && user.isPhoneVerified) {
      return res.status(400).json({ success: false, message: 'User is already verified' });
    }

    const { emailOtp, phoneOtp } = await createAndStoreOtps(user);
    const smsResult = await sendOtps(user, emailOtp, phoneOtp);

    const response = {
      success: true,
      message: 'OTP sent successfully'
    };

    if (process.env.NODE_ENV !== 'production' && smsResult?.devOtp) {
      response.devOtps = { emailOtp, phoneOtp };
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
      { name, phone, address, storeName, city, state, pincode, gstNumber },
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
