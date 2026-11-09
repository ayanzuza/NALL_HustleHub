import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';

import Login from './pages/Login';
import Register from './pages/Register';
import Gigs from './pages/Gigs';
import Booking from './pages/Booking';
import MyGigs from './pages/MyGigs';
import Bookings from './pages/Bookings';
import Income from './pages/Income';
import RequireAuth from './components/RequireAuth';

import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Simple Demo Navigation Header */}
        <header className="bg-slate-900 text-white p-4 flex justify-between items-center border-b border-slate-800">
          <Link to="/gigs" className="font-bold text-xl tracking-wide">
            HustleHub<span className="text-blue-500">+</span>
          </Link>
          <nav className="space-x-4">
            <Link to="/gigs" className="hover:text-blue-400">Marketplace</Link>
            <Link to="/login" className="hover:text-blue-400">Login</Link>
            <Link to="/register" className="bg-blue-600 px-3 py-1.5 rounded hover:bg-blue-700">Register</Link>
          </nav>
        </header>

        <Routes>
          {/* Redirect the home page to the gigs page */}
          <Route
            path="/"
            element={<Navigate to="/gigs" replace />}
          />

          {/* Authentication pages */}
          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/register"
            element={<Register />}
          />

          {/* Main application pages */}
          <Route
            path="/gigs"
            element={<RequireAuth><Gigs /></RequireAuth>}
          />

          <Route
            path="/booking/:id"
            element={<RequireAuth roles={['client']}><Booking /></RequireAuth>}
          />

          <Route
            path="/my-gigs"
            element={<RequireAuth roles={['freelancer']}><MyGigs /></RequireAuth>}
          />

          <Route
            path="/bookings"
            element={<RequireAuth><Bookings /></RequireAuth>}
          />

          <Route
            path="/income"
            element={<RequireAuth roles={['freelancer']}><Income /></RequireAuth>}
          />

          {/* Redirect unknown routes */}
          <Route
            path="*"
            element={<Navigate to="/gigs" replace />}
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;