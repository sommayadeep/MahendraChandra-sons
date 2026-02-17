const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('Missing MONGODB_URI. Set it in environment before running this test.');
  process.exit(1);
}

async function testConnection() {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('SUCCESS: Connected to MongoDB');
  } catch (error) {
    console.log('FAILED:', error.message);
  } finally {
    try {
      await mongoose.disconnect();
    } catch (_) {}
    process.exit(0);
  }
}

testConnection();
