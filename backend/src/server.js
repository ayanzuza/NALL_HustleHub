const https = require('https');
const fs = require('fs');
const path = require('path');
const app = require('./app');
const { port, sslKeyPath, sslCertPath } = require('./config/env');

const keyPath = path.resolve(__dirname, '..', sslKeyPath);
const certPath = path.resolve(__dirname, '..', sslCertPath);

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.error(
    'SSL certificate/key not found. Run "npm run gen-cert" to generate a local development certificate before starting the server.'
  );
  process.exit(1);
}

const sslOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
};

https.createServer(sslOptions, app).listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`HustleHub+ API listening on https://localhost:${port}`);
});
