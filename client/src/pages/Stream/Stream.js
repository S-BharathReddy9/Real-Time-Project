import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getStream } from '../../services/streamService';
import {
  initSocket, disconnectSocket,
  joinStream, leaveStream,
  sendMessage, onMessage, offMessage,
  onChatCleared, offChatCleared,
  onUserJoined, onViewerCount,
} from '../../services/socketService';
import { StreamerPlayer, ViewerPlayer } from '../../components/VideoPlayer/VideoPlayer';
import api from '../../services/api';
import { formatTime, formatViewerCount } from '../../utils/helpers';
import './Stream.css';

export default function Stream() {
  const { id }   = useParams();
  const { user } = useAuth();

  const [stream,    setStream]    = useState(null);
  const [messages,  setMessages]  = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [viewers,   setViewers]   = useState(0);
  const [joined,    setJoined]    = useState([]);
  const [pageError, setPageError] = useState('');
  const [loading,   setLoading]   = useState(true);

  const chatEndRef = useRef(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load stream data + message history
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await getStream(id);
        setStream(data.stream);
        setViewers(data.stream.viewerCount || 0);
        const hist = await api.get(`/chat/${id}/messages`);
        setMessages(hist.data.messages || []);
      } catch {
        setPageError('Stream not found or unavailable.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // Socket connection
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    initSocket(token);
    joinStream(id);

    onMessage(msg  => setMessages(prev => [...prev, msg]));
    onChatCleared(({ streamId }) => {
      if (streamId === id) {
        setMessages([]);
      }
    });
    onUserJoined(({ username }) => {
      setJoined(prev => [...prev.slice(-2), username]);
      setTimeout(() => setJoined(prev => prev.filter(u => u !== username)), 4000);
    });
    onViewerCount(({ count }) => setViewers(count));

    return () => {
      leaveStream(id);
      offMessage();
      offChatCleared();
      disconnectSocket();
    };
  }, [id, user]);

  const handleSend = useCallback((e) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || !user) return;
    sendMessage(id, text);
    setChatInput('');
  }, [chatInput, id, user]);

  const isOwner = stream && user &&
    (stream.streamer?._id === user._id || stream.streamer === user._id);
  const streamerName = stream?.streamer?.username || 'Streamer';
  const streamerProfileHref = stream?.streamer?._id ? `/profile/${stream.streamer._id}` : '/';
  const chatTitle = isOwner ? 'Live Chat' : 'Viewer Chat';
  const chatSubtitle = isOwner ? 'Audience messages and join activity' : 'Talk with everyone watching live';
  const chatPlaceholder = isOwner ? 'Reply to your audience' : 'Join the conversation';
  const streamSummaryTitle = isOwner ? 'Stream details' : 'About this stream';

  if (loading) return (
    <div className="stream-loading">
      <div className="stream-skeleton-video" />
      <p>Loading stream...</p>
    </div>
  );

  if (pageError) return (
    <div className="stream-error-page">
      <h2>{pageError}</h2>
      <Link to="/" className="btn btn-outline" style={{ marginTop: 20 }}>Browse streams</Link>
    </div>
  );

  return (
    <div className={`stream-page ${isOwner ? 'stream-page--host' : 'stream-page--viewer'}`}>
      <div className={`stream-layout ${isOwner ? 'stream-layout--host' : 'stream-layout--viewer'}`}>

        {/* ── Left: video + info ── */}
        <div className="stream-main">

          {/* Video player — streamer sees their own camera; viewers see the incoming feed */}
          {isOwner
            ? <StreamerPlayer streamId={id} />
            : <ViewerPlayer   streamId={id} />
          }

          {isOwner && (
            <section className="host-console-card">
              <div className="host-console-card__eyebrow">Broadcast Console</div>
              <div className="host-console-card__body">
                <div className="host-console-card__content">
                  <h1 className="host-console-card__title">{stream.title}</h1>
                  <p className="host-console-card__subtitle">
                    Streaming as <Link to={streamerProfileHref} className="host-console-card__link">{streamerName}</Link>
                  </p>
                </div>
                <div className="host-console-card__stats">
                  <span className="vp-viewer-pill host-console-card__pill">
                    <span className="viewer-dot" /> {formatViewerCount(viewers)} watching
                  </span>
                  {stream.isLive && <span className="badge-live">LIVE</span>}
                </div>
              </div>
              <p className="host-console-card__hint">Use the player controls to switch sources, manage audio, or end the session.</p>
            </section>
          )}

          {!isOwner && (
            <section className="viewer-hero">
              <div className="viewer-hero__eyebrow">Watching Live</div>
              <div className="viewer-hero__body">
                <div className="stream-avatar viewer-hero__avatar">
                  {stream.streamer?.avatar
                    ? <img src={stream.streamer.avatar} alt={streamerName} />
                    : <span>{streamerName?.[0]?.toUpperCase()}</span>
                  }
                  {stream.isLive && <span className="avatar-live-ring" />}
                </div>

                <div className="viewer-hero__content">
                  <h1 className="viewer-hero__title">{stream.title}</h1>
                  <div className="viewer-hero__meta">
                    <span className="viewer-hero__label">Hosted by</span>
                    <Link to={streamerProfileHref} className="stream-streamer-link viewer-hero__link">
                      {streamerName}
                    </Link>
                    <span className="stream-card-category">{stream.category}</span>
                    <span className="vp-viewer-pill viewer-hero__pill">
                      <span className="viewer-dot" /> {formatViewerCount(viewers)} watching
                    </span>
                  </div>
                  <p className="viewer-hero__hint">Viewer mode keeps playback first and hides broadcaster controls.</p>
                </div>
              </div>
            </section>
          )}

          {/* Stream info */}
          <div className={`stream-info ${isOwner ? 'stream-info--host' : 'stream-info--viewer'}`}>
            <div className="stream-info-top">
              <div className="stream-avatar">
                {stream.streamer?.avatar
                  ? <img src={stream.streamer.avatar} alt={stream.streamer.username} />
                  : <span>{stream.streamer?.username?.[0]?.toUpperCase()}</span>
                }
                {stream.isLive && <span className="avatar-live-ring" />}
              </div>
              <div className="stream-info-text">
                <h1 className="stream-title">{streamSummaryTitle}</h1>
                <div className="stream-meta-row">
                  <Link to={streamerProfileHref} className="stream-streamer-link">
                    {streamerName}
                  </Link>
                  <span className="stream-card-category">{stream.category}</span>
                  {stream.isLive && (
                    <span className="badge-live badge-live--compact">LIVE</span>
                  )}
                  <span className="vp-viewer-pill stream-meta-pill">
                    <span className="viewer-dot" /> {formatViewerCount(viewers)} watching
                  </span>
                </div>
              </div>
            </div>
            {stream.description && (
              <p className="stream-description">{stream.description}</p>
            )}
            {!isOwner && !stream.description && (
              <p className="stream-description">Enjoy the stream and chat with everyone watching live.</p>
            )}
          </div>
        </div>

        {/* ── Right: chat ── */}
        <div className={`stream-chat ${isOwner ? 'stream-chat--host' : 'stream-chat--viewer'}`}>
          <div className="chat-header">
            <div className="chat-header-copy">
              <span className="chat-title">{chatTitle}</span>
              <span className="chat-subtitle">{chatSubtitle}</span>
            </div>
            <span className="chat-count">{messages.length} messages</span>
          </div>

          {/* Join notifications */}
          {joined.map((u, i) => (
            <div key={i} className="chat-join-notif">{u} joined the stream</div>
          ))}

          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-empty">Be the first to say something!</div>
            )}
            {messages.map((msg, i) => {
              const isMe = msg.sender?._id === user?._id;
              return (
                <div key={msg._id || i} className={`chat-msg ${isMe ? 'chat-msg--me' : ''}`}>
                  <span className={`chat-name ${isMe ? 'chat-name--me' : ''}`}>
                    {msg.sender?.username || 'Unknown'}
                  </span>
                  <span className="chat-text">{msg.content}</span>
                  <span className="chat-time">{formatTime(msg.createdAt)}</span>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          <form className="chat-input-row" onSubmit={handleSend}>
            {!user ? (
              <p className="chat-auth-prompt">
                <Link to="/login" className="auth-link">Sign in</Link> to chat
              </p>
            ) : (
              <>
                <input
                  className="chat-input"
                  type="text"
                  placeholder={chatPlaceholder}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  maxLength={500}
                />
                <button type="submit" className="chat-send-btn" disabled={!chatInput.trim()}>Send</button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
