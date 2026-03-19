import React from 'react';
import { Link } from 'react-router-dom';
import './NotFound.css';

export default function NotFound() {
  return (
    <div className="notfound-page">
      <div className="notfound-bg">
        <div className="notfound-orb" />
      </div>
      <div className="notfound-content animate-in">
        <p className="notfound-code">404</p>
        <h1 className="notfound-title">Nothing streaming here</h1>
        <p className="notfound-desc">This page doesn't exist or may have been removed.</p>
        <div style={{display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center', marginTop:28}}>
          <Link to="/" className="btn btn-primary">Back to home</Link>
          <Link to="/dashboard" className="btn btn-outline">Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
