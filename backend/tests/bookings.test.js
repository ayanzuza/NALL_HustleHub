const request = require('supertest');
const app = require('../src/app');
const { Booking, Transaction } = require('./support/fakeModels');
const { registerUser, createAdmin, createGig, auth } = require('./support/helpers');

const book = (token, gigId, extra = {}) => request(app).post('/api/bookings').set(auth(token)).send({ gigId, ...extra });

describe('Bookings, transactions and income', () => {
  let fl; let other; let client; let gig;
  beforeEach(async () => {
    fl = await registerUser(app, 'freelancer');
    other = await registerUser(app, 'freelancer');
    client = await registerUser(app, 'client');
    gig = await createGig(app, fl.token, { price: 750.5 });
  });

  test('a client booking creates a booking AND a linked transaction with the correct parties and amount', async () => {
    const res = await book(client.token, gig.id, { note: 'Please start Monday' });
    expect(res.status).toBe(201);
    const { booking, transaction } = res.body.data;
    expect(booking.client).toBe(client.user.id);
    expect(booking.freelancer).toBe(fl.user.id);
    expect(booking.gigTitle).toBe(gig.title);
    expect(transaction.booking).toBe(booking.id);
    expect(transaction.client).toBe(client.user.id);
    expect(transaction.freelancer).toBe(fl.user.id);
    expect(transaction.amount).toBe(750.5);
    expect(transaction.status).toBe('simulated-paid');
    expect(transaction.reference).toMatch(/^TXN-[0-9A-F]{12}$/);
    expect(Transaction.__all()).toHaveLength(1);
  });

  test('the price always comes from the gig - a tampered amount in the body is ignored', async () => {
    const res = await book(client.token, gig.id, { price: 1, amount: 1 });
    expect(res.body.data.transaction.amount).toBe(750.5);
  });

  test('only clients can book: freelancers get 403, no records created', async () => {
    expect((await book(fl.token, gig.id)).status).toBe(403);
    expect((await book(other.token, gig.id)).status).toBe(403);
    expect(Booking.__all()).toHaveLength(0);
  });

  test('booking validation: bad id 400, unknown gig 404, paused gig 404, unauthenticated 401', async () => {
    expect((await book(client.token, 'nope')).status).toBe(400);
    expect((await book(client.token, '64b64b64b64b64b64b64b64b')).status).toBe(404);
    await request(app).put(`/api/gigs/${gig.id}`).set(auth(fl.token)).send({ status: 'paused' });
    expect((await book(client.token, gig.id)).status).toBe(404);
    expect((await request(app).post('/api/bookings').send({ gigId: gig.id })).status).toBe(401);
  });

  test('if the transaction cannot be saved, the booking is rolled back (no orphan booking)', async () => {
    const spy = jest.spyOn(Transaction, 'create').mockRejectedValueOnce(new Error('db down'));
    const res = await book(client.token, gig.id);
    spy.mockRestore();
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('An unexpected error occurred');
    expect(Booking.__all()).toHaveLength(0);
  });

  test('each role sees only its own bookings; admin sees all', async () => {
    const b = (await book(client.token, gig.id)).body.data.booking;
    const otherClient = await registerUser(app, 'client');
    const admin = await createAdmin(app);
    const ids = async (t) => (await request(app).get('/api/bookings').set(auth(t))).body.data.bookings.map((x) => x.id);
    expect(await ids(client.token)).toEqual([b.id]);
    expect(await ids(fl.token)).toEqual([b.id]);
    expect(await ids(other.token)).toEqual([]);
    expect(await ids(otherClient.token)).toEqual([]);
    expect(await ids(admin.token)).toEqual([b.id]);
  });

  test('a booking cannot be read by users who are not part of it (403)', async () => {
    const b = (await book(client.token, gig.id)).body.data.booking;
    const otherClient = await registerUser(app, 'client');
    expect((await request(app).get(`/api/bookings/${b.id}`).set(auth(client.token))).status).toBe(200);
    expect((await request(app).get(`/api/bookings/${b.id}`).set(auth(fl.token))).status).toBe(200);
    expect((await request(app).get(`/api/bookings/${b.id}`).set(auth(other.token))).status).toBe(403);
    expect((await request(app).get(`/api/bookings/${b.id}`).set(auth(otherClient.token))).status).toBe(403);
  });

  test('transactions are scoped to their participants', async () => {
    await book(client.token, gig.id);
    const count = async (t) => (await request(app).get('/api/transactions').set(auth(t))).body.data.transactions.length;
    expect(await count(client.token)).toBe(1);
    expect(await count(fl.token)).toBe(1);
    expect(await count(other.token)).toBe(0);
  });

  test('income is tracked per freelancer, summed accurately, and is freelancer-only', async () => {
    await book(client.token, gig.id);
    await book(client.token, gig.id);
    const income = await request(app).get('/api/income').set(auth(fl.token));
    expect(income.status).toBe(200);
    expect(income.body.data.totalIncome).toBe(1501);
    expect(income.body.data.transactionCount).toBe(2);
    const none = await request(app).get('/api/income').set(auth(other.token));
    expect(none.body.data.totalIncome).toBe(0);
    expect((await request(app).get('/api/income').set(auth(client.token))).status).toBe(403);
    expect((await request(app).get('/api/income')).status).toBe(401);
  });

  test('floating point prices sum without rounding drift (0.1 + 0.2)', async () => {
    const g1 = await createGig(app, fl.token, { price: 1.1 });
    const g2 = await createGig(app, fl.token, { price: 2.2 });
    await book(client.token, g1.id);
    await book(client.token, g2.id);
    const income = await request(app).get('/api/income').set(auth(fl.token));
    expect(income.body.data.totalIncome).toBe(3.3);
  });
});
