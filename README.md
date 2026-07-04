# LiveChat — Real-time Chat Application

A full-stack real-time chat app with 1-to-1 messaging, group chats, file sharing, voice messages, and WebRTC video/audio calls.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, Tailwind CSS v4, Zustand, Socket.IO client, React Query, Framer Motion, React Hook Form |
| Backend | Node.js + Express, Socket.IO, JWT auth (access + refresh tokens), Mongoose, Cloudinary |
| Database | MongoDB |
| Real-time | Socket.IO (chat, presence, typing) + WebRTC (calls, screen share) |
| DevOps | Docker, Docker Compose |

## Quick start (Docker)

```bash
# 1. Clone / unzip the project
cd chatapp

# 2. Fill in real secrets
cp backend/.env.example backend/.env
# Edit backend/.env: set JWT secrets, SMTP, Cloudinary, Google OAuth

cp frontend/.env.example frontend/.env
# Edit frontend/.env: set VITE_GOOGLE_CLIENT_ID if using Google auth

# 3. Start everything
docker compose up --build

# 4. Visit
#   Frontend:  http://localhost:5173
#   Backend:   http://localhost:5000/api/health
```

## Local development (without Docker)

```bash
# Prerequisites: Node 20+, MongoDB running locally

# Backend
cd backend
npm install
cp .env.example .env   # fill in secrets
npm run dev            # runs on :5000

# Frontend (new terminal)
cd frontend
npm install
cp .env.example .env
npm run dev            # runs on :5173
```

## API reference (key routes)

```
POST   /api/auth/register          Register
POST   /api/auth/login             Login → { accessToken, user }
POST   /api/auth/google            Google OAuth login
POST   /api/auth/refresh           Refresh access token (cookie)
POST   /api/auth/logout            Logout
POST   /api/auth/forgot-password   Send reset email
POST   /api/auth/reset-password    Reset password with token
GET    /api/auth/me                Get current user

GET    /api/chats                  List my chats
POST   /api/chats/one-to-one      Get or create 1-to-1 chat
GET    /api/chats/:id              Get chat by ID

GET    /api/messages/:chatId       Paginated messages (infinite scroll)
GET    /api/messages/:chatId/search?q= Search messages
PATCH  /api/messages/:id           Edit message
DELETE /api/messages/:id           Delete message
POST   /api/messages/:id/reactions Toggle emoji reaction
POST   /api/messages/:id/pin       Toggle pin
POST   /api/messages/:id/star      Toggle star
POST   /api/messages/:id/forward   Forward to other chats

POST   /api/groups                 Create group
PATCH  /api/groups/:id             Edit group (admin)
DELETE /api/groups/:id             Delete group (admin)
POST   /api/groups/:id/members     Add members (admin)
DELETE /api/groups/:id/members/:uid Remove member (admin)
POST   /api/groups/:id/admins/:uid Promote to admin
POST   /api/groups/:id/leave       Leave group

POST   /api/uploads/chat/:chatId   Upload file/image/audio
POST   /api/uploads/avatar         Upload avatar

GET    /api/notifications          Get notifications
PATCH  /api/notifications/:id/read Mark one read
PATCH  /api/notifications/read-all Mark all read

GET    /api/calls/:chatId          Call history

GET    /api/users/search?q=        Search users
PATCH  /api/users/me               Update profile

# Admin (role: admin required)
GET    /api/admin/users            List users
PATCH  /api/admin/users/:id/block  Block/unblock
DELETE /api/admin/messages/:id     Moderate message
GET    /api/admin/analytics        Platform stats
```

## Socket.IO events

### Client → Server
| Event | Payload |
|---|---|
| `join_room` | `{ chatId }` |
| `leave_room` | `{ chatId }` |
| `send_message` | `{ chatId, type, content, attachment?, replyTo? }` |
| `typing` | `{ chatId }` |
| `stop_typing` | `{ chatId }` |
| `message_seen` | `{ chatId, messageIds }` |
| `forward_message` | `{ messageId, chatIds }` |
| `call_user` | `{ chatId, callType, calleeIds }` |
| `call_accept` | `{ callId, chatId }` |
| `call_reject` | `{ callId, chatId }` |
| `call_offer` | `{ callId, toUserId, sdp }` |
| `call_answer` | `{ callId, toUserId, sdp }` |
| `ice_candidate` | `{ callId, toUserId, candidate }` |
| `screen_share_start` | `{ callId }` |
| `screen_share_stop` | `{ callId }` |
| `call_end` | `{ callId, chatId }` |

### Server → Client
`receive_message`, `typing`, `stop_typing`, `online_users`, `user_online`, `user_offline`, `message_seen`, `new_notification`, `incoming_call`, `call_accepted`, `call_rejected`, `call_offer`, `call_answer`, `ice_candidate`, `call_ended`, `screen_share_started`, `screen_share_stopped`, `error`

## Deployment

### Frontend → Vercel
```bash
cd frontend && npm run build
# Push to GitHub, import in Vercel, set env vars:
# VITE_API_URL, VITE_SOCKET_URL, VITE_GOOGLE_CLIENT_ID
```

### Backend → Render / Railway
```bash
# Set env vars in the dashboard (same as backend/.env)
# Start command: node server.js
# Override MONGO_URI with your MongoDB Atlas connection string
```

### Database → MongoDB Atlas
1. Create cluster at cloud.mongodb.com
2. Set `MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/chatapp`
3. Whitelist your server IP in Atlas Network Access

## Folder structure

```
chatapp/
├── backend/
│   ├── config/         db.js, cloudinary.js
│   ├── controllers/    auth, chat, message, upload, group, notification, call, admin
│   ├── middleware/     auth, error, upload, validators
│   ├── models/         User, Chat, Message, Notification, Call
│   ├── routes/         all REST routes
│   ├── services/       email, upload, notification
│   ├── socket/         chatSocket.js, callSocket.js, presenceStore.js, socketAuth.js
│   ├── utils/          generateTokens.js
│   ├── app.js          Express app (no HTTP server)
│   └── server.js       HTTP + Socket.IO bootstrap
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── auth/   AuthLayout, ProtectedRoute, GoogleAuthButton
│       │   ├── calls/  CallOverlay
│       │   ├── chat/   ChatHeader, MessageList, MessageBubble, MessageInput, TypingIndicator
│       │   ├── common/ Avatar, Button, Input
│       │   └── dashboard/ Sidebar, NewChatModal
│       ├── hooks/      useAuthBootstrap, useChatSocketEvents, useWebRTC
│       ├── pages/      LandingPage, DashboardLayout, ChatPage, CallPage, SettingsPage, auth/*
│       ├── services/   api.js, authService, chatService, messageService, socket
│       ├── store/      authStore, chatStore, callStore
│       └── utils/      helpers.js
│
└── docker-compose.yml
```
