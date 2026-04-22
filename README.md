# Bachelor House Rent System

Monorepo for a Dhaka-focused rental marketplace with a Node.js/Express backend and a React/Vite frontend.

## Live Demo

- Frontend: https://client-three-tau-77.vercel.app
- Backend: deploy the `server` service on Render using [render.yaml](render.yaml)

## Project Structure

- `server/` - Express API, MongoDB models, auth, moderation, and intelligence endpoints
- `client/` - React/Vite web app with listing, dashboard, blog, and admin pages

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
- Set `MONGODB_URI`, `JWT_SECRET`, `FRONTEND_URL`, and email credentials in Render

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

## Author

Md. Khayrul Islam Sajib
