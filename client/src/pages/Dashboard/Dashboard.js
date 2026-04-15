import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useStream } from '../../hooks/useStream';
import { createStream, goLive, endStream } from '../../services/streamService';
import { STREAM_CATEGORIES } from '../../utils/constants';
import { formatViewerCount, timeAgo } from '../../utils/helpers';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const { streams, fetchStreams } = useStream();
  const navigate = useNavigate();

  const [myStreams, setMyStreams] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'General' });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => { fetchStreams(); }, [fetchStreams]);
  useEffect(() => {
    if (user) setMyStreams(streams.filter(s => s.streamer?._id === user._id || s.streamer === user._id));
  }, [streams, user]);

  const totalViewers = myStreams.reduce((acc, s) => acc + (s.viewerCount || 0), 0);
  const liveCount = myStreams.filter(s => s.isLive).length;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setFormError('Stream title is required.'); return; }
    setCreating(true);
    try {
      const { data } = await createStream(form);
      setMyStreams(prev => [data.stream, ...prev]);
      setShowCreateModal(false);
      setForm({ title: '', description: '', category: 'General' });
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create stream.');
    } finally { setCreating(false); }
  };

  const handleGoLive = async (streamId) => {
    try {
      const { data } = await goLive(streamId);
      setMyStreams(prev => prev.map(s => s._id === streamId ? data.stream : s));
      navigate(`/stream/${streamId}`);
    } catch (err) { alert('Could not go live. Please try again.'); }
  };

  const handleEnd = async (streamId) => {
    try {
      const { data } = await endStream(streamId);
      setMyStreams(prev => prev.map(s => s._id === streamId ? data.stream : s));
    } catch (err) { alert('Could not end stream.'); }
  };

  return (
    <div className="dashboard-page">
      <div className="container">

        {/* Header */}
        <div className="dash-header">
          <div>
            <h1 className="dash-title">Dashboard</h1>
            <p className="dash-sub">Welcome back, <span className="dash-sub-accent">{user?.username}</span></p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            + New Stream
          </button>
        </div>

        {/* Stats */}
        <div className="dash-stats">
          {[
            { label: 'Total streams',   value: myStreams.length,       accent: false },
            { label: 'Live now',        value: liveCount,              accent: liveCount > 0 },
            { label: 'Total viewers',   value: formatViewerCount(totalViewers), accent: false },
            { label: 'Followers',       value: user?.followers?.length || 0, accent: false },
          ].map(stat => (
            <div key={stat.label} className={`stat-card ${stat.accent ? 'stat-card--live' : ''}`}>
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
              {stat.accent && <span className="badge-live stat-badge">LIVE</span>}
            </div>
          ))}
        </div>

        {/* My Streams */}
        <div className="dash-section">
          <h2 className="dash-section-title">My Streams</h2>

          {myStreams.length === 0 && (
            <div className="dash-empty">
              <p>You haven't created any streams yet.</p>
              <button className="btn btn-outline dash-empty-action" onClick={() => setShowCreateModal(true)}>
                Create your first stream
              </button>
            </div>
          )}

          {myStreams.length > 0 && (
            <div className="my-streams-list">
              {myStreams.map(stream => (
                <div key={stream._id} className="my-stream-row">
                  <div className="my-stream-left">
                    <div className={`my-stream-status ${stream.isLive ? 'status--live' : 'status--offline'}`} />
                    <div>
                      <p className="my-stream-title">{stream.title}</p>
                      <div className="my-stream-meta">
                        <span className="stream-card-category">{stream.category}</span>
                        {stream.viewerCount > 0 && (
                          <span className="my-stream-viewers">{formatViewerCount(stream.viewerCount)} viewers</span>
                        )}
                        <span className="my-stream-time">{timeAgo(stream.createdAt)}</span>
                        <span
                          className="my-stream-id"
                          onClick={() => {
                            navigator.clipboard.writeText(stream._id);
                            alert(`Stream ID ${stream._id} copied to clipboard!`);
                          }}
                          title="Click to copy Stream ID"
                        >
                          ID: {stream._id}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="my-stream-actions">
                    {stream.isLive ? (
                      <>
                        <Link to={`/stream/${stream._id}`} className="btn btn-outline my-stream-btn">View</Link>
                        <button className="btn btn-danger my-stream-btn" onClick={() => handleEnd(stream._id)}>End stream</button>
                      </>
                    ) : (
                      <button className="btn btn-primary my-stream-btn" onClick={() => handleGoLive(stream._id)}>
                        Go Live
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Browse live */}
        <div className="dash-section">
          <div className="dash-section-head">
            <h2 className="dash-section-title">Browse Live</h2>
            <Link to="/" className="dash-see-all">See all -></Link>
          </div>
          <div className="streams-grid dash-browse-grid">
            {streams.slice(0, 3).map(s => (
              <div key={s._id} className="stream-card" onClick={() => navigate(`/stream/${s._id}`)}>
                <div className="stream-card-thumb">
                  <div className="stream-card-placeholder"><span>{s.title[0]?.toUpperCase()}</span></div>
                  <span className="badge-live stream-card-live">LIVE</span>
                </div>
                <div className="stream-card-info">
                  <div className="stream-card-avatar"><span>{s.streamer?.username?.[0]?.toUpperCase()}</span></div>
                  <div className="stream-card-meta">
                    <p className="stream-card-title">{s.title}</p>
                    <p className="stream-card-streamer">{s.streamer?.username}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Create Stream Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create a new stream</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>x</button>
            </div>
            {formError && <div className="auth-error modal-error">{formError}</div>}
            <form onSubmit={handleCreate} noValidate>
              <div className="field-group modal-field">
                <label className="field-label">Stream title *</label>
                <input className="field-input" type="text" placeholder="What are you streaming?"
                  value={form.title} onChange={e => { setForm({...form, title: e.target.value}); setFormError(''); }} />
              </div>
              <div className="field-group modal-field">
                <label className="field-label">Description</label>
                <textarea className="field-input field-textarea"
                  placeholder="Tell your viewers what this stream is about..."
                  value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div className="field-group modal-field modal-field--last">
                <label className="field-label">Category</label>
                <select className="field-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                  {STREAM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Stream'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
