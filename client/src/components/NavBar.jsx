import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const linkClass = 'text-sm text-blue-100 hover:text-white';

  return (
    <nav className="bg-slate-800 text-white px-6 py-3 flex flex-wrap items-center gap-4">
      <span className="font-bold">HustleHub+</span>
      {user ? (
        <>
          <Link className={linkClass} to="/gigs">Browse gigs</Link>
          {user.role === 'freelancer' && <Link className={linkClass} to="/my-gigs">My gigs</Link>}
          <Link className={linkClass} to="/bookings">Bookings</Link>
          {user.role === 'freelancer' && <Link className={linkClass} to="/income">Income</Link>}
          <span className="flex-1" />
          <span className="text-sm">{user.name} ({user.role})</span>
          <button
            className="text-sm bg-slate-600 hover:bg-slate-500 px-3 py-1 rounded-lg"
            onClick={() => { logout(); navigate('/login'); }}
          >
            Log out
          </button>
        </>
      ) : (
        <>
          <Link className={linkClass} to="/login">Log in</Link>
          <Link className={linkClass} to="/register">Register</Link>
        </>
      )}
    </nav>
  );
}
