import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage, isUnauthorised } from '../api';
import NavBar from '../components/NavBar';

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.get('/bookings'), api.get('/transactions')])
      .then(([b, t]) => {
        setBookings(b.data.data.bookings);
        setTransactions(t.data.data.transactions);
      })
      .catch((err) => (isUnauthorised(err) ? navigate('/login') : setError(errorMessage(err))));
  }, [navigate]);

  const th = 'text-left p-2 border-b';
  const td = 'p-2 border-b';

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        {error && <div role="alert" className="p-3 bg-red-100 text-red-700 text-sm rounded-lg">{error}</div>}

        <section>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Bookings</h1>
          {bookings.length === 0 ? (
            <p className="text-gray-600">No bookings yet.</p>
          ) : (
            <table className="w-full bg-white rounded-xl border">
              <thead><tr><th className={th}>Gig</th><th className={th}>Price</th><th className={th}>Status</th><th className={th}>Note</th></tr></thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}><td className={td}>{b.gigTitle}</td><td className={td}>R{b.price}</td><td className={td}>{b.status}</td><td className={td}>{b.note}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Transactions</h2>
          {transactions.length === 0 ? (
            <p className="text-gray-600">No transactions yet.</p>
          ) : (
            <table className="w-full bg-white rounded-xl border">
              <thead><tr><th className={th}>Reference</th><th className={th}>Amount</th><th className={th}>Status</th></tr></thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}><td className={td}>{t.reference}</td><td className={td}>R{t.amount}</td><td className={td}>{t.status}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
