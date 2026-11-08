# Content-Security-Policy for the React frontend (for Ayabonga's nginx config)

The API's own CSP denies everything, because it only returns JSON. The React app is different: it serves HTML, JavaScript and CSS, so it needs a policy that allows exactly what the built Vite app uses and nothing more.

Suggested header for the nginx container (adjust `API_ORIGIN` to the real API URL, e.g. `https://localhost:5443`):

```
add_header Content-Security-Policy "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' API_ORIGIN; manifest-src 'self'; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests" always;
```

Why each part:

| Directive | Value | Reason |
|---|---|---|
| `default-src` | `'none'` | Anything not listed is blocked |
| `script-src` | `'self'` | Only our own bundled JS runs; injected inline scripts are blocked, which is the main XSS defence |
| `style-src` | `'self'` | Only our own CSS file. **If the UI breaks**, the cause is usually inline styles (a component library or `style={{}}` props are fine in React, but a `<style>` tag is not). Prefer fixing that over adding `'unsafe-inline'` |
| `img-src` | `'self' data:` | Our images plus small inlined icons |
| `connect-src` | `'self'` + API origin | `fetch`/axios may only talk to us and the API |
| `object-src` / `frame-src` / `frame-ancestors` | `'none'` | No plugins, no embedded pages, and nobody can frame us (clickjacking) |
| `base-uri`, `form-action` | `'self'` | Stops a `<base>` tag or a rewritten form from redirecting data elsewhere |
| `upgrade-insecure-requests` | - | Any `http://` sub-request is upgraded to `https://` |

Also add on the frontend container: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY` (older browsers) and `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

Check it works: open the app, then the browser console. A blocked resource is reported as a "Content Security Policy" violation. Fix each one by allowing only the specific source, never by adding `*` or `'unsafe-inline'` / `'unsafe-eval'`.
