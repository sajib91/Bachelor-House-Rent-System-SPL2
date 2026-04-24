// backend/routes/propertyRoutes.js

const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// GET all properties with pagination and sorting
router.get('/', propertyController.getProperties);

// GET current user's listings (landlord/admin)
router.get('/mine', protect, propertyController.getMyProperties);
router.get('/mine/rent-tracker', protect, authorizeRoles('Landlord', 'Admin'), propertyController.getRentTracker);
router.get('/mine/intelligence', protect, authorizeRoles('Landlord', 'Admin'), propertyController.getLandlordIntelligence);
router.get('/tenant/reminders', protect, authorizeRoles('Tenant'), propertyController.getTenantReminders);

// Admin publication approval routes
router.get('/admin/pending-publications', protect, authorizeRoles('Admin'), propertyController.getPendingPublications);
router.patch('/admin/:id/publication', protect, authorizeRoles('Admin'), propertyController.reviewPropertyPublication);
router.get('/admin/insights', protect, authorizeRoles('Admin'), propertyController.getAdminInsights);
router.get('/admin/intelligence-thresholds', protect, authorizeRoles('Admin'), propertyController.getIntelligenceThresholds);
router.patch('/admin/intelligence-thresholds', protect, authorizeRoles('Admin'), propertyController.updateIntelligenceThresholds);

// SSLCommerz callbacks (public gateway redirects)
router.post('/payments/ssl/success', propertyController.handleSslPaymentSuccess);
router.get('/payments/ssl/success', propertyController.handleSslPaymentSuccess);
router.post('/payments/ssl/fail', propertyController.handleSslPaymentFailure);
router.get('/payments/ssl/fail', propertyController.handleSslPaymentFailure);
router.post('/payments/ssl/cancel', propertyController.handleSslPaymentFailure);
router.get('/payments/ssl/cancel', propertyController.handleSslPaymentFailure);
router.post('/payments/verify', propertyController.verifyPaymentSlip);

router.get('/:id/quality-assistant', protect, authorizeRoles('Landlord', 'Admin'), propertyController.getListingQualityAssistant);
router.get('/:id/pricing-recommendation', protect, authorizeRoles('Landlord', 'Admin'), propertyController.getPricingRecommendation);
// GET a single property by ID
router.get('/:id', propertyController.getPropertyById);

// POST a new seat listing (protected route, requires authentication)
router.post('/', protect, propertyController.addProperty);

// UPDATE a seat listing
router.patch('/:id', protect, propertyController.updateProperty);

// Seat request and approval flow
router.post('/:id/apply', protect, propertyController.applyForSeat);
router.patch('/:id/applications/:applicationId', protect, authorizeRoles('Landlord'), propertyController.reviewApplication);

// Monthly rent and in-platform chat
router.post('/:id/payments/ssl/initiate', protect, authorizeRoles('Tenant'), propertyController.initiateSslRentPayment);
router.post('/:id/payments', protect, propertyController.addRentPayment);
router.patch('/:id/payments/:paymentId', protect, authorizeRoles('Landlord', 'Admin'), propertyController.updateRentPaymentStatus);
router.get('/:id/payments/:paymentId/slip', protect, propertyController.getPaymentSlip);
router.get('/:id/payments/:paymentId/slip/pdf', protect, propertyController.downloadPaymentSlipPdf);
router.post('/:id/messages', protect, propertyController.addMessage);
router.post('/:id/reviews', protect, authorizeRoles('Tenant'), propertyController.addReview);

module.exports = router;