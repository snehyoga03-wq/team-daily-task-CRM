# SnehYoga Team CRM — Project Overview

A fully functional, real-time CRM application for the SnehYoga team. Built with **Next.js**, **TypeScript**, **Supabase**, and **Zustand**. Designed as a mobile-first PWA.

---

## 🚀 Tech Stack

| Technology | Purpose |
|---|---|
| **Next.js 16** (App Router) | Framework & SSR |
| **TypeScript** | Type safety across the codebase |
| **Supabase** (PostgreSQL) | Database, Auth-free login, Realtime subscriptions |
| **Zustand** | Client-side state management (persisted to localStorage) |
| **Tailwind CSS 4** | Styling & responsive design |
| **Framer Motion** | Animations & transitions |
| **Recharts** | Data visualization (charts, graphs) |

---

## 🔐 Authentication System

This is a **lightweight internal team login** — no passwords or Supabase Auth needed.

- **Login**: Enter your **Name** + **Mobile Number**
- **Existing users**: Recognized by phone number → logged in instantly
- **New users**: Auto-registered as a team member on first login
- **State**: Persisted in `localStorage` via the `useAuthStore` (Zustand)
- **Logout**: Available in Settings view → clears local state

> **File**: [`src/lib/auth.ts`](file:///c:/Users/prath/OneDrive/Documents/@Downloads/@sneha%20yoga/@production/team-daily-task-CRM/src/lib/auth.ts)

---

## 🗄️ Database (Supabase)

### Connection
- **URL**: `NEXT_PUBLIC_SUPABASE_URL` (in `.env.local`)
- **Anon Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (in `.env.local`)
- **RLS**: Policies allow full CRUD for both `anon` and `authenticated` roles (internal tool)

### Tables

| Table | Description |
|---|---|
| `users` | Team members (name, phone, role, XP, level, streak) |
| `teams` | Team groups (Leadership, Marketing, Sales, etc.) |
| `tasks` | Task management with status, priority, assignee, tags |
| `subtasks` | Subtasks linked to parent tasks |
| `task_comments` | Comments on tasks |
| `crm_leads` | CRM pipeline leads with status, source, value |
| `crm_notes` | Notes on CRM leads |
| `crm_followups` | Scheduled follow-ups for leads |
| `calendar_events` | Meetings, webinars, reminders |
| `focus_sessions` | Deep work/focus timer sessions |
| `attendance` | Daily check-in/check-out records |
| `notifications` | System notifications per user |
| `channels` | Chat channels (public, private, direct) |
| `messages` | Chat messages with reactions |
| `leaderboards` | Gamification leaderboard per period |

### Realtime
Tasks, Leads, Messages, Notifications, and Attendance tables have **Supabase Realtime** enabled — the UI updates automatically when data changes.

> **Schema**: [`supabase/schema.sql`](file:///c:/Users/prath/OneDrive/Documents/@Downloads/@sneha%20yoga/@production/team-daily-task-CRM/supabase/schema.sql)
> **Migration**: [`supabase/migration_team_login.sql`](file:///c:/Users/prath/OneDrive/Documents/@Downloads/@sneha%20yoga/@production/team-daily-task-CRM/supabase/migration_team_login.sql)

---

## 📂 Directory Structure

```
team-daily-task-CRM/
├── public/                      # Static assets
├── supabase/
│   ├── schema.sql               # Full database schema (run first)
│   └── migration_team_login.sql # Login system migration (run second)
├── src/
│   ├── app/
│   │   ├── globals.css          # Tailwind, CSS variables, themes
│   │   ├── layout.tsx           # Root layout, PWA meta, fonts
│   │   └── page.tsx             # Main app entry (auth gate + data loading)
│   │
│   ├── components/
│   │   ├── auth/
│   │   │   └── LoginScreen.tsx  # Name + Phone login UI
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx      # Desktop navigation sidebar
│   │   │   ├── Header.tsx       # Top bar (search, quick add, user avatar)
│   │   │   └── RightPanel.tsx   # Productivity panel (desktop only)
│   │   ├── modals/
│   │   │   └── QuickAddModal.tsx # Quick create (task/lead/event) → Supabase
│   │   └── views/
│   │       ├── DashboardView    # Home dashboard with live stats
│   │       ├── TasksView        # Kanban + List task management
│   │       ├── CRMView          # Drag-and-drop lead pipeline
│   │       ├── LeadsView        # Lead table with filters
│   │       ├── CalendarView     # Monthly calendar
│   │       ├── ChatView         # Channel-based messaging
│   │       ├── TeamView         # Team member cards
│   │       ├── AttendanceView   # Check-in/out tracker
│   │       ├── FocusView        # Focus timer
│   │       ├── AnalyticsView    # Charts and metrics
│   │       ├── AIView           # AI assistant
│   │       ├── NotificationsView # Notification feed
│   │       └── SettingsView     # Account info + Logout
│   │
│   └── lib/
│       ├── supabase.ts          # Supabase client + DB type definitions
│       ├── auth.ts              # Authentication store (Zustand)
│       ├── store.ts             # Global app state (Zustand, persisted)
│       ├── dataService.ts       # CRUD operations + Realtime subscriptions
│       └── mockData.ts          # Static chart data for analytics
│
├── .env.local                   # Environment variables (Supabase keys)
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## ⚙️ Data Flow

```
LoginScreen (name + phone)
    ↓
auth.ts → Supabase `users` table (find or create)
    ↓
page.tsx → dataService.ts → Loads all data from Supabase
    ↓
store.ts (Zustand) → Components render real data
    ↓
Realtime subscriptions auto-refresh on DB changes
```

---

## 📱 Mobile Experience

- **Bottom Navigation**: Fixed tab bar on mobile (Home, Tasks, Chat, Leads, More)
- **No Zoom/Bounce**: Viewport locked, overscroll disabled
- **PWA**: Installable on home screen (iOS/Android)
- **Safe Areas**: Respects notch/home indicator on modern phones

---

## 🚀 Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Database
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Open **SQL Editor**
3. Run `supabase/schema.sql` first
4. Run `supabase/migration_team_login.sql` second

### 3. Configure Environment
Ensure `.env.local` has:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Development Server
```bash
npm run dev
```

### 5. Build for Production
```bash
npm run build
```

---

*SnehYoga Team CRM • Built with ❤️*
