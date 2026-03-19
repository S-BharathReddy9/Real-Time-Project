import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useStream } from '../../hooks/useStream';
import { formatViewerCount } from '../../utils/helpers';
import { STREAM_CATEGORIES } from '../../utils/constants';
import './Home.css';

export default function Home() {
  const { user } = useAuth();
  const { streams, loading, fetchStreams } = useStream();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => { fetchStreams(); }, [fetchStreams]);

  const filtered = activeCategory === 'All'
    ? streams
    : streams.filter(s => s.category === activeCategory);

  return (
    <div className="home-page">
      {/* Hero */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-orb hero-orb--cyan" />
          <div className="hero-orb hero-orb--pink" />
          <div className="hero-grid" />
        </div>
        <div className="hero-content container">
          <div className="hero-badge">
            <span className="badge-live">LIVE</span>
            <span>{streams.length} streams happening now</span>
          </div>
          <h1 className="hero-title">
            Stream anything.<br />
            <span className="hero-title--accent">Watch everyone.</span>
          </h1>
          <p className="hero-desc">
            Real-time streaming for up to 20 viewers. No lag, no friction — just you and your audience.
          </p>
          <div className="hero-actions">
            {user ? (
              <Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary">Start streaming free</Link>
                <Link to="/login" className="btn btn-outline">Sign in</Link>
              </>
            )}
          </div>
          <div className="hero-stats">
            {[['10–20', 'Max viewers'], ['0ms', 'Stream key setup'], ['100%', 'Real-time chat']].map(([v, l]) => (
              <div key={l} className="hero-stat">
                <span className="hero-stat-value">{v}</span>
                <span className="hero-stat-label">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Category filter */}
      <section className="streams-section container">
        <div className="section-header-row">
          <h2 className="section-title">Live right now</h2>
          <div className="category-bar">
            {['All', ...STREAM_CATEGORIES].map(cat => (
              <button
                key={cat}
                className={`cat-btn ${activeCategory === cat ? 'cat-btn--active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="streams-loading">
            {[1,2,3,4,5,6].map(i => <div key={i} className="stream-skeleton" />)}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="streams-empty">
            <div className="empty-icon">📡</div>
            <p>No live streams in this category right now.</p>
            {user && <Link to="/dashboard" className="btn btn-outline" style={{marginTop:16}}>Start your stream</Link>}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="streams-grid">
            {filtered.map(stream => (
              <div
                key={stream._id}
                className="stream-card"
                onClick={() => navigate(`/stream/${stream._id}`)}
              >
                <div className="stream-card-thumb">
                  {stream.thumbnail
                    ? <img src={stream.thumbnail} alt={stream.title} />
                    : <div className="stream-card-placeholder">
                        <span>{stream.title[0]?.toUpperCase()}</span>
                      </div>
                  }
                  <span className="badge-live stream-card-live">LIVE</span>
                  <div className="stream-card-viewers">
                    <span className="viewer-dot" />
                    {formatViewerCount(stream.viewerCount)} watching
                  </div>
                </div>
                <div className="stream-card-info">
                  <div className="stream-card-avatar">
                    {stream.streamer?.avatar
                      ? <img src={stream.streamer.avatar} alt={stream.streamer.username} />
                      : <span>{stream.streamer?.username?.[0]?.toUpperCase()}</span>
                    }
                  </div>
                  <div className="stream-card-meta">
                    <p className="stream-card-title">{stream.title}</p>
                    <p className="stream-card-streamer">{stream.streamer?.username}</p>
                    <span className="stream-card-category">{stream.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Feature strip */}
      <section className="features container">
        {[
          { icon: '🎥', title: 'WebRTC Streaming', desc: 'Ultra-low latency peer-to-peer video delivery.' },
          { icon: '💬', title: 'Real-time Chat', desc: 'Socket.io powered chat. Every message instant.' },
          { icon: '🔐', title: 'JWT Auth', desc: 'Secure sessions. Your stream key is yours alone.' },
        ].map(f => (
          <div key={f.title} className="feature-card">
            <span className="feature-icon">{f.icon}</span>
            <h3 className="feature-title">{f.title}</h3>
            <p className="feature-desc">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
