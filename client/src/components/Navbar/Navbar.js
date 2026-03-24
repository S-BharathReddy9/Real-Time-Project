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
          onSubmit={(e) => {
            e.preventDefault();
            const id = e.target.elements.streamId.value.trim();
            if (id) navigate(`/stream/${id}`);
            e.target.reset();
          }}
          style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto', marginRight: '20px' }}
        >
          <input 
            name="streamId" 
            placeholder="Paste Stream ID..." 
            style={{ 
              width: '180px', padding: '6px 12px', fontSize: '13px', 
              borderRadius: '6px 0 0 6px', border: '1px solid #333', 
              background: '#1a1a1a', color: '#fff', outline: 'none'
            }}
          />
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ padding: '7px 16px', fontSize: '13px', borderRadius: '0 6px 6px 0', border: 'none', cursor: 'pointer' }}
          >
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
                <span className="user-chevron">▾</span>
              </button>
              {menuOpen && (
                <div className="user-dropdown">
                  <Link to={`/profile/${user._id}`} className="dropdown-item" onClick={() => setMenuOpen(false)}>
                    👤 Profile
                  </Link>
                  <Link to="/dashboard" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                    📊 Dashboard
                  </Link>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item dropdown-item--danger" onClick={handleLogout}>
                    🚪 Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{display:'flex', gap:8}}>
              <Link to="/login"    className="btn btn-outline" style={{padding:'8px 16px',fontSize:13}}>Sign in</Link>
              <Link to="/register" className="btn btn-primary" style={{padding:'8px 16px',fontSize:13}}>Get started</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
