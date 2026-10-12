
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

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