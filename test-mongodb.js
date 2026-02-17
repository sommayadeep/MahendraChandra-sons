const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('Missing MONGODB_URI. Set it in environment before running this test.');
  process.exit(1);
}

async function testConnection() {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });

  try {
    console.log('Attempting to connect to MongoDB...');
    await client.connect();
    console.log('SUCCESS: Connected to MongoDB');
  } catch (error) {
    console.log('FAILED: Could not connect to MongoDB');
    console.log('Error:', error.message);
  } finally {
    await client.close();
  }
}

testConnection();
