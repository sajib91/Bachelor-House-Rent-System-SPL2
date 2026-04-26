# Bachelor House Rent System

Monorepo for a Dhaka-focused rental marketplace with a Node.js/Express backend (MySQL) and a React/Vite frontend.

## Live Demo

- Frontend: https://client-three-tau-77.vercel.app
- Backend: deploy the `server` service on Render using [render.yaml](render.yaml)

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

Server setup:

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

Client setup:

```bash
cd ../client
cp .env.example .env
npm install
npm run dev
```

Client local URL: http://localhost:5173
Server local URL: http://localhost:5001

## Deployment

Backend on Render:

- Create a Render Web Service from this repository
- Set the root directory to `server`
- Use [render.yaml](render.yaml) as the deployment blueprint
- Set MySQL and app environment variables in Render (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `FRONTEND_URL`)

Frontend on Vercel:

- Import this repository into Vercel
- Set the root directory to `client`
- Set `VITE_API_BASE_URL` to your Render backend URL, for example `https://to-let-globe-server.onrender.com/api`
- Deploy and copy the Vercel URL into the backend `FRONTEND_URL` setting

## Validation

The following checks pass in this workspace:

- `npm --prefix server test`
- `npm --prefix client run build`

## Notes

- The repository has been renamed from backend/frontend to server/client.
- The backend uses environment-driven CORS so Render and Vercel URLs can be configured without code changes.
- Listing images and payment slip images can be uploaded through `/api/upload`.

## Author

Md. Khayrul Islam Sajib
