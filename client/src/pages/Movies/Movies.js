import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './Movies.css';

const Movies = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const response = await api.get('/videos');
        setMovies(response.data.videos);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch movies.');
        setLoading(false);
      }
    };
    fetchMovies();
  }, []);

  if (loading) return <div className="movies-loading">Loading movies...</div>;
  if (error) return <div className="movies-error">{error}</div>;

  return (
    <div className="movies-container">
      <h2>All Movies</h2>
      <div className="movies-grid">
        {movies.map((movie) => (
          <Link to={`/movies/${movie._id}`} key={movie._id} className="movie-card">
            <div className="thumbnail-wrapper">
              <img src={movie.thumbnailUrl} alt={movie.title} className="thumbnail" />
              <div className="play-icon">&#9654;</div>
            </div>
            <div className="movie-details">
              <h3>{movie.title}</h3>
              <p>{movie.description && movie.description.substring(0, 60)}...</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Movies;
