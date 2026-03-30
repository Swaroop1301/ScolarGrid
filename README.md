# ScholarGrid

A comprehensive academic collaboration platform built with **Vite + React + TailwindCSS** and powered by **Supabase** (PostgreSQL, Auth, Storage, Realtime).

## Features

- **Authentication** — Email/password sign-up and login via Supabase Auth
- **Notes Management** — Upload, browse, like, and download academic notes
- **Realtime Chat** — Group messaging with Supabase Realtime subscriptions
- **Leaderboard** — Gamified ranking system based on contribution points
- **Feedback System** — Students submit issues, admins respond
- **Admin Dashboard** — KPIs, user management, notes moderation, analytics
- **Role-Based Access** — Student and Admin portals with Row Level Security

## Quick Start

```bash
npm install
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

## Supabase Setup Checklist

Follow these steps **in order** after creating your Supabase project:

### 1. Database Schema
Run in **Supabase SQL Editor**:
1. `supabase/migrations/001_initial_schema.sql` — Creates 8 tables, 1 view, 2 triggers
2. `supabase/migrations/002_rls.sql` — Enables Row Level Security with granular policies
3. `supabase/migrations/003_storage.sql` — Storage bucket access policies

### 2. Storage Buckets
In **Supabase Dashboard → Storage**:
1. Create bucket `notes-files` (set **Public** = true)
2. Create bucket `avatars` (set **Public** = true)

### 3. Enable Realtime
In **Supabase Dashboard → Database → Replication → Tables**:
- Toggle **ON** the `messages` table

### 4. Environment Variables
Create a `.env` file in the project root:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

> ⚠️ **Never** expose the `service_role` key in frontend code.

### 5. Auth Settings
In **Supabase Dashboard → Auth → Settings**:
- Ensure **Email Confirmations** is configured (enable or disable based on preference)
- The `handle_new_user` trigger auto-creates a `profiles` row on every sign-up

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TailwindCSS 3 |
| Auth | Supabase Auth (email/password) |
| Database | Supabase PostgreSQL with RLS |
| Storage | Supabase Storage (notes-files, avatars) |
| Realtime | Supabase Realtime (postgres_changes) |
| Charts | Recharts |
| Animations | Framer Motion |
| Icons | Lucide React |

## Project Structure

```
src/
├── components/
│   ├── feedback/      # LoadingScreen, PageMessage, UnsupportedFeaturePage
│   └── layout/        # StudentLayout, AdminLayout
├── context/
│   ├── AuthContext.jsx # Supabase auth + profile state
│   └── ThemeContext.jsx
├── lib/
│   ├── supabase.js    # Supabase client singleton
│   └── analytics.js   # Event logging utility
├── pages/
│   ├── admin/         # AdminDashboard, Users, Notes, Groups, Complaints, Analytics
│   ├── auth/          # Login, Signup
│   └── student/       # Dashboard, Notes, Chat, Leaderboard, Feedback, Profile
├── routes/
│   ├── AppRouter.jsx
│   └── ProtectedRoute.jsx
└── App.jsx
```

## Database Schema

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (extends auth.users) |
| `notes` | Uploaded academic resources |
| `chat_groups` | Chat room containers |
| `group_members` | Group membership (M:N) |
| `messages` | Chat messages |
| `complaints` | Student feedback/issues |
| `note_interactions` | Likes and downloads |
| `analytics_events` | Usage telemetry |
| `leaderboard` (view) | Ranked students by points |
