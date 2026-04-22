# To-Let Globe - Backend API

**Version: 1.0.0**
**Last Updated: June 10, 2025**
**Primary Technologies: Node.js, Express.js, MongoDB (with Mongoose), JWT**

---

### 📄 Table of Contents

* [1. Project Overview](#1-project-overview)
* [2. Features](#2-features)
* [3. Tech Stack](#3-tech-stack)
* [4. Prerequisites](#4-prerequisites)
* [5. Getting Started](#5-getting-started)
    * [Cloning the Repository](#cloning-the-repository)
    * [Environment Setup](#environment-setup)
    * [Installing Dependencies](#installing-dependencies)
    * [Running the Application](#running-the-application)
* [6. API Endpoints](#6-api-endpoints)
    * [Authentication & User Routes (`/api/auth`)](#authentication--user-routes-apiauth)
    * [Contact Routes (`/api/contact`)](#contact-routes-apicontact)
    * [Blog Routes (`/api/blogs`)](#blog-routes-apiblogs)
    * [Property Routes (`/api/properties`)](#property-routes-apiproperties)
* [7. Environment Variables](#7-environment-variables)
* [8. Project Structure](#8-project-structure)
* [9. Scripts](#9-scripts)
* [10. Security Features](#10-security-features)
* [11. Testing](#11-testing)
    * [Running Unit/Integration Tests](#running-unitintegration-tests)
* [12. Code Style & Linting](#12-code-style--linting)
* [13. Contributing](#13-contributing)
* [14. License](#14-license)
* [15. Contact](#15-contact)

---

### 1. Project Overview

This project provides a robust and secure backend API for the To-Let Globe application. It supports diverse user roles (e.g., `User`, `Admin`, `Content Creator`) and includes core functionalities such as user registration with email verification, login with JWT-based session management, secure password hashing, password reset functionality, role-based access control, a comprehensive contact form system, a dynamic blog management module and a dedicated module for managing property listings, including image uploads and search capabilities..

The API is designed to be consumed by a modern client application (e.g., the [To-Let Globe React Client](../client/README.md)).

---

### 2. Features

#### User Authentication & Authorization:
* **User Registration:** Secure new user sign-up with optional role assignment.
* **Email Verification:** Account activation via unique, expiring email links.
* **User Login:** Secure authentication using email/username and password, returning a JSON Web Token (JWT) upon success.
* **JWT Authentication:** Stateless session management for secure API access.
* **Password Hashing:** Industry-standard password storage using `bcryptjs` for security.
* **Forgot/Reset Password:** Robust mechanism for users to securely recover and reset forgotten passwords via email.
* **Role-Based Access Control (RBAC):** Middleware to protect routes and resources based on assigned user roles.
* **Protected Routes:** Ensures secure access to user-specific and role-specific API endpoints.

#### Contact Form Management:
* **Message Submission:** Dedicated API endpoint to receive user contact messages.
* **Database Persistence:** Stores all contact messages securely in MongoDB.
* **Email Notifications:** Sends automated confirmation emails to the user and notification emails to the configured administrator upon successful submission.

#### Blog Management:
* **Create Blog Posts:** API endpoint for authorized `Content Creator` roles to publish new blog articles.
* **Retrieve Blog Posts:** Endpoints to fetch single or multiple blog posts for display on the frontend.
* **Like Functionality:** Allows users to "like" blog posts, tracking engagement.

#### Property Management:
* **Property Listing Creation:** API endpoint for authorized `Landlord` roles to add new property listings with comprehensive details.
* **Property Image Uploads:** Supports uploading multiple images per property.
* **Retrieve Property Listings:** Endpoints to fetch single or multiple property listings, with options for pagination, searching, and filtering.
* **Property Updates:** Allows `Landlords` to update their existing property details.
* **Property Deletion:** Provides functionality for `Landlords` to remove their property listings.
* **Search & Filter:** Advanced API capabilities to search properties by location, price, type, amenities, and other criteria.


#### API Management & Security:
* **Input Validation:** Comprehensive server-side validation of all incoming data using `express-validator` to prevent malicious inputs and ensure data integrity.
* **Centralized Error Handling:** Graceful and consistent error management for all API responses, improving debugging and client-side handling.
* **Security Headers:** Enhanced HTTP security with `helmet` middleware, mitigating common web vulnerabilities.
* **Rate Limiting:** Protection against brute-force attacks and denial-of-service (DoS) attempts using `express-rate-limit`.
* **HTTP Request Logging:** Detailed development logging using `morgan` for monitoring API traffic.
* **CORS Handling:** Configured for secure and seamless cross-origin resource sharing between the frontend and backend.

---

### 3. Tech Stack

* **Runtime Environment:** Node.js (v18.x or later)
* **Web Framework:** Express.js
* **Database:** MongoDB (NoSQL, typically hosted on MongoDB Atlas)
* **ODM (Object Data Modeling):** Mongoose
* **Authentication:** JSON Web Tokens (JWT) (`jsonwebtoken`)
* **Password Hashing:** `bcryptjs`
* **File Uploads:** Multer (for handling multipart/form-data, specifically property images)
* **Cloud Storage (Optional/Future):** (e.g., Cloudinary, AWS S3 - for scalable image hosting)
* **Email Sending:** Nodemailer (with Ethereal.email for development/testing)
* **Input Validation:** `express-validator`
* **Environment Variables:** `dotenv`
* **Security:** `helmet`, `express-rate-limit`
* **HTTP Logging:** `morgan`
* **CORS Handling:** `cors`
* **Testing:** Jest, Supertest, MongoDB Memory Server

---

### 4. Prerequisites

Before you begin, ensure you have the following installed on your local development machine:

* **Node.js:** Version 18.x or higher. Download from [nodejs.org](https://nodejs.org/). (npm is included with Node.js installation).
* **MongoDB:** Version 5.x or higher, or preferably use a cloud service like [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
* **Git:** For cloning the repository. Download from [git-scm.com](https://git-scm.com/).
* **(Optional) A REST Client:** Tools like Postman, Insomnia, or the VS Code REST Client extension for testing API endpoints.

---

### 5. Getting Started

### Cloning the Repository

If you haven't already, clone the main To-Let Globe monorepo and navigate into the backend directory:

```bash
git clone [https://github.com/kaustubhdivekar/to-let-globe.git](https://github.com/kaustubhdivekar/to-let-globe.git)
cd to-let-globe/server
```

Environment Setup
This project uses a .env file to store environment-specific configurations and sensitive credentials.

Create a .env file:
Copy the example file to create your local environment configuration:

```Bash

cp .env.example .env
```
Edit .env:
Open the newly created .env file and fill in the required variables. Refer to the Environment Variables section for detailed descriptions of each variable.

Ensure MONGODB_URI points to your MongoDB instance (local or Atlas).
Set a strong, unique JWT_SECRET.
Configure email settings (use Ethereal.email credentials for development/testing).
Set FRONTEND_URL to your frontend application's URL (e.g., http://localhost:5173 for local development).
Set ADMIN_EMAIL to the email address where you want to receive contact form notifications.
Installing Dependencies
Install the project dependencies using npm:

```Bash

npm install
```
Running the Application
Development Mode (with Nodemon for auto-restarts):

```Bash

npm run dev
```
The server will typically start on the port specified in your .env file (default: 5001). You should see console logs indicating server startup and MongoDB connection status.

Production Mode:

```Bash

npm start
```
This command runs the server using node server.js. Ensure your NODE_ENV in .env is set to production when deploying for production environments.

---

### 6. API Endpoints
All API endpoints are prefixed with /api. For more detailed request/response schemas, refer to the source code within server/controllers and server/routes.

Authentication & User Routes (/api/auth)

Method	Endpoint	Description	Access

POST	/register	Register a new user with email, password, and optional role.	Public
POST	/login	Authenticate user credentials, returns JWT on success.	Public
GET	/verify-email/:token	Verify user's email using a unique token from the email link.	Public
POST	/forgot-password	Request a password reset email for a given email address.	Public
POST	/reset-password/:token	Reset user's password using the provided token and new password.	Public
POST	/resend-verification-email	Request a new email verification link if the previous one expired.	Public
GET	/me	Get details of the currently authenticated user based on their JWT.	Private (Requires JWT)
GET	/admin-summary	Example endpoint requiring admin role for access.	Private (Admin Role)

Contact Routes (/api/contact)

Method	Endpoint	Description	Access
POST	/	Submits a new contact message. Saves to DB and sends confirmation/notification emails.	Public

Blog Routes (/api/blogs)

Method	Endpoint	Description	Access
POST	/	Create a new blog post.	Private (Content Creator)
GET	/	Get all blog posts, optionally with pagination/filters.	Public
GET	/:id	Get a single blog post by its ID.	Public
POST	/:id/like	Increment the like count for a specific blog post.	Public
PUT	/:id	Update an existing blog post by its ID.	Private (Content Creator)
DELETE	/:id	Delete a blog post by its ID.	Private (Content Creator)

Property Routes (/api/properties)

Method	Endpoint	Description	Access
POST	/	Create a new property listing. Supports multi-part form data for images.	Private (Landlord)
GET	/	Get all property listings. Supports query parameters for search and filtering (e.g., ?location=Pune&priceMax=50000).	Public
GET	/:id	Get a single property listing by its ID.	Public
PUT	/:id	Update an existing property listing by its ID.	Private (Landlord, Owner)
DELETE	/:id	Delete a property listing by its ID.	Private (Landlord, Owner)
GET	/my-properties	Get all property listings owned by the authenticated Landlord.	Private (Landlord)


---

### 7. Environment Variables

The following environment variables are used by the application. Create a .env file in the root of the backend project directory and populate it based on .env.example.

NODE_ENV: Application environment (development, production, test).
BACKEND_PORT: Port the backend server will run on (e.g., 5001).
MONGODB_URI: Connection string for your MongoDB database (e.g., from MongoDB Atlas).
JWT_SECRET: A long, random, and strong secret key for signing JSON Web Tokens. You can generate one using node -e "console.log(require('crypto').randomBytes(32).toString('hex'))".
JWT_EXPIRES_IN: Expiration time for JWTs (e.g., 1h for 1 hour, 7d for 7 days).
FRONTEND_URL: Base URL of your frontend application (used for generating email links for verification/password reset, e.g., http://localhost:5173 for local development, or your Vercel URL for production).
ADMIN_EMAIL: The email address that will receive notifications for new contact form submissions.
Email Settings (For Development & Testing using Ethereal.email):
These are used for testing email functionality during development without needing a real email provider.

ETHEREAL_HOST: (e.g., smtp.ethereal.email)
ETHEREAL_PORT: (e.g., 587)
ETHEREAL_SECURE: (false for TLS, true for SSL/465 port)
ETHEREAL_USER: Your Ethereal.email username.
ETHEREAL_PASS: Your Ethereal.email password.
Email Settings (For Production - Example using a real SMTP service like SendGrid, Mailgun, etc.):
Important: For production deployments, replace the Ethereal settings with credentials from your actual SMTP provider.

EMAIL_HOST: SMTP host of your production email provider (e.g., smtp.sendgrid.net).
EMAIL_PORT: SMTP port (e.g., 587 for TLS, 465 for SSL).
EMAIL_SECURE: true if using SSL (port 465), false for TLS (port 587).
EMAIL_USER: Username for your production email provider (often an API Key for services like SendGrid).
EMAIL_PASS: Password for your production email provider (often an API Key secret).
EMAIL_FROM_NAME: Sender name for all outgoing emails (e.g., "To-Let Globe Support").
EMAIL_FROM_ADDRESS: Sender email address (e.g., noreply@toletglobe.com).
Rate Limiting (Optional - using default values if not set):
RATE_LIMIT_WINDOW_MS: Time window for rate limiting in milliseconds (e.g., 900000 for 15 minutes).
RATE_LIMIT_MAX_REQUESTS: Maximum requests allowed per IP within the defined window (e.g., 100).

CLOUDINARY_CLOUD_NAME="cloud_name"
CLOUDINARY_API_KEY="api_key"
CLOUDINARY_API_SECRET="secret"

---

### 8. Project Structure

```
server/
├── __tests__/                  # Jest test files for controllers, routes, etc.
│   ├── controllers/
│   │   ├── authController.test.js
│   │   ├── blogController.test.js
│   │   └── contactController.test.js
│   │   └── propertyController.test.js
│   └── routes/
│       ├── authRoutes.test.js
│       ├── blogRoutes.test.js
│       └── contactRoutes.test.js
│       └── propertyRoutes.test.js
├── config/                     # Configuration files (e.g., database connection)
│   └── db.js                   # MongoDB connection logic
│   └── cloudinaryConfig.js     # Cloudinary connection logic
├── controllers/                # Business logic and request handlers
│   ├── authController.js       # User authentication logic
│   ├── blogController.js       # Blog post management logic
│   └── contactController.js    # Contact form submission logic
│   └── propertyController.js   # Property listing management logic
├── middleware/                 # Custom Express middleware functions
│   ├── authMiddleware.js       # JWT validation, user retrieval, role-based access control
│   ├── errorMiddleware.js      # Centralized error handling
│   ├── uploadMiddleware.js     # Multer configuration for file uploads (e.g., property images)
│   ├── validationMiddleware.js # Input validation via express-validator
├── models/                     # Mongoose schemas and models
│   ├── User.js                 # User schema
│   ├── Blog.js                 # Blog post schema
│   └── Contact.js              # Contact message schema
│   └── Property.js             # Property listing schema
├── routes/                     # Express route definitions
│   ├── authRoutes.js           # Authentication related API routes
│   ├── blogRoutes.js           # Blog management API routes
│   └── contactRoutes.js        # Contact form API routes
│   └── propertyRoutes.js       # Property listing API routes
├── uploads/                    # Directory for uploaded files (e.g., property images)
├── utils/                      # Utility functions and services
│   ├── emailService.js         # Nodemailer integration
│   ├── generateToken.js        # JWT token generation
│   └── sendEmail.js            # General email sending utility
├── .env                        # Local environment variables (ignored by Git)
├── .env.example                # Template for environment variables
├── .eslintignore               # Files/directories to ignore for ESLint
├── .eslintrc.js                # ESLint configuration
├── .gitignore                  # Files/directories to ignore for Git
├── jest.config.js              # Jest test runner configuration
├── jest.setup.js               # Global setup for Jest tests (e.g., in-memory DB)
├── package-lock.json
├── package.json                # Project metadata and dependencies
├── README.md                   # This file (Backend API README)
└── server.js                   # Main application entry point
```

---

### 9. Scripts

The following npm scripts are available in package.json for development and testing:

npm start: Starts the server in production mode (node server.js).
npm run dev: Starts the server in development mode with nodemon for automatic reloading on file changes.
npm test: Runs all Jest tests (jest --runInBand).
npm run test:watch: Runs Jest tests in watch mode (re-runs tests on file changes).
npm run test:coverage: Runs Jest tests and generates a detailed code coverage report (output in the coverage/ directory).
npm run lint: Lints the codebase using ESLint to identify code quality issues.
npm run format: Automatically formats the codebase using Prettier to enforce consistent styling.

---

### 10. Security Features

To ensure a robust and secure API, the following security measures are implemented:

Password Hashing: User passwords are never stored in plain text. bcryptjs is used to securely hash and salt them, making them highly resistant to common attacks like rainbow tables.

JWT Authentication: JSON Web Tokens are employed for secure, stateless user sessions. Tokens are cryptographically signed with a strong, secret key (JWT_SECRET) to prevent tampering and ensure authenticity.

HTTPS Enforcement (Production): While this Node.js application itself doesn't directly enforce HTTPS (this is typically handled by a reverse proxy or the hosting platform), using HTTPS is absolutely crucial for production deployments to encrypt all data in transit.

Input Validation: express-validator is used to rigorously validate all incoming request data on the server-side. This helps prevent common web vulnerabilities such as SQL injection, Cross-Site Scripting (XSS), and ensures data integrity.

Environment Variables: Sensitive information such as database credentials, JWT secrets, and API keys are stored in .env files and are strictly excluded from version control (.gitignore).

Security Headers: The helmet middleware is integrated to set various HTTP headers that enhance security by protecting against common web vulnerabilities, including XSS, clickjacking, and others.

Rate Limiting: express-rate-limit middleware is configured to prevent brute-force attacks on authentication endpoints and other sensitive routes by limiting the number of requests per IP address within a specified time window.

CORS (Cross-Origin Resource Sharing): The cors middleware is properly configured to manage access to the API, typically allowing requests only from the specified frontend URL, preventing unauthorized cross-origin requests.

Token Hashing for Verification/Reset: Email verification and password reset tokens sent to users are distinct from the (hashed) versions stored in the database. This adds an extra layer of security, as even if a token is intercepted, it cannot be directly used to gain access.

Principle of Least Privilege (via Roles): The authorizeRoles middleware ensures that users can only access API resources and perform actions that are appropriate for their assigned role, enforcing granular access control.

---

### 11. Testing

This project utilizes Jest for unit and integration testing. Supertest is used for making HTTP requests to test API endpoints, and MongoDB Memory Server provides an isolated, in-memory MongoDB instance for tests, ensuring tests are fast and don't affect your development database.

Running Unit/Integration Tests

To run all tests:

```Bash

npm test
```

To run tests in watch mode (tests automatically re-run on file changes):

```Bash

npm run test:watch
```
To generate a detailed code coverage report (output will be in the coverage/ directory):

```Bash

npm run test:coverage
```
You can then open coverage/lcov-report/index.html in your web browser to view the interactive report.

Test files are organized within the __tests__ directory, mirroring the structure of the code they are testing (e.g., __tests__/controllers/authController.test.js).

---

### 12. Code Style & Linting

To maintain code consistency and quality across the project, the following tools are integrated:

ESLint: Used for static code analysis to find problematic patterns, potential errors, and code that doesn’t adhere to defined style guidelines. The configuration is found in .eslintrc.js.

Prettier: Functions as an opinionated code formatter to ensure a consistent and readable code style across the entire codebase. The configuration is in .prettierrc.json.

To lint the code:

```Bash

npm run lint
```
To automatically format the code:

```Bash

npm run format
```
It's highly recommended to integrate these tools with your Integrated Development Environment (IDE), such as VS Code, for real-time feedback and automatic format-on-save functionality.

---

### 13. Contributing

Contributions are welcome! If you'd like to contribute to the To-Let Globe backend, please follow these steps:

Fork the repository.
Create a new branch for your feature or bug fix:
```Bash

git checkout -b feature/add-new-feature
# OR
git checkout -b fix/resolve-api-bug-123
```
Make your changes. Ensure you adhere to the project's code style and write comprehensive tests for any new functionality or bug fixes.

Commit your changes with a clear and descriptive commit message, ideally following Conventional Commits (e.g., feat: Implement admin dashboard API, fix: Correct password reset token validation).

Push your changes to your forked repository:
```Bash

git push origin feature/add-new-feature
```
Open a Pull Request to the main (or develop) branch of the original repository.

Provide a clear description of your changes and why they were made in the Pull Request.

Please ensure all tests pass (npm test) and the linter shows no errors (npm run lint) before submitting a Pull Request.

---

### 14. License

This project is licensed under the MIT License. For the full license text, please see the LICENSE file in the monorepo root directory.

---

### 15. Author

Project Maintainer: **Kaustubh Divekar**

---