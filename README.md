# HustleHub+ — Secure Freelance Marketplace Platform

**Modules:** INSY7314/w and APDS7311/w
**Student:** Lonwabo Gumede, Ayabonga Nzuza, Luke James Lutchmiah, Nonjabulo Mathenjwa
**Parts:** 1 — Secure Foundations; 2 — Secure Stack

---

## 1. System Overview

HustleHub+ is a secure freelance marketplace that connects two primary types of users:

* **Freelancers** — advertise services ("gigs"), manage bookings, and track income and estimated tax obligations.
* **Clients** — browse available gigs and book the services they need.

A third role, **Admin**, oversees the platform: in Part 2 admins can list users and remove any gig. Admin accounts cannot be self-assigned through public registration; they are created with the `seed:admin` script.

Because HustleHub+ processes sensitive information such as passwords, authentication credentials, booking and transaction records, and income-related information, security is treated as a fundamental design requirement from Part 1 rather than as a feature added later.

Part 1 delivered the secure backend foundation: Node.js and Express REST endpoints for registration, authentication, and access to authenticated user information, backed by an in-memory user store as permitted by the POE brief.

**Part 2 (Secure Stack)** turns that foundation into a full-stack marketplace. User data is now persisted in **MongoDB through Mongoose**; freelancers create and manage their own gigs; clients browse and book them; every booking produces a simulated transaction record; each freelancer's income is tracked from their own transactions; and a React frontend consumes the API. Role-based access control, input sanitisation, rate limiting and a Content Security Policy were added across the backend. See sections 5, 12, 16, 17, 19 and 26.

The backend includes:

* Password hashing using `bcryptjs`
* JWT-based authentication
* HTTPS using a locally generated development certificate
* Server-side input validation using `express-validator`
* Security headers using `helmet`
* Request body-size limits
* Environment-based secret management
* Centralised and controlled error handling
* Protected routes using reusable authentication middleware
* Postman tests covering successful and invalid scenarios

Tax estimation, CI/CD, containerisation, structured logging and the final security review are planned for Part 3.

---

## 2. Intended Users

HustleHub+ is designed around the following marketplace roles.

### 2.1 Clients

Clients use the platform to:

* Browse available freelance services
* View freelancer offerings
* Book services
* View their bookings and the transaction record created for each booking (Part 2)

The `client` role is available through the public registration endpoint.

### 2.2 Freelancers

Freelancers use the platform to:

* Advertise services as gigs
* Manage bookings
* Track income from their bookings (Part 2)
* View estimated tax obligations (planned for Part 3)

The `freelancer` role is available through the public registration endpoint.

### 2.3 Admin

An administrator role is enforced by the backend for privileged platform management. In Part 2 admins can list users (`GET /api/admin/users`) and remove any gig (`DELETE /api/admin/gigs/:id`). Admins are created only through the seed script.

Admin cannot be selected during public registration. The registration validator only permits:

* `client`
* `freelancer`

This prevents an unauthenticated user from simply assigning themselves an elevated role.

---

## 3. Backend Architecture

HustleHub+ follows the **MERN** architecture: MongoDB, Express, React, and Node.js.

In Part 1 the data-access layer was an in-memory store that followed a Mongoose-shaped interface. In Part 2 it was replaced by **MongoDB/Mongoose models** (`src/models`), and a **React frontend** (`client/`) was added. The architecture diagram below is the Part 1 diagram; the Part 2 request path is given in section 3.2.

### 3.1 System Architecture Diagram

<img width="1368" height="1819" alt="MERMIAD DIAGRAM drawio" src="https://github.com/user-attachments/assets/70e8a18b-7859-488a-9f2a-e6afb90d7959" />

### 3.2 Request Processing Flow

A controlled processing sequence is followed when a request is submitted to the HustleHub+ backend.

For general requests:

```text
Client / Postman
       ↓
HTTPS / TLS
       ↓
Helmet / CORS / Body-size limits
       ↓
Express Router
       ↓
Input Validation
       ↓
Controller
       ↓
Data Store
       ↓
Controlled JSON Response
```

For protected routes, JWT authentication is inserted before the controller:

```text
Client / Postman
       ↓
HTTPS / TLS
       ↓
Security and request middleware
       ↓
Express Router
       ↓
Input Validation
       ↓
JWT Authentication Middleware
       ↓
Controller
       ↓
Data Store
       ↓
Controlled JSON Response
```

Invalid requests are rejected before they reach the controller. Authentication failures are rejected by the JWT middleware before protected business logic is executed.

**Part 2 request path.** The middleware order in `src/app.js` is now:

```text
HTTPS / TLS
   ↓
Helmet (incl. Content-Security-Policy, HSTS)
   ↓
CORS (allow-list of frontend origin(s))
   ↓
Body parser with 10 KB limit
   ↓
Sanitisation (NoSQL operator stripping + XSS cleaning)
   ↓
Rate limiting (global on /api; stricter on auth and booking)
   ↓
Express Router
   ↓
Input validation (express-validator)  →  400 on failure
   ↓
JWT authentication  →  401 on failure
   ↓
Role check (authorize)  →  403 on failure
   ↓
Controller (ownership check, role-scoped query)  →  403 / 404
   ↓
MongoDB (Mongoose)
   ↓
Controlled JSON response / central error handler
```

Validation failures are returned directly by `validateRequest`; errors thrown inside controllers or middleware are mapped to fixed generic messages by the central error handler.

### 3.3 Component Summary

| Layer              | Technology                                       | Responsibility                                            |
| ------------------ | ------------------------------------------------ | --------------------------------------------------------- |
| Transport          | Node.js `https` module + self-signed certificate | Encrypts traffic between client and server                |
| Security headers   | `helmet`                                         | Applies protective HTTP security headers                  |
| CORS               | `cors`                                           | Controls cross-origin requests                            |
| Request protection | Express body-parser limits                       | Restricts request body size                               |
| Input validation   | `express-validator`                              | Validates user-supplied data before controller processing |
| Authentication     | `jsonwebtoken`                                   | Creates and verifies signed JWTs                          |
| Password security  | `bcryptjs`                                       | Hashes and compares passwords                             |
| Routing            | Express Router                                   | Separates authentication, marketplace and admin routes    |
| Authorisation      | `authorize(...roles)` + controller ownership checks | Enforces role-based access and per-record ownership    |
| Sanitisation       | `express-mongo-sanitize`, `xss`                  | Strips NoSQL operators and HTML/script from free text     |
| Rate limiting      | `express-rate-limit`                             | Throttles authentication, booking and general API traffic |
| Data               | MongoDB via Mongoose (`src/models`)              | Persists users, gigs, bookings and transactions           |
| Frontend           | React, Vite, React Router, Tailwind (`client/`)  | User interface; calls the API through a dev proxy         |
| Error handling     | Centralised middleware                           | Provides safe and consistent error responses              |

---

## 4. Project Structure

```text
NALL_HustleHub/
├── backend/
│   ├── certs/
│   │   └── generate-cert.sh
│   ├── docs/
│   │   └── newman-part2-output.txt
│   ├── postman/
│   │   ├── HustleHub-Part1.postman_collection.json
│   │   └── HustleHub-Part2.postman_collection.json
│   ├── src/
│   │   ├── config/        env.js, db.js
│   │   ├── controllers/   authController, gigController, bookingController,
│   │   │                  incomeController, adminController
│   │   ├── middleware/    authenticate, authorize, validateRequest, sanitize,
│   │   │                  rateLimiter, errorHandler
│   │   ├── models/        User, Gig, Booking, Transaction, cleanJson
│   │   ├── routes/        auth, user, gig, booking, transaction, income, admin
│   │   ├── scripts/       seedAdmin.js
│   │   ├── utils/         validators.js
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/             Jest + Supertest suites and tests/support (in-memory model fakes)
│   ├── .env.example
│   └── package.json
├── client/                React frontend (Vite, Tailwind, Vitest)
├── HustleHub_Part2.postman_collection.json   (frontend/API collection and Newman report)
├── postman-report.html
└── README.md
```

The project follows a layered structure so that routing, controllers, middleware, validation, configuration, and data access have separate responsibilities. This separation improves maintainability and makes individual security controls easier to test and review. In Part 2 the Part 1 in-memory `userStore.js` was removed and replaced by Mongoose models without changing the authentication architecture.

---

## 5. API Routes

### 5.1 Endpoints

| Method | Endpoint | Roles | Purpose |
| ------ | -------- | ----- | ------- |
| GET | `/api/health` | public | Health check |
| POST | `/api/auth/register` | public (rate limited) | Register as `client` or `freelancer`; returns user and JWT |
| POST | `/api/auth/login` | public (rate limited) | Log in; returns user and JWT |
| GET | `/api/users/me` | any authenticated | Current user's profile |
| GET | `/api/gigs` | any authenticated | Browse active gigs (`?category=&page=&limit=`) |
| GET | `/api/gigs/mine` | freelancer | The caller's own gigs (any status) |
| GET | `/api/gigs/:id` | any authenticated | One gig (paused gigs visible only to owner/admin) |
| POST | `/api/gigs` | freelancer | Create a gig |
| PUT | `/api/gigs/:id` | freelancer (owner) | Update own gig |
| DELETE | `/api/gigs/:id` | freelancer (owner) | Delete own gig |
| POST | `/api/bookings` | client (rate limited) | Book a gig; creates a booking and a simulated transaction |
| GET | `/api/bookings` | any authenticated | Role-scoped list: client = own bookings, freelancer = bookings of their gigs, admin = all |
| GET | `/api/bookings/:id` | participants, admin | One booking |
| GET | `/api/transactions` | any authenticated | Role-scoped list (same scoping as bookings) |
| GET | `/api/income` | freelancer | Total income and transactions for the caller |
| GET | `/api/admin/users` | admin | List all users |
| DELETE | `/api/admin/gigs/:id` | admin | Remove any gig |

Public authentication routes are kept separate from protected routes. Authentication is not treated as a one-time event: every protected request must provide valid credentials.

### 5.2 Marketplace features

| Area | Behaviour |
| ---- | --------- |
| Gig management | Freelancers create, view, update and delete **their own** gigs. Any logged-in user can browse active gigs with a category filter and pagination. |
| Bookings | Clients book an active gig. The booking snapshots the gig title and price and links the client and the freelancer. |
| Transactions | Every booking creates a transaction (`TXN-…` reference, amount, currency ZAR, status `simulated-paid`). No payment provider is called, as permitted by the brief. |
| Income tracking | `GET /api/income` returns the freelancer's total income, transaction count and transactions, derived from transactions where they are the freelancer. |
| Admin | Admins can list users and remove any gig. Admin accounts are created by a seed script, never through the public API. |

### 5.3 Role-based access control

| Capability | Client | Freelancer | Admin |
| ---------- | :----: | :--------: | :---: |
| Register / log in | yes | yes | yes (seeded) |
| Browse gigs | yes | yes | yes |
| Create / update / delete gigs | 403 | own only | 403 (may remove via admin route) |
| Book a gig | yes | 403 | 403 |
| View bookings / transactions | own only | own only | all |
| View income | 403 | own only | 403 |
| Admin routes | 403 | 403 | yes |

Enforcement is layered: `authenticate` (valid JWT) → `authorize(...roles)` (role taken from the verified token) → an **ownership check** in the controller for update/delete → **role-scoped queries** for bookings, transactions and income, so one user cannot read another's records. The gig owner, the client on a booking and the freelancer on a transaction always come from the verified JWT or the stored gig, never from the request body. Only whitelisted fields are copied from request bodies (mass-assignment protection), and the transaction amount is copied from the gig's stored price, so a client-supplied `amount` is ignored.

---

## 6. Password Security and Hashing

Passwords are never stored or logged in plaintext.

During registration, the submitted password is processed using `bcryptjs`:

```text
User password
      ↓
bcrypt hashing
      ↓
Password hash
      ↓
Stored in the User collection (MongoDB; in-memory store in Part 1)
```

HustleHub+ uses **12 bcrypt salt rounds**. bcrypt generates a unique salt for each password and deliberately makes password hashing computationally expensive. This increases the cost of password-guessing attacks if stored password hashes are compromised.

Only the resulting `passwordHash` is stored.

During login, the original password is not recovered or decrypted. Instead, the submitted password is compared with the stored hash:

```text
Submitted password
       ↓
bcrypt.compare()
       ↓
Stored password hash
       ↓
Match / no match
```

Only when the comparison succeeds does the application issue a JWT.

This approach follows the security principle that passwords should be protected using dedicated password-hashing algorithms rather than reversible encryption.

---

## 7. JWT-Based Authentication

Following successful authentication, HustleHub+ generates a signed JSON Web Token (JWT).

The token contains only the information required for authentication and authorisation:

* User ID
* User role

Sensitive information such as the user's password is never placed inside the JWT.

The token is signed using the `JWT_SECRET` environment variable. The secret is not hard-coded in the source code.

The token expiration is configurable using `JWT_EXPIRES_IN`, with a default of **1 hour**.

### JWT Authentication Flow

```text
User submits email + password
             ↓
       Input validation
             ↓
       Find user account
             ↓
    bcrypt password comparison
             ↓
       Authentication succeeds
             ↓
       JWT is generated
             ↓
       Token returned to client
             ↓
Client sends Bearer token
with subsequent requests
             ↓
    authenticate middleware
             ↓
          jwt.verify()
             ↓
       ┌───────────────┐
       │ Valid token?  │
       └───────┬───────┘
          Yes  │  No
           ↓   ↓
      Request   HTTP 401
      proceeds
```

The authentication middleware verifies the JWT signature and expiration on every protected request.

Requests with no token or a malformed `Authorization` header return:

```text
401 Authentication required
```

Invalid, expired, tampered, or forged tokens return a generic:

```text
401 Invalid or expired token
```

No further token failure details are disclosed to the client.

---

## 8. JWT Protection of Routes

JWT verification is implemented as reusable route middleware rather than being embedded directly inside the controller.

The Part 1 protected route is:

```text
GET /api/users/me
```

The processing sequence is:

```text
GET /api/users/me
        ↓
authenticate middleware
        ↓
JWT verification
        ↓
authenticated user identified
        ↓
controller
        ↓
JSON response
```

This design makes authentication reusable because the same middleware can be applied to additional protected routes as the application grows.

Express supports middleware at application and router levels, making this approach suitable for separating public and protected processing.

---

## 9. Input Validation

All user input accepted by the registration and login endpoints is validated server-side using `express-validator`.

Server-side validation is important because client-side validation can be bypassed by an attacker.

### 9.1 Registration Validation

The registration endpoint validates:

* Name is provided
* Name is between 2 and 100 characters
* Name contains only permitted characters
* Email is provided
* Email has a valid format
* Email is normalised
* Password is provided
* Password is between 8 and 128 characters
* Password contains an uppercase character
* Password contains a lowercase character
* Password contains a number
* Password contains a special character
* Role, when supplied, must be `client` or `freelancer`

The `admin` role cannot be self-assigned during registration.

### 9.2 Login Validation

The login endpoint validates:

* Email is provided
* Email has a valid format
* Email is normalised
* Password is provided

Validation takes place before the controller is executed.

Invalid requests receive:

```text
HTTP 400 Bad Request
```

with structured validation errors.

This provides a security barrier between untrusted external input and authentication or data-storage operations.

---

## 10. Request Size Protection

The backend limits JSON and URL-encoded request bodies to **10 KB**:

```javascript
express.json({ limit: '10kb' })
express.urlencoded({ limit: '10kb' })
```

This prevents the authentication API from unnecessarily processing oversized request bodies and reduces exposure to resource-exhaustion attacks involving excessively large payloads.

---

## 11. HTTPS Configuration

The HustleHub+ backend is served over HTTPS rather than plain HTTP.

The `server.js` implementation uses Node.js's native HTTPS functionality and loads a locally generated development certificate and private key:

```text
HTTPS client
      ↓
SSL/TLS encryption
      ↓
HustleHub+ Express API
```

The development certificate is self-signed because the application is being tested locally.

This protects authentication credentials and JWTs while they are transmitted between the client and server. Without HTTPS, credentials and tokens could potentially be intercepted over an unencrypted network.

If the certificate or private key is missing, the application fails to start rather than silently falling back to HTTP.

For production deployment, the self-signed certificate would be replaced with a certificate issued by a trusted Certificate Authority.

---

## 12. Security Headers and CORS

### 12.1 Helmet and Content-Security-Policy

`helmet()` applies HTTP security headers. In Part 2 it is configured with an explicit Content-Security-Policy. Because the API only returns JSON and never serves HTML, the policy is deliberately strict:

```text
default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
```

HSTS is enabled (one year, `includeSubDomains`), along with `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer`. `X-Powered-By` is removed. The React frontend is a separate origin served by Vite, so this API policy does not restrict it.

### 12.2 CORS

CORS is restricted to the configured frontend origin(s) from `FRONTEND_ORIGIN` (default `http://localhost:3000` and `http://localhost:5173`). Other browser origins receive no CORS headers. Non-browser clients such as Postman and curl are unaffected. In development the Vite server proxies `/api` to the HTTPS backend, so the browser only ever contacts `http://localhost:5173`.

---

## 13. Controlled Error Handling

HustleHub+ uses centralised error-handling middleware.

The application includes:

* A `notFound` handler for unmatched routes
* A central error handler for unexpected errors

Unexpected internal errors are logged server-side for debugging, while the client receives a safe response without internal implementation details.

For example:

```json
{
  "success": false,
  "message": "An unexpected error occurred"
}
```

Stack traces, file paths, configuration details, and library internals are not returned to API clients.

This creates a separation between information required by developers for debugging and information that should be exposed to external users.

---

## 14. Authentication Error Protection

Authentication-related responses are intentionally generic.

For login, the same response is returned when:

* The email address does not exist
* The password is incorrect

Example:

```text
Incorrect email or password
```

This reduces the amount of information an attacker can use to determine whether a particular email address has an account.

Similarly, invalid and expired or tampered JWTs are handled using a generic authentication failure response rather than revealing the exact reason for the token failure.

---

## 15. Environment and Secret Management

Sensitive configuration is stored in environment variables rather than hard-coded into the application.

The main authentication secret is:

```text
JWT_SECRET
```

The JWT expiration can be configured using:

```text
JWT_EXPIRES_IN
```

The `.env` file is excluded from version control.

The application performs fail-fast checks during startup so that it does not run without required security configuration.

A strong random secret can be generated using:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 16. Threat Notes

| Threat                                   | Risk                                                                           | Control                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Credential theft                         | Plaintext passwords could be exposed if the store is compromised               | Passwords are hashed using bcrypt before storage                            |
| Inadequate authentication                | Unauthenticated users could access protected resources                         | JWT authentication middleware protects private routes                       |
| JWT manipulation                         | An attacker could attempt to modify token claims                               | JWTs are signed and verified using a server-side secret                     |
| Malicious input                          | Unexpected or malicious values could reach application logic                   | Server-side allowlist and format validation is performed before controllers |
| Sensitive-data interception              | Credentials or tokens could be intercepted in transit                          | HTTPS/TLS encrypts client-server communication                              |
| Information leakage                      | Stack traces and implementation details could aid attackers                    | Centralised error handling returns safe generic responses                   |
| Oversized requests                       | Excessive payloads could consume server resources                              | Request bodies are limited to 10 KB                                         |
| Privilege escalation during registration | A user could attempt to register as an administrator                           | Public registration only permits `client` and `freelancer` roles            |
| User enumeration                         | Attackers could identify registered accounts through different login responses | Generic authentication failure messages are used                            |
| NoSQL operator injection                 | Payloads such as `{"$gt": ""}` could alter database queries                    | Validators require strings; `express-mongo-sanitize` strips `$` and `.` keys |
| Stored cross-site scripting              | Script or HTML in gig titles, descriptions or notes could run in a browser     | `xss` cleaning before storage; React escapes output; strict API CSP          |
| Broken access control (IDOR)             | A user could read or change another user's gigs, bookings or income            | JWT + role check + ownership check + role-scoped queries                     |
| Mass assignment                          | A client could send `freelancer`, `role` or `amount` fields to forge ownership | Only whitelisted fields are copied from request bodies                       |
| Price tampering                          | A client could send a lower price in a booking                                 | Amount is always taken from the stored gig price                             |
| Brute force and abuse                    | Repeated login or booking requests                                             | Rate limiting: auth 20, booking 20, other API routes 300 per 15 minutes      |
| Partial failure                          | A booking could exist without its transaction                                  | The booking is deleted if the transaction cannot be saved (compensating rollback) |

---

## 17. Setup and Running Locally

### 17.1 Backend

Requirements: Node.js 18+, and a MongoDB database (local, or a free MongoDB Atlas cluster with your IP on the Network Access list).

```bash
cd backend
npm install
cp .env.example .env
npm run gen-cert
npm start
```

Edit `.env` before starting:

* `JWT_SECRET` — a strong random value, for example:

  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```

* `MONGO_URI` — for example `mongodb://127.0.0.1:27017/hustlehub`, or an Atlas `mongodb+srv://…/hustlehub` string.
* `FRONTEND_ORIGIN` — `http://localhost:5173` (comma-separate several origins if needed).
* Optional: `RATE_LIMIT_AUTH_MAX`, `RATE_LIMIT_BOOKING_MAX`, `RATE_LIMIT_GLOBAL_MAX`.

`.env` must never be committed (it is in `.gitignore`). `npm run gen-cert` creates the local SSL certificate and private key in `certs/`. For development with automatic reloading use `npm run dev`. The API is available at `https://localhost:5443`. Because the certificate is self-signed, browsers and API clients show a warning; this is expected locally.

Create the first admin (admins cannot self-register):

```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='ALongPassw0rd!' npm run seed:admin
```

### 17.2 Frontend

```bash
cd client
npm install
npm run dev
```

The app runs at `http://localhost:5173`. The Vite dev server proxies `/api` to `https://localhost:5443` (accepting the self-signed certificate in development only). Start the backend first. The frontend can register users, log in, browse gigs, create gigs (freelancers), book gigs (clients), and view bookings, transactions and income.

---

## 18. Windows / Git Bash Troubleshooting

### 18.1 OpenSSL Subject Path Conversion

If:

```bash
npm run gen-cert
```

reports a malformed subject name and `certs/cert.pem` is not created, Git Bash may be rewriting the leading `/` in the OpenSSL `-subj` argument as a Windows path.

Run:

```bash
MSYS_NO_PATHCONV=1 openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout certs/key.pem -out certs/cert.pem -subj "/C=ZA/ST=KwaZulu-Natal/L=Durban/O=HustleHub/OU=Dev/CN=localhost"
```

Then confirm that both files exist:

```bash
ls certs/
```

### 18.2 PowerShell `curl`

In PowerShell, `curl` may refer to the `Invoke-WebRequest` alias rather than the standard curl executable.

Use:

```powershell
curl.exe -k https://localhost:5443/api/health
```

The `-k` option allows testing against the self-signed local certificate.

### 18.3 JSON Request Bodies in PowerShell

If PowerShell causes quoting problems with inline JSON, save the JSON request body to a file and send it using:

```powershell
-d "@file.json"
```

---

## 19. Postman Testing

The project includes:

```text
postman/HustleHub-Part1.postman_collection.json
```

The collection tests both successful and invalid scenarios.

Before running the collection:

1. Start the HustleHub+ HTTPS server.
2. Import the Postman collection.
3. Disable Postman's SSL certificate verification for local testing.
4. Run the collection.

### Test Scenarios

The collection covers:

* Successful registration
* Duplicate email registration
* Weak password registration
* Invalid email registration
* Missing registration fields
* Script/HTML injection attempt in the name field
* Successful login
* Incorrect password
* Unknown email
* Missing login fields
* Protected route with a valid token
* Protected route without a token
* Protected route with an invalid token

---

## 20. Postman Test Results

All scenarios in the Part 1 collection were executed against the local HTTPS server and passed as expected.

| Test                            | Expected                   | Result |
| ------------------------------- | -------------------------- | ------ |
| Health check                    | 200                        | Pass   |
| Register - success              | 201, JWT issued            | Pass   |
| Register - duplicate email      | 409                        | Pass   |
| Register - weak password        | 400, field errors          | Pass   |
| Register - invalid email        | 400                        | Pass   |
| Register - missing fields       | 400                        | Pass   |
| Register - malicious input      | 400, rejected              | Pass   |
| Login - success                 | 200, JWT issued            | Pass   |
| Login - wrong password          | 401, generic message       | Pass   |
| Login - unknown email           | 401, same generic message  | Pass   |
| Login - missing fields          | 400                        | Pass   |
| Protected route - no token      | 401                        | Pass   |
| Protected route - invalid token | 401                        | Pass   |
| Protected route - valid token   | 200, correct user returned | Pass   |

---

## 20A. Part 2 Testing (Backend, Newman and Frontend)

### Backend automated tests (Jest + Supertest)

```bash
cd backend
npm test
```

41 tests in 5 suites cover registration/login/JWT, RBAC for every role, gig ownership, booking → transaction creation, income totals, role-scoped visibility, sanitisation, security headers, CORS, rate limiting and safe error responses. These tests run the real Express app but replace the Mongoose models with in-memory stand-ins (`tests/support/fakeModels.js`), so they validate application logic and security controls rather than MongoDB itself.

### API tests (Postman + Newman) against the real database

```bash
# terminal 1 (MongoDB reachable, .env configured)
cd backend
npm start
# terminal 2
cd backend
npm run test:newman
```

`backend/postman/HustleHub-Part2.postman_collection.json` contains 41 requests and 64 assertions covering: registration of two freelancers and a client, rejection of the `admin` role at registration, duplicate email, wrong password, NoSQL operator injection, missing/valid tokens, RBAC (client cannot create gigs or view income or use admin routes; freelancer cannot book), gig create/update/delete and ownership (403 for another freelancer), script-tag sanitisation, invalid input and malformed ids, booking → transaction with server-side price (tampered amount ignored), role-scoped booking/transaction/income visibility, malformed-JSON handling, and the presence of CSP and HSTS headers. Unique emails are generated on each run so it can be repeated.

Result of the run against MongoDB Atlas: **41 requests, 64 assertions, 0 failed** (output saved in `backend/docs/newman-part2-output.txt`). The Part 1 collection still passes against the Part 2 code. If the rate limit returns `429` after several back-to-back runs, restart the server or raise `RATE_LIMIT_AUTH_MAX`.

The repository root also holds `HustleHub_Part2.postman_collection.json` and `postman-report.html`, an earlier collection and Newman HTML report produced by the frontend team member.

### Frontend automated tests (Vitest + React Testing Library)

```bash
cd client
npm install
npx vitest run
```

The suite covers component rendering and form validation (Login, Register, Gigs, Booking) and integration tests that mock the API client: login stores the JWT and navigates, bad credentials show the server's generic message, a weak password never reaches the API, the register form offers only `client` and `freelancer`, clients see "Book Service" and freelancers do not, a booking sends only `gigId` and a note and shows the transaction reference, role-guarded routes redirect or refuse, and script-like gig text is rendered as inert text.

---

## 21. API Response Format

The API uses a consistent JSON response structure.

### Success

```json
{
  "success": true,
  "message": "Human-readable summary",
  "data": {}
}
```

### Validation Error

```json
{
  "success": false,
  "message": "Human-readable error summary",
  "errors": [
    {
      "field": "email",
      "message": "A valid email address is required"
    }
  ]
}
```

The `errors` array is included for validation failures.

Other errors such as `401`, `404`, `409`, and `500` return safe `success` and `message` fields without exposing internal implementation details.

---

## 22. Why 12 Bcrypt Salt Rounds?

The bcrypt cost factor determines how computationally expensive password hashing is.

HustleHub+ uses **12 salt rounds** as a balance between security and performance. Increasing the cost factor makes password guessing more expensive for an attacker, while also increasing the processing time required by the server for registration and login.

The chosen value provides a stronger password-hashing configuration than very low cost factors while remaining practical for a local development application.

The exact cost factor can be reviewed and adjusted as the system is deployed to environments with different hardware and performance requirements.

---

## 23. Dependency Advisories

**Part 1.** `npm audit` reported moderate advisories involving the `qs` package, pulled in through Express/body-parser. No non-breaking fix was available then, so nothing was force-upgraded before submission.

**Part 2.** Re-running the audit found advisories in Express's dependency chain (`qs`, `body-parser`, `proxy-addr`) and in `morgan`. These were fixed with the non-breaking command

```bash
npm audit fix --omit=dev
```

which updated the lockfile only (Express 4.22.3, body-parser 1.20.8, proxy-addr 2.0.8, morgan 1.12.1; no major version change). After the fix, `npm audit --omit=dev` reports **0 vulnerabilities** in production dependencies and all 41 backend tests still pass. The remaining advisories reported by a full `npm audit` are in development tooling (the Newman and Jest dependency trees), which is not part of the deployed API. `npm audit fix --force` is deliberately not used because it would introduce breaking changes.

---

## 24. Roadmap

### Part 2 (completed)

Gig management, bookings, simulated transactions, income tracking, RBAC, sanitisation, rate limiting, CSP, MongoDB persistence, the React frontend, and backend, API and frontend testing. See sections 5, 12, 16, 17, 20A and 26.

### Frontend overview (Part 2)

The frontend is built with **React, Vite, Tailwind CSS and React Router**.

* **Authentication UI:** registration and login screens with client-side validation (mirroring the server's password policy) and graceful display of server errors.
* **Marketplace browsing:** gig discovery with search over title, description and category.
* **Booking interface:** the client picks a date and notes; the booking is created through the API and the transaction reference is shown as the simulated confirmation.
* **Freelancer pages:** My gigs (create, pause/activate, delete), bookings and transactions, and income.
* **Security alignment:** the JWT is attached to API calls and kept in `localStorage`. This is a recorded trade-off: script on the page could read it, which is mitigated by React's output escaping (no `dangerouslySetInnerHTML` is used), server-side sanitisation and the API's CSP. Route guards in the UI are a convenience only; the backend enforces authentication and RBAC on every request.

### Part 3

Planned functionality includes:

* Tax estimation
* Financial dashboard
* CI/CD using GitHub Actions
* Static analysis
* Docker
* Docker Compose
* Structured logging
* Additional security controls
* Final security review

---

## 25. Academic Security Conclusion

Part 1 establishes a security-focused foundation for HustleHub+.

The backend combines several security controls rather than relying on a single mechanism. Passwords are hashed before storage, authentication is performed using signed JWTs, protected routes require valid authentication credentials, user input is validated server-side, HTTPS protects data in transit, request bodies are size-limited, security headers are applied, secrets are stored through environment configuration, and internal errors are controlled before being returned to clients.

The layered architecture ensures that requests pass through security controls before sensitive application functionality is reached. Invalid input is rejected before controller processing, authentication is checked before protected resources are accessed, and internal failures are separated from information exposed to API users.

The Part 1 in-memory store is permitted by the POE requirements. Because data access has been separated from the controllers, the persistence mechanism can be replaced with MongoDB/Mongoose in Part 2 without requiring a complete redesign of the authentication architecture.

The resulting implementation therefore satisfies the immediate Part 1 secure-foundation requirements while providing a structured basis for the marketplace, financial, and additional security functionality planned for later parts.

**Part 2 conclusion.** Part 2 keeps the layered approach and applies it to the marketplace. Every sensitive route requires a JWT, role checks and ownership checks decide who can act on which record, user input is validated, sanitised and size-limited, authentication and booking endpoints are rate limited, and the API sends a strict Content-Security-Policy with HSTS. Pricing and ownership are decided on the server, so the client cannot forge them. Known limitations: a JWT carries the role at the time it was issued, so a role change takes effect only after the token expires (1 hour by default); rate-limit counters live in server memory, so scaling to several instances would need a shared store such as Redis; the JWT is held in `localStorage` in the browser; and payments are simulated, as the brief permits. Part 3 will add the DevSecOps controls.

---

## 26. Part 2 Team Contributions

| Member | Contribution |
| ------ | ------------ |
| Lonwabo Gumede | Backend security and integration: MongoDB/Mongoose models, RBAC and ownership checks, validation, sanitisation, rate limiting, Helmet/CSP and CORS, the gig, booking, transaction and income modules used in the final build, admin routes and seed script, Jest suites, the Part 2 Postman collection and Newman run, the wiring of the React pages to the API, and this README update. |
| Ayabonga Nzuza | React frontend foundation (project setup, Login, Register, Gigs and Booking pages, routing, Vitest component tests), an earlier Postman collection and Newman HTML report, and README contributions. |
| Nonjabulo Mathenjwa | An earlier booking and simulated-transaction implementation and a booking rate-limiting fix, pushed to the repository (commits `f6b817e` and `780ba0b`); the final build uses the integrated, tested version of this module. <!-- confirm wording with Nonjabulo --> |
| Luke Lutchmiah | Part 1 Postman testing and documentation (`POSTMAN TESTING.docx`); an earlier gig controller/routes/test draft was uploaded but was not integrated because it lacked update and delete. <!-- confirm wording with Luke --> |

---

# AI Disclosure

## Annexure: Disclosure of AI Usage in my Assessment

### Generative AI Use

| Section(s) within the Assessment         | AI Tool Used     | Purpose / Intention Behind Use                                                                                                                                                                                                                                                                                                      | Date(s) Used     | Link to AI Chat                                                |
| ---------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------- |
| Part 1 – Documentation / Mermaid Diagram | ChatGPT (OpenAI) | Guidance on creating and structuring a Mermaid diagram for the HustleHub+ system documentation. ChatGPT was used to explain Mermaid diagram syntax, structure, and how to represent the required system components and relationships. The generated guidance was reviewed and adapted by me for the requirements of the assessment. | 7 September 2026 | https://chatgpt.com/share/6a9f21f7-ef64-83ea-9afc-16ef74f979e9 |
| Part 1 and Part 2 – Backend code, tests, Postman/Newman collection, React integration, git and debugging guidance, README drafting | Claude (Anthropic) | Used as a coding and documentation assistant by Lonwabo Gumede: generating and reviewing backend code (Mongoose models, RBAC, sanitisation, rate limiting, error handling), Jest tests, the Part 2 Postman collection, wiring the React pages to the API, README sections, and step-by-step git and troubleshooting help. All code was run and tested by me (41 backend tests, Newman 64/64 against MongoDB Atlas, frontend tests) and reviewed before being committed. | Part 1 (September 2026) and 12 October 2026 | <add the Claude chat share link here> |


### Statement of Responsible AI Use

ChatGPT was used for guidance on the Mermaid diagram syntax and structure for the Part 1 documentation. Claude was used as described in the table above for code, tests, documentation and troubleshooting. In both cases the AI output was reviewed, run, tested and adapted to the requirements of the assessment, and the final decisions, implementation and documentation remain my responsibility. Other team members should add their own AI-use entries to this table if they used generative AI.

---

# Part 1 Submission Checklist

* [x] Architecture diagram
* [x] MERN architecture documented
* [x] Backend API built with Node.js and Express
* [x] Registration and login functionality
* [x] In-memory user storage
* [x] Passwords securely hashed using bcrypt
* [x] JWT issued after authentication
* [x] JWT validated on protected requests
* [x] HTTPS served using a local SSL certificate
* [x] Server-side input validation
* [x] Controlled error responses
* [x] Security headers
* [x] Request-size protection
* [x] Environment-based secret management
* [x] Postman collection
* [x] Successful and invalid test scenarios
* [ ] Demonstration video recorded and linked
* [ ] GitHub repository link included in final submission

---

# Part 2 Submission Checklist

* [x] Gig management: freelancers create, update, view and delete their own gigs
* [x] Ownership enforced: users cannot modify, delete or read resources that are not theirs
* [x] Bookings create a simulated confirmation and a transaction record linked to client and freelancer
* [x] Freelancer income tracked from their own transactions
* [x] JWT required on all protected routes
* [x] Role-based access control enforced (client, freelancer, admin)
* [x] Input validation and sanitisation (NoSQL injection and XSS)
* [x] Rate limiting on authentication and booking endpoints
* [x] Security headers with a Content-Security-Policy
* [x] MongoDB persistence with Mongoose
* [x] React frontend: register, log in, browse gigs, book, view bookings and income
* [x] Backend tests (Jest, 41) and API tests (Postman and Newman, 64 assertions)
* [x] Frontend automated tests (Vitest and React Testing Library)
* [x] README updated (features, security measures, run instructions, testing)
* [ ] Screenshots committed to `backend/docs/screenshots`
* [ ] Part 2 demonstration video recorded and linked: <add video link here>
* [ ] GitHub repository link included in the final submission

---

# References

Express.js. 2026. *Using middleware*. [online] Available at: https://expressjs.com/en/guide/using-middleware/ [Accessed 1 September 2026].

Express.js. 2026. *Routing*. [online] Available at: https://expressjs.com/en/guide/routing/ [Accessed 1 September 2026].

Express.js. 2026. *Express middleware*. [online] Available at: https://expressjs.com/en/resources/middleware/ [Accessed 1 September 2026].

Express-Validator. 2026. *express-validator*. [online] Available at: https://express-validator.github.io/docs/ [Accessed 1 September 2026].

Jones, M., Bradley, J. and Sakimura, N. 2015. *RFC 7519: JSON Web Token (JWT)*.

Node.js. 2026. *Node.js v26.8.1 documentation*. [online] Available at: https://nodejs.org/api/https.html [Accessed 1 September 2026].

OpenAI. 2026. *ChatGPT (GPT-5.6 Luna)*. Available at: https://chatgpt.com/share/6a9f21f7-ef64-83ea-9afc-16ef74f979e9 [Accessed 7 September 2026].

OWASP. 2026. *Input Validation Cheat Sheet*. [online] Available at: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet [Accessed 1 September 2026].

OWASP. 2026. *Password Storage Cheat Sheet*. [online] Available at: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet [Accessed 1 September 2026].

OWASP. 2026. *REST Security Cheat Sheet*. [online] Available at: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet [Accessed 1 September 2026].
