// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Income from './pages/Income';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('./api', () => ({ default: { get }, errorMessage: (err) => err.message || 'Unable to load data', isUnauthorised: () => false }));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('./components/NavBar', () => ({ default: () => <nav>Navigation</nav> }));

const income = { totalIncome: 1250, pendingIncome: 300, transactionCount: 1, currency: 'ZAR', bookingStatusCounts: { pending: 2, approved: 1, completed: 1, rejected: 0, cancelled: 0 }, transactions: [] };
const tax = { taxYear: 2027, taxYearLabel: '2027', grossIncome: 1250, estimatedTax: 0, netIncome: 1250, effectiveTaxRate: 0, transactionCount: 1, availableTaxYears: [2026, 2027], monthly: [{ month: '2026-03', income: 1250, estimatedTax: 0, netIncome: 1250 }], assumptions: ['Estimate only.'] };

beforeEach(() => { get.mockReset(); });
afterEach(cleanup);

describe('Income dashboard', () => {
  it('shows loading then income, tax, chart and booking counts', async () => {
    get.mockImplementation((url) => Promise.resolve({ data: { data: url === '/income' ? income : tax } }));
    render(<Income />);
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    expect(await screen.findByText(/income & tax overview/i)).toBeInTheDocument();
    expect(screen.getByText(/gross income/i)).toBeInTheDocument();
    expect(screen.getByText(/estimated tax/i)).toBeInTheDocument();
    expect(screen.getByText(/bookings by status/i)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows a friendly error and retry control when loading fails', async () => {
    get.mockRejectedValue(new Error('Service temporarily unavailable'));
    render(<Income />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/temporarily unavailable/i);
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows an empty income message when there are no transactions', async () => {
    get.mockImplementation((url) => Promise.resolve({ data: { data: url === '/income' ? { ...income, transactions: [], transactionCount: 0, totalIncome: 0, bookingStatusCounts: { pending: 0, approved: 0, completed: 0, rejected: 0, cancelled: 0 } } : { ...tax, grossIncome: 0, monthly: [] } } }));
    render(<Income />);
    expect(await screen.findByText(/no recorded income in this tax year yet/i)).toBeInTheDocument();
    expect(screen.getByText(/no bookings yet/i)).toBeInTheDocument();
  });
});
