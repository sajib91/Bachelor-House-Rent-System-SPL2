//backend/models/Blog.js
const mongoose = require('mongoose');

const BlogSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        required: true,
        trim: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    intro: {
        type: String,
        required: true,
        trim: true
    },
    imageUrl: { // To store the URL of the uploaded image
        type: String,
        required: false // Optional, if a blog can exist without an image
    },
    content: { // The full blog content, potentially HTML from a rich text editor
        type: String,
        required: true
    },
    views: {
        type: Number,
        default: 0
    },
    likes: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update 'updatedAt' field before saving
BlogSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Blog', BlogSchema);