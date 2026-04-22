// backend/server.js 

// 1. Import Core Modules
const express = require('express'); // Express framework for building web applications
const http = require('http');
const dotenv = require('dotenv');   // For loading environment variables from a .env file
const cors = require('cors');       // For enabling Cross-Origin Resource Sharing
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const authRoutes = require('./routes/authRoutes'); // Import the auth router
const contactRoutes = require('./routes/contactRoutes'); // Import the contact router
const blogRoutes = require('./routes/blogRoutes'); // Import the blog router
const propertyRoutes = require('./routes/propertyRoutes'); // Import the property router
const propertyController = require('./controllers/propertyController');
const Property = require('./models/Property');
const User = require('./models/User');
const uploadRoutes = require('./routes/uploadRoutes'); // Import the upload router
const { errorHandler } = require('./middleware/errorMiddleware'); // Import the error router
const rateLimit = require('express-rate-limit'); // Import express rate limit
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path'); // For local photo uploads

// 2. Load Environment Variables
// This line loads variables from a .env file into process.env
// Should be done early, especially before database connections or port configurations
dotenv.config({ path: './.env' }); // By default, it looks for a .env file in the root of the project

// 3. Import Database Connection Function (we'll create this soon)
const connectDB = require('./config/db');

// 4. Initialize Express Application
const app = express(); // Creates an instance of the Express application
const server = http.createServer(app);

// Secure HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
})); // Sets various HTTP headers to help protect your app

// 5. Connect to Database
connectDB(); // Call the function to establish MongoDB connection

// 6. Middleware Setup
// Enable CORS for all routes and origins (for development).
// For production, you might want to configure specific origins.
// app.use(cors());
// Configure CORS using environment variables so deployments do not require code changes.
const normalizeOrigin = (origin = '') => origin.trim().replace(/\/$/, '');

const defaultOrigins = ['http://localhost:5173', 'http://localhost:3000'];
const configuredOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ALLOWED_ORIGINS || '').split(','),
]
  .map((value) => normalizeOrigin(value || ''))
  .filter(Boolean);

const allowedOrigins = new Set([...defaultOrigins, ...configuredOrigins]);
const allowVercelPreviewDomains = process.env.CORS_ALLOW_VERCEL_PREVIEWS === 'true';

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  const normalized = normalizeOrigin(origin);
  if (allowedOrigins.has(normalized)) {
    return true;
  }

  if (!allowVercelPreviewDomains) {
    return false;
  }

  try {
    return new URL(normalized).hostname.endsWith('.vercel.app');
  } catch (error) {
    return false;
  }
};

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (isAllowedOrigin(origin)) {
            return callback(null, true);
        }
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Allow cookies to be sent
    optionsSuccessStatus: 204
}));

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Socket origin not allowed by CORS policy.'));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const SOCKET_JWT_SECRET = process.env.JWT_SECRET || 'bachelor-house-rent-system-dev-secret';

const canJoinPropertyRoom = (property, user) => {
  if (!property || !user) return false;

  const userId = String(user.id);
  if (String(property.landlord) === userId) return true;
  if (user.role === 'Tenant') return true;

  const hasApplication = (property.seatApplications || []).some(
    (application) => String(application.tenant) === userId
  );
  if (hasApplication) return true;

  const hasMessages = (property.messages || []).some(
    (message) => String(message.sender) === userId
  );

  return hasMessages;
};

io.use(async (socket, next) => {
  try {
    const authToken = socket.handshake.auth?.token;
    const headerToken = socket.handshake.headers?.authorization?.startsWith('Bearer ')
      ? socket.handshake.headers.authorization.split(' ')[1]
      : null;
    const token = authToken || headerToken;

    if (!token) {
      return next(new Error('Authentication required for realtime connection.'));
    }

    const decoded = jwt.verify(token, SOCKET_JWT_SECRET);

    if (decoded.id === 'system-admin' && decoded.role === 'Admin') {
      socket.data.user = {
        id: 'system-admin',
        role: 'Admin',
      };
      return next();
    }

    const user = await User.findById(decoded.id).select('_id role');

    if (!user) {
      return next(new Error('User not found for realtime connection.'));
    }

    socket.data.user = {
      id: String(user._id),
      role: user.role,
    };

    next();
  } catch (error) {
    next(new Error('Invalid realtime authentication token.'));
  }
});

propertyController.setSocketServer(io);

io.on('connection', (socket) => {
  socket.on('property:join', async (propertyId) => {
    if (!propertyId) return;

    try {
      const property = await Property.findById(propertyId).select('landlord seatApplications messages');

      if (!property || !canJoinPropertyRoom(property, socket.data.user)) {
        socket.emit('property:error', { message: 'Not authorized to join this chat room.' });
        return;
      }

      socket.join(`property:${propertyId}`);
    } catch (error) {
      socket.emit('property:error', { message: 'Unable to join chat room right now.' });
    }
  });

  socket.on('property:leave', (propertyId) => {
    if (!propertyId) return;
    socket.leave(`property:${propertyId}`);
  });

  socket.on('property:typing', (payload = {}) => {
    const propertyId = payload.propertyId;
    if (!propertyId) return;

    const roomName = `property:${propertyId}`;
    if (!socket.rooms.has(roomName)) return;

    socket.to(roomName).emit('property:typing', {
      propertyId,
      userId: socket.data.user.id,
      isTyping: Boolean(payload.isTyping),
    });
  });
});

// Express middleware to parse JSON request bodies.
// When the frontend sends JSON data (e.g., in a POST request),
// this middleware parses it and makes it available in `req.body`.
app.use(express.json());

// Express middleware to parse URL-encoded request bodies (e.g., from HTML forms).
// `extended: false` uses the querystring library (simpler).
app.use(express.urlencoded({ extended: false }));

// Serve static files from the local 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 7. Define a Simple Test Route
// A GET request to the root URL ('/') of our API
app.get('/', (req, res) => {
  // req: request object (contains info about the incoming request)
  // res: response object (used to send a response back to the client)
  res.status(200).json({ message: 'Welcome to the Bachelor House Rent System API!' });
});

// Apply rate limiting to API routes to prevent abuse
// You can configure different limiters for different routes if needed
const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' },
});

// For more sensitive routes like login or password reset, stricter limits reduce brute-force attacks.
const authLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 10, // Limit each IP to 10 auth attempts per window
    message: { success: false, message: 'Too many authentication attempts from this IP, please try again after 10 minutes.' },
    skipSuccessfulRequests: true, // Don't count successful auths against the limit
});

app.use('/api', apiLimiter); // Apply to all routes starting with /api
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// 8. Define API Routes
// All routes defined in authRoutes.js will be prefixed with /api/auth
app.use('/api/auth', authRoutes);
// Mount routes
app.use('/api/contact', contactRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/upload', uploadRoutes);

// 9. Global Error Handling Middleware
app.use(errorHandler);


// 10. Define the Port
// Use the PORT environment variable if set, otherwise default to 5000.
// process.env.PORT allows the hosting provider to set the port.
const PORT = Number(process.env.PORT || process.env.BACKEND_PORT || 5001);

// HTTP request logger middleware (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); // 'dev' format gives colored status codes for quick visual feedback
}

// 11. Start the Server
// The app.listen() function starts a UNIX socket and listens for connections on the specified path (or port).
// app.listen(PORT, () => {
//   console.log(`Backend server is running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
//   console.log('Press Ctrl+C to stop the server.');
// });
server.listen(PORT, () => {
    console.log(`Backend server is running in ${process.env.NODE_ENV} mode on http://localhost:${PORT}`);
});