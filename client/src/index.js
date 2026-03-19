import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Suppress "The play() request was interrupted" unhandled rejection dev overlays
window.addEventListener('unhandledrejection', event => {
  if (event.reason?.message?.includes('play() request was interrupted')) {
    event.preventDefault();
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
