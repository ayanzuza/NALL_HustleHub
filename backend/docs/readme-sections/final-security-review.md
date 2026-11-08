## Final Security Review

This review maps the threats most relevant to HustleHub+ to the controls that address them, using the OWASP Top 10 (2021) as the checklist (OWASP, 2021). Each control is implemented in code and covered by automated tests unless stated otherwise.

### Threat-to-control mapping

| Threat | How it could happen here | Controls in place | Where |
|---|---|---|---|
| **Injection** (NoSQL operator injection) | A login or filter value such as `{"$gt": ""}` changes the meaning of a database query and bypasses a check | Every field is validated as a string/number/allowed value (objects are refused outright); `express-mongo-sanitize` strips `$` and `.` keys; Mongoose schemas fix field types; query-string filters (`status`, `taxYear`, `category`) are validated against allow-lists | `validators.js`, `sanitize.js`, tests in `security.test.js`, `approval.test.js`, `tax.test.js` |
| **Cross-site scripting (XSS)** | A gig title or booking note containing `<script>` is stored and later runs in another user's browser | HTML and script are stripped from free text before storage; React escapes output by default; API CSP blocks all scripts and connections; the frontend gets its own restrictive CSP | `sanitize.js`, `app.js`, `frontend-csp-recommendation.md` |
| **Authentication weaknesses** | Weak or leaked passwords, password guessing, forged or stolen tokens, user enumeration | Passwords hashed with bcrypt (12 rounds) and a strength policy; JWTs signed, algorithm pinned, expire after 1 hour; **lockout with backoff**; **token revocation on logout**; IP rate limiting on auth routes; identical response and similar timing for unknown user, wrong password and locked account; HTTPS only | `authController.js`, `authenticate.js`, `rateLimiter.js` |
| **Broken access control** | A user reads or changes another user's gigs, bookings, transactions or income; a client approves their own booking; role escalation at registration | JWT required on every protected route; role check (`authorize`) on each action; **ownership check** (only the gig's freelancer can approve/reject/complete, only the booking's client can cancel); queries scoped to the caller's own records; admins are read-only on bookings; registration cannot create admins; only whitelisted fields are copied from request bodies | `authorize.js`, `bookingController.js`, tests `approval.test.js`, `bookings.test.js` |
| **Business-logic abuse** | Choosing the price, approving twice to create duplicate payments, income counting rejected bookings | Price always read from the stored gig; booking state machine (invalid moves return 409); atomic state change so concurrent approvals produce exactly one transaction; approval rolled back if the transaction cannot be saved; income counted only from approved bookings | `bookingController.js`, `incomeController.js` |
| **Sensitive data exposure** | Hashes, lock state or tokens leaking through responses, logs or caches | Password hash and lockout fields excluded from every query and every JSON response; logs redact secrets and store email fingerprints only; `Cache-Control: no-store`; HSTS and TLS in transit; errors return generic messages with no stack traces, paths or configuration | `cleanJson.js`, `logger.js`, `errorHandler.js` |
| **Security misconfiguration** | Missing headers, open CORS, verbose errors, default settings | Helmet with a full CSP, HSTS, no-referrer, nosniff; Permissions-Policy; CORS limited to the configured frontend origin and needed methods; required secrets must be set or the server refuses to start; `X-Powered-By` removed | `app.js`, `env.js` |
| **Denial of service / abuse** | Flooding login or booking endpoints; huge request bodies | Rate limits on authentication, booking creation, booking actions and all other routes (clear 429 message); 10 KB body limit; lockout slows single-account attacks | `rateLimiter.js`, `app.js` |
| **Vulnerable dependencies** | A known flaw in a library | `npm audit` run on production dependencies (0 vulnerabilities after fixing two advisories in `body-parser` and `qs`); the CI pipeline repeats the scan on every push | `package-lock.json`, pipeline |
| **Insufficient logging and monitoring** | An attack goes unnoticed, or nobody can tell what happened afterwards | Structured logs for logins, lockouts, rejected tokens, access-control denials, bookings, transactions, rate-limit hits and errors, correlated by request id and shipped to a cloud platform | `logger.js`, see Logging section |
| **Cross-site request forgery (CSRF)** | A malicious site makes the browser send an authenticated request | The token is sent in the `Authorization` header by our own JavaScript, not in a cookie, so the browser never attaches it automatically; CORS blocks other origins from reading responses | `authenticate.js`, `app.js` |

### Known limitations and residual risks

Being honest about what is not covered is part of a security review.

1. **Token storage in the browser.** The React app keeps the JWT in `localStorage`, which any script running on the page could read if an XSS flaw existed. Mitigations are the HTML-stripping on input, React's output escaping, the frontend CSP and the 1-hour expiry; revocation limits the damage of a stolen token. The more robust design would be an `HttpOnly` cookie with CSRF protection.
2. **Lockout can be used against a user.** Someone can deliberately trigger a lock on another person's account. The lock is short, expires by itself and only grows for repeated offences.
3. **No multi-factor authentication.** A strong password plus lockout is the only login factor.
4. **Rate limit counters are held in memory per server instance.** Running several API instances would give each its own counters; a shared store such as Redis would be needed at scale.
5. **Payments are simulated** (as the brief requires), so there is no real payment fraud surface and no payment-card data is handled.
6. **The development certificate is self-signed.** A real deployment needs a certificate from a trusted authority.
7. **The tax figure is an estimate** based on stated assumptions, not tax advice.

### Verification

- 124 automated backend tests (Jest and Supertest) cover the controls above, including role and ownership checks, lockout, revocation, headers, redaction and the tax logic.
- The Postman collection and Newman run exercise the same behaviour end to end against a real database.
- Static analysis and dependency scanning run in the CI pipeline (see Pipeline section).

### References

OWASP (2021) *OWASP Top 10:2021*. Available at: https://owasp.org/Top10/ (Accessed: <date you opened it>).
