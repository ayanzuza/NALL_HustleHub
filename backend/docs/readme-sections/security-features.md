## Additional Security Features (beyond the minimum requirements)

Two features were added beyond what the brief requires, plus a set of smaller hardening changes. All are working, tested and active in the final system.

### Feature 1 - Account lockout with exponential backoff

**Problem.** Rate limiting is per IP address. An attacker using many addresses can still guess one account's password slowly. Lockout protects the *account* itself.

**How it works.**
- Every failed login for an existing account increments a counter, using an atomic database update so parallel guesses cannot slip past it.
- After **5** consecutive failures the account is locked for **15 minutes**. Each further lock doubles the time (30 min, 60 min and so on) up to a cap of **24 hours**, so a persistent attacker is slowed to a crawl while a genuine user who forgot their password recovers quickly.
- A successful login clears the counter and the backoff.
- While locked, even the correct password is refused, and failed attempts during the lock do not extend it (so an attacker cannot keep a victim locked out forever by hammering the account).
- The thresholds are configurable (`LOCKOUT_THRESHOLD`, `LOCKOUT_BASE_MS`, `LOCKOUT_MAX_MS`).

**Not revealing account state.** Unknown email, wrong password and locked account all return the same `401 Invalid email or password`. The server also performs a real bcrypt comparison against a dummy hash when the account does not exist or is locked, so response *time* does not reveal which case occurred either. Lock state is never included in any API response. The lock is recorded in the log (`auth.account_locked`) so it is visible to monitoring.

**Trade-off.** Lockout can be abused to annoy a specific user (deliberately failing logins against their account). The lock is short, grows only for repeat offenders, expires by itself and is combined with IP rate limiting, which we judged an acceptable trade for protection against account takeover.

**Code:** `src/controllers/authController.js`, user lock fields in `src/models/User.js`. **Tests:** `tests/lockout.test.js`.

### Feature 2 - Token revocation on logout (JWT denylist)

**Problem.** A JWT is valid until it expires. Without revocation, "logging out" only deletes the token in the browser; a copied or stolen token keeps working for up to an hour.

**How it works.**
- Every token now carries a unique id (`jti`).
- `POST /api/auth/logout` stores that `jti`, with the token's expiry time, in a `RevokedToken` collection. Only the id is stored, never the token itself.
- The authentication middleware checks the denylist on every protected request, so the token stops working immediately on every route.
- MongoDB removes each entry automatically once the token would have expired anyway (a TTL index), so the collection stays small.
- Tokens with no `jti` are rejected, because they could never be revoked. If the denylist cannot be checked (for example the database is down) the request is refused rather than allowed (fail closed).
- Logging out ends only that session; the same user's other sessions are unaffected.

**Code:** `src/models/RevokedToken.js`, `src/middleware/authenticate.js`, `logout` in the auth controller. **Tests:** `tests/logout.test.js`.

### Further hardening

| Change | Why |
|---|---|
| **JWT algorithm pinned to HS256** at verification | Blocks "algorithm confusion" attacks where a forged token names a different or no algorithm |
| **Expanded Content-Security-Policy** (16 directives, all `'none'` plus `upgrade-insecure-requests`) | The API only returns JSON, so scripts, styles, images, fonts, frames, forms, plugins and network access are all denied; if a response were ever rendered by a browser it could load and run nothing |
| **Permissions-Policy** disabling camera, microphone, geolocation, payment and USB | Removes powerful browser features the app never needs |
| **`Cache-Control: no-store`** on API responses | Keeps financial and personal data out of browser and proxy caches |
| **Server-generated request ids** | Lets every log entry for one request be correlated, and cannot be forged by clients |
| **Atomic booking state changes** | Two simultaneous approvals cannot both succeed, so a booking can never produce two transactions |
| **Dependency advisories fixed** | `npm audit` reports 0 vulnerabilities in production dependencies |

### Content-Security-Policy directives explained

| Directive | Value | What it prevents |
|---|---|---|
| `default-src` | `'none'` | Fallback: anything not listed is blocked |
| `script-src`, `script-src-attr` | `'none'` | Any JavaScript, including inline event handlers (core XSS defence) |
| `style-src`, `img-src`, `font-src`, `media-src` | `'none'` | Loading styles, images, fonts or media (stops injected content and data leaks through resource requests) |
| `connect-src` | `'none'` | `fetch`, XHR and WebSocket calls (stops exfiltration of data to an attacker's server) |
| `object-src`, `frame-src`, `child-src`, `worker-src`, `manifest-src` | `'none'` | Plugins, embedded pages, workers and manifests |
| `base-uri` | `'none'` | A `<base>` tag redirecting relative links |
| `form-action` | `'none'` | Forms submitting data elsewhere |
| `frame-ancestors` | `'none'` | The API being embedded in another site (clickjacking) |
| `upgrade-insecure-requests` | - | Plain `http://` sub-requests are upgraded to `https://` |

The React frontend serves real pages, so it has its own, less restrictive policy configured on its web server (see `docs/frontend-csp-recommendation.md`).

### References

OWASP (n.d.) *Authentication Cheat Sheet*. OWASP Cheat Sheet Series. Available at: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html (Accessed: <date you opened it>).

OWASP (n.d.) *Content Security Policy Cheat Sheet*. OWASP Cheat Sheet Series. Available at: https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html (Accessed: <date you opened it>).
