# NALL_HustleHub

# HustleHub+ — Secure Freelance Marketplace Platform

**Module:** INSY7314/w & APDS7311/w
**Part:** 1 — Secure Foundations

---

1. System Overview

HustleHub+ is a safe freelance marketplace that links employers and independent contractors. Clients will be able to peruse offered services and make reservations, and freelancers will be able to promote their services. The technology will eventually include income tracking, booking-related transactions, and projected tax requirements.

There are two main user groups for which the platform is intended. While **clients** will use the platform to look through available services and make reservations, **freelancers** will use it to promote their services and maintain information related to their work. Future plans call for the creation of an administrative position to assist with platform administration and moderating.

Security is regarded as a basic design need because HustleHub+ would handle sensitive data, such as user credentials, authentication information, transactional records, and income-related data. The secure backend framework that will serve as the basis for the subsequent functionality is established in Part 1.

The backend API is provided via **Node.js and Express** in the Part 1 implementation. User registration, user login, and a JWT-protected user profile endpoint are all supported by the current implementation. JSON Web Tokens (JWTs) are used to secure authenticated requests, bcrypt hashing is used to secure user passwords, `express-validator' is used to validate incoming registration and login data, and a locally generated self-signed certificate is used to serve the API over HTTPS.

The POE employs a method of progressive development. As a result, Part 1 does not implement the entire MERN application. The Part 1 criteria allow for the use of a **in-memory user store** in the existing backend. Later phases will see the introduction of the React frontend, service/gig capabilities, bookings, transaction functionality, and persistent MongoDB storage.



2. Security Architecture

Express and Node.js are used in the implementation of the Part 1 backend. As requests proceed through the request-response cycle of the application, Express employs middleware to handle them. Middleware can use `next()` to transfer control to subsequent middleware, examine or alter requests and answers, or terminate requests (Express.js, 2026).

Several global middleware components, such as Helmet, CORS, JSON and URL-encoded body parsing, and Morgan request logging, are used in the present backend. To lessen the possibility of needlessly large request payloads, a 10 KB request body size limit is also included.

The API exposes the following Part 1 endpoints:

| Method | Endpoint             | Authentication | Purpose                                         |
| ------ | -------------------- | -------------- | ----------------------------------------------- |
| GET    | `/api/health`        | Not required   | Confirms that the API is running                |
| POST   | `/api/auth/register` | Not required   | Registers a new user                            |
| POST   | `/api/auth/login`    | Not required   | Authenticates a user and issues a JWT           |
| GET    | `/api/users/me`      | JWT required   | Returns the authenticated user's public profile |

Prior to the request reaching the authentication controllers, the authentication routes employ validation middleware. Before enabling the request to reach the controller, the protected `/api/users/me` route employs JWT authentication middleware to confirm the provided Bearer token.

Additionally, the application makes use of centralized error handling. A specialized middleware called `notFound` handles unknown routes, while `errorHandler.js` handles unexpected application problems. Express uses the `(err, req, res, next)` signature to document error-handling middleware as a specialized middleware function (Express.js, 2026).

Part 1 uses `userStore.js` to store user records in an in-memory data structure. Operations like locating a user by email, locating a user by ID, and creating a user are all made possible by the data-access functions. This abstraction is meant to enable MongoDB/Mongoose to eventually replace the storage method without necessitating a full rewrite of the authentication controllers.



3. Security Decisions

3.1 Password Hashing

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

Express.js. 2026. Using Middleware [online] Available at: < https://expressjs.com/en/guide/using-middleware/ (Accessed: 2 September 2026).

Express.js (2026) *Error Handling*. Available at: https://expressjs.com/en/guide/error-handling/ (Accessed: 2 September 2026).

Node.js (2026) *HTTPS*. Node.js Documentation. Available at: https://nodejs.org/api/https.html (Accessed: 2 September 2026).

OWASP (2026) *JSON Web Token Cheat Sheet*. OWASP Cheat Sheet Series. Available at: https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html (Accessed: 6 September 2026).

OWASP (2026) *Password Storage Cheat Sheet*. OWASP Cheat Sheet Series. Available at: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html (Accessed: 2 September 2026).

OWASP (2026) *Input Validation Cheat Sheet*. OWASP Cheat Sheet Series. Available at: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html (Accessed: 2 September 2026).
