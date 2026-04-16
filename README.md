🎵 BeatFlow – Modern Music Streaming Platform

🚀 Live Demo: https://beatflow-26.vercel.app/

A full-stack music streaming platform built with React, Node.js, Express, and MongoDB that delivers a Spotify-like experience with secure authentication, payments, and real-time features.

🔥 Why This Project Matters

Most student projects are CRUD apps.
This is not.

✔ Real authentication using Clerk
✔ Real payments via Cashfree
✔ Real-time notifications (SSE)
✔ Full media handling with Cloudinary
✔ Scalable backend architecture

👉 This is production-style engineering, not a tutorial clone.

🎯 Core Features
👤 User Side
🔐 Secure login/signup (Clerk)
🎧 Stream music with full player controls
❤️ Like & save songs
📂 Create playlists
💳 Subscribe to premium plans
💰 Wallet system for payments
📥 Download songs
🔔 Real-time notifications
🛠 Admin Side
👥 Manage users
🎵 Upload songs & albums
📊 View analytics
🎁 Create offers
📢 Send announcements
🖥️ Live Preview

👉 Try it here:
https://beatflow-26.vercel.app/

⚠️ Don’t just show code — make people use your product

🧱 Tech Stack
Frontend
React 19 + TypeScript
Vite
Tailwind CSS + DaisyUI
Zustand
Backend
Node.js + Express
MongoDB + Mongoose
Clerk Authentication
Cashfree Payments
Cloudinary Storage
⚙️ Architecture Overview
Frontend (React)
       ↓
Backend API (Express)
       ↓
MongoDB + Cloudinary + Clerk + Cashfree

👉 Clean separation of concerns + scalable structure

⚡ Getting Started
Clone the project
git clone <repo-url>
cd music_app
Run Backend
cd backend
npm install
npm run dev
Run Frontend
cd frontend
npm install
npm run dev
🔐 Environment Setup

You must configure:

Clerk (Auth)
Cashfree (Payments)
Cloudinary (Media)
MongoDB (Database)

Without this → app won’t work. No shortcuts.

📦 Key APIs
/api/songs → Music data
/api/playlists → User playlists
/api/payment → Subscription & wallet
/api/user → Profile & notifications
🚢 Deployment
Frontend → Vercel
Backend → Render / Railway
Database → MongoDB Atlas