// backend/routes/contactRoutes.js
const express = require('express');
const { submitContactForm } = require('../controllers/contactController');
const { body } = require('express-validator'); // For input validation

const router = express.Router();

router.post(
    '/',
    [
        body('name').notEmpty().withMessage('Name is required'),
        body('email').isEmail().withMessage('Please include a valid email'),
        body('topic').isIn(['General Inquiry', 'Technical Support', 'Partnership', 'Other']).withMessage('Invalid topic selected'),
        body('message').notEmpty().withMessage('Message is required').isLength({ max: 500 }).withMessage('Message cannot exceed 500 characters')
    ],
    submitContactForm
);

module.exports = router;