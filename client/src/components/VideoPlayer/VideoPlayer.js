import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from '../../services/socketService';
import api from '../../services/api';
import './VideoPlayer.css';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// ─────────────────────────────────────────────────────────
//  STREAMER — captures webcam/screen, sends to all viewers
// ─────────────────────────────────────────────────────────
export function StreamerPlayer({ streamId }) {
  const localVideoRef = useRef(null);
  const moviePlayerRef = useRef(null);
  const localStream   = useRef(null);
  const peers         = useRef({});   // viewerId → RTCPeerConnection
  const socket        = getSocket();

  const [live,        setLive]        = useState(false);
  const [error,       setError]       = useState('');
  const [videoSource, setVideoSource] = useState('camera');
  const [muted,       setMuted]       = useState(false);
  const [camOff,      setCamOff]      = useState(false);
  const [viewerCount, setViewerCount] = useState(0);

  // Watch Party States
  const [movies, setMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);

  useEffect(() => {
    api.get('/videos')
      .then(res => setMovies(res.data.videos))
      .catch(err => console.error("Could not fetch movies for Watch Party:", err));
  }, []);

  // Create a peer connection for one viewer and send an offer
  const createPeerForViewer = useCallback(async (viewerId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peers.current[viewerId] = pc;

    // Add all local tracks
    localStream.current?.getTracks().forEach(track => {
      pc.addTrack(track, localStream.current);
    });

    // Send ICE candidates to that viewer
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socket.emit('webrtc:ice', { targetId: viewerId, candidate });
    };

    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('webrtc:offer', { viewerId, offer });
  }, [socket]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    // A new viewer joined and is ready
    socket.on('webrtc:viewer-ready', ({ viewerId }) => {
      createPeerForViewer(viewerId);
    });

    // Viewer sent an answer
    socket.on('webrtc:answer', async ({ viewerId, answer }) => {
      const pc = peers.current[viewerId];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    // ICE from viewer
    socket.on('webrtc:ice', async ({ fromId, candidate }) => {
      const pc = peers.current[fromId];
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on('viewer:count', ({ count }) => setViewerCount(count));

    return () => {
      socket.off('webrtc:viewer-ready');
      socket.off('webrtc:answer');
      socket.off('webrtc:ice');
      socket.off('viewer:count');
    };
  }, [socket, createPeerForViewer]);

  const startStream = async (source) => {
    setError('');
    try {
      let stream;
      if (source === 'screen') {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        const mic    = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
        if (mic) {
          mic.getAudioTracks().forEach(t => screen.addTrack(t));
        }
        stream = screen;
      } else if (source === 'movie') {
        if (!selectedMovie) throw new Error("Please select a movie to stream.");
        
        const isYouTube = selectedMovie.videoUrl.includes('youtube') || selectedMovie.videoUrl.includes('youtu.be');
        if (isYouTube) throw new Error("You cannot broadcast YouTube videos due to browser security restrictions on iframes. Please use a direct .mp4 link or a local file on your computer!");

        const movieUrl = selectedMovie.videoUrl.startsWith('http') 
          ? selectedMovie.videoUrl 
          : `${api.defaults.baseURL}/videos/${selectedMovie._id}/stream`;
          
        moviePlayerRef.current.src = movieUrl;
        await moviePlayerRef.current.play();
        
        stream = moviePlayerRef.current.captureStream 
          ? moviePlayerRef.current.captureStream(30) 
          : moviePlayerRef.current.mozCaptureStream(30);
          
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      }

      localStream.current = stream;
      if (localVideoRef.current) {
        if (source === 'movie') {
           localVideoRef.current.srcObject = null;
        } else {
           localVideoRef.current.srcObject = stream;
        }
      }

      socket.emit('webrtc:start', { streamId });
      setLive(true);
    } catch (err) {
      setError(
        err.name === 'NotAllowedError'
          ? 'Camera/microphone permission denied. Please allow access and try again.'
          : `Could not start stream: ${err.message}`
      );
    }
  };

  const stopStream = () => {
    localStream.current?.getTracks().forEach(t => t.stop());
    Object.values(peers.current).forEach(pc => pc.close());
    peers.current = {};
    localStream.current = null;
    
    if (moviePlayerRef.current) {
      moviePlayerRef.current.pause();
      moviePlayerRef.current.removeAttribute('src');
      moviePlayerRef.current.load();
    }
    
    if (localVideoRef.current) {
        localVideoRef.current.pause();
        localVideoRef.current.srcObject = null;
        localVideoRef.current.load();
    }
    socket.emit('webrtc:stop', { streamId });
    setLive(false);
  };
  
  useEffect(() => {
    return () => {
      if (localVideoRef.current) {
        localVideoRef.current.pause();
        localVideoRef.current.removeAttribute('src');
        localVideoRef.current.load();
      }
      if (moviePlayerRef.current) {
        moviePlayerRef.current.pause();
        moviePlayerRef.current.removeAttribute('src');
        moviePlayerRef.current.load();
      }
    };
  }, []);

  const toggleMute = () => {
    localStream.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMuted(m => !m);
  };

  const toggleCamera = () => {
    localStream.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setCamOff(c => !c);
  };

  const switchSource = async (source) => {
    if (live) stopStream();
    setVideoSource(source);
    await startStream(source);
  };

  return (
    <div className="vp-container vp-streamer">
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
        <span 
          onClick={() => {
            navigator.clipboard.writeText(streamId);
            alert(`Stream ID ${streamId} copied to clipboard!`);
          }} 
          style={{ cursor: 'pointer', background: '#333', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', border: '1px solid #444', color: '#00e5ff', fontWeight: 'bold' }} 
          title="Click to copy Stream ID"
        >
          Stream ID: {streamId} 📋
        </span>
      </div>

      {/* Preview */}
      <div className="vp-video-wrap">
        <video ref={localVideoRef} autoPlay muted playsInline className="vp-video" style={{ display: videoSource === 'movie' && live ? 'none' : 'block' }} />
        <video ref={moviePlayerRef} autoPlay crossOrigin="anonymous" playsInline controls className="vp-video" style={{ display: videoSource === 'movie' && live ? 'block' : 'none', width: '100%', height: '100%', objectFit: 'contain', backgroundColor: 'black' }} />
        {!live && (
          <div className="vp-offline-overlay">
            <div className="vp-offline-icon">🎥</div>
            <p className="vp-offline-title">Camera preview</p>
            <p className="vp-offline-sub">Choose a source and go live when ready</p>
          </div>
        )}
        {live && (
          <div className="vp-live-badges">
            <span className="badge-live">LIVE</span>
            <span className="vp-viewer-pill">
              <span className="viewer-dot" /> {viewerCount} watching
            </span>
          </div>
        )}
        {camOff && live && (
          <div className="vp-cam-off">
            <span>📷</span><p>Camera off</p>
          </div>
        )}
      </div>

      {error && <div className="vp-error">{error}</div>}

      {/* Controls */}
      <div className="vp-controls">
        {!live ? (
          <>
            <div className="vp-source-toggle">
              <button className={`vp-source-btn ${videoSource === 'camera' ? 'active' : ''}`} onClick={() => setVideoSource('camera')}>📷 Camera</button>
              <button className={`vp-source-btn ${videoSource === 'screen' ? 'active' : ''}`} onClick={() => setVideoSource('screen')}>🖥️ Screen</button>
              <button className={`vp-source-btn ${videoSource === 'movie' ? 'active' : ''}`} onClick={() => setVideoSource('movie')}>🎬 Movie</button>
            </div>

            {videoSource === 'movie' && (
              <select className="vp-movie-select" style={{ marginBottom: '15px', padding: '10px', width: '100%', borderRadius: '4px', background: '#222', color: 'white', border: '1px solid #444' }}
                onChange={e => setSelectedMovie(movies.find(m => m._id === e.target.value))}
                value={selectedMovie?._id || ''}>
                <option value="">Select a Movie to Stream...</option>
                {movies.map(m => (<option key={m._id} value={m._id}>{m.title}</option>))}
              </select>
            )}

            <button className="btn btn-danger vp-go-live-btn" onClick={() => startStream(videoSource)} disabled={videoSource === 'movie' && !selectedMovie}>
              ● Go Live
            </button>
          </>
        ) : (
          <>
            <button className={`vp-ctrl-btn ${muted ? 'vp-ctrl-btn--off' : ''}`} onClick={toggleMute} title={muted ? 'Unmute mic' : 'Mute mic'}>{muted ? '🔇' : '🎙️'}</button>
            <button className={`vp-ctrl-btn ${camOff ? 'vp-ctrl-btn--off' : ''}`} onClick={toggleCamera} title={camOff ? 'Turn camera on' : 'Turn camera off'}>{camOff ? '📷' : '📸'}</button>
            <div className="vp-source-toggle" style={{ margin: '0 auto' }}>
              <button className={`vp-source-btn ${videoSource === 'camera' ? 'active' : ''}`} onClick={() => switchSource('camera')} title="Switch to Camera">📷</button>
              <button className={`vp-source-btn ${videoSource === 'screen' ? 'active' : ''}`} onClick={() => switchSource('screen')} title="Switch to Screen">🖥️</button>
              <button className={`vp-source-btn ${videoSource === 'movie' ? 'active' : ''}`} onClick={async () => {
                  setVideoSource('movie');
                  if (selectedMovie) {
                    if (live) stopStream();
                    setTimeout(() => startStream('movie'), 100);
                  }
              }} title="Switch to Movie">🎬</button>
            </div>
            
            <button className="btn btn-danger" onClick={stopStream}>■ End stream</button>
            
            {videoSource === 'movie' && (
              <select className="vp-movie-select" style={{ marginTop: '15px', padding: '10px', width: '100%', borderRadius: '4px', background: '#222', color: 'white', border: '1px solid #444' }}
                onChange={async (e) => {
                  const m = movies.find(x => x._id === e.target.value);
                  setSelectedMovie(m);
                  if (m && live) {
                     stopStream();
                     setTimeout(() => startStream('movie'), 500);
                  }
                }}
                value={selectedMovie?._id || ''}>
                <option value="">Switch Movie...</option>
                {movies.map(m => (<option key={m._id} value={m._id}>{m.title}</option>))}
              </select>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  VIEWER — receives stream from streamer
// ─────────────────────────────────────────────────────────
export function ViewerPlayer({ streamId }) {
  const remoteVideoRef = useRef(null);
  const pcRef          = useRef(null);
  const socket         = getSocket();

  const [status,   setStatus]   = useState('waiting');  // waiting | connecting | live | ended
  const [muted,    setMuted]    = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const wrapRef = useRef(null);

  const connectToStreamer = useCallback(async (streamerId) => {
    setStatus('connecting');

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Display incoming video
    pc.ontrack = ({ streams }) => {
      if (remoteVideoRef.current && streams[0]) {
        remoteVideoRef.current.srcObject = streams[0];
        setStatus('live');
      }
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socket.emit('webrtc:ice', { targetId: streamerId, candidate });
    };

    pc.oniceconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.iceConnectionState)) {
        setStatus('ended');
      }
    };

    // Tell streamer we're ready → streamer will send offer
    socket.emit('webrtc:viewer-ready', { streamId });
  }, [socket, streamId]);

  useEffect(() => {
    if (!socket) return;

    // If streamer is already live when we join
    socket.on('streamer:present', ({ streamerId }) => {
      connectToStreamer(streamerId);
    });

    // Receive offer from streamer
    socket.on('webrtc:offer', async ({ streamerId, offer }) => {
      const pc = pcRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc:answer', { streamerId, answer });
    });

    // ICE from streamer
    socket.on('webrtc:ice', async ({ fromId, candidate }) => {
      if (pcRef.current) await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on('streamer:ended', () => {
      setStatus('ended');
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      pcRef.current?.close();
    });

    return () => {
      socket.off('streamer:present');
      socket.off('webrtc:offer');
      socket.off('webrtc:ice');
      socket.off('streamer:ended');
      pcRef.current?.close();
      if (remoteVideoRef.current) {
          remoteVideoRef.current.pause();
          remoteVideoRef.current.removeAttribute('src');
          remoteVideoRef.current.load();
      }
    };
  }, [socket, connectToStreamer]);

  const toggleMute = () => {
    if (remoteVideoRef.current) remoteVideoRef.current.muted = !remoteVideoRef.current.muted;
    setMuted(m => !m);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      wrapRef.current?.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  return (
    <div className="vp-container vp-viewer" ref={wrapRef}>
      <div className="vp-video-wrap">
        <video ref={remoteVideoRef} autoPlay playsInline className="vp-video" />

        {status === 'waiting' && (
          <div className="vp-offline-overlay">
            <div className="vp-spinner" />
            <p className="vp-offline-title">Waiting for stream to start…</p>
          </div>
        )}

        {status === 'connecting' && (
          <div className="vp-offline-overlay">
            <div className="vp-spinner" />
            <p className="vp-offline-title">Connecting…</p>
          </div>
        )}

        {status === 'ended' && (
          <div className="vp-offline-overlay">
            <div className="vp-offline-icon">📡</div>
            <p className="vp-offline-title">Stream ended</p>
            <p className="vp-offline-sub">The streamer has gone offline.</p>
          </div>
        )}

        {status === 'live' && (
          <div className="vp-live-badges">
            <span className="badge-live">LIVE</span>
          </div>
        )}

        {/* Viewer controls overlay */}
        {status === 'live' && (
          <div className="vp-viewer-controls">
            <button className="vp-ctrl-btn" onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}>
              {muted ? '🔇' : '🔊'}
            </button>
            <button className="vp-ctrl-btn" onClick={toggleFullscreen} title="Fullscreen">
              {fullscreen ? '⛶' : '⛶'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
