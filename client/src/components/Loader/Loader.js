import React from 'react';
import './Loader.css';

export default function Loader({ fullscreen, size = 'md' }) {
  if (fullscreen) {
    return (
      <div className="loader-fullscreen">
        <div className="loader-ring">
          <span /><span /><span />
        </div>
        <p className="loader-text">StreamSphere</p>
      </div>
    );
  }
  return <div className={`loader-ring loader-${size}`}><span /><span /><span /></div>;
}
