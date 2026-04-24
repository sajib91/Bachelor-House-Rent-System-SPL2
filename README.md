# Bachelor House Rent System

Monorepo for a Dhaka-focused rental marketplace with a React/Vite frontend and a PHP/MySQL backend migration path.

## Tech Snapshot

- Backend: PHP + PDO + JWT-style auth helpers + MySQL
- Frontend: React + Vite
- Database: MySQL schema in `bhms.sql`
- Smart Intelligence: fraud/risk scoring, listing quality, pricing recommendation, reminder and admin insights

## Project Structure

- `php-api/` - active PHP + MySQL API (`public/index.php`)
- `client/` - web app (listing, dashboard, blog, admin)
- `server/` - legacy Node backend kept for reference during migration

## Full Step-by-Step PHP/MySQL Setup

1. Clone and enter repository:

```bash
git clone https://github.com/sajib91/Bachelor-House-Rent-System-SPL2.git
cd Bachelor-House-Rent-System-SPL2
```

2. Create the MySQL database locally:

```bash
mysql -u root -p < bhms.sql
```

3. Configure the PHP backend environment:

```bash
cd php-api
cp .env.example .env
```

Set the MySQL and auth values in `.env`:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=bhms
DB_USER=root
DB_PASSWORD=
JWT_SECRET=bachelor-house-rent-system-dev-secret
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5001
API_PUBLIC_URL=http://localhost:5001
```

4. Start the PHP backend:

```bash
php -S localhost:5001 -t php-api/public
```

5. Start the frontend in a second terminal:

```bash
cd client
npm install
npm run dev
```

Client local URL: `http://localhost:5173`  
PHP API local URL: `http://localhost:5001`

## Deployment Notes

- Deploy the PHP backend with the `php-api/public` directory as the document root.
- Keep `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `FRONTEND_URL`, and `API_PUBLIC_URL` configured.
- Frontend `VITE_API_BASE_URL` should target your deployed backend `/api` URL.

## Validation

Recommended checks:

```bash
npm --prefix client run build
php -l php-api/public/index.php
```

## Author

Md. Khayrul Islam Sajib
