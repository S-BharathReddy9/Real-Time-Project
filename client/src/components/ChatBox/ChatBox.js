import React, { useState, useEffect, useRef } from 'react';
import { formatTime, getInitials } from '../../utils/helpers';
import {
  joinStream, leaveStream,
  sendMessage, onMessage, offMessage,
  onChatCleared, offChatCleared,
  onUserJoined, getSocket,
} from '../../services/socketService';
import './ChatBox.css';

export default function ChatBox({ streamId, currentUser, initialMessages = [] }) {
  const [messages, setMessages]   = useState(initialMessages);
  const [input,    setInput]      = useState('');
  const [online,   setOnline]     = useState(0);
  const bottomRef                 = useRef(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !streamId) return;

    joinStream(streamId);

    onMessage((msg) => {
      setMessages(prev => [...prev, msg]);
    });

    onChatCleared(({ streamId: clearedStreamId }) => {
      if (clearedStreamId === streamId) {
        setMessages([]);
      }
    });

    onUserJoined(() => setOnline(n => n + 1));

    socket.on('user:left',    () => setOnline(n => Math.max(0, n - 1)));
    socket.on('viewer:count', ({ count }) => setOnline(count));

    return () => {
      leaveStream(streamId);
      offMessage();
      offChatCleared();
    };
  }, [streamId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    sendMessage(streamId, trimmed);
    setInput('');
  };

  return (
    <div className="chatbox">
      <div className="chat-header">
        <span className="chat-title">Live Chat</span>
        {online > 0 && (
          <span className="chat-online">
            <span className="online-dot" /> {online} online
          </span>
        )}
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>No messages yet.</p>
            <p>Be the first to say hello! 👋</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isSelf = msg.sender?._id === currentUser?._id;
          return (
            <div key={msg._id || i} className={`chat-msg ${isSelf ? 'self' : ''}`}>
              {!isSelf && (
                <div className="msg-avatar">
                  {msg.sender?.avatar
                    ? <img src={msg.sender.avatar} alt="" />
                    : getInitials(msg.sender?.username || '?')
                  }
                </div>
              )}
              <div className="msg-bubble-wrap">
                {!isSelf && (
                  <span className="msg-username">{msg.sender?.username}</span>
                )}
                <div className="msg-bubble">
                  <span className="msg-text">{msg.content}</span>
                  <span className="msg-time">{formatTime(msg.createdAt)}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input-row" onSubmit={handleSend}>
        <input
          className="chat-input"
          placeholder="Say something..."
          value={input}
          onChange={e => setInput(e.target.value)}
          maxLength={500}
          autoComplete="off"
        />
        <button type="submit" className="chat-send" disabled={!input.trim()}>
          ➤
        </button>
      </form>
    </div>
  );
}
