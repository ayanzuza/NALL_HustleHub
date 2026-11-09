// @vitest-environment jsdom
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import Register from './pages/Register';

// Mock react-router-dom hooks and components
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

afterEach(() => {
  cleanup();
});

describe('Register Page Validation Tests', () => {
  it('renders registration form fields correctly', () => {
    render(<Register />);

    expect(screen.getByText('Create HustleHub Account')).toBeInTheDocument();
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('displays error message when submitting empty fields', () => {
    render(<Register />);

    const submitBtn = screen.getByRole('button', { name: /^register$/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText('All fields are required.')).toBeInTheDocument();
  });
});