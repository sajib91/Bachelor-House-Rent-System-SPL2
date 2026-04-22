# Bachelor House Rent System

**Version: 1.0.0**
**Last Updated: June 10, 2025**

This monorepo houses the complete source code for **Bachelor House Rent System**, a full-stack Dhaka rental marketplace focused on bachelor-friendly seat listings, verified identity, landlord approvals, rent collection, and in-platform chat. It features a Node.js/Express.js backend API and a React frontend designed around the bachelor housing workflow.

---

## 🚀 Project Overview

To-Let Globe aims to simplify the renting and leasing process by providing a secure, flexible, and modern platform. The project demonstrates best practices in decoupled architecture, utilizing JWT for authentication, email-based account management, secure data processing, and integrated communication functionalities (e.g., contact form with notifications). The frontend features a sleek dark theme with vibrant cyan and gold gradient accents, aligning with contemporary UI/UX principles.

---

## ✨ Key Features

### Backend
* **User Management:** Tenant and landlord registration, JWT authentication, and password hashing.
* **Verification:** Email verification plus identity document metadata for tenant trust.
* **Seat Listings:** Shared-living listings with seats, gender preference, room type, amenities, and rules.
* **Booking Workflow:** Seat applications, landlord approval/rejection, and automatic seat count updates.
* **Rent Flow:** Monthly rent payment submissions with transaction IDs and landlord verification.
* **Chat:** In-platform listing messages for pre-booking questions and landlord interviews.
* **Security:** `helmet`, `express-rate-limit`, CORS, and centralized error handling.


### Frontend
* **Tenant registration:** Name, email, phone, verification type, and optional host intent.
* **Listings:** Seat search with area, budget, gender, room type, and amenity filters.
* **Dashboard:** Verification status, hosted listings, and seat request tracking.
* **Detail workflow:** Apply for seat, submit rent, chat with landlord, and review approval state.
* **Modern UI:** Dark Dhaka-inspired design with amber and teal accents.


---

## 💻 Tech Stack

### Backend
* **Runtime:** Node.js
* **Web Framework:** Express.js
* **Database ODM:** Mongoose (for MongoDB)
* **Authentication:** `jsonwebtoken`, `bcryptjs`
* **Email:** Nodemailer
* **Validation:** `express-validator`
* **Security:** `helmet`, `express-rate-limit`
* **Environment Variables:** `dotenv`
* **Development:** `nodemon`

### Frontend
* **Library:** React.js (v18+)
* **Build Tool:** Vite
* **Routing:** React Router DOM (v6)
* **API Client:** Axios
* **Form Management:** React Hook Form
* **State Management:** React Context API
* **UI Notifications:** React Toastify
* **Icons:** React Icons
* **Rich Text Editor:** React Quill
* **Styling:** CSS Modules, Global CSS with CSS Variables
* **Code Quality:** ESLint, Prettier

### Database
* **MongoDB:** NoSQL database (hosted via MongoDB Atlas).

### Deployment
* **Backend:** Render
* **Frontend:** Vercel

---

## 📂 Monorepo Structure
```
to-let-globe/
├── server/                   # Node.js Express.js Server Application
│   ├── config/               # Database connection, security configurations
│   ├── controllers/          # Business logic for API routes
│   ├── middleware/           # Authentication, error handling, rate limiting
│   ├── models/               # Mongoose schemas (User, Contact, Blog etc.)
│   ├── routes/               # API endpoint definitions
│   ├── utils/                # Email service, JWT helpers, general utilities
│   ├── .env.example          # Template for backend environment variables
│   ├── package.json          # Backend dependencies and scripts
│   └── server.js             # Main backend entry point
├── client/                   # React.js Client Application
│   ├── public/               # Static assets
│   ├── src/                  # React source code
│   │   ├── assets/           # Images, custom SVGs, fonts
│   │   ├── components/       # Reusable UI components
│   │   ├── contexts/         # React Context for global state (e.g., Auth)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── pages/            # Page-level components (Login, Dashboard, Contact, Blog, PropertyList, PropertyDetail, CreateProperty)
│   │   ├── services/         # API integration services (Axios configuration)
│   │   ├── styles/           # Global CSS, theme variables, CSS modules
│   │   ├── App.jsx           # Main application component with routing
│   │   └── main.jsx          # Application entry point
│   ├── .env.example          # Template for frontend environment variables
│   ├── index.html            # Main HTML page
│   ├── package.json          # Frontend dependencies and scripts
│   └── vite.config.js        # Vite build configuration
├── .gitignore                # Global Git ignore rules
└── README.md                 # This file (Monorepo Root README)
```
---

## 🌐 Live Demo

Explore the live application:
* **Frontend:** update with your deployed URL
* **Backend API Status:** update with your deployed URL

---

## ⚙️ Prerequisites

Before you begin, ensure you have the following installed on your machine:

* **Node.js:** v18.x or later (includes npm).
* **Git:** Latest version.
* **A MongoDB Atlas account:** [Sign up](https://www.mongodb.com/cloud/atlas/register) for a free tier.
* **A Render account:** [Sign up](https://render.com/) for a free tier (for backend deployment).
* **A Vercel account:** [Sign up](https://vercel.com/) for a free tier (for frontend deployment).
* **A transactional email service provider** (e.g., [SendGrid](https://sendgrid.com/), [Mailgun](https://www.mailgun.com/) for production emails) or [Ethereal.email](https://ethereal.email/) for development testing.
* **A Cloudinary account:** [Sign up](https://cloudinary.com/) for a free tier (for cloud image storage CDN).

---

## 🚀 Local Development Setup

Follow these steps to get the Bachelor House Rent System application running on your local machine.

### 1. Clone the Repository

Clone the monorepo to your local machine using Git:

```bash
git clone [https://github.com/kaustubhdivekar/to-let-globe.git](https://github.com/kaustubhdivekar/to-let-globe.git)
cd to-let-globe
```

### 2. Environment Variables Setup
You will need to set up .env files for both the backend and frontend applications. These files will contain sensitive information and local configurations, and are excluded from version control by .gitignore.

Server Environment (server/.env)
Navigate into the backend directory:

```Bash

cd server
```
Create the .env file by copying from the example:

```Bash

cp .env.example .env
```
Open the newly created .env file and fill in your details:

```
MONGODB_URI: Your MongoDB Atlas connection string (e.g., mongodb+srv://<username>:<password>@cluster0.xyz.mongodb.net/to-let-globe?retryWrites=true&w=majority).
JWT_SECRET: A very strong, random secret string for JWT signing. You can generate one with node -e "console.log(require('crypto').randomBytes(32).toString('hex'))".
JWT_EXPIRES_IN: JWT expiration time (e.g., 1h).
ETHEREAL_USER, ETHEREAL_PASS: Your Ethereal.email credentials for development email testing.
ADMIN_EMAIL: An email address to receive contact form notifications (can be another Ethereal.email address for development).
FRONTEND_URL: http://localhost:5173 (for local frontend development).
NODE_ENV: development
```

Client Environment (client/.env)
Navigate into the frontend directory (from the backend directory, use cd ../frontend, or from the monorepo root, use cd frontend):

```Bash

cd ../client # or cd client

```
Create the .env file by copying from the example:

```Bash

cp .env.example .env

```
Open the newly created .env file and fill in your details:
```
VITE_API_BASE_URL: http://localhost:5001/api (assuming your backend runs on port 5001).
```
### 3. Install Dependencies & Run Services
You will need two separate terminal windows/tabs: one for the backend and one for the frontend.

Backend Setup
In your first terminal, navigate to the backend directory:

```Bash

cd to-let-globe/server

```
Install dependencies:

```Bash

npm install
Run the backend server:
```
```Bash

npm run dev
```
The backend server will typically run on http://localhost:5001.

Frontend Setup
In your second terminal, navigate to the frontend directory:

```Bash

cd to-let-globe/client
```
Install dependencies:

```Bash

npm install
```
Run the frontend development server:

```Bash

npm run dev
```
The frontend application will typically be available at http://localhost:5173.

---

### 4. Access the Application
Once both services are running, open your web browser and go to: http://localhost:5173

---

## 🗺️ API Endpoints Overview
The backend exposes RESTful APIs under the /api prefix. For detailed API documentation, including request/response schemas, please refer to the dedicated Backend README.

Some key endpoints include:

POST /api/auth/register - User registration
POST /api/auth/login - User login
GET /api/auth/verify-email/:token - Email verification
POST /api/auth/forgot-password - Request password reset link
POST /api/auth/reset-password/:token - Reset password
GET /api/auth/me - Get current user's profile (Protected)
POST /api/contact - Submit a contact form message
POST /api/blogs - Create a new blog post (Protected: Content Creator)
GET /api/blogs - Get all blog posts (Public)
GET /api/blogs/:id - Get a single blog post by ID (Public)
POST /api/blogs/:id/like - Like a blog post (Public)
POST /api/properties - Create a new property listing (Protected: Landlord)
GET /api/properties - Get all property listings (Public, with search/filter options)
GET /api/properties/:id - Get a single property listing by ID (Public)
PUT /api/properties/:id - Update a property listing (Protected: Landlord, Owner)
DELETE /api/properties/:id - Delete a property listing (Protected: Landlord, Owner)

🔑 Key Frontend Pages
Home Page (/): The main landing page.
Login (/login): User authentication interface.
Register (/register): New user account creation.
Forgot Password (/forgot-password): Initiate password reset process.
Reset Password (/reset-password/:token): Complete password reset.
Email Verification Status (/verify-email): Page to confirm email verification status.
Dashboard (/dashboard): Protected area for authenticated users.
Contact Us (/contact): Form to send messages to administrators.
Blog Listing (/blogs): Displays all available blog posts.
Create Blog (/blogs/create): Protected route for Content Creators to add new blog posts.
Blog Detail (/blogs/:id): Page to view a single blog post.
Property Listing (/properties): Displays all available property listings with search and filter options.
Property Detail (/properties/:id): Page to view a single property with details and images.
Create Property (/properties/create): Protected route for Landlords to add new property listings.
Manage Properties (/dashboard/properties): Protected area for Landlords to manage their own properties.
Unauthorized (/unauthorized): Page for users attempting to access restricted content without proper authorization.

🔒 Environment Variables Details
Refer to the .env.example files in both server/ and client/ directories for a complete list and their descriptions.

Important: Never commit your actual .env files to Git. .env.example serves as a template.

---

## 🚀 Deployment Instructions
This project is configured for continuous deployment using Render for the backend and Vercel for the frontend.

1. MongoDB Atlas Setup

Create a free account on MongoDB Atlas.

Create a new cluster (the free M0 tier is typically sufficient for personal projects).

Configure Network Access: For development, you can temporarily add 0.0.0.0/0 (Allow Access From Anywhere), but for production, narrow this down to specific IP addresses (Render's static IPs) for enhanced security.

Configure Database Access: Create a new database user with a strong username and password. Grant "Read and write to any database" privileges.

Get your Connection String: Go to "Databases," click "Connect" for your cluster, choose "Connect your application," select Node.js driver, and copy the connection string. Replace <username>, <password>, and myFirstDatabase (or your chosen database name) in the string. This is your MONGODB_URI.

2. Backend Deployment (Render)

Push your entire monorepo code to a GitHub/GitLab/Bitbucket repository.

Sign up/log in to Render.

Click "New +" and select "Web Service".

Connect your Git repository.

Configure the service:

Name: to-let-globe-backend (or similar)
Region: Choose a region close to your users and database.
Branch: main (or your deployment branch).
Root Directory: backend (Crucial for monorepos: tells Render where the backend project resides).
Build Command: npm install
Start Command: npm start (or node server.js)
Environment: Node
Environment Variables: Add all necessary variables from your server/.env file.

NODE_ENV: production
MONGODB_URI: Your MongoDB Atlas connection string.
JWT_SECRET: The same strong secret used locally.
JWT_EXPIRES_IN: e.g., 1h
EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM_NAME, EMAIL_FROM_ADDRESS: Your production email service credentials.
ADMIN_EMAIL: Your production admin email.
FRONTEND_URL: Initially, use a placeholder or leave blank. You'll update this with your Vercel frontend URL after its deployment.

Select the Free instance type if applicable.

Click "Create Web Service". Render will build and deploy your backend. Note the .onrender.com URL provided.

3. Frontend Deployment (Vercel)

Push your entire monorepo code to GitHub/GitLab/Bitbucket.

Sign up/log in to Vercel.

Click "Add New..." and select "Project".

Import your Git repository.

Configure the project:

Project Name: to-let-globe-frontend (or similar)
Vercel usually auto-detects React (Vite) projects.
Root Directory: frontend (Crucial for monorepos: tells Vercel where the frontend project resides).
Build Command: Usually auto-detected as npm run build or vite build.
Output Directory: Usually auto-detected as dist.
Environment Variables:

VITE_API_BASE_URL: Set this to your deployed Render backend URL (e.g., https://to-let-globe-backend.onrender.com/api).

Click "Deploy". Vercel will build and deploy your frontend. Note the .vercel.app URL provided.

4. Post-Deployment Updates

Update Render Backend's FRONTEND_URL: Go back to your to-let-globe-backend service on Render. Edit the FRONTEND_URL environment variable to your Vercel frontend URL (e.g., https://to-let-globe-frontend.vercel.app). Trigger a redeploy on Render for this change to take effect.

Verify Deployment: Open your Vercel frontend URL. Test all functionalities, especially login, registration, and the contact/blog forms, to ensure seamless communication with the deployed backend and database.

---

## ✅ Testing

Backend Testing
Framework: Jest
HTTP Assertions: Supertest
Location: server/ directory

Run Tests:
```Bash

cd backend
npm test
```
Frontend Testing

(Currently, explicit frontend tests are not configured. If implemented, they would typically use Vitest/Jest and React Testing Library.)

To run (if configured):

```Bash

cd frontend
npm test
```

---

## 📐 Code Quality & Conventions
Linters & Formatters: ESLint and Prettier are configured for both backend and frontend to enforce coding standards and ensure consistent formatting.
To check for linting errors: npm run lint (in respective server/ or client/ directories).
To automatically format code: npm run format (in respective server/ or client/ directories).
Commit Messages: Follow Conventional Commits for clear, structured, and automated changelog-friendly commit history (e.g., feat: Add contact form, fix: Resolve email sending error, docs: Update README).
Branching Strategy: A Gitflow-like model (e.g., main for production-ready code, develop for ongoing development, feature/ branches for new features, bugfix/ for bug fixes) is recommended for organized development.

---

## 👋 Contributing
Contributions are highly welcome! If you'd like to contribute, please follow these steps:

Fork the repository to your own GitHub account.
Clone your forked repository: git clone https://github.com/Your-GitHub-Username/to-let-globe.git
Create a new branch for your feature or bug fix: git checkout -b feature/your-feature-name or git checkout -b bugfix/issue-description.
Make your changes in the appropriate server/ or client/ directory.
Ensure your code adheres to the project's code quality standards (run npm run lint and npm run format).
Write tests for new features or bug fixes (if applicable).
Commit your changes with a clear, conventional commit message (e.g., feat: Implement user profile update).
Push your branch to your forked repository: git push origin feature/your-feature-name.
Open a Pull Request from your feature branch to the main branch of the original repository. Provide a detailed description of your changes.

---

## 📜 License
This project is licensed under the MIT License. See the LICENSE file in the monorepo root for full details.

---

## 👨‍💻 Author

**Kaustubh Divekar**

---