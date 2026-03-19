import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import { timeAgo } from '../../utils/helpers';
import './Profile.css';

export default function Profile() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const navigate = useNavigate();

  const [profile,    setProfile]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [following,  setFollowing]  = useState(false);
  const [editMode,   setEditMode]   = useState(false);
  const [editForm,   setEditForm]   = useState({ bio: '', avatar: '' });
  const [saving,     setSaving]     = useState(false);
  const [saveMsg,    setSaveMsg]    = useState('');

  const isMe = me && (me._id === id || !id);
  const targetId = id || me?._id;

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/users/${targetId}`);
        setProfile(data.user);
        setEditForm({ bio: data.user.bio || '', avatar: data.user.avatar || '' });
        setFollowing(data.user.followers?.includes(me?._id));
      } catch { setError('User not found.'); }
      finally { setLoading(false); }
    };
    if (targetId) load();
  }, [targetId, me?._id]);

  const handleFollow = async () => {
    try {
      await api.post(`/users/${targetId}/follow`);
      setProfile(prev => ({
        ...prev,
        followers: following
          ? prev.followers.filter(f => f !== me._id)
          : [...prev.followers, me._id],
      }));
      setFollowing(f => !f);
    } catch (err) { alert('Could not follow. Please try again.'); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/users/me', editForm);
      setProfile(data.user);
      setEditMode(false);
      setSaveMsg('Profile updated!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch { alert('Failed to save.'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="profile-loading">
      <div className="profile-skeleton" />
    </div>
  );
  if (error) return (
    <div className="stream-error-page">
      <h2>🕵️ {error}</h2>
      <Link to="/" className="btn btn-outline" style={{marginTop:20}}>Go home</Link>
    </div>
  );

  const followerCount = profile.followers?.length || 0;
  const followingCount = profile.following?.length || 0;

  return (
    <div className="profile-page">
      <div className="container">

        {/* Banner */}
        <div className="profile-banner">
          <div className="profile-banner-inner">
            <div className="profile-avatar-wrap">
              <div className="profile-avatar">
                {profile.avatar
                  ? <img src={profile.avatar} alt={profile.username} />
                  : <span>{profile.username?.[0]?.toUpperCase()}</span>
                }
              </div>
              {profile.isStreaming && <span className="badge-live profile-live-badge">LIVE</span>}
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="profile-header">
          <div>
            <h1 className="profile-username">{profile.username}</h1>
            <p className="profile-bio">{profile.bio || (isMe ? 'Add a bio to your profile.' : 'No bio yet.')}</p>
            <p className="profile-joined">Joined {timeAgo(profile.createdAt)}</p>
          </div>
          <div className="profile-actions">
            {isMe ? (
              <button className="btn btn-outline" onClick={() => setEditMode(e => !e)}>
                {editMode ? 'Cancel' : 'Edit profile'}
              </button>
            ) : me && (
              <button
                className={`btn ${following ? 'btn-outline' : 'btn-primary'}`}
                onClick={handleFollow}
              >
                {following ? 'Unfollow' : 'Follow'}
              </button>
            )}
          </div>
        </div>

        {saveMsg && <div className="save-msg">{saveMsg}</div>}

        {/* Edit form */}
        {editMode && (
          <form className="edit-form" onSubmit={handleSave}>
            <div className="field-group" style={{marginBottom:14}}>
              <label className="field-label">Avatar URL</label>
              <input className="field-input" type="url" placeholder="https://..."
                value={editForm.avatar} onChange={e => setEditForm({...editForm, avatar: e.target.value})} />
            </div>
            <div className="field-group" style={{marginBottom:16}}>
              <label className="field-label">Bio</label>
              <textarea className="field-input field-textarea"
                placeholder="Tell everyone about yourself..."
                maxLength={200}
                value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} />
              <span style={{fontSize:11,color:'#4a5568',marginTop:4}}>{editForm.bio.length}/200</span>
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </form>
        )}

        {/* Stats */}
        <div className="profile-stats">
          {[
            { value: followerCount,  label: 'Followers' },
            { value: followingCount, label: 'Following' },
          ].map(s => (
            <div key={s.label} className="profile-stat">
              <span className="profile-stat-value">{s.value}</span>
              <span className="profile-stat-label">{s.label}</span>
            </div>
          ))}
          {profile.isStreaming && (
            <div className="profile-stat">
              <span className="profile-stat-value" style={{color:'#ff2d55'}}>●</span>
              <span className="profile-stat-label">Live now</span>
            </div>
          )}
        </div>

        {/* Streams section */}
        <div className="profile-streams">
          <h2 className="dash-section-title">
            {isMe ? 'Your recent streams' : `${profile.username}'s streams`}
          </h2>
          <div className="profile-streams-empty">
            <p>No streams to show yet.</p>
            {isMe && (
              <Link to="/dashboard" className="btn btn-outline" style={{marginTop:12}}>
                Go to dashboard
              </Link>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
