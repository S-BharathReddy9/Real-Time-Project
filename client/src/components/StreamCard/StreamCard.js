import React from 'react';
import { Link } from 'react-router-dom';
import { formatViewerCount, timeAgo } from '../../utils/helpers';
import './StreamCard.css';

export default function StreamCard({ stream }) {
  const { _id, title, streamer, category, viewerCount, thumbnail, startedAt } = stream;

  return (
    <Link to={`/stream/${_id}`} className="stream-card">
      <div className="card-thumb">
        {thumbnail
          ? <img src={thumbnail} alt={title} />
          : <div className="card-thumb-placeholder">
              <span className="thumb-icon">▶</span>
            </div>
        }
        <span className="badge-live">LIVE</span>
        <div className="viewer-pill">
          <span className="viewer-dot" />
          {formatViewerCount(viewerCount)} viewers
        </div>
      </div>

      <div className="card-body">
        <div className="card-streamer">
          <div className="streamer-avatar">
            {streamer?.avatar
              ? <img src={streamer.avatar} alt={streamer.username} />
              : streamer?.username?.[0]?.toUpperCase()
            }
          </div>
          <div className="card-meta">
            <p className="card-title">{title}</p>
            <p className="card-sub">{streamer?.username} · {category}</p>
          </div>
        </div>
        {startedAt && (
          <p className="card-time">{timeAgo(startedAt)}</p>
        )}
      </div>
    </Link>
  );
}
