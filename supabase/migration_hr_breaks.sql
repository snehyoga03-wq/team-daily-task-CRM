-- Migration: Detailed Break Logs & Expanded HR Profiles

-- 1. Add HR profile columns to the `users` table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS designation TEXT,
ADD COLUMN IF NOT EXISTS shift TEXT;

-- 2. Create the `attendance_logs` table
CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  action_type TEXT DEFAULT 'break',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add Index for attendance_logs
CREATE INDEX IF NOT EXISTS idx_attendance_logs_user_date ON public.attendance_logs(user_id, date);

-- 4. Set up Row Level Security (RLS) for attendance_logs
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all attendance_logs" 
ON public.attendance_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert attendance_logs" 
ON public.attendance_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update attendance_logs" 
ON public.attendance_logs FOR UPDATE TO authenticated USING (true);

-- 5. Enable Realtime for attendance_logs (optional but good for live dashboards)
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_logs;
