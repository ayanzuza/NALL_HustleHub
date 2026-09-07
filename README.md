# HustleHub+ — Secure Freelance Marketplace Platform

**Modules:** INSY7314/w and APDS7311/w
**Student:** Lonwabo Gumede (ST10270409)
**Part:** 1 — Secure Foundations

---

## 1. System Overview

HustleHub+ is a secure freelance marketplace that connects two primary types of users:

* **Freelancers** — advertise services ("gigs"), manage bookings, and track income and estimated tax obligations.
* **Clients** — browse available gigs and book the services they need.

A third role, **Admin**, is recognised by the backend and will oversee the platform in later parts of the project, including user and gig moderation. Admin accounts cannot be self-assigned through public registration.

Because HustleHub+ processes sensitive information such as passwords, authentication credentials, booking and transaction records, and income-related information, security is treated as a fundamental design requirement from Part 1 rather than as a feature added later.

Part 1 delivers the secure backend foundation. Node.js and Express provide REST API endpoints for registration, authentication, and access to authenticated user information. The database layer is currently implemented using an in-memory user store, as permitted by the POE brief, and is designed so that it can be replaced with MongoDB/Mongoose in Part 2 with minimal changes to the controllers.

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

Gigs, bookings, transactions, the React frontend, and additional security and deployment features are introduced in later parts of the project.

---

## 2. Intended Users

HustleHub+ is designed around the following marketplace roles.

### 2.1 Clients

Clients use the platform to:

* Browse available freelance services
* View freelancer offerings
* Book services
* Track booking and transaction information in later parts of the project

The `client` role is available through the public registration endpoint.

### 2.2 Freelancers

Freelancers use the platform to:

* Advertise services as gigs
* Manage bookings
* Track income
* View estimated tax obligations in later parts of the project

The `freelancer` role is available through the public registration endpoint.

### 2.3 Admin

An administrator role is recognised internally by the backend and will be used for privileged platform management in later parts.

Admin cannot be selected during public registration. The registration validator only permits:

* `client`
* `freelancer`

This prevents an unauthenticated user from simply assigning themselves an elevated role.

---

## 3. Backend Architecture

HustleHub+ follows the **MERN** architecture: MongoDB, Express, React, and Node.js.

MongoDB and the React frontend are introduced in later parts. In Part 1, the data-access layer uses an in-memory store that follows a Mongoose-shaped interface, allowing the persistence mechanism to be replaced with MongoDB/Mongoose later.

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
| Routing            | Express Router                                   | Separates authentication and protected user routes        |
| Data               | In-memory user store                             | Stores user records in Part 1                             |
| Error handling     | Centralised middleware                           | Provides safe and consistent error responses              |

---

## 4. Project Structure

```text
hustlehub-backend/
├── certs/
│   └── generate-cert.sh
├── postman/
│   └── HustleHub-Part1.postman_collection.json
├── src/
│   ├── config/
│   │   └── env.js
│   ├── controllers/
│   │   └── authController.js
│   ├── middleware/
│   │   ├── authenticate.js
│   │   ├── errorHandler.js
│   │   └── validateRequest.js
│   ├── models/
│   │   └── userStore.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── userRoutes.js
│   ├── utils/
│   │   └── validators.js
│   ├── app.js
│   └── server.js
├── .env.example
├── package.json
└── README.md
```

The project follows a layered structure so that routing, controllers, middleware, validation, configuration, and data access have separate responsibilities.

This separation improves maintainability and makes individual security controls easier to test and review. It also allows the in-memory `userStore.js` to be replaced by a Mongoose model in Part 2 without significantly changing the authentication architecture.

---

## 5. API Routes

The following endpoints are implemented in Part 1:

| Method | Endpoint             | Authentication | Purpose                                   |
| ------ | -------------------- | -------------- | ----------------------------------------- |
| GET    | `/api/health`        | No             | Determines whether the API is operational |
| POST   | `/api/auth/register` | No             | Creates a new user account                |
| POST   | `/api/auth/login`    | No             | Authenticates an existing user            |
| GET    | `/api/users/me`      | Yes            | Returns the authenticated user's profile  |

Public authentication routes are kept separate from protected user routes. Authentication is therefore not treated as a one-time event: every protected request must provide valid authentication credentials.

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
Stored in userStore
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

### 12.1 Helmet

`helmet()` is used to apply standard HTTP security headers.

These headers provide additional browser-level protection and help reduce exposure to common web security risks.

### 12.2 CORS

CORS is currently configured using the default permissive configuration:

```javascript
cors()
```

This is intentional for Part 1 local testing because the final frontend origin is not yet established.

In Part 2, CORS will be restricted to the known HustleHub+ frontend origin rather than permitting requests from arbitrary origins.

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

---

## 17. Setup and Running Locally

### 17.1 Install Dependencies

```bash
npm install
```

### 17.2 Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and provide a strong `JWT_SECRET`.

A random secret can be generated with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 17.3 Generate the Development Certificate

```bash
npm run gen-cert
```

This creates the local SSL certificate and private key inside the `certs/` directory.

### 17.4 Start the Server

```bash
npm start
```

For development with automatic reloading:

```bash
npm run dev
```

The API is available at:

```text
https://localhost:5443
```

Because the development certificate is self-signed, browsers and API clients may display a certificate warning. This is expected for local development.

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

## 23. Known Dependency Advisory

At the time of Part 1 development, `npm audit` reports three moderate-severity advisories involving the `qs` package, which is pulled in transitively through the Express/body-parser dependency chain.

No compatible non-breaking fix was available at the time of testing. Running:

```bash
npm audit fix --force
```

would require a major Express version change and could introduce breaking changes.

For this reason, the dependency was not force-upgraded immediately before submission without full regression testing.

The advisory will be reviewed again during Parts 2 and 3, when dependency updates can be tested alongside the broader application.

---

## 24. Roadmap

### Part 2

Planned functionality includes:

* MongoDB persistence
* Mongoose integration
* Gig CRUD
* Booking functionality
* Transaction records
* Income tracking
* Role-based access control
* React frontend
* Rate limiting
* Restricted CORS configuration
* Content Security Policy
* Newman API testing
* Frontend testing

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

---

# AI Disclosure

## Annexure: Disclosure of AI Usage in my Assessment

### Generative AI Use

| Section(s) within the Assessment         | AI Tool Used     | Purpose / Intention Behind Use                                                                                                                                                                                                                                                                                                      | Date(s) Used     | Link to AI Chat                                                |
| ---------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------- |
| Part 1 – Documentation / Mermaid Diagram | ChatGPT (OpenAI) | Guidance on creating and structuring a Mermaid diagram for the HustleHub+ system documentation. ChatGPT was used to explain Mermaid diagram syntax, structure, and how to represent the required system components and relationships. The generated guidance was reviewed and adapted by me for the requirements of the assessment. | 7 September 2026 | https://chatgpt.com/share/6a9f21f7-ef64-83ea-9afc-16ef74f979e9 |

### Statement of Responsible AI Use

ChatGPT was used as a supporting tool during the development of the assessment. Its use was limited to obtaining guidance and explanations relating to the structure and implementation of a Mermaid diagram for the HustleHub+ documentation. The AI-generated guidance was reviewed, interpreted, and adapted to suit the requirements of the assessment. The final assessment work, decisions, implementation, and documentation remain my responsibility.

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
