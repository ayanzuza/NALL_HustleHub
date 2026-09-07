HUSTLE HUB+
1.	System Overview
HustleHub+ is a safe freelance marketplace that links employers and independent contractors. Freelancers will be able to promote their services, while clients will be able to peruse and reserve freelancing services. Along with recording financial transactions related to reservations, the platform is designed to give users information about their income and expected tax requirements.
Security is seen as a fundamental requirement rather than a feature introduced later in development because HustleHub+ processes sensitive data, such as user passwords, authentication information, transactional records, and income-related information.
The platform's secure backend is established in Part 1. Node.js and Express are used to create the backend, which provides REST API endpoints for user registration, authentication, and access to verified user data. Since the POE allows local in-memory or file-based storage prior to the introduction of a database in a later stage, the current implementation's usage of an in-memory user store is suitable for Part 1.
Routes, controllers, middleware, validation tools, configuration, and data storage make up the layered structure of the backend. This division makes it possible to manage authentication, validation, and error handling duties separately, which enhances maintainability and makes it simpler to find and examine security controls.

2.	Intended Users
The two main marketplace user roles that HustleHub+ is built around are:
Customers
The site is used by clients to locate and reserve freelancers' services. The client role is depicted during user authentication and registration in Part 1.
Independent contractors
The site is used by freelancers to promote their services and eventually get reservations from customers. During registration and authentication, the freelancer role is also portrayed.

Additionally, an administrator role is recognized internally by the backend. Nevertheless, users cannot self-register as administrators using the Part 1 registration validator. Only client and freelancer roles are allowed to register.
Because privileged positions shouldn't be freely assignable through an unrestricted public registration endpoint, this distinction is crucial for security.

3.	Backend Architecture
An Express-based REST architecture powers the HustleHub+ backend.
The components of the primary application are as follows:
Component	Responsibility
app.js	Configures routes, error handling, request processing, Express, security middleware.
server.js	Builds the HTTPS server and loads the private key and SSL certificate.
routes/	Adds middleware that is particular to a given route and defines API endpoints.
controllers/	Includes user authentication, login, and registration.
middleware/		Offers error management, validation-result processing, and authentication.
utils/validators.js	Specifies rules for login and registration validation.
models/userStore.js	Supplies the in-memory user storage for Part 1.
config/env.js	Loads the environment settings and keeps the necessary secrets safe.
certs/	Includes the development SSL certificate and key that were created locally.
postman/	Includes the Postman collection from Part 1, which is used to test the API.

Middleware can be applied globally or to specific routes thanks to Express's support for both application-level and router-level middleware. This is exactly the same structure as HustleHub+, where authentication and validation are linked to the routes that need them and security middleware is applied at the application level. (Express.js, 2026)


4.	Request and Processing Flow
A regulated processing sequence is followed while submitting a request to the HustleHub+ backend.
General request flow
Client/Postman
↓
HTTPS
↓
Express application
↓
Security and request middleware
↓
Route
↓
Validation middleware
↓
Authentication middleware where required
↓
Controller
↓
In-memory user store
↓
Controlled JSON response

This kind of layered request processing is suitable for an Express API since Express's middleware concept is especially made to enable various processing functions to run throughout a request-response cycle. (Express.js, 2026)





5.	API Routes
The following relevant endpoints are exposed by the Part 1 backend:
Method	Endpoint	Purpose	Authentication
GET	/api/health	Determines if the API is operational.	Not required
POST	/api/auth/register	Creates a new user account.	Not required
POST	/api/auth/login	Verifies an existing user's identity.	Not required
GET	/api/users/me	Retrieves the data of the verified user.	JWT required

It is evident that authentication is not regarded as a one-time login event because public authentication endpoints and protected user endpoints are kept apart. Rather, access to protected resources is then managed using authentication credentials.

6.	Password Security and Hashing
Passwords are not kept in plaintext on HustleHub+.
The bcryptjs library is used to process the password entered during registration:
User password
      ↓
bcrypt hashing
      ↓
Password hash
      ↓
Stored in userStore

The application makes use of:
12 rounds of bcrypt salt
Instead of the original password, the generated password hash is saved as passwordHash.
Since a password shouldn't be kept in plaintext, this is a crucial security measure. Instead of directly storing passwords, OWASP advises utilizing specialized password-hashing algorithms like Argon2id, bcrypt, or PBKDF2. Password hashing is better than encryption, according to OWASP, because the original password cannot be easily obtained by reversing the hash. (OWASP, 2026)
HustleHub+ does not decrypt or retrieve a stored password during login. Rather, the cached password hash and the password entered at login are compared by bcrypt:
Submitted password
       ↓
bcrypt.compare()
       ↓
Stored password hash
       ↓
Match / no match

Only when the comparison succeeds does the application issue a JWT.
This means that the authentication process does not require the application to retain the user's plaintext password.

7.	JWT-Based Authentication
HustleHub+ creates a JSON Web Token (JWT) following successful authentication.
The JWT includes the user's:
•	ID 
•	role
The server-side JWT_SECRET environment variable is used to sign the token, which has an adjustable expiration period (the current default is one hour).
Because JWT offers a concise technique for conveying claims between parties, it is suitable for the Part 1 authentication requirement. JWT is a small, URL-safe representation of claims that can be digitally signed or otherwise integrity safeguarded, according to the IETF's RFC 7519. (RFC 7519, 2015)
JWT authentication flow:
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
Valid token → request proceeds
Invalid token → HTTP 401


8.	JWT Protection of Routes
Instead of being carried out within the controller itself, JWT authentication is implemented as route middleware.
The route that is protected is:
GET /api/users/me
Because of the way the route is set up, the authentication middleware runs before the controller:
GET /api/users/me
        ↓
authenticate
        ↓
JWT verification
        ↓
me controller

Because authentication becomes a reusable middleware control that can be connected to more protected routes as the application grows, this is better than putting authentication code inside each individual controller.
For this kind of route-specific processing, Express enables middleware at the router level. (Express.js, 2026)

9.	Input Validation
Part 1 validates all user input submitted through the implemented registration and login endpoints.
For this, HustleHub+ makes use of express-validator. For verifying and cleaning incoming request data, the library offers Express middleware. (Express-validator, 2026)

Validation of registration
The endpoint for registration verifies:
•	The name is given.
•	The name has two to one hundred characters.
•	Only allowed characters are present in the name.
•	Email is given.
•	The email format is valid.
•	Email has become commonplace.
•	The password is given.
•	The password has eight to one hundred and twenty-eight characters.
•	There is an uppercase character in the password.
•	There is a lowercase character in the password.
•	There is a number in the password.
•	The password contains at least one special character.
•	When a role is given, it must be either client or independent contractor.

Validation of login
The endpoint for login verifies:
•	Email is given.
•	The email format is valid.
•	The email address is normalised.
•	The password is given.

Prior to the controller, the validation middleware runs. The request is denied with HTTP 400 Bad Request if validation is unsuccessful.
Because client-side validation can be circumvented by an attacker, OWASP advises using server-side validation and validating input as soon as possible. Additionally, it suggests establishing acceptable character sets, formats, and length limitations as needed. (OWASP, 2026)
As a result, HustleHub+'s validation method offers an extra security barrier between the application's authentication mechanism and untrusted external data.

10.	Request Size Protection
JSON and URL-encoded request bodies are limited to 10 KB by the backend:
express.json({ limit: '10kb' })
express.urlencoded({ limit: '10kb' })

This keeps the authentication API from processing request bodies that are too big.
This is especially important since APIs shouldn't accept an infinite amount of request data. As part of API input protection, OWASP's REST security guidelines advise establishing suitable request-size limitations. (OWASP, 2026)

11.	HTTPS Configuration
Instead of HTTP, HTTPS is used to deliver the HustleHub+ backend.
The server.js code loads a local SSL certificate and private key and makes use of Node.js's HTTPS functionality:
HTTPS client
     ↓
SSL/TLS encryption
     ↓
HustleHub+ Express API

If the necessary SSL certificate or private key cannot be located, the application will not launch. The project's certificate-generation script can be used to create the development certificate.
To construct HTTPS servers with TLS-related setup, including keys and certificates, Node.js offers https.createServer(). (Node.js, 2026)
Because JWTs and authentication credentials are sent between the client and API, HTTPS is especially crucial for HustleHub+. Sensitive data is less likely to be intercepted during network transmission when it is encrypted.


12.	Controlled Error Handling
Centralized error management is implemented by HustleHub+ by:
notFound 
error handler
Additionally, the application makes sure that the client is not immediately notified of unforeseen internal issues.
As an example, the API returns:
{
  "success": false,
  "message": "An unexpected error occurred"
}
for unforeseen server-side malfunctions.

During development, internal stack traces might be recorded server-side; however, the API response does not include them.
This is significant because error messages may inadvertently reveal details about the underlying workings of an application, such as:
•	Paths to files
•	Stack traces
•	Details on the framework
•	Details of internal implementation
•	Configuration details

As a result, the controlled error response establishes a distinction between the data that developers need for debugging and the data that API users should be able to access.

13.	Authentication Error Protection
The same generic error message is purposefully returned by the login procedure when either:
•	Either the password is wrong 
•	The email address is invalid.
The answer is:
Incorrect password or email
By doing this, it is prevented from needlessly disclosing which portion of the provided credentials was inaccurate.
Likewise, a generic response is used by the JWT middleware:
A token that is invalid or expires for authentication tokens that are not valid.

As a result, an attacker can gain less information from responses pertaining to authentication.
14.	Threat Notes
Threat 1: Credential Theft:
Users' real passwords may be revealed if the user store was compromised and unencrypted passwords were kept there.
Control: Before being stored, passwords are hashed using bcrypt.

Threat 2: Inadequate authentication
Without properly authenticating, a user might be able to access protected resources.
Control: JWT authentication middleware is used for protected routes, and a valid Bearer token is required for every request.

Threat 3: manipulation of tokens
A JWT's identity or job information could be altered by an attacker.
Control: The server-side JWT secret is used to sign and validate JWTs.

Threat 4: Incorrect or malevolent input
Attackers may send unexpected values to authentication endpoints.
Control: Prior to controller processing, server-side validation verifies the data format, length, allowable characters, and permitted role values. When feasible, OWASP prefers allowlist-style validation over server-side validation of untrusted input.

Threat 5: Interception of sensitive data
It is possible for credentials or authentication tokens sent over an unencrypted connection to be intercepted.
Control: A locally specified SSL certificate is used to serve the backend over HTTPS.

Threat 6: Error-related leakage of information
Implementation details may be revealed by comprehensive error messages or stack traces.
Control: Clients receive controlled answers without stack traces or file locations, and internal errors are managed centrally.

Threat 7: Excessive requests
To use up server resources, an attacker might submit request bodies that are excessively large.
Control: The maximum size of JSON and URL-encoded request bodies is 10 KB.

Threat 8: Increasing privileges by registering
It is possible for a malevolent user to try to register as an administrator.
Control: Only client and freelancer roles are accepted for public registration.

15.	Academic Security Conclusion
HustleHub+ is built on a security-focused foundation thanks to the Part 1 design. Password hashing, JWT-based authentication, server-side input validation, HTTPS, security headers, request-size limitations, environment-based secret management, and controlled error handling are all combined in the backend.
Before reaching sensitive application functionality, requests are subjected to security measures as part of the architecture's layered approach. Passwords are never kept in plaintext, input is verified on the server, protected routes demand a valid JWT, and internal failures are kept from being needlessly shown to API users.
Additionally, the design offers a good starting point for further development. The POE permits Part 1 to utilize an in-memory user store, but because the user storage layer and authentication controllers are separated, the storage mechanism can be changed to a database at a later time without significantly altering the authentication architecture.
As a result, the final design satisfies the immediate Part 1 needs while offering a structured basis for the extra transactional, marketplace, and security features that will be created in later sections.

Mermaid MERN Diagram:
<img width="1368" height="1819" alt="MERMIAD DIAGRAM drawio" src="https://github.com/user-attachments/assets/70e8a18b-7859-488a-9f2a-e6afb90d7959" />



References:
Express.js. 2026. Using middleware. [online] Available at: < https://expressjs.com/en/guide/using-middleware/ > [Accessed 1 September 2026]
Express.js. 2026. Routing. [online]. Available at: < https://expressjs.com/en/guide/routing/ > [Accessed 1 September 2026]
Express.js. 2026. Express middleware. [online] Available at: < https://expressjs.com/en/resources/middleware/ > [Accessed 1 September 2026]
Express-Validator. 2026. express-validator. [online] Available at: < https://express-validator.github.io/docs/ > [Accessed 1 September 2026]
Jones, M., Bradley, J. and Sakimura, N. 2015. RFC 7519: JSON Web Token (JWT).
Node.js. 2026. Node.js v26.8.1 documentation. [online]. Available at: < https://nodejs.org/api/https.html > [Accessed 1 September 2026]
OWASP. 2026. Input Validation Cheat Sheet. [online]. Available at: < https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet > [Accessed 1 September 2026]
OWASP. 2026. Password Storage Cheat Sheet. [online]. Available at: < https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet > [Accessed 1 September 2026]
OWASP. 2026. REST Security Cheat Sheet. [online]. Available at: < https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet > [Accessed 1 September 2026]
