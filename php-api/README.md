# PHP API

Active backend implementation for the Bachelor House Rent System.

## Run locally

1. Copy environment file:

```bash
cp .env.example .env
```

2. Start the API:

```bash
php -S localhost:5001 -t public
```

3. Point the client to:

- `VITE_API_BASE_URL=http://localhost:5001/api`

## Notes

- Main router/controller file: `public/index.php`
- Database schema: repository root `bhms.sql`
- Static uploads are served from `public/uploads`
