import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactPlayer from 'react-player';
import api from '../../services/api';
import './MoviePlayer.css';

const MoviePlayer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(true);

  // Stop playing gracefully before unmounting
  useEffect(() => {
    return () => {
      setPlaying(false);
    };
  }, []);

  const handleBack = () => {
    setPlaying(false);
    setTimeout(() => navigate(-1), 50);
  };

  useEffect(() => {
    const fetchMovie = async () => {
      try {
        const response = await api.get(`/videos/${id}`);
        setMovie(response.data.video);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch movie details.');
        setLoading(false);
      }
    };
    fetchMovie();
  }, [id]);

  if (loading) return <div className="movie-loading">Loading movie...</div>;
  if (error) return <div className="movie-error">{error}</div>;

  const getVideoSource = () => {
    if (!movie || !movie.videoUrl) return '';
    if (movie.videoUrl.startsWith('http')) return movie.videoUrl;
    // Route local paths directly through the Node streaming core parameter proxy
    return `${api.defaults.baseURL}/videos/${id}/stream`;
  };

  const videoSource = getVideoSource();

  return (
    <div className="movie-player-container">
      <button className="back-btn" onClick={handleBack}>
        &larr; Back to Movies
      </button>
      
      <div className="player-wrapper">
        <ReactPlayer
          className="react-player"
          src={videoSource}
          controls={true}
          width="100%"
          height="100%"
          playing={playing}
          playsInline={true}
          onError={() => setError('This movie could not be played. Please check the video source.')}
        />
      </div>

      <div className="movie-info">
        <h1>{movie.title}</h1>
        <p>{movie.description}</p>
      </div>
    </div>
  );
};

export default MoviePlayer;
