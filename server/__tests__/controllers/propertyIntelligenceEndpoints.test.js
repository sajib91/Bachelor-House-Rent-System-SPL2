const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

jest.mock('../../middleware/authMiddleware', () => ({
  protect: (req, res, next) => {
    req.user = {
      _id: req.headers['x-test-user-id'] || 'test-user',
      role: req.headers['x-test-role'] || 'Tenant',
      email: req.headers['x-test-email'] || 'test@example.com',
      fullName: req.headers['x-test-name'] || 'Test User',
      username: req.headers['x-test-username'] || 'testuser',
      phoneNumber: req.headers['x-test-phone'] || '01700000000',
      verificationType: req.headers['x-test-verification-type'] || 'Student ID',
      verificationDocumentUrl: req.headers['x-test-document-url'] || 'https://example.com/student-id.jpg',
      verificationStatus: 'Verified',
    };
    next();
  },
  authorizeRoles: (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  },
}));

const propertyRoutes = require('../../routes/propertyRoutes');
const Property = require('../../models/Property');
const User = require('../../models/User');
const { errorHandler } = require('../../middleware/errorMiddleware');

const app = express();
app.use(express.json());
app.use('/api/properties', propertyRoutes);
app.use(errorHandler);

describe('Property Intelligence Endpoints', () => {
  let landlordId;
  let tenantId;
  let adminId;
  let propertyId;

  beforeEach(async () => {
    landlordId = new mongoose.Types.ObjectId();
    tenantId = new mongoose.Types.ObjectId();
    adminId = new mongoose.Types.ObjectId();

    await User.create([
      {
        _id: landlordId,
        username: 'landlord1',
        fullName: 'Landlord One',
        email: 'landlord@example.com',
        password: 'Password123!',
        role: 'Landlord',
        verificationType: 'NID',
        verificationDocumentUrl: 'https://example.com/nid.jpg',
        verificationStatus: 'Verified',
        isVerified: true,
      },
      {
        _id: tenantId,
        username: 'tenant1',
        fullName: 'Tenant One',
        email: 'tenant@example.com',
        password: 'Password123!',
        role: 'Tenant',
        verificationType: 'Student ID',
        verificationDocumentUrl: 'https://example.com/student.jpg',
        verificationStatus: 'Verified',
        isVerified: true,
      },
      {
        _id: adminId,
        username: 'admin1',
        fullName: 'Admin One',
        email: 'admin@example.com',
        password: 'Password123!',
        role: 'Admin',
        verificationType: 'NID',
        verificationDocumentUrl: 'https://example.com/admin-nid.jpg',
        verificationStatus: 'Verified',
        isVerified: true,
      },
    ]);

    const property = await Property.create({
      landlord: landlordId,
      landlordName: 'Landlord One',
      landlordPhone: '01710000000',
      landlordWhatsapp: '01710000000',
      landlordBkash: '01710000001',
      title: 'Shared seat near DU campus',
      area: 'Dhanmondi',
      nearbyUniversity: 'DU',
      address: 'House 12, Road 3, Dhanmondi, Dhaka',
      totalSeats: 4,
      availableSeats: 3,
      genderPreference: 'Male',
      roomType: 'Shared Seat',
      monthlyRentPerSeat: 5000,
      securityDeposit: 3000,
      photos: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg', 'https://example.com/photo3.jpg'],
      description: 'Comfortable shared room with WiFi and nearby transport access for university students.',
      mealSystem: 'Mixed',
      commuteMinutes: 20,
      rules: { gateClosingTime: '11:00 PM', guestPolicy: 'Day guests only' },
      amenities: ['WiFi', 'Filtered Water'],
      isActive: true,
      publicationStatus: 'Approved',
      seatApplications: [
        {
          tenant: tenantId,
          tenantName: 'Tenant One',
          tenantEmail: 'tenant@example.com',
          studentIdType: 'Student ID',
          seatsRequested: 1,
          status: 'Approved',
        },
      ],
    });

    propertyId = property._id;
  });

  it('returns quality assistant endpoint for landlord', async () => {
    const response = await request(app)
      .get(`/api/properties/${propertyId}/quality-assistant`)
      .set('x-test-user-id', String(landlordId))
      .set('x-test-role', 'Landlord');

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.quality).toBeDefined();
    expect(typeof response.body.quality.score).toBe('number');
  });

  it('returns pricing recommendation endpoint for landlord', async () => {
    const response = await request(app)
      .get(`/api/properties/${propertyId}/pricing-recommendation`)
      .set('x-test-user-id', String(landlordId))
      .set('x-test-role', 'Landlord');

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.recommendation).toBeDefined();
    expect(response.body.recommendation).toHaveProperty('recommendedRent');
  });

  it('blocks spam message from moderation guard', async () => {
    const response = await request(app)
      .post(`/api/properties/${propertyId}/messages`)
      .set('x-test-user-id', String(tenantId))
      .set('x-test-role', 'Tenant')
      .send({ message: 'FREE MONEY!!! click here https://bit.ly/xyz now!!!!!' });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/blocked/i);
  });

  it('blocks spam review from moderation guard', async () => {
    const response = await request(app)
      .post(`/api/properties/${propertyId}/reviews`)
      .set('x-test-user-id', String(tenantId))
      .set('x-test-role', 'Tenant')
      .send({ rating: 4, comment: 'urgent transfer now!!! http://spam.test click here!!!!!' });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/blocked/i);
  });

  it('stores document verification info on apply', async () => {
    const secondTenantId = new mongoose.Types.ObjectId();
    await User.create({
      _id: secondTenantId,
      username: 'tenant2',
      fullName: 'Tenant Two',
      email: 'tenant2@example.com',
      password: 'Password123!',
      role: 'Tenant',
      verificationType: 'Student ID',
      verificationDocumentUrl: 'https://example.com/student2.jpg',
      verificationStatus: 'Verified',
      isVerified: true,
    });

    const response = await request(app)
      .post(`/api/properties/${propertyId}/apply`)
      .set('x-test-user-id', String(secondTenantId))
      .set('x-test-role', 'Tenant')
      .set('x-test-email', 'tenant2@example.com')
      .set('x-test-name', 'Tenant Two')
      .set('x-test-document-url', 'https://example.com/student2.jpg')
      .send({ seatsRequested: 1, studentIdType: 'Student ID' });

    expect(response.statusCode).toBe(201);

    const updated = await Property.findById(propertyId);
    const applied = updated.seatApplications.find((item) => String(item.tenant) === String(secondTenantId));
    expect(applied).toBeDefined();
    expect(applied.documentVerification).toBeDefined();
    expect(typeof applied.documentVerification.score).toBe('number');
  });

  it('returns payment assistant details on payment submission', async () => {
    const response = await request(app)
      .post(`/api/properties/${propertyId}/payments`)
      .set('x-test-user-id', String(tenantId))
      .set('x-test-role', 'Tenant')
      .send({ month: '2026-04', provider: 'bKash', transactionId: 'BK-99887766', amount: 5000 });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.paymentAssistant).toBeDefined();
    expect(response.body.paymentAssistant.status).toBeDefined();
  });

  it('returns tenant reminder engine data', async () => {
    const response = await request(app)
      .get('/api/properties/tenant/reminders?month=2026-04')
      .set('x-test-user-id', String(tenantId))
      .set('x-test-role', 'Tenant');

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.reminderEngine).toBeDefined();
    expect(response.body.reminderEngine).toHaveProperty('dueCount');
  });

  it('returns admin insights data', async () => {
    const response = await request(app)
      .get('/api/properties/admin/insights')
      .set('x-test-user-id', String(adminId))
      .set('x-test-role', 'Admin');

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.insights).toBeDefined();
    expect(response.body.insights).toHaveProperty('totalUsers');
  });

  it('returns admin intelligence threshold settings', async () => {
    const response = await request(app)
      .get('/api/properties/admin/intelligence-thresholds')
      .set('x-test-user-id', String(adminId))
      .set('x-test-role', 'Admin');

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.thresholds).toBeDefined();
    expect(response.body.thresholds).toHaveProperty('fraud');
  });

  it('updates admin intelligence threshold settings', async () => {
    const response = await request(app)
      .patch('/api/properties/admin/intelligence-thresholds')
      .set('x-test-user-id', String(adminId))
      .set('x-test-role', 'Admin')
      .send({
        thresholds: {
          fraud: { medium: 30, high: 60 },
          risk: { medium: 35, high: 65 },
        },
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.thresholds.fraud.medium).toBe(30);
    expect(response.body.thresholds.fraud.high).toBe(60);
  });
});
