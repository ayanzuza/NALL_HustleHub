// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BookingActions from './components/BookingActions';
import StatusBadge from './components/StatusBadge';

const { patch } = vi.hoisted(() => ({ patch: vi.fn() }));
vi.mock('./api', () => ({ default: { patch }, errorMessage: () => 'Could not update booking', isUnauthorised: () => false }));

afterEach(() => { cleanup(); patch.mockReset(); });

describe('Booking approval controls', () => {
  const booking = { id: 'booking-1', status: 'pending' };

  it('lets a freelancer approve a pending booking and updates the parent', async () => {
    const onUpdated = vi.fn();
    const updated = { ...booking, status: 'approved' };
    patch.mockResolvedValue({ data: { data: { booking: updated } } });
    render(<BookingActions booking={booking} role="freelancer" onUpdated={onUpdated} onUnauthorised={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /approve/i }));
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/bookings/booking-1/approve', {}));
    expect(onUpdated).toHaveBeenCalledWith(updated);
  });

  it('lets a freelancer reject a pending booking', async () => {
    patch.mockResolvedValue({ data: { data: { booking: { ...booking, status: 'rejected' } } } });
    render(<BookingActions booking={booking} role="freelancer" onUpdated={vi.fn()} onUnauthorised={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /decline/i }));
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/bookings/booking-1/reject', {}));
  });

  it('lets a client cancel a pending booking but hides actions after a decision', () => {
    const { rerender } = render(<BookingActions booking={booking} role="client" onUpdated={vi.fn()} onUnauthorised={vi.fn()} />);
    expect(screen.getByRole('button', { name: /cancel request/i })).toBeInTheDocument();
    rerender(<BookingActions booking={{ ...booking, status: 'approved' }} role="client" onUpdated={vi.fn()} onUnauthorised={vi.fn()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('sends a cancellation request when a client cancels a pending booking', async () => {
    patch.mockResolvedValue({ data: { data: { booking: { ...booking, status: 'cancelled' } } } });
    render(<BookingActions booking={booking} role="client" onUpdated={vi.fn()} onUnauthorised={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel request/i }));
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/bookings/booking-1/cancel', {}));
  });

  it('renders a readable status badge', () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText('pending')).toBeInTheDocument();
  });
});
