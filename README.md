# BHRS-SPL-2

BHRS-SPL-2 (Bachelor House Rent System) is a full-stack seat-rental platform focused on bachelor housing workflows in Dhaka.

It is a monorepo with:

- a React + Vite client application
- a Node.js + Express API server
- a MySQL data layer (auto-bootstrap tables on server startup)

## Core Highlights

- Role-based access: Tenant, Landlord, Admin
- Tenant and landlord verification workflow with admin approval/rejection
- Listing publication moderation by admin
- Verified-tenant-only seat application flow
- Landlord seat request review (approve/reject)
- Secure rent payment submission (provider, mobile account, OTP, PIN)
- In-app messaging and typing indicators via Socket.IO
- Blog and contact modules
- Admin intelligence/insight and moderation tooling

## Repository Layout

```text
.
├── client/                # React + Vite frontend
├── server/                # Express API + business logic
├── Database/              # SQL migration assets
├── render.yaml            # Render deployment blueprint
└── README.md
```

## Technology Stack

- Frontend: React 18, Vite 6, React Router, React Hook Form, Axios, Socket.IO client
- Backend: Express 5, JWT auth, Socket.IO, Express Validator, Multer, Cloudinary, Nodemailer
- Database: MySQL (via mysql2/promise)
- Testing: Jest + Supertest

## Prerequisites

- Node.js 18+ (recommended)
- npm 9+
- MySQL 8+

## Local Development

### 1) Clone

```bash
git clone https://github.com/sajib91/Bachelor-House-Rent-System-SPL2.git
cd Bachelor-House-Rent-System-SPL2
```

### 2) Configure Server Environment

Create `server/.env` with at least:

```env
# App
NODE_ENV=development
BACKEND_PORT=5001

# JWT
JWT_SECRET=change-me
JWT_EXPIRES_IN=1h

# MySQL
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=to_let_globe

# CORS
FRONTEND_URL=http://localhost:5173
CORS_ALLOWED_ORIGINS=http://localhost:5173
CORS_ALLOW_VERCEL_PREVIEWS=true

# Optional admin login override
SYSTEM_ADMIN_USER_ID=admin
SYSTEM_ADMIN_PASSWORD=admin@123

# Optional mail (password reset / notifications)
EMAIL_FROM_NAME=BHRS-SPL-2
EMAIL_FROM_ADDRESS=no-reply@example.com
ETHEREAL_HOST=
ETHEREAL_PORT=
ETHEREAL_SECURE=
ETHEREAL_USER=
ETHEREAL_PASS=

# Optional Cloudinary upload
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Note:

- The server auto-creates required MySQL tables if they do not exist.
- If Cloudinary values are missing, uploads fall back to local `server/uploads`.

### 3) Configure Client Environment

Create `client/.env`:

```env
VITE_API_BASE_URL=http://localhost:5001/api
VITE_BACKEND_URL=http://localhost:5001
```

### 4) Install and Run

Run server:

```bash
cd server
npm install
npm run dev
```

Run client (new terminal):

```bash
cd client
npm install
npm run dev
```

App URLs:

- Client: http://localhost:5173
- Server: http://localhost:5001

## Available Scripts

### Client (`client/package.json`)

- `npm run dev` - start Vite dev server
- `npm run build` - production build
- `npm run preview` - preview production build
- `npm run lint` - ESLint checks
- `npm run format` - Prettier format under `src/`

### Server (`server/package.json`)

- `npm start` - run API in normal mode
- `npm run dev` - run API with nodemon
- `npm test` - run Jest tests
- `npm run test:watch` - watch mode
- `npm run test:coverage` - coverage report

## Deployment

### Backend (Render)

- Use [render.yaml](render.yaml)
- Service root directory: `server`
- Ensure Render environment includes DB/JWT/CORS variables

### Frontend (Vercel)

- Root directory: `client`
- Set:
  - `VITE_API_BASE_URL=https://<your-render-service>.onrender.com/api`
  - `VITE_BACKEND_URL=https://<your-render-service>.onrender.com`

## API Overview

Main route groups:

- `/api/auth` - register, login, profile, verification, admin user moderation
- `/api/properties` - listing CRUD, seat apply/review, payment, reminders, admin moderation
- `/api/blogs` - blog listing/details/create/like
- `/api/contact` - contact submissions
- `/api/upload` - image uploads

## Tested Status (Current Workspace)

- `npm --prefix server test` passed
- `npm --prefix client run build` passed

## Maintenance Notes

- Listing and payment uploads are handled via `/api/upload`.
- Realtime events are powered by Socket.IO with JWT-based handshake auth.
- Admin moderation supports user verification, ban/unban, delete, and listing moderation.

## Author

Md. Khayrul Islam Sajib
