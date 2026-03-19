import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from '../../services/socketService';
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
  const localStream   = useRef(null);
  const peers         = useRef({});   // viewerId → RTCPeerConnection
  const socket        = getSocket();

  const [live,        setLive]        = useState(false);
  const [error,       setError]       = useState('');
  const [videoSource, setVideoSource] = useState('camera');
  const [muted,       setMuted]       = useState(false);
  const [camOff,      setCamOff]      = useState(false);
  const [viewerCount, setViewerCount] = useState(0);

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
        const screen = await navigator.mediaDisplayMedia({ video: true, audio: true });
        const mic    = await navigator.getUserMedia({ audio: true }).catch(() => null);
        if (mic) {
          mic.getAudioTracks().forEach(t => screen.addTrack(t));
        }
        stream = screen;
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      }

      localStream.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
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
      {/* Preview */}
      <div className="vp-video-wrap">
        <video ref={localVideoRef} autoPlay muted playsInline className="vp-video" />
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
              <button
                className={`vp-source-btn ${videoSource === 'camera' ? 'active' : ''}`}
                onClick={() => setVideoSource('camera')}
              >📷 Camera</button>
              <button
                className={`vp-source-btn ${videoSource === 'screen' ? 'active' : ''}`}
                onClick={() => setVideoSource('screen')}
              >🖥️ Screen</button>
            </div>
            <button className="btn btn-danger vp-go-live-btn" onClick={() => startStream(videoSource)}>
              ● Go Live
            </button>
          </>
        ) : (
          <>
            <button className={`vp-ctrl-btn ${muted ? 'vp-ctrl-btn--off' : ''}`} onClick={toggleMute}
              title={muted ? 'Unmute mic' : 'Mute mic'}>
              {muted ? '🔇' : '🎙️'}
            </button>
            <button className={`vp-ctrl-btn ${camOff ? 'vp-ctrl-btn--off' : ''}`} onClick={toggleCamera}
              title={camOff ? 'Turn camera on' : 'Turn camera off'}>
              {camOff ? '📷' : '📸'}
            </button>
            <div className="vp-source-toggle" style={{ margin: '0 auto' }}>
              <button
                className={`vp-source-btn ${videoSource === 'camera' ? 'active' : ''}`}
                onClick={() => switchSource('camera')}
              >📷</button>
              <button
                className={`vp-source-btn ${videoSource === 'screen' ? 'active' : ''}`}
                onClick={() => switchSource('screen')}
              >🖥️</button>
            </div>
            <button className="btn btn-danger" onClick={stopStream}>■ End stream</button>
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
