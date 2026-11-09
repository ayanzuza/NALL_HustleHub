// @vitest-environment jsdom
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});

import api from './api';
import { AuthProvider } from './context/AuthContext';
import Gigs from './pages/Gigs';
import Booking from './pages/Booking';

const ok = (data) => Promise.resolve({ data: { success: true, data } });
const asUser = (role) =>
  localStorage.setItem('user', JSON.stringify({ id: 'u1', name: 'Tester', role }));
const gigs = [
  { id: 'g1', title: 'Logo design', description: 'A clean logo for you', category: 'design', price: 450 },
  { id: 'g2', title: 'Landing page', description: 'A fast landing page', category: 'development', price: 1200 },
  { id: 'g3', title: 'Poster layout', description: 'A bold event poster', category: 'design', price: 200 },
];

function renderGigs() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/gigs']}>
        <Routes><Route path="/gigs" element={<Gigs />} /></Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });
afterEach(cleanup);

describe('Marketplace', () => {
  it('is called Marketplace and filters by category', async () => {
    asUser('client');
    api.get.mockReturnValue(ok({ gigs }));
    renderGigs();
    expect(await screen.findByRole('heading', { name: 'Marketplace' })).toBeInTheDocument();
    expect(screen.getByText('Showing 3 of 3 gigs')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('group', { name: /filter by category/i })).getByRole('button', { name: 'development' }));
    expect(screen.getByText('Landing page')).toBeInTheDocument();
    expect(screen.queryByText('Logo design')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 1 of 3 gigs')).toBeInTheDocument();
  });

  it('sorts by price', async () => {
    asUser('client');
    api.get.mockReturnValue(ok({ gigs }));
    renderGigs();
    await screen.findByText('Logo design');
    fireEvent.change(screen.getByLabelText('Sort gigs'), { target: { value: 'low' } });
    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(['Poster layout', 'Logo design', 'Landing page']);
  });

  it('shows a friendly empty state', async () => {
    asUser('client');
    api.get.mockReturnValue(ok({ gigs: [] }));
    renderGigs();
    expect(await screen.findByText('No gigs yet')).toBeInTheDocument();
  });

  it('tells a freelancer how many booking requests are waiting', async () => {
    asUser('freelancer');
    api.get.mockImplementation((url) =>
      url === '/bookings' ? ok({ bookings: [{ id: 'b1' }, { id: 'b2' }] }) : ok({ gigs }));
    renderGigs();
    expect(await screen.findByText(/2 new booking requests waiting for your decision/i)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/bookings', { params: { status: 'pending' } });
  });

  it('shows no banner to clients', async () => {
    asUser('client');
    api.get.mockReturnValue(ok({ gigs }));
    renderGigs();
    await screen.findByText('Logo design');
    expect(screen.queryByText(/waiting for your decision/i)).not.toBeInTheDocument();
  });
});

describe('Booking confirmation', () => {
  it('shows the gig being booked and explains the request is pending approval', async () => {
    asUser('client');
    api.get.mockReturnValue(ok({ gig: gigs[0] }));
    api.post.mockReturnValue(ok({ booking: { id: 'b1', status: 'pending' } }));
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/booking/g1']}>
          <Routes><Route path="/booking/:id" element={<Booking />} /></Routes>
        </MemoryRouter>
      </AuthProvider>
    );
    expect(await screen.findByText('Logo design')).toBeInTheDocument();
    fireEvent.change(document.querySelector('input[type=date]'), { target: { value: '2026-11-20' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }));
    const dialog = await screen.findByRole('dialog', { name: /booking request sent/i });
    expect(dialog).toHaveTextContent(/pending/i);
    expect(dialog).toHaveTextContent(/freelancer has to approve/i);
  });
});
