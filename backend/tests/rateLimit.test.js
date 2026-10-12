// Limits are read at startup, so set tiny ones BEFORE the app is loaded.
process.env.RATE_LIMIT_AUTH_MAX = '3';
process.env.RATE_LIMIT_BOOKING_MAX = '2';

const request = require('supertest');
const app = require('../src/app');
const { registerUser, createGig, auth, PASSWORD } = require('./support/helpers');

describe('Rate limiting', () => {
  test('booking endpoint: requests beyond the limit get 429 with a clear message', async () => {
    const fl = await registerUser(app, 'freelancer'); // auth hit 1
    const client = await registerUser(app, 'client'); // auth hit 2
    const gig = await createGig(app, fl.token);
    const book = () => request(app).post('/api/bookings').set(auth(client.token)).send({ gigId: gig.id });
    expect((await book()).status).toBe(201);
    expect((await book()).status).toBe(201);
    const blocked = await book();
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ success: false, message: 'Too many booking requests. Please try again later.' });
    expect(blocked.headers['ratelimit-limit']).toBe('2');
  });

  test('auth endpoints: brute-force attempts get 429', async () => {
    const attempt = () => request(app).post('/api/auth/login').send({ email: 'a@b.com', password: PASSWORD });
    expect((await attempt()).status).toBe(401); // auth hit 3 (limit is 3)
    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toBe('Too many authentication attempts. Please try again later.');
  });
});
