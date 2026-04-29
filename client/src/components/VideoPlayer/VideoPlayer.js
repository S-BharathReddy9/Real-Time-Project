import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from '../../services/socketService';
import api from '../../services/api';
import './VideoPlayer.css';

// STUN/TURN servers for WebRTC - includes local network friendly servers
const ICE_SERVERS = {
  iceServers: [
    // Google STUN servers (works for internet)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // Twilio free STUN (fallback)
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
  // ICE candidate policy - include all candidates (host, srflx, relay) for local network support
  iceTransportPolicy: 'all',
  iceCandidatePoolSize: 10,
};

const waitForMediaReady = (mediaEl) =>
  new Promise((resolve, reject) => {
    if (!mediaEl) {
      reject(new Error('Movie player is not ready.'));
      return;
    }

    if (mediaEl.readyState >= 2) {
      resolve();
      return;
    }

    const handleReady = () => {
      cleanup();
      resolve();
    };

    const handleError = () => {
      cleanup();
      reject(new Error('Movie could not be loaded for streaming.'));
    };

    const cleanup = () => {
      mediaEl.removeEventListener('loadeddata', handleReady);
      mediaEl.removeEventListener('canplay', handleReady);
      mediaEl.removeEventListener('error', handleError);
    };

    mediaEl.addEventListener('loadeddata', handleReady, { once: true });
    mediaEl.addEventListener('canplay', handleReady, { once: true });
    mediaEl.addEventListener('error', handleError, { once: true });
  });

const waitForCapturedTracks = (stream, timeoutMs = 3000) =>
  new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const checkTracks = () => {
      if (stream?.getVideoTracks().length || stream?.getAudioTracks().length) {
        resolve(stream);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error('Movie stream could not be captured. Try a different video file.'));
        return;
      }

      setTimeout(checkTracks, 100);
    };

    checkTracks();
  });

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
    const existingPeer = peers.current[viewerId];
    if (existingPeer) {
      existingPeer.close();
    }

    if (!localStream.current?.getTracks().length) {
      console.log('[Streamer] No local tracks available');
      return;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peers.current[viewerId] = pc;
    console.log('[Streamer] Created peer connection for viewer:', viewerId);

    // Add all local tracks
    localStream.current?.getTracks().forEach(track => {
      console.log('[Streamer] Adding track:', track.kind, 'enabled:', track.enabled, 'readyState:', track.readyState);
      pc.addTrack(track, localStream.current);
    });

    // Send ICE candidates to that viewer
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        console.log('[Streamer] Sending ICE to viewer:', viewerId, candidate.candidate?.substring(0, 50));
        socket.emit('webrtc:ice', { targetId: viewerId, candidate });
      } else {
        console.log('[Streamer] ICE gathering complete for viewer:', viewerId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[Streamer] ICE connection state for viewer', viewerId, ':', pc.iceConnectionState);
    };

    pc.onconnectionstatechange = () => {
      console.log('[Streamer] Connection state for viewer', viewerId, ':', pc.connectionState);
      if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        if (peers.current[viewerId] === pc) {
          delete peers.current[viewerId];
        }
      }
    };

    // Create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    console.log('[Streamer] Created offer for viewer:', viewerId, 'SDP:', offer.sdp?.substring(0, 100) + '...');

    // Wait for ICE gathering to complete before sending offer
    if (pc.iceGatheringState === 'complete') {
      console.log('[Streamer] ICE already complete, sending offer');
      socket.emit('webrtc:offer', { viewerId, offer: pc.localDescription });
    } else {
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') {
          console.log('[Streamer] ICE gathering complete, sending offer');
          socket.emit('webrtc:offer', { viewerId, offer: pc.localDescription });
        }
      };
      // Timeout fallback - send offer after 1 second even if ICE isn't complete
      setTimeout(() => {
        if (pc.iceGatheringState !== 'complete' && pc.signalingState !== 'closed') {
          console.log('[Streamer] ICE timeout, sending current offer');
          socket.emit('webrtc:offer', { viewerId, offer: pc.localDescription });
        }
      }, 1000);
    }
  }, [socket]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    // A new viewer joined and is ready
    socket.on('webrtc:viewer-ready', ({ viewerId }) => {
      console.log('[Streamer] Viewer ready:', viewerId);
      createPeerForViewer(viewerId);
    });

    // Viewer sent an answer
    socket.on('webrtc:answer', async ({ viewerId, answer }) => {
      console.log('[Streamer] Received answer from viewer:', viewerId);
      const pc = peers.current[viewerId];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    // ICE from viewer
    socket.on('webrtc:ice', async ({ fromId, candidate }) => {
      console.log('[Streamer] Received ICE from viewer:', fromId);
      const pc = peers.current[fromId];
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    const handleViewerCount = ({ count }) => {
      console.log('[Streamer] Viewer count updated:', count);
      setViewerCount(count);
    };
    socket.on('viewer:count', handleViewerCount);

    return () => {
      socket.off('webrtc:viewer-ready');
      socket.off('webrtc:answer');
      socket.off('webrtc:ice');
      socket.off('viewer:count', handleViewerCount);
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

        const videoUrl = selectedMovie.videoUrl || '';
        const isYouTube = videoUrl.includes('youtube') || videoUrl.includes('youtu.be');
        if (isYouTube) throw new Error("You cannot broadcast YouTube videos due to browser security restrictions on iframes. Please use a direct .mp4 link or a local file on your computer!");

        const movieUrl = videoUrl.startsWith('http')
          ? videoUrl
          : `${api.defaults?.baseURL || ''}/videos/${selectedMovie._id}/stream`;

        if (!moviePlayerRef.current) {
          throw new Error('Movie player is not ready yet.');
        }

        moviePlayerRef.current.src = movieUrl;
        await waitForMediaReady(moviePlayerRef.current);
        await moviePlayerRef.current.play();

        // Capture stream from video element - some browsers don't support fps parameter
        let capturedStream = null;
        try {
          capturedStream = moviePlayerRef.current.captureStream
            ? moviePlayerRef.current.captureStream()
            : moviePlayerRef.current.mozCaptureStream
              ? moviePlayerRef.current.mozCaptureStream()
              : null;
        } catch (captureErr) {
          console.error('[Streamer] captureStream error:', captureErr);
          throw new Error('Failed to capture video stream. This browser may not support movie streaming.');
        }

        if (!capturedStream) {
          throw new Error('This browser does not support movie capture for live streaming.');
        }

        stream = await waitForCapturedTracks(capturedStream);
          
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

      // First announce we're live, THEN we can accept viewers
      socket.emit('webrtc:start', { streamId });
      console.log('[Streamer] Announced stream start to server');

      // Give server time to register us before viewers connect
      setTimeout(() => {
        setLive(true);
        console.log('[Streamer] Stream is now LIVE, ready to accept viewers');
      }, 500);
    } catch (err) {
      setError(
        err.name === 'NotAllowedError'
          ? 'Camera/microphone permission denied. Please allow access and try again.'
          : `Could not start stream: ${err.message}`
      );
    }
  };

  const stopBroadcast = () => {
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

  const endStreamSession = async () => {
    stopBroadcast();

    try {
      await api.patch(`/streams/${streamId}/end`);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Stream ended locally, but server cleanup failed. Please refresh your dashboard.'
      );
    }
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
    if (live) stopBroadcast();
    setVideoSource(source);
    await startStream(source);
  };

  return (
    <div className="vp-container vp-streamer">
      <div className="vp-topbar">
        <span
          className="vp-stream-chip"
          onClick={() => {
            navigator.clipboard.writeText(streamId);
            alert(`Stream ID ${streamId} copied to clipboard!`);
          }} 
          title="Click to copy Stream ID"
        >
          Stream ID: {streamId} 📋
        </span>
      </div>

      {/* Preview */}
      <div className={`vp-video-wrap ${videoSource === 'movie' ? 'vp-video-wrap--movie' : ''}`}>
        <video ref={localVideoRef} autoPlay muted playsInline className="vp-video" style={{ display: videoSource === 'movie' && live ? 'none' : 'block' }} />
        <video ref={moviePlayerRef} autoPlay crossOrigin="anonymous" playsInline controls className="vp-video vp-video--movie" style={{ display: videoSource === 'movie' && live ? 'block' : 'none' }} />
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
              <select className="vp-movie-select vp-movie-select--stacked"
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
            <div className="vp-source-toggle vp-source-toggle--live">
              <button className={`vp-source-btn ${videoSource === 'camera' ? 'active' : ''}`} onClick={() => switchSource('camera')} title="Switch to Camera">📷</button>
              <button className={`vp-source-btn ${videoSource === 'screen' ? 'active' : ''}`} onClick={() => switchSource('screen')} title="Switch to Screen">🖥️</button>
              <button className={`vp-source-btn ${videoSource === 'movie' ? 'active' : ''}`} onClick={async () => {
                  setVideoSource('movie');
                  if (selectedMovie) {
                    if (live) stopBroadcast();
                    setTimeout(() => startStream('movie'), 100);
                  }
              }} title="Switch to Movie">🎬</button>
            </div>
            
            <button className="btn btn-danger" onClick={endStreamSession}>■ End stream</button>
            
            {videoSource === 'movie' && (
              <select className="vp-movie-select vp-movie-select--live"
                onChange={async (e) => {
                  const m = movies.find(x => x._id === e.target.value);
                  setSelectedMovie(m);
                  if (m && live) {
                     stopBroadcast();
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
  const streamerIdRef  = useRef(null);
  const pendingIceRef  = useRef([]);
  const socket         = getSocket();

  const [status,   setStatus]   = useState('waiting');  // waiting | connecting | live | ended
  const [muted,    setMuted]    = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [streamerName, setStreamerName] = useState('');
  const wrapRef = useRef(null);

  const clearRemoteVideo = useCallback(() => {
    if (!remoteVideoRef.current) return;

    remoteVideoRef.current.pause();
    remoteVideoRef.current.srcObject = null;
    remoteVideoRef.current.removeAttribute('src');
    remoteVideoRef.current.load();
  }, []);

  const closePeerConnection = useCallback(() => {
    pendingIceRef.current = [];
    if (!pcRef.current) return;

    pcRef.current.ontrack = null;
    pcRef.current.onicecandidate = null;
    pcRef.current.oniceconnectionstatechange = null;
    pcRef.current.onconnectionstatechange = null;
    pcRef.current.close();
    pcRef.current = null;
  }, []);

  const flushPendingIce = useCallback(async (pc) => {
    const queuedCandidates = [...pendingIceRef.current];
    pendingIceRef.current = [];

    for (const candidate of queuedCandidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Could not apply queued ICE candidate:', err);
      }
    }
  }, []);

  const ensurePeerConnection = useCallback(() => {
    if (pcRef.current && pcRef.current.connectionState !== 'closed') {
      return pcRef.current;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;
    console.log('[Viewer] Created new peer connection');

    // Display incoming video - attach to video element immediately
    pc.ontrack = (event) => {
      console.log('[Viewer] Received track event:', event.track.kind, 'streams:', event.streams.length);
      if (remoteVideoRef.current && event.streams[0]) {
        const stream = event.streams[0];
        console.log('[Viewer] Setting srcObject with stream. Tracks:', stream.getTracks().map(t => t.kind));
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.muted = true;
        remoteVideoRef.current.play?.().catch(e => console.error('[Viewer] Play error:', e));
        setStatus('live');
      }
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && streamerIdRef.current) {
        console.log('[Viewer] Sending ICE to streamer:', candidate.candidate?.substring(0, 50));
        socket.emit('webrtc:ice', { targetId: streamerIdRef.current, candidate });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[Viewer] ICE connection state:', pc.iceConnectionState);
      if (['disconnected', 'failed', 'closed'].includes(pc.iceConnectionState)) {
        if (pcRef.current === pc) {
          pcRef.current = null;
        }
        setStatus('ended');
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[Viewer] Connection state:', pc.connectionState);
    };

    return pc;
  }, [socket]);

  const connectToStreamer = useCallback(({ streamerId, resetPeer = false } = {}) => {
    if (!socket) return;

    if (streamerId) {
      streamerIdRef.current = streamerId;
      console.log('[Viewer] Streamer detected:', streamerId);
    }

    if (resetPeer) {
      closePeerConnection();
    }

    const pc = ensurePeerConnection();

    // Tell streamer we're ready → streamer will send offer
    console.log('[Viewer] Sending viewer-ready for stream:', streamId, 'PC state:', pc.connectionState);
    socket.emit('webrtc:viewer-ready', { streamId });
  }, [closePeerConnection, ensurePeerConnection, socket, streamId]);

  // Polling mechanism to detect streamer presence (helps with network issues)
  useEffect(() => {
    if (!socket || status === 'live') return;

    const pollInterval = setInterval(() => {
      if (socket.connected && status !== 'live') {
        console.log('[Viewer] Polling for streamer...');
        socket.emit('webrtc:viewer-ready', { streamId });
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [socket, streamId, status]);

  useEffect(() => {
    if (!socket) return;

    const handleSocketConnect = () => {
      setStatus(prev => (prev === 'ended' ? 'waiting' : prev));
      connectToStreamer({ resetPeer: true });
    };

    const handleStreamerPresent = ({ streamerId, username }) => {
      console.log('[Viewer] Streamer present event:', streamerId, 'username:', username);
      if (username) setStreamerName(username);
      setStatus('connecting');
      connectToStreamer({ streamerId, resetPeer: true });
    };

    const handleOffer = async ({ streamerId, offer }) => {
      try {
        console.log('[Viewer] Received offer from streamer:', streamerId, 'SDP:', offer?.sdp?.substring(0, 100) + '...');
        streamerIdRef.current = streamerId;
        setStatus('connecting');

        let pc = ensurePeerConnection();
        if (pc.signalingState !== 'stable') {
          console.log('[Viewer] Signaling state not stable, closing and recreating');
          closePeerConnection();
          pc = ensurePeerConnection();
        }

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        console.log('[Viewer] Set remote description');
        await flushPendingIce(pc);

        const answer = await pc.createAnswer();
        console.log('[Viewer] Created answer');
        await pc.setLocalDescription(answer);

        // Wait for ICE gathering before sending answer
        if (pc.iceGatheringState === 'complete') {
          console.log('[Viewer] ICE complete, sending answer');
          socket.emit('webrtc:answer', { streamerId, answer: pc.localDescription });
        } else {
          pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === 'complete') {
              console.log('[Viewer] ICE gathering complete, sending answer');
              socket.emit('webrtc:answer', { streamerId, answer: pc.localDescription });
            }
          };
          // Timeout fallback
          setTimeout(() => {
            if (pc.iceGatheringState !== 'complete' && pc.signalingState !== 'closed') {
              console.log('[Viewer] ICE timeout, sending answer');
              socket.emit('webrtc:answer', { streamerId, answer: pc.localDescription });
            }
          }, 1000);
        }
      } catch (err) {
        console.error('Failed to accept stream offer:', err);
        closePeerConnection();
        setStatus('waiting');
      }
    };

    const handleIce = async ({ fromId, candidate }) => {
      if (streamerIdRef.current && fromId !== streamerIdRef.current) return;

      console.log('[Viewer] Received ICE from:', fromId);
      const pc = ensurePeerConnection();
      if (!pc.remoteDescription) {
        pendingIceRef.current.push(candidate);
        return;
      }

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Failed to add ICE candidate:', err);
      }
    };

    const handleStreamerEnded = () => {
      streamerIdRef.current = null;
      setStreamerName('');
      closePeerConnection();
      setStatus('ended');
      clearRemoteVideo();
    };

    socket.on('connect', handleSocketConnect);
    socket.on('streamer:present', handleStreamerPresent);
    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:ice', handleIce);
    socket.on('streamer:ended', handleStreamerEnded);

    if (socket.connected) {
      connectToStreamer({ resetPeer: true });
    }

    return () => {
      socket.off('connect', handleSocketConnect);
      socket.off('streamer:present', handleStreamerPresent);
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:ice', handleIce);
      socket.off('streamer:ended', handleStreamerEnded);
      streamerIdRef.current = null;
      closePeerConnection();
      clearRemoteVideo();
    };
  }, [clearRemoteVideo, closePeerConnection, connectToStreamer, ensurePeerConnection, flushPendingIce, socket]);

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
        <video ref={remoteVideoRef} autoPlay playsInline muted={muted} className="vp-video" />

        {status === 'waiting' && (
          <div className="vp-offline-overlay">
            <div className="vp-spinner" />
            <p className="vp-offline-title">Waiting for stream to start…</p>
            <p className="vp-offline-sub">Socket: {socket?.connected ? 'Connected' : 'Disconnected'}</p>
          </div>
        )}

        {status === 'connecting' && (
          <div className="vp-offline-overlay">
            <div className="vp-spinner" />
            <p className="vp-offline-title">Connecting…</p>
            <p className="vp-offline-sub">Host: {streamerName || streamerIdRef.current?.substring(0,8) || 'Unknown'}</p>
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
            {streamerName && (
              <span className="vp-host-pill">Host: {streamerName}</span>
            )}
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
      
      {/* Debug info - remove in production */}
      <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.7)', color: '#0f0', padding: '8px', fontSize: '10px', fontFamily: 'monospace' }}>
        DEBUG: status={status} | socket={socket?.connected ? '✓' : '✗'} | streamer={streamerIdRef.current?.substring(0,8) || 'none'}
      </div>
    </div>
  );
}
