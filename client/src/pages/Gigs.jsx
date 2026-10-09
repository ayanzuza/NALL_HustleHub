import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Star, MapPin } from 'lucide-react';

const MOCK_GIGS = [
  { id: 1, title: 'Full-Stack Web Development', freelancer: 'Sipho Dlamini', price: 1500, rating: 4.9, location: 'Durban' },
  { id: 2, title: 'Mobile App UI/UX Design', freelancer: 'Nomvula Zulu', price: 950, rating: 4.8, location: 'Johannesburg' },
  { id: 3, title: 'Database Optimization & API Integration', freelancer: 'Kagiso Mokoena', price: 1200, rating: 5.0, location: 'Cape Town' },
];

export default function Gigs() {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const filteredGigs = MOCK_GIGS.filter((gig) =>
    gig.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gig.freelancer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Explore Marketplace Gigs</h1>
            <p className="text-gray-600 mt-1">Connect with skilled student freelancers on HustleHub.</p>
          </div>
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search services or freelancers..."
              className="w-full pl-10 pr-4 py-2 border rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGigs.map((gig) => (
            <div key={gig.id} className="bg-white rounded-xl shadow-sm border p-6 flex flex-col justify-between hover:shadow-md transition">
              <div>
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">Available</span>
                <h3 className="text-lg font-bold text-gray-800 mt-3">{gig.title}</h3>
                <p className="text-sm text-gray-600 mt-1">By {gig.freelancer}</p>
                <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {gig.rating}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {gig.location}</span>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900">R{gig.price}</span>
                <button
                  onClick={() => navigate(`/booking/${gig.id}`)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                >
                  Book Service
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}