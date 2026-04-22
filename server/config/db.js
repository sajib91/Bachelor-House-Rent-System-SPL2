const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config(); // Ensure environment variables are loaded

const connectDB = async () => {
  try {
    // process.env.MONGODB_URI will be read from your .env file
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    // Exit process with failure if DB connection fails
    process.exit(1);
  }
};

module.exports = connectDB;