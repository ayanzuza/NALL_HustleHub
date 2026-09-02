require('dotenv').config();

// Fail fast if critical secrets are missing rather than silently
// falling back to an insecure default.
const required = ['JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    // eslint-disable-next-line no-console
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

module.exports = {
  port: process.env.PORT || 5443,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  sslKeyPath: process.env.SSL_KEY_PATH || 'certs/key.pem',
  sslCertPath: process.env.SSL_CERT_PATH || 'certs/cert.pem',
};
