# BHRS-SPL-2

BHRS-SPL-2 is a Dhaka-focused seat-rental platform that connects tenants, landlords, and admins in one verified workflow.

## Project Background

Urban bachelor housing often suffers from low trust, fake listings, missing documents, and manual communication. BHRS-SPL-2 was designed to solve those pain points with:

- role-based onboarding and verification (Tenant, Landlord, Admin)
- listing moderation and ownership checks
- application-to-approval seat flow
- secure monthly payment pipeline
- real-time property-level chat
- admin verification and ban controls

## High-Level Architecture

### 1) Frontend Layer (`client/`)

- React + Vite SPA
- React Router for route segmentation
- Auth state managed in context (`sessionStorage` token/user)
- Axios API client with auth interceptor
- Socket.IO client for live chat/typing events

### 2) Backend Layer (`server/`)

- Node.js + Express API
- Middleware stack: Helmet, CORS policy, rate limiting, validation, auth guards, error middleware
- JWT auth for REST and Socket.IO handshake
- Modular route/controller organization by domain

### 3) Data Layer

- MySQL as the primary datastore
- SQL pool bootstrap that ensures database/table existence
- Domain models under `server/models` for users, properties, contacts, blogs, and settings

### 4) Realtime Layer

- Socket.IO server mounted on the same HTTP server
- token-authenticated connection handshake
- room-based events (`user:{id}`, `property:{id}`)
- authorization check before joining property chat

## API Route Optimization System

The API is optimized for security, reliability, and predictable behavior under load.

### Routing Strategy

- domain prefixes:
  - `/api/auth`
  - `/api/properties`
  - `/api/blogs`
  - `/api/contact`
  - `/api/upload`
- route-level guards with `protect` and `authorizeRoles`
- centralized validation middleware before controllers

### Security and Throughput Controls

- CORS allow-list normalization (supports env-driven origins and optional Vercel preview allow)
- global API rate limiter with dedicated stricter auth limiter for login/reset flows
- Helmet headers for baseline HTTP hardening
- shared error middleware to normalize API failures

### Auth and Session Optimization

- lightweight JWT payload (`id`, `role`) for fast authorization checks
- admin/system login support with environment override
- frontend request interceptor attaches token automatically
- 401 interceptor performs cleanup to avoid broken stale sessions

### Reliability Controls

- upload paths skipped from strict generic rate limits to reduce false throttling during image workflows
- Socket.IO origin checks mirror REST CORS policy
- property room joins validated against landlord/tenant/application/message eligibility

## End-to-End Core Flows

### Registration and Verification

1. user submits registration with verification document
2. account is created with `Pending` verification state
3. admin reviews and sets `Verified` or `Rejected` with feedback
4. only verified accounts can continue role flows (Tenant/Landlord)

### Admin Login

1. frontend submits role + identifier + password to `/api/auth/login`
2. backend validates admin credentials and returns JWT
3. client stores token in `sessionStorage` and updates auth context
4. protected admin routes authorize based on role

### Seat Application and Payment

1. tenant applies for a seat on a listing
2. landlord approves/rejects in dashboard
3. approved flow enters payment pipeline (method, account, OTP, PIN, slip)
4. backend stores transaction steps and verification metadata

## Project Structure

- `client/`: web frontend
- `server/`: API server and realtime backend
- `Database/migrations/`: SQL bootstrap scripts
- `render.yaml`: Render deployment blueprint

## Environment Configuration

Create `server/.env`:

```env
NODE_ENV=development
BACKEND_PORT=5001

JWT_SECRET=change-me
JWT_EXPIRES_IN=1h

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=bhrs_spl_2

FRONTEND_URL=http://localhost:5173
CORS_ALLOWED_ORIGINS=http://localhost:5173
CORS_ALLOW_VERCEL_PREVIEWS=true

SYSTEM_ADMIN_USER_ID=admin
SYSTEM_ADMIN_PASSWORD=admin@123

EMAIL_FROM_NAME=BHRS-SPL-2
EMAIL_FROM_ADDRESS=no-reply@example.com
ETHEREAL_HOST=
ETHEREAL_PORT=
ETHEREAL_SECURE=
ETHEREAL_USER=
ETHEREAL_PASS=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Create `client/.env`:

```env
VITE_API_BASE_URL=http://localhost:5001/api
VITE_BACKEND_URL=http://localhost:5001
```

## Local Run

Install dependencies:

```bash
cd server && npm install
cd ../client && npm install
```

Run backend:

```bash
cd server
npm run dev
```

Run frontend:

```bash
cd client
npm run dev
```

Local URLs:

- Frontend: http://localhost:5173
- Backend: http://localhost:5001

## Scripts

### Server

- `npm start`: run API
- `npm run dev`: run API with nodemon
- `npm test`: run Jest tests
- `npm run test:watch`: run tests in watch mode
- `npm run test:coverage`: coverage report

### Client

- `npm run dev`: start Vite dev server
- `npm run build`: production build
- `npm run preview`: preview production build
- `npm run lint`: lint checks
- `npm run format`: format frontend source

## Deployment

### Render (Backend)

- use `render.yaml`
- root dir: `server`
- set DB/JWT/CORS/environment secrets

### Vercel (Frontend)

- root dir: `client`
- set:
  - `VITE_API_BASE_URL=https://<render-service>.onrender.com/api`
  - `VITE_BACKEND_URL=https://<render-service>.onrender.com`

## API Route Map

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/forgot-password`
- `POST /api/auth/resend-password-otp`
- `POST /api/auth/reset-password`
- `POST /api/auth/reset-password/:token`
- `GET /api/auth/verify-email/:token`
- `POST /api/auth/resend-verification-email`

### Admin Auth and Moderation (Admin userID: "admin" ; pass: "admin@123"

- `GET /api/auth/admin-summary`
- `GET /api/auth/admin/pending-verifications`
- `PATCH /api/auth/admin/users/:userId/verification`
- `GET /api/auth/admin/users`
- `PATCH /api/auth/admin/users/:userId/ban`
- `DELETE /api/auth/admin/users/:userId`

### Other Domains

- `api/properties/*`: listing CRUD, applications, payments, moderation, intelligence
- `api/blogs/*`: blog features
- `api/contact/*`: contact form pipeline
- `api/upload/*`: image/document uploads

## Verified Status (Current Fix Pass)

- backend tests pass
- frontend production build passes
- runtime dependency issue in backend startup fixed by nodemailer version correction

## developer

1. **Md. Khayrul Islam Sajib**
   email : bsse1552@iit.du.ac.bd

2. **Md. Atiqur Rahman**
   email: bsse1417@iit.du.ac.bd


