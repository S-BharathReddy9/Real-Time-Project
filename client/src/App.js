import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { StreamProvider } from './context/StreamContext';
import Navbar from './components/Navbar/Navbar';
import AppRoutes from './routes/AppRoutes';
import './styles/main.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <StreamProvider>
          <Navbar />
          <main>
            <AppRoutes />
          </main>
        </StreamProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
