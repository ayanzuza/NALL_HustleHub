import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import api, { errorMessage, isUnauthorised } from '../api';
import { useAuth } from '../context/AuthContext';
import NavBar from '../components/NavBar';

export default function Gigs() {
  const [gigs, setGigs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    let cancelled = false;
    api
      .get('/gigs')
      .then((res) => { if (!cancelled) setGigs(res.data.data.gigs); })
      .catch((err) => {
        if (cancelled) return;
        if (isUnauthorised(err)) navigate('/login');
        else setError(errorMessage(err));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [navigate]);

  const term = searchTerm.toLowerCase();
  const filteredGigs = gigs.filter(
    (gig) =>
      gig.title.toLowerCase().includes(term) ||
      gig.description.toLowerCase().includes(term) ||
      gig.category.toLowerCase().includes(term)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-5xl mx-auto p-6">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Explore Marketplace Gigs</h1>
            <p className="text-gray-600 mt-1">Connect with skilled student freelancers on HustleHub.</p>
          </div>
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search services or categories..."
              className="w-full pl-10 pr-4 py-2 border rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </header>

        {error && <div role="alert" className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded-lg">{error}</div>}
        {loading && <p className="text-gray-600">Loading gigs…</p>}
        {!loading && !error && filteredGigs.length === 0 && <p className="text-gray-600">No gigs found.</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGigs.map((gig) => (
            <div key={gig.id} className="bg-white rounded-xl shadow-sm border p-6 flex flex-col justify-between hover:shadow-md transition">
              <div>
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">{gig.category}</span>
                <h3 className="text-lg font-bold text-gray-800 mt-3">{gig.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{gig.description}</p>
              </div>
              <div className="mt-6 pt-4 border-t flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900">R{gig.price}</span>
                {user?.role === 'client' && (
                  <button
                    onClick={() => navigate(`/booking/${gig.id}`)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                  >
                    Book Service
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
