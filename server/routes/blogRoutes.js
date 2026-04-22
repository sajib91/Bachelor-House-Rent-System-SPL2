// backend/routes/blogRoutes.jsx
const express = require('express');
const { body } = require('express-validator');
const { createBlog, getBlogs, getBlogById, likeBlog } = require('../controllers/blogController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware'); // Import 'protect' and 'authorizeRoles' from authMiddleware

const router = express.Router();

// Public routes
router.get('/', getBlogs);
router.get('/:id', getBlogById);
router.post('/:id/like', likeBlog); // Consider making this private if you only want logged-in users to like

// Protected route (requires content creator role)
router.post(
    '/',
    [
        protect, // Authenticates the user
        authorizeRoles('Content Creator'), // Checks if the user has 'Content Creator' role
        body('name', 'Author name is required').not().isEmpty(),
        body('role', 'Role is required').not().isEmpty(),
        body('title', 'Blog title is required').not().isEmpty(),
        body('category', 'Category is required').not().isEmpty(),
        body('intro', 'Introduction is required').not().isEmpty(),
        body('content', 'Blog content is required').not().isEmpty()
    ],
    createBlog
);

module.exports = router;