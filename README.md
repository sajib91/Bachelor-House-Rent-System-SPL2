# Bachelor House Rent System

Monorepo for a Dhaka-focused rental marketplace with a Node.js/Express backend (MySQL) and a React/Vite frontend.



## Project Structure

- `server/` - Express API, MySQL-backed models, auth, moderation, and intelligence endpoints
- `client/` - React/Vite web app with listing, dashboard, blog, and admin pages

## Key Features

- Role-based platform: Tenant, Landlord, Admin
- Landlord-only listing publication with admin approval workflow
- Admin moderation with mandatory feedback when removing listings
- Landlord ownership enforcement for listing update/delete
- Tenant seat application workflow with landlord approval/rejection
- Secure tenant payment flow:
	- method selection
	- mobile account number
	- OTP step
	- PIN step
	- payment slip upload
	- backend-generated QR authentication code
- Landlord dashboard notifications for pending seat applications

## Local Setup

Clone the repo:

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
