// backend/routes/contactRoutes.js
const express = require('express');
const {
    submitContactForm,
    getAdminContactMessages,
    updateAdminContactMessage,
} = require('../controllers/contactController');
const { body, validationResult } = require('express-validator'); // For input validation
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
        });
    }
    next();
};

router.post(
    '/',
    [
        body('name').notEmpty().withMessage('Name is required'),
        body('email').isEmail().withMessage('Please include a valid email'),
        body('topic').isIn(['General Inquiry', 'Technical Support', 'Partnership', 'Feedback', 'Complaint', 'Other']).withMessage('Invalid topic selected'),
        body('message').notEmpty().withMessage('Message is required').isLength({ max: 500 }).withMessage('Message cannot exceed 500 characters')
    ],
    validateRequest,
    submitContactForm
);

router.get('/admin/messages', protect, authorizeRoles('Admin'), getAdminContactMessages);

router.patch(
    '/admin/messages/:id',
    protect,
    authorizeRoles('Admin'),
    [
        body('status')
            .optional()
            .isIn(['Open', 'In Progress', 'Resolved'])
            .withMessage('Invalid status value.'),
        body('adminNote')
            .optional()
            .isLength({ max: 1000 })
            .withMessage('Admin note cannot exceed 1000 characters.'),
    ],
    validateRequest,
    updateAdminContactMessage
);

module.exports = router;