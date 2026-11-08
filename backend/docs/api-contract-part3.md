# HustleHub+ API contract - Part 3 changes

For: Nonjabulo (dashboard + approval UI), Luke (tests + pipeline), Ayabonga (Docker).
Base URL: `https://localhost:5443/api`. Every protected request needs `Authorization: Bearer <token>`.
All responses are `{ success, message, data? }`; errors are `{ success: false, message, errors? }`.

## 1. Booking approval flow (changed)

A booking is now a **request**. Money is only recorded when the freelancer approves it.

```
client books -> pending --freelancer approves--> approved --freelancer completes--> completed
                   |-- freelancer rejects --> rejected
                   '-- client cancels ------> cancelled        (only while still pending)
```

`rejected`, `cancelled` and `completed` are final.

| Method + path | Who | Body | Result |
|---|---|---|---|
| `POST /bookings` | client | `{ gigId, note? }` | **201** `{ booking }` with `status: "pending"`. **No transaction yet.** |
| `PATCH /bookings/:id/approve` | the gig's freelancer | `{ note? }` | **200** `{ booking, transaction }` - transaction created now |
| `PATCH /bookings/:id/reject` | the gig's freelancer | `{ note? }` | **200** `{ booking }` |
| `PATCH /bookings/:id/complete` | the gig's freelancer | `{ note? }` | **200** `{ booking }` (from `approved` only) |
| `PATCH /bookings/:id/cancel` | the booking's client | `{ note? }` | **200** `{ booking }` (from `pending` only) |
| `GET /bookings?status=pending` | any role (scoped to own) | - | `{ bookings }`; `status` optional, one of the 5 statuses |
| `GET /bookings/:id` | client / freelancer on it / admin | - | `{ booking }` |
| `GET /transactions` | any role (scoped to own) | - | `{ transactions }` |

`note` is optional text, max 500 characters. It is stored as `decisionNote` on the booking.

Booking object: `id, gig, gigTitle, price, client, freelancer, note, status, decisionNote, decidedAt?, createdAt, updatedAt`.

Errors to handle in the UI:

| Status | Meaning |
|---|---|
| 400 | bad id, note too long / not text, unknown `status` filter |
| 401 | missing, expired or logged-out token |
| 403 | wrong role, or the booking is not yours |
| 404 | booking / gig not found |
| 409 | not allowed from the booking's current state (e.g. approving an already-rejected booking), or someone changed it at the same moment - refresh and retry |
| 429 | too many requests |

Admins can view everything but cannot approve, reject, cancel or complete.

## 2. Income and tax (changed / new) - freelancer only

`GET /income` - existing fields plus two new ones for the dashboard:

```json
{ "totalIncome": 4500, "currency": "ZAR", "transactionCount": 3,
  "pendingIncome": 2500,
  "bookingStatusCounts": { "pending": 1, "approved": 3, "rejected": 0, "cancelled": 1, "completed": 2 },
  "transactions": [ ... ] }
```

`pendingIncome` = value of bookings still waiting for the freelancer's decision (not yet income).

`GET /income/tax?taxYear=2027` - `taxYear` optional (defaults to the current tax year). A tax year is named after the year it **ends** in: 2027 = 1 Mar 2026 to 28 Feb 2027. Supported: 2026, 2027.

```json
{ "taxYear": 2027, "taxYearLabel": "2027 (1 March 2026 - 28 February 2027)", "currency": "ZAR",
  "transactionCount": 2, "grossIncome": 300000, "estimatedTax": 40572, "netIncome": 259428,
  "effectiveTaxRate": 13.52, "belowTaxThreshold": false, "taxThreshold": 99000,
  "monthly": [ { "month": "2026-03", "transactionCount": 0, "income": 0, "estimatedTax": 0, "netIncome": 0 }, "... 12 entries, March to February ..." ],
  "assumptions": [ "Estimate only - ...", "..." ],
  "availableTaxYears": [2026, 2027] }
```

- `monthly` always has 12 entries in tax-year order, so it can go straight into a bar/line chart. Months add up exactly to the annual totals.
- `effectiveTaxRate` is a percentage. `assumptions` should be shown on the dashboard (it is an estimate, not tax advice).
- Invalid `taxYear` gives 400.

## 3. Logout (new)

`POST /auth/logout` (any logged-in user, no body) - **200**. The token used for the request stops working immediately everywhere. The frontend should call this and then delete the stored token. Any later request with that token returns 401.

Tokens now carry a unique `jti`. Tokens from before this change are rejected, so everyone logs in again once after deploying.

## 4. Login lockout (behaviour change)

After 5 consecutive failed logins an account is locked for 15 minutes (doubling for each further lock, capped at 24 h). While locked, even the correct password is refused with the **same** `401 "Invalid email or password"` as any bad login - the response never reveals that an account exists or is locked. The UI should simply show that message.

## 5. Other things that changed

- **CORS** now allows `PATCH` (the approval buttons need it).
- **Rate limits:** approve/reject/cancel/complete share their own limiter (3x the booking limit). `429` bodies are unchanged in shape.
- Every response has an `X-Request-Id` header - useful to quote when reporting a bug.
- API responses are `Cache-Control: no-store`.

## 6. For Luke - Postman/Newman and pipeline

Run against the in-memory server: `npm run test:fake-server` (terminal 1), then `npm run test:newman` (terminal 2).
Currently **3 assertions fail** in `HustleHub-Part2.postman_collection.json` because the booking step no longer returns a transaction:

1. "Transaction created from server-side price (tampered amount ignored)"
2. "Has transaction of 600"
3. "Income tracked for A"

Fix: after each `POST /bookings`, add a `PATCH /bookings/{{bookingId}}/approve` request as the freelancer, and move the transaction/income assertions after it. New requests worth adding: reject, cancel, wrong-role approve (403), double approve (409), `GET /income/tax`, `POST /auth/logout` then reuse token (401), and 5 bad logins then a good one (401).

Pipeline notes:
- `npm audit --omit=dev` is clean (0 vulnerabilities) after the dependency fix on this branch. Plain `npm audit` still lists dev-tool advisories that only a breaking upgrade would fix, so scan production dependencies.
- Backend unit tests: `npm test` (124 tests, about 75 seconds because bcrypt is deliberately slow).
- Set `NODE_ENV=test` and `JWT_SECRET` only for tests; the real server needs `MONGO_URI` and `JWT_SECRET`.

## 7. For Ayabonga - running the backend in a container

- Node >= 18. Start command: `node src/server.js` (`npm ci --omit=dev` in the image).
- The server only starts if `certs/key.pem` and `certs/cert.pem` exist (HTTPS only). Generate at build/start with `bash certs/generate-cert.sh` (needs `openssl` in the image) or mount certificates. Never bake real certificates or `.env` into the image.
- Environment variables: `PORT`, `NODE_ENV`, `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `SSL_KEY_PATH`, `SSL_CERT_PATH`, `FRONTEND_ORIGIN` (must match the URL the browser uses for the frontend container), `RATE_LIMIT_*`, `LOG_LEVEL`, `LOG_HTTP_HOST`, `LOG_HTTP_PATH`, `LOG_HTTP_TOKEN`, `LOCKOUT_*`. Defaults and comments are in `.env.example`.
- Health check: `GET /api/health` over HTTPS (self-signed cert, so the check must skip certificate verification, e.g. `wget --no-check-certificate -qO- https://localhost:5443/api/health`).
- Logs are JSON lines on stdout, so `docker compose logs api` shows them.
- Behind nginx or a proxy the client IP changes: rate limiting and logs would see the proxy's address unless Express is told to trust it (`app.set('trust proxy', 1)`). Tell me if the Compose setup puts a proxy in front of the API and I will add it.
- For the frontend CSP, see `frontend-csp-recommendation.md`.
