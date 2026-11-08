const request = require('supertest');
const app = require('../src/app');
const { Booking, Transaction } = require('./support/fakeModels');
const { registerUser, createAdmin, createGig, auth } = require('./support/helpers');

const act = (token, id, action, body = {}) => request(app).patch(`/api/bookings/${id}/${action}`).set(auth(token)).send(body);
const book = (token, gigId) => request(app).post('/api/bookings').set(auth(token)).send({ gigId });

describe('Booking approval workflow', () => {
  let fl; let otherFl; let client; let otherClient; let admin; let gig; let booking;
  beforeEach(async () => {
    fl = await registerUser(app, 'freelancer');
    otherFl = await registerUser(app, 'freelancer');
    client = await registerUser(app, 'client');
    otherClient = await registerUser(app, 'client');
    admin = await createAdmin(app);
    gig = await createGig(app, fl.token, { price: 1200 });
    booking = (await book(client.token, gig.id)).body.data.booking;
  });

  describe('approve', () => {
    test('the gig owner approves: booking becomes approved and a linked transaction is created', async () => {
      const res = await act(fl.token, booking.id, 'approve', { note: 'Happy to help' });
      expect(res.status).toBe(200);
      const { booking: b, transaction: t } = res.body.data;
      expect(b.status).toBe('approved');
      expect(b.decisionNote).toBe('Happy to help');
      expect(b.decidedAt).toBeDefined();
      expect(t.booking).toBe(booking.id);
      expect(t.client).toBe(client.user.id);
      expect(t.freelancer).toBe(fl.user.id);
      expect(t.amount).toBe(1200);
      expect(t.status).toBe('simulated-paid');
      expect(t.reference).toMatch(/^TXN-[0-9A-F]{12}$/);
      expect(Transaction.__all()).toHaveLength(1);
    });

    test('nobody else can approve it: other freelancer, client, admin (403) or anonymous (401)', async () => {
      expect((await act(otherFl.token, booking.id, 'approve')).status).toBe(403);
      expect((await act(client.token, booking.id, 'approve')).status).toBe(403);
      expect((await act(admin.token, booking.id, 'approve')).status).toBe(403);
      expect((await request(app).patch(`/api/bookings/${booking.id}/approve`)).status).toBe(401);
      expect(Booking.__all()[0].status).toBe('pending');
      expect(Transaction.__all()).toHaveLength(0);
    });

    test('approving twice is refused (409) and does not create a second transaction', async () => {
      expect((await act(fl.token, booking.id, 'approve')).status).toBe(200);
      expect((await act(fl.token, booking.id, 'approve')).status).toBe(409);
      expect(Transaction.__all()).toHaveLength(1);
    });

    test('two simultaneous approvals: exactly one wins, exactly one transaction exists', async () => {
      const results = await Promise.all([act(fl.token, booking.id, 'approve'), act(fl.token, booking.id, 'approve')]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
      expect(Transaction.__all()).toHaveLength(1);
    });

    test('if the transaction cannot be saved, the approval is rolled back to pending', async () => {
      const spy = jest.spyOn(Transaction, 'create').mockRejectedValueOnce(new Error('db down'));
      const res = await act(fl.token, booking.id, 'approve');
      spy.mockRestore();
      expect(res.status).toBe(500);
      expect(res.body.message).toBe('An unexpected error occurred');
      expect(Booking.__all()[0].status).toBe('pending');
      expect(Transaction.__all()).toHaveLength(0);
    });

    test('input checks: bad id 400, unknown booking 404, over-long or non-text note 400', async () => {
      expect((await act(fl.token, 'nope', 'approve')).status).toBe(400);
      expect((await act(fl.token, '64b64b64b64b64b64b64b64b', 'approve')).status).toBe(404);
      expect((await act(fl.token, booking.id, 'approve', { note: 'x'.repeat(501) })).status).toBe(400);
      expect((await act(fl.token, booking.id, 'approve', { note: { $gt: '' } })).status).toBe(400);
      expect(Booking.__all()[0].status).toBe('pending');
    });
  });

  describe('reject', () => {
    test('the gig owner rejects: no transaction is ever created and it cannot then be approved', async () => {
      const res = await act(fl.token, booking.id, 'reject', { note: 'Fully booked' });
      expect(res.status).toBe(200);
      expect(res.body.data.booking.status).toBe('rejected');
      expect(res.body.data.booking.decisionNote).toBe('Fully booked');
      expect(res.body.data.transaction).toBeUndefined();
      expect((await act(fl.token, booking.id, 'approve')).status).toBe(409);
      expect(Transaction.__all()).toHaveLength(0);
    });

    test('only the gig owner can reject', async () => {
      expect((await act(otherFl.token, booking.id, 'reject')).status).toBe(403);
      expect((await act(client.token, booking.id, 'reject')).status).toBe(403);
      expect((await act(admin.token, booking.id, 'reject')).status).toBe(403);
    });
  });

  describe('cancel', () => {
    test('the booking client can cancel while pending; the freelancer can then no longer approve', async () => {
      const res = await act(client.token, booking.id, 'cancel');
      expect(res.status).toBe(200);
      expect(res.body.data.booking.status).toBe('cancelled');
      expect((await act(fl.token, booking.id, 'approve')).status).toBe(409);
      expect(Transaction.__all()).toHaveLength(0);
    });

    test('other clients, freelancers and admins cannot cancel someone else\'s booking', async () => {
      expect((await act(otherClient.token, booking.id, 'cancel')).status).toBe(403);
      expect((await act(fl.token, booking.id, 'cancel')).status).toBe(403);
      expect((await act(admin.token, booking.id, 'cancel')).status).toBe(403);
    });

    test('an approved booking can no longer be cancelled (409) - the transaction stands', async () => {
      await act(fl.token, booking.id, 'approve');
      expect((await act(client.token, booking.id, 'cancel')).status).toBe(409);
      expect(Transaction.__all()).toHaveLength(1);
    });
  });

  describe('complete', () => {
    test('only an approved booking can be completed, and only by its freelancer', async () => {
      expect((await act(fl.token, booking.id, 'complete')).status).toBe(409); // still pending
      await act(fl.token, booking.id, 'approve');
      expect((await act(client.token, booking.id, 'complete')).status).toBe(403);
      expect((await act(otherFl.token, booking.id, 'complete')).status).toBe(403);
      const res = await act(fl.token, booking.id, 'complete');
      expect(res.status).toBe(200);
      expect(res.body.data.booking.status).toBe('completed');
      expect((await act(fl.token, booking.id, 'complete')).status).toBe(409); // final state
    });

    test('completing does not create another transaction', async () => {
      await act(fl.token, booking.id, 'approve');
      await act(fl.token, booking.id, 'complete');
      expect(Transaction.__all()).toHaveLength(1);
    });
  });

  test('unknown actions are not routes (404)', async () => {
    expect((await act(fl.token, booking.id, 'delete')).status).toBe(404);
    expect((await act(fl.token, booking.id, 'status', { status: 'approved' })).status).toBe(404);
  });
});
