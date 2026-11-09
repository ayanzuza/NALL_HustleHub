
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage, isUnauthorised } from '../api';
import { useAuth } from '../context/AuthContext';
import NavBar from '../components/NavBar';
import BookingActions from '../components/BookingActions';
import StatusBadge from '../components/StatusBadge';
import PendingBanner from '../components/PendingBanner';

const money = (value) =>
  new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(Number(value || 0));

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { user } = useAuth();
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [bookingResponse, transactionResponse] = await Promise.all([
        api.get('/bookings'),
        api.get('/transactions'),
      ]);

      setBookings(bookingResponse.data.data.bookings || []);
      setTransactions(transactionResponse.data.data.transactions || []);
    } catch (err) {
      if (isUnauthorised(err)) {
        navigate('/login');
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

 useEffect(() => {
  let cancelled = false;

  const fetchInitialData = async () => {
    try {
      const [bookingResponse, transactionResponse] = await Promise.all([
        api.get('/bookings'),
        api.get('/transactions'),
      ]);

      if (!cancelled) {
        setBookings(bookingResponse.data.data.bookings || []);
        setTransactions(transactionResponse.data.data.transactions || []);
      }
    } catch (err) {
      if (!cancelled) {
        if (isUnauthorised(err)) {
          navigate('/login');
        } else {
          setError(errorMessage(err));
        }
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  };

  fetchInitialData();

  return () => {
    cancelled = true;
  };
}, [navigate]);

  // Refresh the data after a booking action succeeds.
  const handleBookingUpdated = () => {
    loadData();
  };

  const handleUnauthorised = () => {
    navigate('/login');
  };

  const th =
    'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500';

  const td = 'px-4 py-4 text-sm text-slate-700';

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Page heading */}
        <section>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Bookings
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Manage booking requests and view transaction records.
          </p>
        </section>

        {user?.role === 'freelancer' && (
          <PendingBanner count={bookings.filter((b) => b.status === 'pending').length} />
        )}

        {/* Error state */}
        {error && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm text-red-700">{error}</p>

            <button
              type="button"
              onClick={loadData}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-slate-200 bg-white p-8 text-center"
          >
            <p className="text-sm font-medium text-slate-600">
              Loading your bookings and transactions...
            </p>
          </div>
        ) : (
          <>
            {/* Bookings section */}
            <section aria-labelledby="bookings-heading">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2
                    id="bookings-heading"
                    className="text-xl font-bold text-slate-900"
                  >
                    Booking requests
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Review and manage your booking requests.
                  </p>
                </div>

                <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
                  {bookings.length} {bookings.length === 1 ? 'booking' : 'bookings'}
                </span>
              </div>

              {bookings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
                  <h3 className="font-semibold text-slate-800">
                    No bookings yet
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Your booking requests will appear here when they become available.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th scope="col" className={th}>Gig</th>
                          <th scope="col" className={th}>Price</th>
                          <th scope="col" className={th}>Status</th>
                          <th scope="col" className={th}>Note</th>
                          <th scope="col" className={th}>Actions</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {bookings.map((booking) => (
                          <tr
                            key={booking.id}
                            className="transition hover:bg-slate-50"
                          >
                            <td className={`${td} font-medium text-slate-900`}>
                              {booking.gigTitle || 'Untitled gig'}
                            </td>

                            <td className={td}>
                              {money(booking.price)}
                            </td>

                            <td className={td}>
                              <StatusBadge status={booking.status} />
                            </td>

                            <td className={`${td} max-w-xs whitespace-normal`}>
                              {booking.note || 'No additional note'}
                            </td>

                            <td className={td}>
                              <BookingActions
                                booking={booking}
                                role={user?.role}
                                onUpdated={handleBookingUpdated}
                                onUnauthorised={handleUnauthorised}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>

            {/* Transactions section */}
            <section aria-labelledby="transactions-heading">
              <div className="mb-4">
                <h2
                  id="transactions-heading"
                  className="text-xl font-bold text-slate-900"
                >
                  Transactions
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  View the payment records associated with your bookings.
                </p>
              </div>

              {transactions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
                  <h3 className="font-semibold text-slate-800">
                    No transactions yet
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Transaction records will appear here when available.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[550px] divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th scope="col" className={th}>Reference</th>
                          <th scope="col" className={th}>Amount</th>
                          <th scope="col" className={th}>Status</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {transactions.map((transaction) => (
                          <tr
                            key={transaction.id}
                            className="transition hover:bg-slate-50"
                          >
                            <td className={`${td} font-medium`}>
                              {transaction.reference || 'Not available'}
                            </td>

                            <td className={td}>
                              {money(transaction.amount)}
                            </td>

                            <td className={td}>
                              <StatusBadge status={transaction.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
