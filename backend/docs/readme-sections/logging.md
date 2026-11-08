## Logging and Monitoring

### How it works

The API writes one structured JSON entry per event using Winston (`src/utils/logger.js`). JSON means each field (event name, user, request id, IP) can be searched and filtered by a log platform instead of reading free text. Entries go to two places:

1. **Standard output.** Docker captures this, so `docker compose logs api` shows the live log.
2. **A cloud log platform (optional, enabled by environment variables).** When `LOG_HTTP_HOST` and `LOG_HTTP_TOKEN` are set, entries are also sent over HTTPS to the platform in small batches. If the platform is unreachable the API keeps running; log shipping can never take the application down.

Every request gets a server-generated request id (also returned in the `X-Request-Id` header). All log entries for one request share it, so an incident can be followed from the first request to the final error. A request id supplied by a client is ignored, so it cannot be used to forge log entries.

### What is logged and why

| Event | Level | Why it matters |
|---|---|---|
| `auth.register`, `auth.register_duplicate` | info / warn | New accounts; repeated duplicates can mean someone probing for existing emails |
| `auth.login_success` | info | Normal activity baseline and an audit trail of who signed in |
| `auth.login_failed` (reason: `unknown_user` / `bad_password`) | warn | Many failures from one IP or against one account is the signature of password guessing |
| `auth.login_blocked` | warn | A locked account is still being attacked |
| `auth.account_locked` | warn | Lockout triggered, with its duration |
| `auth.logout`, `auth.token_rejected` (reason: `expired` / `invalid` / `revoked` / `missing_jti`) | info / warn | Forged, tampered or reused tokens, including use of a logged-out token |
| `authz.denied` | warn | A user tried something their role or ownership does not allow (probing for broken access control) |
| `booking.created`, `booking.approved`, `booking.rejected`, `booking.cancelled`, `booking.completed` | info | Full audit trail of the booking workflow, including who and from which status |
| `transaction.created` | info | Every simulated payment with reference, parties and amount, so money records can be reconciled |
| `income.tax_summary_viewed` | info | Access to financial data |
| `ratelimit.exceeded` | warn | Abuse, scraping or automated attacks, with which limiter fired |
| `error.handled` | warn (4xx) / error (5xx) | Failures with the real cause, which the client is never shown |
| `http.request` | info | Method, path, status and response time for every request |

### What is deliberately NOT logged

- **Passwords, tokens, authorization headers, cookies and hashes.** Any field whose name suggests a secret is replaced with `[REDACTED]` before an entry is written, at any depth. This is a safety net on top of never passing such values in the first place.
- **Email addresses.** A short SHA-256 fingerprint is logged instead, so repeated attempts against one account can still be correlated without storing personal data in the logs.
- **Query strings** (nothing sensitive that ended up in a URL is stored) and **request bodies**.

Stack traces are logged only outside production, and only for server errors. Clients only ever receive a generic error message.

### Why this is important for security

Logs are how an attack is noticed and investigated. Failed logins, lockouts, rejected tokens and access-control denials show an attack as it happens; the booking and transaction trail lets us verify what was done and by whom after the fact. Logs also need protecting: they exclude secrets so that a leaked log file does not become a leaked credential.

### Evidence

- Screenshot of the log platform showing login, booking, transaction and error events: `docs/evidence/logging-platform.png` *(add after connecting the platform)*
- Local example of the real output: `docker compose logs api`

Example entry (formatted for reading):

```json
{ "level": "warn", "event": "auth.login_failed", "reason": "bad_password", "emailId": "fb98d44ad750",
  "requestId": "0f6e...", "ip": "::1", "service": "hustlehub-api", "timestamp": "2026-11-08T19:31:38.287Z" }
```

### Testing

`tests/logging.test.js` checks redaction at any depth, that entries reach a real transport as valid JSON, that failed logins never contain the password or raw email, and that registration, login, lockout, booking, approval, transaction, access-denied, rejected-token and unexpected-error events are all recorded. `tests/logging.ratelimit.test.js` checks rate-limit hits are logged.

### References

OWASP (n.d.) *Logging Cheat Sheet*. OWASP Cheat Sheet Series. Available at: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html (Accessed: <date you opened it>).
