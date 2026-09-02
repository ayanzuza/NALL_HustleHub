const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { nodeEnv } = require('./config/env');

const app = express();

// Security headers (CSP, HSTS, X-Frame-Options, etc.) applied to
// every response. Full CSP tuning for the frontend happens in Part 2.
app.use(helmet());

app.use(cors());

// Cap request body size to reduce risk of oversized-payload abuse.
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

if (nodeEnv !== 'test') {
  app.use(morgan(nodeEnv === 'development' ? 'dev' : 'combined'));
}

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'HustleHub+ API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
