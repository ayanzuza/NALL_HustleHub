import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function Booking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleBooking = (e) => {
    e.preventDefault();
    if (!date) return;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Book Service #{id}</h2>
        <p className="text-sm text-gray-600 mb-6">Confirm details to schedule your service with the freelancer.</p>

        {submitted ? (
          <div className="bg-green-50 border border-green-200 text-green-800 p-6 rounded-xl text-center space-y-3">
            <h3 className="font-bold text-lg">Booking Request Sent!</h3>
            <p className="text-sm">Your booking for {date} has been placed successfully.</p>
            <button
              onClick={() => navigate('/gigs')}
              className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition"
            >
              Return to Marketplace
            </button>
          </div>
        ) : (
          <form onSubmit={handleBooking} className="space-y-4">
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
  );
}
