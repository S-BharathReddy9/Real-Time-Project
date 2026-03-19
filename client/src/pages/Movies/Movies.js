import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Movies.css';

const Movies = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        // Will fetch from backend, mocking for now
        // const response = await axios.get('/api/videos');
        // setMovies(response.data.videos);
        
        setMovies([
            {
                _id: '1',
                title: 'Sample Movie for Testing',
                description: 'This is a wonderful test movie.',
                thumbnailUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=1025&ixlib=rb-4.0.3',
            },
            {
                _id: '2',
                title: 'Another Awesome Movie',
                description: 'Action packed adventure for everyone.',
                thumbnailUrl: 'https://images.unsplash.com/photo-1574267432553-4b4628081524?auto=format&fit=crop&q=80&w=1170&ixlib=rb-4.0.3',
            }
        ]);
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
