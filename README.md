# Banking Ledger API

Full-stack developer assessment: accounts and immutable transactions with atomic balance updates, pagination, validations, and optional money transfers.

**Stack:** Node.js · Express · JavaScript · PostgreSQL · Zod

## Reviewer quick start

```bash
cp .env.example .env   # set DATABASE_URL to your Postgres
npm install
npm run migrate
npm start
```

- Health: http://localhost:3000/health  
- Docs: http://localhost:3000/docs  
- Smoke (server must be running): `npm run smoke`

**Integrity highlights:** transaction + balance update run in one DB transaction with `SELECT … FOR UPDATE`; transfers lock both accounts in UUID order and fully roll back on failure; no transaction edit/delete routes.

## Features

- Create / fetch accounts
- Credit and debit transactions (atomic with balance update)
- Transaction immutability (no edit/delete APIs)
- Balance always reflects committed transactions only
- Paginated transaction history (`page`, `limit`) sorted latest-first
- Duplicate `reference_id` handling per account
- Consistent HTTP error envelope
- Bonus: atomic money transfer between accounts
- OpenAPI docs at `/docs`

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ installed locally **or** a hosted Postgres URL (Neon, Supabase, Render, etc.)
- No Docker required

## Local setup

### 1. Create a database

With local Postgres:

```bash
createdb banking_ledger
# or: psql -c "CREATE DATABASE banking_ledger;"
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/banking_ledger
NODE_ENV=development
```

Use your real Postgres user/password/host if different. For a hosted DB, paste that connection string as `DATABASE_URL`.

### 3. Install & migrate

```bash
npm install
npm run migrate
```

### 4. Run

```bash
npm run dev
# or: npm start
```

- API: http://localhost:3000  
- Docs: http://localhost:3000/docs  
- Health: http://localhost:3000/health  

## API overview

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/accounts` | Create account |
| `GET` | `/accounts/:id` | Get account |
| `POST` | `/accounts/:id/transactions` | Create credit/debit |
| `GET` | `/accounts/:id/transactions` | List transactions (paginated) |
| `POST` | `/transfers` | Transfer between accounts |
| `GET` | `/health` | Health check |
| `GET` | `/docs` | Swagger UI |

Full schema: [openapi.yaml](openapi.yaml) · assumptions: [ASSUMPTIONS.md](ASSUMPTIONS.md)

## Example requests

```bash
# Create accounts
curl -s -X POST http://localhost:3000/accounts \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alice"}'

curl -s -X POST http://localhost:3000/accounts \
  -H 'Content-Type: application/json' \
  -d '{"name":"Bob"}'

# Credit Alice (replace ACCOUNT_A)
curl -s -X POST http://localhost:3000/accounts/ACCOUNT_A/transactions \
  -H 'Content-Type: application/json' \
  -d '{"type":"credit","amount":100,"reference_id":"c1","description":"Initial deposit"}'

# Debit Alice
curl -s -X POST http://localhost:3000/accounts/ACCOUNT_A/transactions \
  -H 'Content-Type: application/json' \
  -d '{"type":"debit","amount":30,"reference_id":"d1"}'

# List transactions
curl -s "http://localhost:3000/accounts/ACCOUNT_A/transactions?page=1&limit=10"

# Transfer 20 from Alice to Bob
curl -s -X POST http://localhost:3000/transfers \
  -H 'Content-Type: application/json' \
  -d '{"from_account_id":"ACCOUNT_A","to_account_id":"ACCOUNT_B","amount":20,"reference_id":"t1"}'
```

## Error format

```json
{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance. Available: 20, requested: 30"
  }
}
```

| Code | HTTP | When |
|------|------|------|
| `VALIDATION_ERROR` | 400 | Bad body / params / pagination |
| `ACCOUNT_NOT_FOUND` | 404 | Unknown account ID |
| `DUPLICATE_TRANSACTION` | 409 | Same `reference_id` for account |
| `INSUFFICIENT_BALANCE` | 422 | Debit/transfer exceeds balance |
| `INTERNAL_ERROR` | 500 | Unexpected failure |

## Data integrity

- Create transaction + balance update run in a **single DB transaction**
- Account row is locked with `SELECT … FOR UPDATE` before debit/credit
- Transfers lock both accounts in UUID order (deadlock-safe) and roll back fully on failure
- DB constraints: `balance >= 0`, `amount > 0`, `type IN ('credit','debit')`, `UNIQUE (account_id, reference_id)`

## Deployment (Render)

No Docker. Use Render’s **Node** Web Service + managed Postgres.

1. Push this repo to GitHub/GitLab.
2. In Render: create a **PostgreSQL** database → copy **External** (or Internal) `DATABASE_URL`.
3. Create a **Web Service**:
   - Runtime: **Node**
   - Build command: `npm install`
   - Start command: `npm run migrate && npm start`
4. Environment variables:
   - `DATABASE_URL` = Postgres connection string from step 2
   - `NODE_ENV` = `production`
   - `PORT` is set by Render automatically
5. After deploy, open `https://<your-service>.onrender.com/health` and `/docs`.

Add the live URL here after deploy:

```text
Live API: https://YOUR_SERVICE.onrender.com
Docs:     https://YOUR_SERVICE.onrender.com/docs
```

## Project structure

```text
src/
  index.js / app.js / config.js / schemas.js
  db/           pool + migrate
  migrations/   SQL schema
  routes/       HTTP layer
  services/     business logic + atomic DB ops
  middleware/   validation + errors
  errors/       AppError
openapi.yaml
ASSUMPTIONS.md
```

## License

MIT
