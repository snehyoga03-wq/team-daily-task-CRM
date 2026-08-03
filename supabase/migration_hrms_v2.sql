-- ─── HRMS V2 DATABASE MIGRATION ─────────────────────────────────────────

-- 1. Extend Users / Employee Profiles with full details
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
ADD COLUMN IF NOT EXISTS dob DATE,
ADD COLUMN IF NOT EXISTS joining_date DATE,
ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'intern')),
ADD COLUMN IF NOT EXISTS reporting_manager_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

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

-- 2. Configurable HR Policy Settings Table
CREATE TABLE IF NOT EXISTS public.hr_policy_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  weekday_start TIME NOT NULL DEFAULT '09:30:00',
  weekday_end TIME NOT NULL DEFAULT '18:30:00',
  saturday_start TIME NOT NULL DEFAULT '09:30:00',
  saturday_end TIME NOT NULL DEFAULT '17:00:00',
  grace_period_time TIME NOT NULL DEFAULT '09:45:00',
  late_mark_time TIME NOT NULL DEFAULT '10:00:00',
  half_day_report_cutoff TIME NOT NULL DEFAULT '12:00:00',
  late_minute_deduction_rate DECIMAL NOT NULL DEFAULT 1.0, -- ₹1 per late minute for 1-3 lates
  allowed_lates_before_halfday INTEGER NOT NULL DEFAULT 3, -- 4th, 5th, 6th late = Half Day
  allowed_lates_before_fullday INTEGER NOT NULL DEFAULT 6, -- 7th onwards = Full Day Leave / LWP
  max_lunch_duration_minutes INTEGER NOT NULL DEFAULT 45,
  max_lunch_breaks_per_day INTEGER NOT NULL DEFAULT 1,
  overtime_threshold_minutes INTEGER NOT NULL DEFAULT 60, -- OT starts 1 hr after closing
  max_employee_wfh_per_month INTEGER NOT NULL DEFAULT 2,
  monthly_leave_credit DECIMAL NOT NULL DEFAULT 1.5,
  max_leave_balance_cap DECIMAL NOT NULL DEFAULT 3.0,
  intern_exam_leave_bonus INTEGER NOT NULL DEFAULT 7,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default settings if empty
INSERT INTO public.hr_policy_settings (id) 
SELECT uuid_generate_v4() 
WHERE NOT EXISTS (SELECT 1 FROM public.hr_policy_settings);

-- 3. Company WFH Declarations Table
CREATE TABLE IF NOT EXISTS public.company_wfh_declarations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  reason TEXT NOT NULL, -- e.g., 'Heavy Traffic', 'Red Alert', 'Flood', 'Office Maintenance'
  target_type TEXT NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'department', 'selected_users')),
  target_department TEXT,
  affected_user_ids UUID[],
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Upgrade Leave Requests for 2-Tier Approval, Exam Uploads, and WFH Work Plans
-- First drop existing constraint on leave_type if present
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

-- 5. HRMS Audit Logs Table
CREATE TABLE IF NOT EXISTS public.hrms_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL, -- e.g. 'Attendance Edit', 'Leave Approval', 'Policy Change', 'Profile Update'
  performed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  details TEXT,
  previous_value JSONB,
  updated_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Add RLS Policies
ALTER TABLE public.hr_policy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_wfh_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hrms_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read hr_policy_settings" ON public.hr_policy_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth update hr_policy_settings" ON public.hr_policy_settings FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Auth read company_wfh" ON public.company_wfh_declarations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert company_wfh" ON public.company_wfh_declarations FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Auth read hrms_audit" ON public.hrms_audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert hrms_audit" ON public.hrms_audit_logs FOR INSERT TO authenticated WITH CHECK (true);
