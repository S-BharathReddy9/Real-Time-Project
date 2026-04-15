import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner container">
        <Link to="/" className="navbar-logo">
          <span className="navbar-logo-dot" />
          StreamSphere
        </Link>

        <div className="navbar-links">
          <NavLink to="/" end className={({isActive}) => `nav-link ${isActive ? 'nav-link--active' : ''}`}>Browse Live</NavLink>
          <NavLink to="/movies" className={({isActive}) => `nav-link ${isActive ? 'nav-link--active' : ''}`}>Movies</NavLink>
          {user && (
            <NavLink to="/dashboard" className={({isActive}) => `nav-link ${isActive ? 'nav-link--active' : ''}`}>Dashboard</NavLink>
          )}
        </div>

        <form
          className="navbar-join"
          onSubmit={(e) => {
            e.preventDefault();
            const id = e.target.elements.streamId.value.trim();
            if (id) navigate(`/stream/${id}`);
            e.target.reset();
          }}
        >
          <input className="navbar-join-input" name="streamId" placeholder="Paste Stream ID..." />
          <button type="submit" className="btn btn-primary navbar-join-btn">
            Join
          </button>
        </form>

        <div className="navbar-right">
          {user ? (
            <div className="user-menu-wrap">
              <button className="user-btn" onClick={() => setMenuOpen(o => !o)}>
                <span className="user-avatar">
                  {user.avatar ? <img src={user.avatar} alt={user.username} /> : user.username?.[0]?.toUpperCase()}
                </span>
                <span className="user-name">{user.username}</span>
                <span className="user-chevron">v</span>
              </button>
              {menuOpen && (
                <div className="user-dropdown">
                  <Link to={`/profile/${user._id}`} className="dropdown-item" onClick={() => setMenuOpen(false)}>Profile</Link>
                  <Link to="/dashboard" className="dropdown-item" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item dropdown-item--danger" onClick={handleLogout}>Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <div className="navbar-guest-actions">
              <Link to="/login" className="btn btn-outline navbar-action-btn">Sign in</Link>
              <Link to="/register" className="btn btn-primary navbar-action-btn">Get started</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
