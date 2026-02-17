const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const cartRoutes = require('./routes/cartRoutes');
const contactRoutes = require('./routes/contactRoutes');
const User = require('./models/User');

// Load env vars
dotenv.config();


const app = express();

// Middleware
const allowedOrigins = new Set(
  [
    process.env.FRONTEND_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
    ...(process.env.FRONTEND_URLS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  ].filter(Boolean)
);

app.use(
  cors((req, callback) => {
    const requestOrigin = req.headers.origin || '';
    const host = req.headers.host || '';
    const sameOrigin = requestOrigin && host && requestOrigin.includes(host);
    const renderOrigin = requestOrigin.endsWith('.onrender.com');
    const vercelOrigin = requestOrigin.endsWith('.vercel.app');

    const allow =
      !requestOrigin ||
      sameOrigin ||
      allowedOrigins.has(requestOrigin) ||
      renderOrigin ||
      vercelOrigin;

    callback(null, {
      origin: allow,
      credentials: true,
    });
  })
);
app.use(express.json());
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/contact', contactRoutes);

// Health check
app.get('/api', (req, res) => {
  res.json({ status: 'ok', message: 'MC Sons API root' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'MC Sons API is running' });
});

// Seed admin accounts
const seedAdmin = async () => {
  try {
    const ownerEmail = (process.env.OWNER_EMAIL || 'mahendrachandra.sons@gmail.com').toLowerCase().trim();
    const ownerPassword = process.env.OWNER_PASSWORD || 'admin123';
    const ownerName = process.env.OWNER_NAME || 'Owner';

    const defaultAdminEmail = 'admin@mcsons.com';
    const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';

    const ownerUser = await User.findOne({ email: ownerEmail }).select('+password');
    if (!ownerUser) {
      await User.create({
        name: ownerName,
        email: ownerEmail,
        password: ownerPassword,
        role: 'admin',
        phone: '1234567890',
        address: 'Owner Office'
      });
      console.log(`Owner admin account seeded: ${ownerEmail}`);
    } else if (ownerUser.role !== 'admin') {
      await User.updateOne({ _id: ownerUser._id }, { $set: { role: 'admin' } });
      console.log(`Owner account promoted to admin: ${ownerEmail}`);
    }

    const defaultAdmin = await User.findOne({ email: defaultAdminEmail });
    if (!defaultAdmin) {
      await User.create({
        name: 'Admin',
        email: defaultAdminEmail,
        password: defaultAdminPassword,
        role: 'admin',
        phone: '1234567890',
        address: 'Admin Office'
      });
      console.log(`Default admin seeded: ${defaultAdminEmail}`);
    }
  } catch (error) {
    console.log('Error seeding admin:', error.message);
  }
};

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      seedAdmin();
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
