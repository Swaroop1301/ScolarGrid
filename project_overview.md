# ScholarGrid Project Overview

This document provides a comprehensive overview of the file structure and the prominent features implemented in the ScholarGrid frontend based on the `Fixed_Frontend` branch.

## 📂 File Structure

The project has been scaffolded using Vite + React and TailwindCSS. Below is the primary structure of the `src` directory, which governs the core application:

```text
src/
├── components/
│   ├── feedback/
│   │   └── LoadingScreen.jsx      # Reusable loading states
│   └── layout/
│       ├── AdminLayout.jsx        # Admin portal wrapper layout
│       └── StudentLayout.jsx      # Student portal wrapper layout
├── context/
│   ├── AuthContext.jsx            # Global state for Authentication
│   └── ThemeContext.jsx           # Global state for UI Theming (e.g., Light/Dark mode)
├── pages/
│   ├── admin/                     # --- Admin Features ---
│   │   ├── AdminDashboard.jsx     # Overview of platform usage
│   │   ├── AnalyticsPage.jsx      # Deep dive analytics and metrics
│   │   ├── ComplaintsPage.jsx     # View and resolve student complaints
│   │   ├── GroupsPage.jsx         # Manage chat/study groups
│   │   ├── NotesModeration.jsx    # Moderate uploaded student notes
│   │   └── UsersPage.jsx          # Register/manage students and staff
│   ├── auth/                      # --- Authentication ---
│   │   ├── LoginPage.jsx          # User login
│   │   └── SignupPage.jsx         # New student registration
│   └── student/                   # --- Student Features ---
│   │   ├── ChatPage.jsx           # Real-time student communication
│   │   ├── Dashboard.jsx          # Student portal landing overview
│   │   ├── FeedbackPage.jsx       # Submit feedback or complaints
│   │   ├── LeaderboardPage.jsx    # Student rankings based on participation
│   │   ├── NotesPage.jsx          # Upload and access class notes
│   │   └── ProfilePage.jsx        # Manage personal user profile
├── routes/
│   ├── AppRouter.jsx              # Centralized route definitions
│   └── ProtectedRoute.jsx         # Route wrapper enforcing Role-Based Access Control (RBAC)
├── App.jsx                        # Root React Component wrapping contexts and routing
├── index.css                      # Global TailwindCSS base configurations
└── main.jsx                       # Application entry point
```

---

## 🚀 Website Features

The platform is strictly divided into authentication, student, and administrator domains using **Role-Based Access Control**.

### 1. Authentication & Core Infrastructure
* **Secure Routing:** Non-authenticated users are automatically redirected to the Login page. Authenticated users are restricted to their assigned roles (Admin vs. Student).
* **Global Theming:** Provides dynamic visual themes globally applied via `ThemeContext`.
* **Centralized State:** User authentication session is maintained efficiently using `AuthContext`.

### 2. Student Portal
Available to users logged in with the `student` role.
* **Student Dashboard:** A consolidated view summarizing recent notes, chat activity, and personal statistics.
* **Notes Management (`/notes`):** A repository feature where students can view, share, and organize academic notes.
* **Real-time Chat (`/chat`):** A focused communication channel for immediate peer-to-peer or group messaging.
* **Gamification / Leaderboard (`/leaderboard`):** A competitive ranking system likely tracking academic activity to engage students.
* **Feedback System (`/feedback`):** Enables students to lodge complaints, give feedback, and communicate directly with the administration.
* **Profile Management (`/profile`):** Allows students to update personal details and system preferences.

### 3. Administrator Portal
Available to users logged in with the `admin` role.
* **Admin Dashboard:** High-level metrics showing the overall health and activity of the platform.
* **User Management (`/admin/users`):** Full control over user accounts. Ability to monitor, add, edit, or remove students/users.
* **Content Moderation (`/admin/notes`):** Review notes uploaded by students to ensure academic integrity and prevent inappropriate content.
* **Group Management (`/admin/groups`):** Control over distinct communication channels or study groups across the platform.
* **Complaint Resolution (`/admin/complaints`):** The receiving end of the student feedback system for managing, reviewing, and closing issue tickets.
* **Systems Analytics (`/admin/analytics`):** Detailed statistical views detailing daily traffic, notes engagement, and system performance.
