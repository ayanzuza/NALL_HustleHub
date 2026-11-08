// Limits are read at startup, so set a tiny one BEFORE the app is loaded.
process.env.RATE_LIMIT_BOOKING_MAX = '1';

const request = require('supertest');
const app = require('../src/app');
const { logger } = require('../src/utils/logger');
const { registerUser, createGig, auth } = require('./support/helpers');

test('rate-limit hits are logged as warnings with the limiter name and path', async () => {
  const spy = jest.spyOn(logger, 'log');
  const fl = await registerUser(app, 'freelancer');
  const client = await registerUser(app, 'client');
  const gig = await createGig(app, fl.token);
  const book = () => request(app).post('/api/bookings').set(auth(client.token)).send({ gigId: gig.id });
  expect((await book()).status).toBe(201);
  expect((await book()).status).toBe(429);
  const hit = spy.mock.calls.map(([level, event, meta]) => ({ level, event, ...meta })).find((e) => e.event === 'ratelimit.exceeded');
  spy.mockRestore();
  expect(hit).toMatchObject({ level: 'warn', limiter: 'booking', path: '/api/bookings' });
});
