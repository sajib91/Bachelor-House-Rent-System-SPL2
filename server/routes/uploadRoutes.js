// backend/routes/uploadRoutes.js
const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinaryConfig'); // Import your cloudinary config
const path = require('path'); // Not strictly needed if only using Cloudinary, but good to keep if you have local storage fallbacks
const fs = require('fs/promises');
const crypto = require('crypto');
const router = express.Router();
const asyncHandler = require('express-async-handler'); // To catch async errors

// Configure multer to store files in memory
const storage = multer.memoryStorage();

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// @desc    Upload multiple images to Cloudinary
// @route   POST /api/upload
// @access  Private (You might want to make this private, requiring authentication)
router.post('/', upload.array('photos', 10), asyncHandler(async (req, res) => { // 'photos' is the field name, 10 is max files
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded.' });
  }

  const hasCloudinaryConfig = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
  );

  const uploadedUrls = [];

  for (const file of req.files) {
    try {
      if (hasCloudinaryConfig) {
        const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

        const result = await cloudinary.uploader.upload(dataUri, {
          folder: 'to-let-globe-properties',
          resource_type: 'image',
        });

        uploadedUrls.push(result.secure_url);
      } else {
        const extension = path.extname(file.originalname) || '.jpg';
        const safeFileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`;
        const uploadDir = path.join(__dirname, '..', 'uploads');
        const filePath = path.join(uploadDir, safeFileName);

        await fs.mkdir(uploadDir, { recursive: true });
        await fs.writeFile(filePath, file.buffer);

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        uploadedUrls.push(`${baseUrl}/uploads/${safeFileName}`);
      }
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      // Handle individual file upload errors
      // Use template literals for the error message as well
      return res.status(500).json({ message: `Failed to upload image: ${file.originalname}`, error: error.message });
    }
  }

  res.status(200).json({ message: 'Files uploaded successfully', urls: uploadedUrls });
}));

module.exports = router;