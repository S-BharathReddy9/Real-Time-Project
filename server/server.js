require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/database');
const initSocket = require('./config/socket');
const { corsOrigin } = require('./config/allowedOrigins');
const { errorHandler } = require('./middleware/errorMiddleware');

// Route imports
const authRoutes = require('./routes/authRoutes');
const streamRoutes = require('./routes/streamRoutes');
const chatRoutes = require('./routes/chatRoutes');
const userRoutes = require('./routes/userRoutes');
const videoRoutes = require('./routes/videoRoutes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = initSocket(server);
app.set('io', io);

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/streams', streamRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/videos', videoRoutes);

app.get('/health', (req, res) => res.json({ status: 'StreamSphere server is live 🔴' }));

app.get('/', (req, res) =>
  res.json({
    status: 'ok',
    service: 'StreamSphere backend',
    health: '/health',
  })
);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => console.log(`🚀 Server running on ${HOST}:${PORT}`));
