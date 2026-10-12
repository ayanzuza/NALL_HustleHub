const mongoose = require('mongoose');
const { mongoUri } = require('./env');

async function connectDb() {
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
  // eslint-disable-next-line no-console
  console.log('MongoDB connected');
}

module.exports = { connectDb };
