# NALL_HustleHub

# HustleHub+ — Secure Freelance Marketplace Platform

**Module:** INSY7314/w & APDS7311/w
**Part:** 1 — Secure Foundations

---

## 1. System Overview

HustleHub+ is a secure freelance marketplace platform designed to connect clients with freelancers. Freelancers will be able to advertise services, while clients will be able to browse available services and make bookings. In later stages of development, the platform will also support booking-related transactions, income tracking and estimated tax obligations.

The platform is designed for two primary user groups. **Freelancers** will use the platform to advertise their services and manage information associated with their work, while **clients** will use the platform to browse available services and make bookings. An administrative role is planned for later development to support platform management and moderation.

Because HustleHub+ will process sensitive information, including user credentials, authentication information, transactional records and income-related data, security is treated as a fundamental design requirement. Part 1 establishes the secure backend foundation on which the later functionality will be built.

The Part 1 implementation uses **Node.js and Express** to provide the backend API. The current implementation supports user registration, user login and a JWT-protected user profile endpoint. User passwords are protected using bcrypt hashing, incoming registration and login data is validated using `express-validator`, authenticated requests are protected using JSON Web Tokens (JWTs), and the API is served over HTTPS using a locally generated self-signed certificate.

The POE follows an incremental development approach. Therefore, the complete MERN application is not implemented in Part 1. The current backend uses an **in-memory user store**, which is permitted by the Part 1 requirements. Persistent MongoDB storage, the React frontend, service/gig functionality, bookings and transaction functionality will be introduced in later stages.

---

## 2. Security Architecture

The Part 1 backend is implemented using Node.js and Express. Express uses middleware to process requests as they move through the application's request-response cycle. Middleware can inspect or modify requests and responses, terminate requests, or pass control to subsequent middleware using `next()` (Express.js, 2026).

The current backend applies several global middleware components, including Helmet, CORS, JSON and URL-encoded body parsing, and Morgan request logging. A request body size limit of 10 KB is also applied to reduce the risk associated with unnecessarily large request payloads.

The API exposes the following Part 1 endpoints:

| Method | Endpoint             | Authentication | Purpose                                         |
| ------ | -------------------- | -------------- | ----------------------------------------------- |
| GET    | `/api/health`        | Not required   | Confirms that the API is running                |
| POST   | `/api/auth/register` | Not required   | Registers a new user                            |
| POST   | `/api/auth/login`    | Not required   | Authenticates a user and issues a JWT           |
| GET    | `/api/users/me`      | JWT required   | Returns the authenticated user's public profile |

The authentication routes use validation middleware before the request reaches the authentication controllers. The protected `/api/users/me` route uses JWT authentication middleware to verify the supplied Bearer token before allowing the request to reach the controller.

The application also uses centralised error handling. Unknown routes are handled by a dedicated `notFound` middleware, while unexpected application errors are processed by `errorHandler.js`. Express documents error-handling middleware as a specialised middleware function using the `(err, req, res, next)` signature (Express.js, 2026).

For Part 1, user records are stored in an in-memory data structure through `userStore.js`. The data-access functions provide operations such as finding a user by email, finding a user by ID and creating a user. This abstraction is intended to allow the storage mechanism to be replaced by MongoDB/Mongoose during a later stage without requiring the authentication controllers to be completely redesigned.

---

## 4. Security Decisions

### 4.1 Password Hashing

HustleHub+ does not store user passwords in plaintext. During registration, the submitted password is processed using the `bcryptjs` password-hashing library before the resulting password hash is stored in the in-memory user store.

The implementation currently uses a bcrypt work factor of **12**:

```javascript
const SALT_ROUNDS = 12;
const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
```

During login, the submitted password is compared with the stored password hash using `bcrypt.compare()`. The original plaintext password is therefore not required to be stored by the application.

Password hashing is preferable to encryption or plaintext storage because a password hash is designed to be computationally difficult to reverse. OWASP recommends using slow, adaptive password-hashing algorithms such as Argon2id, bcrypt or PBKDF2 rather than storing passwords in plaintext. For bcrypt implementations, OWASP recommends a work factor of at least 10 and notes that bcrypt commonly has a maximum input length of 72 bytes (OWASP, 2026).

The application also separates the internal user representation from the public user representation. The `toPublicUser()` function deliberately excludes the `passwordHash` property before user information is returned in API responses. This prevents the stored password hash from being unnecessarily exposed to clients.

**Implementation note:** The current validation rule permits passwords up to 128 characters, while bcrypt commonly has a 72-byte input limit. Before final submission, the validation rule should therefore be reviewed and, if bcrypt remains the selected algorithm, the maximum password length should be aligned with the bcrypt limitation. OWASP recommends enforcing a maximum of 72 bytes or less for bcrypt implementations (OWASP, 2026).

---

### 4.2 JWT-Based Authentication

HustleHub+ uses **JSON Web Tokens (JWTs)** to identify authenticated users when accessing protected API resources.

Following successful registration or login, the backend creates a signed JWT containing the authenticated user's `id` and `role`. The token is configured with an expiry period, which is currently set to one hour through the `JWT_EXPIRES_IN` environment variable.

The implementation creates the token using:

```javascript
jwt.sign(
  { id: user.id, role: user.role },
  jwtSecret,
  { expiresIn: jwtExpiresIn }
);
```

The JWT secret is loaded from the `JWT_SECRET` environment variable rather than being hard-coded in the source code. The application also performs a startup check and terminates if the required secret is missing.

The JWT is returned to the client after successful registration or login. For subsequent protected requests, the client must provide the token using the HTTP `Authorization` header in the following format:

```text
Authorization: Bearer <JWT>
```

The `/api/users/me` endpoint is protected by the `authenticate` middleware. This middleware checks that a Bearer token is present and then uses `jwt.verify()` with the configured secret to verify the token. If the token is missing, malformed, invalid or expired, the request is rejected with an HTTP `401 Unauthorized` response. A successfully verified token results in its decoded `id` and `role` being attached to `req.user` for use by the protected controller.

A signed JWT provides integrity and authenticity for its claims; it should not be described as automatically encrypting the information contained within it. OWASP explains that signed JWTs protect their claims against tampering through their signature, while encryption is a separate capability (OWASP, 2026). The HustleHub+ implementation therefore uses JWT primarily for **authenticated user identification and integrity protection**, rather than for storing confidential information inside the token.

The JWT implementation should also be reviewed to ensure that the accepted signing algorithm is explicitly restricted to the algorithm intended by the application. OWASP recommends controlling accepted JWT algorithms and avoiding configurations that permit algorithm confusion or unexpected signing methods (OWASP, 2026).

---

### 4.3 Input Validation

HustleHub+ validates user-controlled input before registration and login requests reach the authentication controllers. Validation is implemented using the `express-validator` library.

For registration, the following fields are validated:

* **Name:** required, between 2 and 100 characters, and restricted to letters, spaces, apostrophes and hyphens.
* **Email:** required, validated as an email address and normalised.
* **Password:** required, with a minimum length of 8 characters and requirements for uppercase letters, lowercase letters, numbers and special characters.
* **Role:** optional, but if supplied it must be either `client` or `freelancer`.

The restriction of the registration role to `client` or `freelancer` prevents a user from simply registering themselves as an `admin`. Administrative functionality is intended for a later stage of development.

For login, the email and password fields are validated before the authentication controller is executed.

The route structure ensures that validation is performed before the relevant controller:

```text
POST /api/auth/register
        ↓
Registration validation
        ↓
validateRequest
        ↓
register controller
```

and:

```text
POST /api/auth/login
        ↓
Login validation
        ↓
validateRequest
        ↓
login controller
```

If validation fails, `validateRequest.js` returns an HTTP `400 Bad Request` response containing the relevant field and validation messages. Raw submitted values and internal implementation details are not included in the validation response.

Input validation is an important security control because data supplied by users must be treated as untrusted until it has been checked against the application's expected requirements. OWASP recommends validating input according to expected data types, formats, lengths and permitted values, with allowlist-based validation preferred where appropriate (OWASP, 2026).

It is important to note that input validation is applied to the **registration and login routes** in the current Part 1 implementation. The protected `/api/users/me` endpoint does not use the registration/login validation rules because it does not accept the same user-registration input. Instead, it is protected using JWT authentication middleware.

---

### 4.4 HTTPS/TLS

The HustleHub+ API is served over **HTTPS using Node.js's native HTTPS module**. The server loads a locally generated development certificate and private key and passes these credentials to `https.createServer()` before starting the Express application.

The implementation is structured as follows:

```text
TLS certificate + private key
          ↓
Node.js HTTPS server
          ↓
Express application
          ↓
API routes and middleware
```

The application expects the certificate and key to exist before the server starts. If either file is missing, the server terminates and instructs the developer to generate the local certificate.

The development certificate is **self-signed**, which is appropriate for demonstrating HTTPS locally but is not equivalent to a certificate issued by a trusted Certificate Authority (CA). As a result, browsers and API clients such as Postman may display a certificate warning during local development.

Node.js provides the `https.createServer()` API for creating HTTPS servers using TLS configuration options (Node.js, 2026). HTTPS/TLS is particularly important for HustleHub+ because authentication credentials and JWTs are transmitted between clients and the backend. Transport encryption helps protect this information against interception or modification while it is travelling across the network.

The self-signed certificate should therefore be understood as a **Part 1 local-development implementation**. In a production deployment, it should be replaced with a certificate issued by a trusted Certificate Authority.

Helmet is also enabled globally in the Express application. Helmet provides security-related HTTP response headers, but it should not be described as providing the HTTPS encryption itself. The encryption of network traffic is provided by HTTPS/TLS.

---

## References

Express.js (2026) *Using Middleware*. Available at: https://expressjs.com/en/guide/using-middleware/ (Accessed: 6 September 2026).

Express.js (2026) *Error Handling*. Available at: https://expressjs.com/en/guide/error-handling/ (Accessed: 6 September 2026).

Node.js (2026) *HTTPS*. Node.js Documentation. Available at: https://nodejs.org/api/https.html (Accessed: 6 September 2026).

OWASP (2026) *JSON Web Token Cheat Sheet*. OWASP Cheat Sheet Series. Available at: https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html (Accessed: 6 September 2026).

OWASP (2026) *Password Storage Cheat Sheet*. OWASP Cheat Sheet Series. Available at: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html (Accessed: 6 September 2026).

OWASP (2026) *Input Validation Cheat Sheet*. OWASP Cheat Sheet Series. Available at: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html (Accessed: 6 September 2026).
