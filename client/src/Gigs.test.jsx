// @vitest-environment jsdom
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import Gigs from './pages/Gigs';

// Mock react-router-dom hooks and components
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

afterEach(() => {
  cleanup();
});

describe('Gigs Page Tests', () => {
  it('renders gigs search and heading correctly', () => {
    render(<Gigs />);

    expect(screen.getByText(/explore available gigs/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search gigs/i)).toBeInTheDocument();
  });
});