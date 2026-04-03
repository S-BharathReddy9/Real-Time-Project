# StreamSphere 🔴

A real-time live streaming platform for 10–20 users built with React, Node.js, MongoDB, and Socket.io.

## Stack
- **Frontend**: React 18, React Router v6, Axios, Socket.io-client
- **Backend**: Node.js, Express, Socket.io, JWT auth
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.io (chat + viewer counts)
- **Streaming**: WebRTC (integrate your preferred media server)

## Quick Start

### 1. Clone and install
```bash
# Server
cd server && npm install

# Client
cd client && npm install
```

### 2. Configure environment
```bash
cp .env.example server/.env
cp .env.example client/.env
```

### 3. Run
```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm start
```

## Deployment Notes

If you deploy the frontend to Vercel, the build can succeed while runtime API calls still fail. The frontend needs production environment variables at build time:

```bash
REACT_APP_API_URL=https://your-backend-domain.com/api
REACT_APP_SOCKET_URL=https://your-backend-domain.com
```

The backend must also allow the deployed frontend origin:

```bash
CLIENT_URL=https://your-app.vercel.app
CLIENT_URLS=https://your-app.vercel.app,https://your-preview-domain.vercel.app
ALLOW_VERCEL_PREVIEWS=true
```

`ALLOW_VERCEL_PREVIEWS=true` is optional and allows `*.vercel.app` preview deployments to connect without updating the backend for every preview URL.

## Pages
| Route | Page | Auth |
|-------|------|------|
| `/` | Home — browse live streams | Public |
| `/login` | Sign in | Public |
| `/register` | Create account | Public |
| `/dashboard` | Manage streams, go live | Private |
| `/stream/:id` | Watch stream + chat | Public |
| `/profile/:id` | Streamer profile | Public |

## Real-time Chat Flow
```
User types message
      ↓
socket.emit('chat:message', { streamId, content })
      ↓
chatSocket.js saves to MongoDB
      ↓
io.to(streamId).emit('chat:message', populated)
      ↓
All viewers in room receive it instantly
```
