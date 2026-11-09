import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import api, { errorMessage, isUnauthorised } from '../api';
import { useAuth } from '../context/AuthContext';
import NavBar from '../components/NavBar';
import PendingBanner from '../components/PendingBanner';

const money = (value) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(Number(value || 0));

const SORTS = {
  newest: 'Newest first',
  low: 'Price: low to high',
  high: 'Price: high to low',
};

export default function Gigs() {
  const [gigs, setGigs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('newest');
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role;

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

  // Freelancers see how many booking requests are waiting for them.
  useEffect(() => {
    if (role !== 'freelancer') return undefined;
    let cancelled = false;
    Promise.resolve(api.get('/bookings', { params: { status: 'pending' } }))
      .then((res) => {
        const list = res?.data?.data?.bookings;
        if (!cancelled && Array.isArray(list)) setPendingCount(list.length);
      })
      .catch(() => {}); // the banner is a convenience; never block the page
    return () => { cancelled = true; };
  }, [role]);

  const categories = useMemo(
    () => [...new Set(gigs.map((g) => g.category).filter(Boolean))].sort(),
    [gigs]
  );

  const term = searchTerm.toLowerCase();
  const filteredGigs = useMemo(() => {
    const list = gigs.filter(
      (gig) =>
        (category === 'all' || gig.category === category) &&
        (gig.title.toLowerCase().includes(term) ||
          gig.description.toLowerCase().includes(term) ||
          gig.category.toLowerCase().includes(term))
    );
    if (sort === 'low') return [...list].sort((a, b) => a.price - b.price);
    if (sort === 'high') return [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [gigs, category, term, sort]);

  const chip = (active) =>
    `rounded-full border px-3 py-1 text-sm font-medium capitalize transition ${
      active ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-5xl mx-auto p-6">
        <PendingBanner count={pendingCount} linkToBookings />

        <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Marketplace</h1>
            <p className="text-gray-600 mt-1">
              {role === 'client'
                ? 'Find skilled student freelancers and book a service in minutes.'
                : 'See what other student freelancers are offering on HustleHub+.'}
            </p>
          </div>
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search services or categories..."
              aria-label="Search services or categories"
              className="w-full pl-10 pr-4 py-2 border rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </header>

        {categories.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
              <button type="button" className={chip(category === 'all')} onClick={() => setCategory('all')}>All</button>
              {categories.map((c) => (
                <button key={c} type="button" className={chip(category === c)} onClick={() => setCategory(c)}>{c}</button>
              ))}
            </div>
            <label className="text-sm text-gray-600">
              Sort{' '}
              <select
                aria-label="Sort gigs"
                className="ml-1 rounded-lg border border-gray-300 bg-white px-2 py-1.5"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                {Object.entries(SORTS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
        )}

        {error && <div role="alert" className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded-lg">{error}</div>}
        {loading && <p className="text-gray-600" role="status">Loading gigs…</p>}
        {!loading && !error && gigs.length > 0 && (
          <p className="mb-4 text-sm text-gray-500">
            Showing {filteredGigs.length} of {gigs.length} {gigs.length === 1 ? 'gig' : 'gigs'}
          </p>
        )}
        {!loading && !error && filteredGigs.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <h2 className="font-semibold text-gray-800">{gigs.length === 0 ? 'No gigs yet' : 'No gigs found'}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {gigs.length === 0
                ? role === 'freelancer'
                  ? 'Be the first: create a gig under "My gigs".'
                  : 'Freelancers have not posted any gigs yet. Check back soon.'
                : 'Try a different search or category.'}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGigs.map((gig) => (
            <div key={gig.id} className="bg-white rounded-xl shadow-sm border p-6 flex flex-col justify-between hover:shadow-md transition">
              <div>
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full capitalize">{gig.category}</span>
                <h3 className="text-lg font-bold text-gray-800 mt-3">{gig.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{gig.description}</p>
              </div>
              <div className="mt-6 pt-4 border-t flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900">{money(gig.price)}</span>
                {role === 'client' && (
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
