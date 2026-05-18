# Real-Time MERN Chat App 💬

A full-stack messaging application built with React, Node.js, MongoDB, and Socket.io. Supports private DMs, multi-user groups, and live status tracking.

## 🚀 Quick Setup

1. **Backend Configuration:**
   * Navigate to `/server` and run `npm install`.
   * Create a `.env` file inside `/server`:
     ```env
     PORT=5000
     ATLAS_URI=your_mongodb_atlas_connection_string
     JWT_SECRET=your_jwt_secret_key
     CLIENT_URL=http://localhost:5173
     ```
   * Start server: `npm start`

2. **Frontend Configuration:**
   * Navigate to `/client` and run `npm install`.
   * Create a `.env` file inside `/client`:
     ```env
     VITE_BACKEND_URL=http://localhost:5000
     
     ```
   * Start client: `npm run dev`
## 📁 Project Structure
* `client/` - React frontend layout (Vite + Context API)
* `server/` - Node/Express backend configuration
* `server/socket/` - Real-time websocket network logic

## 🌐 Deployment Details
* **Frontend:** Deployed to Vercel (uses `vercel.json` for path routing).
* **Backend:** Deployed to Render as a Node Web Service.

## 👨‍💻 Author
* **GitHub:** [@Abhijith-AjayKumar](https://github.com/Abhijith-AjayKumar)
