-- HR Management System Migration

-- ─── ROLES EXTENSION ────────────────────────────────────────────
-- We'll allow 'hr' and 'admin' for role columns in users table. The existing table uses TEXT.

-- ─── DEPARTMENTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── EMPLOYEE PROFILES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employee_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  designation TEXT,
  joining_date DATE,
  reporting_manager_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  shift_type TEXT DEFAULT 'general' CHECK (shift_type IN ('morning', 'general', 'evening', 'night', 'custom')),
  attendance_score DECIMAL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ATTENDANCE LOGS (For detailed tracking) ────────────────────
CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attendance_id UUID NOT NULL REFERENCES public.attendance(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('check_in', 'check_out', 'break_start', 'break_end')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device TEXT,
  ip_address TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── LEAVE BALANCES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leave_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('casual', 'sick', 'earned', 'maternity', 'paternity')),
  total_days DECIMAL DEFAULT 0,
  used_days DECIMAL DEFAULT 0,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  UNIQUE(user_id, leave_type, year)
);

-- ─── LEAVE REQUESTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('casual', 'sick', 'earned', 'maternity', 'paternity', 'half_day', 'wfh', 'permission')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── HOLIDAYS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'public' CHECK (type IN ('public', 'company')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert 2026 Holidays
INSERT INTO public.holidays (date, name, type) VALUES
('2026-01-26', 'Republic Day', 'public'),
('2026-03-03', 'Holi', 'public'),
('2026-03-19', 'Ugadi/Gudi Padwa', 'public'),
('2026-05-01', 'Labour Day', 'public'),
('2026-08-15', 'Independence Day', 'public'),
('2026-08-28', 'Raksha Bandhan', 'public'),
('2026-09-04', 'Gopalkala', 'public'),
('2026-09-14', 'Ganesh Chaturthi', 'public'),
('2026-09-25', 'Anant Chaturthi', 'public'),
('2026-10-02', 'Gandhi Jayanti', 'public'),
('2026-10-20', 'Dussehra', 'public'),
('2026-11-07', 'Diwali Day 1', 'company'),
('2026-11-08', 'Diwali Day 2', 'company'),
('2026-11-09', 'Diwali Day 3', 'company'),
('2026-11-10', 'Diwali Day 4', 'company'),
('2026-11-11', 'Diwali Day 5', 'company')
ON CONFLICT (date) DO NOTHING;

-- ─── OVERTIME REQUESTS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.overtime_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours DECIMAL NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ATTENDANCE CORRECTIONS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attendance_corrections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  attendance_id UUID REFERENCES public.attendance(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('forgot_check_in', 'forgot_check_out', 'wrong_time', 'missing')),
  requested_time TIMESTAMPTZ NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── LATE POLICY SETTINGS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.late_policy_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporting_time TIME NOT NULL DEFAULT '09:30:00',
  grace_period_minutes INTEGER NOT NULL DEFAULT 15,
  late_mark_start_time TIME NOT NULL DEFAULT '09:46:00',
  half_day_start_time TIME NOT NULL DEFAULT '12:00:00',
  early_exit_time TIME NOT NULL DEFAULT '16:00:00',
  allowed_late_marks_per_month INTEGER NOT NULL DEFAULT 3,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings if none exist
INSERT INTO public.late_policy_settings (id) VALUES (uuid_generate_v4()) ON CONFLICT DO NOTHING;

-- ─── ATTENDANCE AUDIT LOGS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attendance_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL, -- e.g., 'Attendance Updated', 'Leave Approved'
  performed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  reason TEXT,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── RLS POLICIES ───────────────────────────────────────────────
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overtime_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.late_policy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_audit_logs ENABLE ROW LEVEL SECURITY;

-- Simple RLS (Internal CRM approach: Authenticated users can read most, create own. Admin/HR can update all)
CREATE POLICY "Auth read departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth read profiles" ON public.employee_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert profiles" ON public.employee_profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update profiles" ON public.employee_profiles FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Auth read attendance_logs" ON public.attendance_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert attendance_logs" ON public.attendance_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update attendance_logs" ON public.attendance_logs FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Auth read leave_balances" ON public.leave_balances FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth update leave_balances" ON public.leave_balances FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Auth read leave_requests" ON public.leave_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert leave_requests" ON public.leave_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update leave_requests" ON public.leave_requests FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Auth read holidays" ON public.holidays FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert holidays" ON public.holidays FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update holidays" ON public.holidays FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete holidays" ON public.holidays FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth read overtime" ON public.overtime_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert overtime" ON public.overtime_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update overtime" ON public.overtime_requests FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Auth read corrections" ON public.attendance_corrections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert corrections" ON public.attendance_corrections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update corrections" ON public.attendance_corrections FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Auth read late_policy" ON public.late_policy_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth update late_policy" ON public.late_policy_settings FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Auth read audit" ON public.attendance_audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert audit" ON public.attendance_audit_logs FOR INSERT TO authenticated WITH CHECK (true);
