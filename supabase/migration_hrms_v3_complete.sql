-- ─── HRMS V3 COMPLETE DATABASE MIGRATION ─────────────────────────────────────────

-- 1. Extend Attendance Table with Fine Amount, Late Minutes, OT Hours, and Notes
ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS fine_amount DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS late_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ot_hours DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Extend Users & Employee Profiles
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
ADD COLUMN IF NOT EXISTS dob DATE,
ADD COLUMN IF NOT EXISTS joining_date DATE,
ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'intern')),
ADD COLUMN IF NOT EXISTS reporting_manager_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS designation TEXT,
ADD COLUMN IF NOT EXISTS shift TEXT;

CREATE TABLE IF NOT EXISTS public.employee_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  address TEXT,
  emergency_contact TEXT,
  dob DATE,
  joining_date DATE,
  employment_type TEXT DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'intern')),
  reporting_manager_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Extend Leave Requests for 2-Tier Approval, Exam Uploads, Notice Categories
ALTER TABLE public.leave_requests DROP CONSTRAINT IF EXISTS leave_requests_leave_type_check;

ALTER TABLE public.leave_requests 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'planned' CHECK (category IN ('planned', 'short_notice', 'emergency')),
ADD COLUMN IF NOT EXISTS short_notice_reason TEXT,
ADD COLUMN IF NOT EXISTS emergency_reason TEXT,
ADD COLUMN IF NOT EXISTS planned_work TEXT,
ADD COLUMN IF NOT EXISTS exam_timetable_url TEXT,
ADD COLUMN IF NOT EXISTS dept_head_status TEXT DEFAULT 'pending' CHECK (dept_head_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS dept_head_approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS office_manager_status TEXT DEFAULT 'pending' CHECK (office_manager_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS office_manager_approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 4. Leave Balances Table
CREATE TABLE IF NOT EXISTS public.leave_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL,
  total_days DECIMAL DEFAULT 3.0,
  used_days DECIMAL DEFAULT 0.0,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  UNIQUE(user_id, leave_type, year)
);

-- Seed default leave balances for existing users
INSERT INTO public.leave_balances (user_id, leave_type, total_days, used_days, year)
SELECT id, 'casual', 3.0, 0.0, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER FROM public.users
ON CONFLICT (user_id, leave_type, year) DO NOTHING;

INSERT INTO public.leave_balances (user_id, leave_type, total_days, used_days, year)
SELECT id, 'sick', 3.0, 0.0, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER FROM public.users
ON CONFLICT (user_id, leave_type, year) DO NOTHING;

-- 5. HR Policy Settings
CREATE TABLE IF NOT EXISTS public.hr_policy_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  weekday_start TIME NOT NULL DEFAULT '09:30:00',
  weekday_end TIME NOT NULL DEFAULT '18:30:00',
  saturday_start TIME NOT NULL DEFAULT '09:30:00',
  saturday_end TIME NOT NULL DEFAULT '17:00:00',
  grace_period_time TIME NOT NULL DEFAULT '09:45:00',
  late_mark_time TIME NOT NULL DEFAULT '10:00:00',
  half_day_report_cutoff TIME NOT NULL DEFAULT '12:00:00',
  late_minute_deduction_rate DECIMAL NOT NULL DEFAULT 1.0,
  allowed_lates_before_halfday INTEGER NOT NULL DEFAULT 3,
  allowed_lates_before_fullday INTEGER NOT NULL DEFAULT 6,
  max_lunch_duration_minutes INTEGER NOT NULL DEFAULT 45,
  max_lunch_breaks_per_day INTEGER NOT NULL DEFAULT 1,
  overtime_threshold_minutes INTEGER NOT NULL DEFAULT 60,
  max_employee_wfh_per_month INTEGER NOT NULL DEFAULT 2,
  monthly_leave_credit DECIMAL NOT NULL DEFAULT 1.5,
  max_leave_balance_cap DECIMAL NOT NULL DEFAULT 3.0,
  intern_exam_leave_bonus INTEGER NOT NULL DEFAULT 7,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.hr_policy_settings (id) 
SELECT uuid_generate_v4() 
WHERE NOT EXISTS (SELECT 1 FROM public.hr_policy_settings);

-- 6. Company WFH Declarations & Audit Logs
CREATE TABLE IF NOT EXISTS public.company_wfh_declarations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  reason TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'department', 'selected_users')),
  target_department TEXT,
  affected_user_ids UUID[],
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hrms_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL,
  performed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  details TEXT,
  previous_value JSONB,
  updated_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.hr_policy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_wfh_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hrms_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read hr_policy_settings" ON public.hr_policy_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth update hr_policy_settings" ON public.hr_policy_settings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth read company_wfh" ON public.company_wfh_declarations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert company_wfh" ON public.company_wfh_declarations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth read hrms_audit" ON public.hrms_audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert hrms_audit" ON public.hrms_audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth read leave_balances" ON public.leave_balances FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth update leave_balances" ON public.leave_balances FOR UPDATE TO authenticated USING (true);
