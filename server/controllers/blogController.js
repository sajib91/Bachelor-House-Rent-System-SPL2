// backend/controllers/blogController.js
const Blog = require('../models/Blog');
const { validationResult } = require('express-validator'); // For input validation

// @desc    Create a new blog post
// @route   POST /api/blogs
// @access  Private (Content Creator only)
exports.createBlog = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error('Validation errors:', errors.array()); // Log validation errors explicitly
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { name, role, title, category, intro, imageUrl, content } = req.body;

        const newBlog = new Blog({
            name,
            role,
            title,
            category,
            intro,
            imageUrl, // This will be the URL after image upload
            content
        });

        const blog = await newBlog.save();
        res.status(201).json({ message: 'Blog created successfully', blog });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all blogs with pagination and filtering
// @route   GET /api/blogs
// @access  Public
exports.getBlogs = async (req, res) => {
    const { page = 1, limit = 6, sortBy = 'latest' } = req.query; // Default to 6 blogs per page, sort by latest
    const skip = (parseInt(page) - 1) * parseInt(limit);
    let sortCriteria = { createdAt: -1 }; // Default: latest

    if (sortBy === 'trending') {
        sortCriteria = { likes: -1, views: -1 }; // Sort by likes then views for trending
    }

    try {
        const blogs = await Blog.find()
                            .sort(sortCriteria)
                            .skip(skip)
                            .limit(parseInt(limit));

        const totalBlogs = await Blog.countDocuments();

        res.json({
            blogs,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalBlogs / parseInt(limit)),
            totalBlogs
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get single blog by ID
// @route   GET /api/blogs/:id
// @access  Public
exports.getBlogById = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);

        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        // Increment views on access (optional, but good for "trending")
        blog.views += 1;
        await blog.save();

        res.json(blog);
    } catch (error) {
        console.error(error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Blog not found' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Like a blog post
// @route   POST /api/blogs/:id/like
// @access  Public (or Private, depending on if you want logged-in users only)
exports.likeBlog = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);

        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        blog.likes += 1;
        await blog.save();

        res.json({ message: 'Blog liked successfully', likes: blog.likes });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Important: For production, you'd want to track user likes to prevent multiple likes from one user.
// This simple implementation allows multiple likes from anyone.