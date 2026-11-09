import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { errorMessage, isUnauthorised } from '../api';
import NavBar from '../components/NavBar';

export default function Booking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [gig, setGig] = useState(null);

  // Show what is being booked (title and price come from the server).
  useEffect(() => {
    let cancelled = false;
    Promise.resolve(api.get(`/gigs/${id}`))
      .then((res) => { if (!cancelled && res?.data?.data?.gig) setGig(res.data.data.gig); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!date) return;
    setError('');
    try {
      // Only the gig id and a note are sent. The price and the parties come from the server.
      const note = `Preferred date: ${date}.${notes.trim() ? ` ${notes.trim()}` : ''}`.slice(0, 500);
      const res = await api.post('/bookings', { gigId: id, note });
      setResult(res.data.data);
      setSubmitted(true);
    } catch (err) {
      if (isUnauthorised(err)) navigate('/login');
      else setError(errorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="p-6 flex items-center justify-center">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Book Service</h2>
        <p className="text-sm text-gray-600 mb-4">Send a booking request. The freelancer must approve it before it is confirmed.</p>
        {gig && (
          <div className="mb-6 rounded-lg border bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 capitalize">{gig.category}</p>
            <p className="mt-1 font-semibold text-gray-900">{gig.title}</p>
            <p className="mt-1 text-sm text-gray-600">Price: <strong>R{gig.price}</strong> (simulated payment, charged only if approved)</p>
          </div>
        )}

        {submitted ? (
          <div role="dialog" aria-label="Booking request sent" className="bg-green-50 border border-green-200 text-green-800 p-6 rounded-xl text-center space-y-3">
            <h3 className="font-bold text-lg">Booking Request Sent!</h3>
            <p className="text-sm">Your request for {date} is now <strong>pending</strong>. The freelancer has to approve it before it is confirmed and the payment is recorded.</p>
            <p className="text-sm">Track it under <strong>Bookings</strong>. You can cancel it while it is still pending.</p>
            {result?.transaction && (
              <p className="text-sm">Transaction <strong>{result.transaction.reference}</strong>: R{result.transaction.amount}</p>
            )}
            <button
              onClick={() => navigate('/bookings')}
              className="mt-4 mr-2 bg-white border border-green-600 text-green-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-100 transition"
            >
              View my bookings
            </button>
            <button
              onClick={() => navigate('/gigs')}
              className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition"
            >
              Return to Marketplace
            </button>
          </div>
        ) : (
          <form onSubmit={handleBooking} className="space-y-4">
            {error && <div role="alert" className="p-3 bg-red-100 text-red-700 text-sm rounded-lg">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date</label>
              <input
                type="date"
                required
                className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Instructions / Requirements</label>
              <textarea
                rows="4"
                placeholder="Provide details about what you need built or completed..."
                className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/gigs')}
                className="w-1/2 border text-gray-700 py-2.5 rounded-lg hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition"
              >
                Confirm Booking
              </button>
            </div>
          </form>
        )}
      </div>
      </div>
    </div>
  );
}