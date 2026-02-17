const User = require('../models/User');
const Cart = require('../models/Cart');
const jwt = require('jsonwebtoken');

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

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, address, storeName, city, state, pincode, gstNumber } = req.body;
    const normalizedEmail = normalizeEmail(email);

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
      phone,
      address,
      storeName,
      city,
      state,
      pincode,
      gstNumber
    });

    const token = generateToken(user._id);

    res.status(201).json({
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
