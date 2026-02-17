const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');

dotenv.config();

const run = async () => {
  const ownerEmail = (process.env.OWNER_EMAIL || '').toLowerCase().trim();
  const ownerPassword = process.env.OWNER_PASSWORD || '';
  const ownerName = process.env.OWNER_NAME || 'Owner';

  if (!ownerEmail || !ownerPassword) {
    console.error('Missing OWNER_EMAIL or OWNER_PASSWORD in environment.');
    process.exit(1);
  }

  await connectDB();

  const passwordHash = await bcrypt.hash(ownerPassword, 10);
  const existing = await User.findOne({ email: ownerEmail });

  if (!existing) {
    await User.create({
      name: ownerName,
      email: ownerEmail,
      password: ownerPassword,
      role: 'admin',
      phone: '',
      address: ''
    });
    console.log(`Owner account created as admin: ${ownerEmail}`);
  } else {
    await User.updateOne(
      { _id: existing._id },
      {
        $set: {
          role: 'admin',
          password: passwordHash,
          name: existing.name || ownerName
        }
      }
    );
    console.log(`Owner account reset and promoted to admin: ${ownerEmail}`);
  }

  process.exit(0);
};

run().catch((error) => {
  console.error('Failed to reset owner admin:', error.message);
  process.exit(1);
});
