
const request = require('supertest');
const express = require('express');
const User = require('../../models/User'); // Adjust path as necessary
const authRoutes = require('../../routes/authRoutes'); // Your router
const { errorHandler } = require('../../middleware/errorMiddleware');

// Setup an Express app instance for testing
const app = express();
app.use(express.json()); // To parse JSON request bodies
app.use('/api/auth', authRoutes); // Mount your auth routes
app.use(errorHandler); // Use your global error handler

// Mock the email service to prevent actual email sending during tests
jest.mock('../../utils/emailService', () => jest.fn().mockResolvedValue(true));


describe('Auth Controller - Registration', () => {
  const validUserData = {
    username: 'testuser',
    fullName: 'Test Tenant',
    email: 'test@example.com',
    password: 'Password123!',
    role: 'Tenant',
    instituteType: 'University',
    instituteName: 'Dhaka University',
    hometown: 'Dhaka',
    profilePictureUrl: 'https://example.com/profile.jpg',
    verificationType: 'Student ID',
    verificationDocumentUrl: 'https://example.com/student-id.jpg',
  };

  it('should register a new user successfully and return a 201 status', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(validUserData);

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('Registration submitted successfully');
    expect(response.body.user).toBeDefined();
    expect(response.body.user.email).toBe(validUserData.email.toLowerCase()); // Emails are lowercased

    // Check if user is in the database
    const dbUser = await User.findOne({ email: validUserData.email });
    expect(dbUser).not.toBeNull();
    expect(dbUser.username).toBe(validUserData.username);
  });

  it('should fail to register a user with an existing email and return 400', async () => {
    // First, register a user
    await User.create(validUserData);

    // Then, attempt to register with the same email
    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...validUserData, username: 'anotheruser' }); // Different username, same email

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('User already exists with this email');
  });

  it('should fail to register a user with an existing username and return 400', async () => {
    await User.create(validUserData);
    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...validUserData, email: 'another@example.com' }); // Different email, same username

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Username is already taken');
  });


  it('should fail registration with invalid password (too short) and return 400', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...validUserData, password: 'short' });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed');
    expect(response.body.errors[0].message).toContain('Password must be at least 8 characters long.');
  });

  // Add more tests for other validation rules (email format, username format, role, etc.)
});

// You would add more describe blocks for login, forgotPassword, etc.
describe('Auth Controller - Login', () => {
  let loginCredentials;

    beforeEach(async () => {
    loginCredentials = {
      email: `logintest_${Date.now()}@example.com`,
      password: 'Password123!'
    };

        // Create a user to log in with
        const user = new User({
          username: `logintestuser_${Date.now()}`,
          fullName: 'Login Test Tenant',
            email: loginCredentials.email,
            password: loginCredentials.password, // Will be hashed by pre-save
          role: 'Tenant',
          instituteType: 'University',
          instituteName: 'Dhaka University',
          hometown: 'Dhaka',
          profilePictureUrl: 'https://example.com/profile.jpg',
          verificationType: 'Student ID',
          verificationDocumentUrl: 'https://example.com/student-id.jpg',
          isVerified: true,
          verificationStatus: 'Verified', // Assume verified for login tests
        });
        await user.save();
    });

    it('should login an existing user successfully and return 200 with a token', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send(loginCredentials);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.token).toBeDefined();
        expect(response.body.user.email).toBe(loginCredentials.email);
    });

    it('should fail login with incorrect password and return 401', async () => {
        const response = await request(app)
.post('/api/auth/login')
.send({ ...loginCredentials, password: 'WrongPassword!' });

                expect(response.statusCode).toBe(401);
                expect(response.body.success).toBe(false);
                expect(response.body.message).toBe('Invalid credentials');
            });

             it('should fail login with non-existent email and return 401', async () => {
                const response = await request(app)
                    .post('/api/auth/login')
                    .send({ email: 'nosuchuser@example.com', password: 'Password123!' });

                expect(response.statusCode).toBe(401); // Check if your controller logic returns 401 for non-existent user
                expect(response.body.success).toBe(false);
                expect(response.body.message).toBe('Invalid credentials');
            });
        });
