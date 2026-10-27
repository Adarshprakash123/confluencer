# Assumptions

1. **Missing brief sections (1–4):** Exact endpoint paths were not in the provided excerpt. This API implements a conventional surface:
   - `POST /accounts`, `GET /accounts/:id`
   - `POST /accounts/:id/transactions`, `GET /accounts/:id/transactions`
   - `POST /transfers` (bonus)
   - `GET /health`, interactive docs at `/docs`

2. **Database:** The brief allows any database. **PostgreSQL** was chosen for relational constraints (`CHECK`, `UNIQUE`, `FK`) and row-level locking (`SELECT … FOR UPDATE`) to enforce balance consistency and atomicity.

3. **No Docker:** Local development uses a locally installed PostgreSQL (or any Postgres `DATABASE_URL`, e.g. Neon/Supabase). Deployment uses Render’s native Node runtime (not Docker).

4. **Money:** Stored as `NUMERIC(19, 2)`. API accepts/returns numbers with up to two decimal places.

5. **Pagination defaults:** `page=1`, `limit=20`. `limit` max is `100`. Empty lists return `total_pages: 0`. Response fields `page` / `limit` are the current page and page size (brief wording); also returned: `total_records`, `total_pages`.

6. **Sorting:** Transactions are always returned latest-first by `created_at`.

7. **Idempotency / duplicates:** Uniqueness is enforced on `(account_id, reference_id)`. Duplicate creates return `409 DUPLICATE_TRANSACTION`.

8. **Transfers:** A single client `reference_id` becomes two ledger rows: `{reference_id}:debit` on the source and `{reference_id}:credit` on the destination, so each account still has unique reference IDs.

9. **Immutability:** There are no update or delete transaction endpoints. Failed/rejected requests never persist balance changes.

10. **Auth:** No authentication or multi-tenancy (not required by the brief excerpt).

11. **Timestamps:** Stored and returned in UTC (`TIMESTAMPTZ`).

12. **Rejected transactions:** Validation failures, insufficient balance, and duplicate reference IDs do not create transaction rows and do not change balances.
