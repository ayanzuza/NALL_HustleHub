// @vitest-environment jsdom
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import Booking from './pages/Booking';

// Mock react-router-dom hooks and components
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: '1' }),
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

afterEach(() => {
  cleanup();
});

describe('Booking Page Tests', () => {
  it('renders booking form or details correctly', () => {
    render(<Booking />);

    expect(screen.getByRole('button', { name: /book/i })).toBeInTheDocument();
  });
});