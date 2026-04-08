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

  if (loading) return (
    <div className="stream-loading">
      <div className="stream-skeleton-video" />
      <p>Loading stream…</p>
    </div>
  );

  if (pageError) return (
    <div className="stream-error-page">
      <h2>😶 {pageError}</h2>
      <Link to="/" className="btn btn-outline" style={{ marginTop: 20 }}>Browse streams</Link>
    </div>
  );

  return (
    <div className="stream-page">
      <div className="stream-layout">

        {/* ── Left: video + info ── */}
        <div className="stream-main">

          {/* Video player — streamer sees their own camera; viewers see the incoming feed */}
          {isOwner
            ? <StreamerPlayer streamId={id} />
            : <ViewerPlayer   streamId={id} />
          }

          {/* Stream info */}
          <div className="stream-info">
            <div className="stream-info-top">
              <div className="stream-avatar">
                {stream.streamer?.avatar
                  ? <img src={stream.streamer.avatar} alt={stream.streamer.username} />
                  : <span>{stream.streamer?.username?.[0]?.toUpperCase()}</span>
                }
                {stream.isLive && <span className="avatar-live-ring" />}
              </div>
              <div className="stream-info-text">
                <h1 className="stream-title">{stream.title}</h1>
                <div className="stream-meta-row">
                  <Link to={`/profile/${stream.streamer?._id}`} className="stream-streamer-link">
                    {stream.streamer?.username}
                  </Link>
                  <span className="stream-card-category">{stream.category}</span>
                  {stream.isLive && (
                    <span className="badge-live" style={{ fontSize: 10 }}>LIVE</span>
                  )}
                  <span className="vp-viewer-pill" style={{ position: 'static', fontSize: 12, padding: '3px 10px' }}>
                    <span className="viewer-dot" /> {formatViewerCount(viewers)} watching
                  </span>
                </div>
              </div>
            </div>
            {stream.description && (
              <p className="stream-description">{stream.description}</p>
            )}
          </div>
        </div>

        {/* ── Right: chat ── */}
        <div className="stream-chat">
          <div className="chat-header">
            <span className="chat-title">Live Chat</span>
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
                  placeholder="Send a message…"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  maxLength={500}
                />
                <button type="submit" className="chat-send-btn" disabled={!chatInput.trim()}>↑</button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
