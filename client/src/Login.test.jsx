// @vitest-environment jsdom
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import Login from './pages/Login';

// Mock react-router-dom hooks and components
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

// Mock AuthContext
vi.mock('./context/AuthContext', () => ({
  useAuth: () => ({
    login: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
});

describe('Login Page Validation Tests', () => {
  it('renders login form elements correctly', () => {
    render(<Login />);

    expect(screen.getByText('Login to HustleHub')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('displays error message when submitting empty credentials', () => {
    render(<Login />);

    const loginBtn = screen.getByRole('button', { name: /log in/i });
    fireEvent.click(loginBtn);

    expect(screen.getByText('Please enter both email and password.')).toBeInTheDocument();
  });
});