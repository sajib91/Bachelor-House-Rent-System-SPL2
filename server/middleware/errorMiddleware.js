// backend/middleware/errorMiddleware.js
const dotenv = require('dotenv');
dotenv.config(); // Ensure NODE_ENV is loaded

const errorHandler = (err, req, res, next) => {
  // Determine status code: use error's statusCode if set, otherwise default to 500
  let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message || 'Internal Server Error';

  // Mongoose Bad ObjectId Error
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404; // Not found
    message = `Resource not found. Invalid ID format.`;
  }

  // Mongoose Duplicate Key Error (e.g., unique email or username violation)
  if (err.code === 11000) {
    statusCode = 400; // Bad request
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate field value entered for '${field}'. Please use another value.`;
  }

  // Mongoose Validation Error (already handled in controller, but can be a fallback)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401; // Unauthorized
    message = 'Invalid token. Please log in again.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401; // Unauthorized
    message = 'Your session has expired. Please log in again.';
  }

  // Log the error in development for debugging
  if (process.env.NODE_ENV === 'development') {
    console.error('-------------------- ERROR START --------------------');
    console.error(`Status Code: ${statusCode}`);
    console.error(`Message: ${message}`);
    console.error('Error Object:', err); // Log the full error object in dev
    console.error('Stack Trace:', err.stack);
    console.error('--------------------  ERROR END  --------------------');
  }

  res.status(statusCode).json({
    success: false,
    message: message,
    // Only include stack trace in development for security reasons
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = { errorHandler };