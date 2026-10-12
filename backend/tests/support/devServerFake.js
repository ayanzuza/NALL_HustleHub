/**
 * Boots the REAL app over HTTPS but with in-memory model stand-ins, so the
 * Newman collection can be exercised with no MongoDB. For development/CI
 * smoke-testing only - the submission evidence run should use real MongoDB.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const Module = require('module');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-fake-server-secret';
process.env.RATE_LIMIT_AUTH_MAX = process.env.RATE_LIMIT_AUTH_MAX || '500';

const fake = require('./fakeModels');
for (const name of ['User', 'Gig', 'Booking', 'Transaction']) {
  const file = require.resolve(`../../src/models/${name}`);
  const mod = new Module(file);
  mod.filename = file;
  mod.exports = fake[name];
  mod.loaded = true;
  require.cache[file] = mod;
}

const app = require('../../src/app');
const root = path.resolve(__dirname, '..', '..');
const options = {
  key: fs.readFileSync(path.join(root, 'certs/key.pem')),
  cert: fs.readFileSync(path.join(root, 'certs/cert.pem')),
};
const port = process.env.PORT || 5443;
https.createServer(options, app).listen(port, () => {
  console.log(`[FAKE DB] HustleHub+ API on https://localhost:${port} (in-memory models, not MongoDB)`);
});
