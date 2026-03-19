import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

import Home      from '../pages/Home/Home';
import Login     from '../pages/Login/Login';
import Register  from '../pages/Register/Register';
import Dashboard from '../pages/Dashboard/Dashboard';
import Stream    from '../pages/Stream/Stream';
import Profile   from '../pages/Profile/Profile';
import NotFound  from '../pages/NotFound/NotFound';
import Movies    from '../pages/Movies/Movies';
import MoviePlayer from '../pages/MoviePlayer/MoviePlayer';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
};

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/"           element={<Home />} />
      <Route path="/login"      element={<Login />} />
      <Route path="/register"   element={<Register />} />
      <Route path="/stream/:id" element={<Stream />} />
      <Route path="/profile/:id" element={<Profile />} />
      <Route path="/movies"     element={<Movies />} />
      <Route path="/movies/:id" element={<MoviePlayer />} />
      <Route path="/dashboard"  element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="*"           element={<NotFound />} />
    </Routes>
  );
}
