-- SnehYoga Team CRM — Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'member',
  team_id UUID,
  xp_points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak_days INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TEAMS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#8b5cf6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for users.team_id
ALTER TABLE public.users ADD CONSTRAINT fk_users_team FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

-- ─── TASKS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assignee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  due_date DATE,
  tags TEXT[] DEFAULT '{}',
  estimated_hours DECIMAL,
  actual_hours DECIMAL,
  parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SUBTASKS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subtasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TASK COMMENTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CRM LEADS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp_status TEXT,
  status TEXT DEFAULT 'new_lead' CHECK (status IN ('new_lead', 'interested', 'follow_up', 'joined_webinar', 'converted', 'not_interested')),
  source TEXT,
  notes TEXT,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  value DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CRM NOTES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CRM FOLLOWUPS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_followups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  type TEXT DEFAULT 'call',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CALENDAR EVENTS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  type TEXT DEFAULT 'event' CHECK (type IN ('meeting', 'webinar', 'task', 'reminder', 'event')),
  color TEXT,
  creator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  attendees UUID[] DEFAULT '{}',
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── FOCUS SESSIONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL,
  completed_minutes INTEGER DEFAULT 0,
  type TEXT DEFAULT 'focus',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ATTENDANCE ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'leave')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ─── NOTIFICATIONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'task',
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CHANNELS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'public' CHECK (type IN ('public', 'private', 'direct')),
  members UUID[] DEFAULT '{}',
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MESSAGES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachments TEXT[] DEFAULT '{}',
  reactions JSONB DEFAULT '{}',
  reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── LEADERBOARDS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leaderboards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  tasks_completed INTEGER DEFAULT 0,
  focus_hours DECIMAL DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  rank INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, period)
);

-- ─── INDEXES ────────────────────────────────────────────────────
CREATE INDEX idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_crm_leads_status ON public.crm_leads(status);
CREATE INDEX idx_crm_leads_assigned ON public.crm_leads(assigned_to);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX idx_messages_channel ON public.messages(channel_id, created_at);
CREATE INDEX idx_attendance_user_date ON public.attendance(user_id, date);
CREATE INDEX idx_focus_sessions_user ON public.focus_sessions(user_id, started_at);

-- ─── RLS POLICIES ───────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all data (internal team app)
CREATE POLICY "Authenticated users can read all" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON public.subtasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON public.task_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON public.crm_leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON public.crm_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON public.crm_followups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON public.calendar_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON public.focus_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON public.attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON public.notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON public.channels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON public.messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON public.leaderboards FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert/update/delete (internal team app)
CREATE POLICY "Authenticated users can insert" ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON public.tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON public.tasks FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON public.subtasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON public.subtasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON public.subtasks FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON public.task_comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON public.task_comments FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON public.crm_leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON public.crm_leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON public.crm_leads FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON public.crm_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert" ON public.crm_followups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON public.crm_followups FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON public.calendar_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON public.calendar_events FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON public.calendar_events FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON public.focus_sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON public.focus_sessions FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON public.attendance FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON public.attendance FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON public.notifications FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON public.channels FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON public.channels FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert" ON public.messages FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can insert" ON public.leaderboards FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON public.leaderboards FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ─── FUNCTIONS ──────────────────────────────────────────────────

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_crm_leads_updated_at BEFORE UPDATE ON public.crm_leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Calculate user XP and level
CREATE OR REPLACE FUNCTION calculate_user_xp(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_tasks_done INTEGER;
  v_focus_hours DECIMAL;
  v_xp INTEGER;
  v_level INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_tasks_done FROM public.tasks WHERE assignee_id = p_user_id AND status = 'done';
  SELECT COALESCE(SUM(completed_minutes) / 60.0, 0) INTO v_focus_hours FROM public.focus_sessions WHERE user_id = p_user_id;
  v_xp := (v_tasks_done * 50) + (v_focus_hours * 30)::INTEGER;
  v_level := GREATEST(1, (v_xp / 500) + 1);
  UPDATE public.users SET xp_points = v_xp, level = v_level WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Get team productivity stats
CREATE OR REPLACE FUNCTION get_team_productivity(p_period TEXT DEFAULT 'week')
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  tasks_completed BIGINT,
  focus_hours DECIMAL,
  xp_points INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.full_name,
    COUNT(t.id) as tasks_completed,
    COALESCE(SUM(fs.completed_minutes) / 60.0, 0) as focus_hours,
    u.xp_points
  FROM public.users u
  LEFT JOIN public.tasks t ON t.assignee_id = u.id AND t.status = 'done' 
    AND t.updated_at >= CASE 
      WHEN p_period = 'week' THEN NOW() - INTERVAL '7 days'
      WHEN p_period = 'month' THEN NOW() - INTERVAL '30 days'
      ELSE NOW() - INTERVAL '1 day'
    END
  LEFT JOIN public.focus_sessions fs ON fs.user_id = u.id 
    AND fs.started_at >= CASE 
      WHEN p_period = 'week' THEN NOW() - INTERVAL '7 days'
      WHEN p_period = 'month' THEN NOW() - INTERVAL '30 days'
      ELSE NOW() - INTERVAL '1 day'
    END
  GROUP BY u.id, u.full_name, u.xp_points
  ORDER BY tasks_completed DESC;
END;
$$ LANGUAGE plpgsql;

-- Get CRM pipeline summary
CREATE OR REPLACE FUNCTION get_crm_pipeline_summary()
RETURNS TABLE(
  stage TEXT,
  lead_count BIGINT,
  total_value DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cl.status as stage,
    COUNT(*) as lead_count,
    COALESCE(SUM(cl.value), 0) as total_value
  FROM public.crm_leads cl
  GROUP BY cl.status
  ORDER BY 
    CASE cl.status
      WHEN 'new_lead' THEN 1
      WHEN 'interested' THEN 2
      WHEN 'follow_up' THEN 3
      WHEN 'joined_webinar' THEN 4
      WHEN 'converted' THEN 5
      WHEN 'not_interested' THEN 6
    END;
END;
$$ LANGUAGE plpgsql;

-- ─── REALTIME ───────────────────────────────────────────────────
-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
