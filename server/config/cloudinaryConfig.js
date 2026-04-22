const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

dotenv.config(); // Ensure dotenv is loaded here as well for this file

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true // Use HTTPS for all requests
});

module.exports = cloudinary;