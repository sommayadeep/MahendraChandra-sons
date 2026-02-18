const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    const activeDbName = conn.connection.name || '';
    const expectedDbName = String(process.env.EXPECTED_DB_NAME || '').trim();
    const strictDbNameCheck = String(process.env.STRICT_DB_NAME_CHECK || '').toLowerCase() === 'true';

    console.log(`MongoDB Connected: ${conn.connection.host} / DB: ${activeDbName}`);

    if (expectedDbName && activeDbName !== expectedDbName) {
      const mismatchMessage = `MongoDB DB name mismatch. Expected "${expectedDbName}" but connected to "${activeDbName}".`;
      if (strictDbNameCheck) {
        throw new Error(mismatchMessage);
      }
      console.warn(mismatchMessage);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
