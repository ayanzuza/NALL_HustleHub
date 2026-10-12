// @vitest-environment jsdom
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});

import api from './api';
import { AuthProvider } from './context/AuthContext';
import RequireAuth from './components/RequireAuth';
import Login from './pages/Login';
import Register from './pages/Register';
import Gigs from './pages/Gigs';
import Booking from './pages/Booking';
import MyGigs from './pages/MyGigs';

const ok = (data) => Promise.resolve({ data: { success: true, data } });
const fail = (status, message) =>
  Promise.reject({ response: { status, data: { success: false, message } } });

function renderAt(path, routes) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>{routes}</Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}
const asUser = (role) =>
  localStorage.setItem('user', JSON.stringify({ id: 'u1', name: 'Tester', role }));

beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });
afterEach(cleanup);

describe('Login (wired to the API)', () => {
  const routes = [
    <Route key="l" path="/login" element={<Login />} />,
    <Route key="g" path="/gigs" element={<p>Gigs page</p>} />,
  ];

  it('posts credentials, stores the JWT and goes to the gigs page', async () => {
    api.post.mockReturnValue(ok({ token: 'jwt-1', user: { id: 'u1', name: 'Ada', role: 'client' } }));
    renderAt('/login', routes);
    fireEvent.change(document.querySelector('input[type=email]'), { target: { value: 'ada@example.com' } });
    fireEvent.change(document.querySelector('input[type=password]'), { target: { value: 'StrongPass1!' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));
    expect(await screen.findByText('Gigs page')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'ada@example.com', password: 'StrongPass1!' });
    expect(localStorage.getItem('token')).toBe('jwt-1');
  });

  it('shows the generic server error and stores no token on bad credentials', async () => {
    api.post.mockReturnValue(fail(401, 'Invalid email or password'));
    renderAt('/login', routes);
    fireEvent.change(document.querySelector('input[type=email]'), { target: { value: 'ada@example.com' } });
    fireEvent.change(document.querySelector('input[type=password]'), { target: { value: 'WrongPass1!' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));
    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
  });
});

describe('Register (wired to the API)', () => {
  const routes = [
    <Route key="r" path="/register" element={<Register />} />,
    <Route key="l" path="/login" element={<p>Login page</p>} />,
  ];
  const fill = (password) => {
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Bo' } });
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'bo@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
    fireEvent.click(screen.getByRole('button', { name: /^register$/i }));
  };

  it('blocks a weak password without calling the API', async () => {
    renderAt('/register', routes);
    fill('weakpass');
    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('offers only client and freelancer roles, never admin', () => {
    renderAt('/register', routes);
    const values = [...screen.getByLabelText('Account Role').querySelectorAll('option')].map((o) => o.value);
    expect(values).toEqual(['client', 'freelancer']);
  });

  it('registers with the chosen role and moves to the login page', async () => {
    api.post.mockReturnValue(ok({ user: {}, token: 't' }));
    renderAt('/register', routes);
    fireEvent.change(screen.getByLabelText('Account Role'), { target: { value: 'freelancer' } });
    fill('StrongPass1!');
    expect(await screen.findByText('Login page')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/auth/register', {
      name: 'Bo', email: 'bo@example.com', password: 'StrongPass1!', role: 'freelancer',
    });
  });
});

describe('Gigs (wired to the API)', () => {
  const gig = { id: 'g1', title: 'Logo design', description: 'A clean logo for you', category: 'design', price: 450, status: 'active' };
  const routes = [<Route key="g" path="/gigs" element={<Gigs />} />];

  it('shows gigs from the API and a Book button to clients', async () => {
    asUser('client');
    api.get.mockReturnValue(ok({ gigs: [gig] }));
    renderAt('/gigs', routes);
    expect(await screen.findByText('Logo design')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /book service/i })).toBeInTheDocument();
  });

  it('does not offer booking to freelancers', async () => {
    asUser('freelancer');
    api.get.mockReturnValue(ok({ gigs: [gig] }));
    renderAt('/gigs', routes);
    expect(await screen.findByText('Logo design')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /book service/i })).not.toBeInTheDocument();
  });

  it('renders script-like gig text as inert text, not HTML', async () => {
    asUser('client');
    api.get.mockReturnValue(ok({ gigs: [{ ...gig, title: '<img src=x onerror=alert(1)>' }] }));
    const { container } = renderAt('/gigs', routes);
    expect(await screen.findByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('Booking (wired to the API)', () => {
  it('sends only gigId and a note, then shows the transaction reference', async () => {
    asUser('client');
    api.post.mockReturnValue(ok({ booking: { id: 'b1' }, transaction: { reference: 'TXN-ABC', amount: 450 } }));
    renderAt('/booking/g1', [<Route key="b" path="/booking/:id" element={<Booking />} />]);
    fireEvent.change(document.querySelector('input[type=date]'), { target: { value: '2026-11-01' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }));
    expect(await screen.findByText('TXN-ABC')).toBeInTheDocument();
    const [url, body] = api.post.mock.calls[0];
    expect(url).toBe('/bookings');
    expect(Object.keys(body).sort()).toEqual(['gigId', 'note']);
    expect(body.gigId).toBe('g1');
  });

  it('shows the server message when booking is rate limited', async () => {
    asUser('client');
    api.post.mockReturnValue(fail(429, 'Too many booking attempts'));
    renderAt('/booking/g1', [<Route key="b" path="/booking/:id" element={<Booking />} />]);
    fireEvent.change(document.querySelector('input[type=date]'), { target: { value: '2026-11-01' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/too many/i);
  });
});

describe('Role-based routes', () => {
  const routes = [
    <Route key="l" path="/login" element={<p>Login page</p>} />,
    <Route key="m" path="/my-gigs" element={<RequireAuth roles={['freelancer']}><MyGigs /></RequireAuth>} />,
  ];

  it('redirects a logged-out visitor to login', () => {
    renderAt('/my-gigs', routes);
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('blocks a client from the freelancer page', () => {
    asUser('client');
    renderAt('/my-gigs', routes);
    expect(screen.getByRole('alert')).toHaveTextContent(/do not have access/i);
  });

  it('lets a freelancer create a gig with a numeric price', async () => {
    asUser('freelancer');
    api.get.mockReturnValue(ok({ gigs: [] }));
    api.post.mockReturnValue(ok({ gig: {} }));
    renderAt('/my-gigs', routes);
    fireEvent.change(await screen.findByLabelText('Title'), { target: { value: 'API work' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Build a REST API for you' } });
    fireEvent.change(screen.getByLabelText('Price (ZAR)'), { target: { value: '900' } });
    fireEvent.click(screen.getByRole('button', { name: /create gig/i }));
    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(api.post.mock.calls[0][0]).toBe('/gigs');
    expect(api.post.mock.calls[0][1].price).toBe(900);
  });
});
