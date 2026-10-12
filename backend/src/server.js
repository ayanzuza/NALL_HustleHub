require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose'); // <--- 1. Import mongoose
const app = require('./app');
const { port, sslKeyPath, sslCertPath, mongoUri } = require('./config/env'); // <--- Make sure mongoUri is imported from config

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

// 2. Connect to MongoDB before starting the server
mongoose.connect(process.env.MONGO_URI || mongoUri)
  .then(() => {
    console.log('MongoDB Connected Successfully');
    
    // 3. Start HTTPS server only after DB connects
    https.createServer(sslOptions, app).listen(port, () => {
      console.log(`HustleHub+ API listening on https://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });