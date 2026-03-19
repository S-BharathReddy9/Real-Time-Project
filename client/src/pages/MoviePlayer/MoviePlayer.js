import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactPlayer from 'react-player';
import axios from 'axios';
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
        // We will build this endpoint down the line, simulating for now or fetching if available
        // const response = await axios.get(`/api/videos/${id}`);
        // setMovie(response.data.video);
        
        // Mock data for immediate preview if API is not yet ready
        setMovie({
          title: "Sample Movie for Testing",
          description: "This is a wonderful test movie.",
          videoUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" // A public HLS test stream
        });
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

  return (
    <div className="movie-player-container">
      <button className="back-btn" onClick={handleBack}>
        &larr; Back to Movies
      </button>
      
      <div className="player-wrapper">
        <ReactPlayer
          className="react-player"
          url={movie.videoUrl}
          controls={true}
          width="100%"
          height="100%"
          playing={playing}
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
