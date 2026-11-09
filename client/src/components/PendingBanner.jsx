import { Link } from 'react-router-dom';

/**
 * Shown to freelancers when clients are waiting for their decision.
 * Presentational only: the caller works out the count from the API.
 */
export default function PendingBanner({ count, linkToBookings = false }) {
  if (!count) return null;
  const plural = count === 1 ? 'request' : 'requests';
  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900"
    >
      <div>
        <p className="font-semibold">
          {count} new booking {plural} waiting for your decision
        </p>
        <p className="text-sm">
          A client wants to book you. Approve to confirm the job and record the payment, or reject to decline.
        </p>
      </div>
      {linkToBookings && (
        <Link
          to="/bookings"
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
        >
          Review requests
        </Link>
      )}
    </div>
  );
}
