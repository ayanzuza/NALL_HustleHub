
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';

import Login from './pages/Login';
import Register from './pages/Register';
import Gigs from './pages/Gigs';
import Booking from './pages/Booking';

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
            element={<Gigs />}
          />

          <Route
            path="/booking/:id"
            element={<Booking />}
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