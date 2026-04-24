# To-Let Globe Server API

Express backend for To-Let Globe with native PostgreSQL (`pg`) and SQL-driven data access.

## Stack

- Node.js + Express
- Native PostgreSQL (`pg`)
- PostgreSQL
- JWT auth + role based access control
- Smart intelligence utilities for fraud/risk/quality/pricing/reminders/insights
- SSLCommerz payment integration

## Step-by-Step PostgreSQL Implementation

1. Enter backend folder:

```bash
cd server
```

2. Copy environment file:

```bash
cp .env.example .env
```

3. Configure PostgreSQL connection in `.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/to_let_globe?schema=public"
```

4. Install dependencies:

```bash
npm install
```

5. Start API:

```bash
npm run dev
```

## Available Scripts

- `npm run dev` - Start with Nodemon
- `npm start` - Start production server
- `npm test` - Run Jest tests
- `npm run test:coverage` - Coverage report

## Core Modules

- Auth and verification: `routes/authRoutes.js`, `controllers/authController.js`
- Property lifecycle/intelligence/payments: `routes/propertyRoutes.js`, `controllers/propertyController.js`
- Contact inbox/admin handling: `routes/contactRoutes.js`, `controllers/contactController.js`
- Blog module: `routes/blogRoutes.js`, `controllers/blogController.js`

## Smart Intelligence (Implemented)

- Fraud and moderation checks for messages/reviews/documents
- Listing quality scoring and actionable feedback
- Dynamic pricing recommendation
- Tenant monthly reminder summaries
- Landlord and admin insight analytics
- Configurable thresholds through admin endpoints

## Deployment (Render)

Set these minimum env vars:

- `NODE_ENV=production`
- `DATABASE_URL` (PostgreSQL connection)
- `JWT_SECRET`
- `FRONTEND_URL`
- Email settings (`EMAIL_*` or Ethereal values)
- SSLCommerz settings when payment gateway is enabled

## Notes

- MongoDB runtime has been removed from backend data access.
- Db has been removed. Runtime data access uses PostgreSQL queries through `config/dbClient.js`.
