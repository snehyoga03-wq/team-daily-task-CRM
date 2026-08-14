import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

let _supabase: SupabaseClient | null = null;

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabase) {
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
          'Supabase URL and Anon Key must be defined. ' +
          'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.'
        );
      }
      _supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
    return (_supabase as any)[prop];
  },
});

// ─── Database Types ─────────────────────────────────────────────────

export interface DbUser {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  team_id: string | null;
  department?: string | null;
  designation?: string | null;
  shift?: string | null;
  address?: string | null;
  emergency_contact?: string | null;
  dob?: string | null;
  joining_date?: string | null;
  employment_type?: 'full_time' | 'intern' | null;
  reporting_manager_id?: string | null;
  tag?: string | null;
  xp_points: number;
  level: number;
  streak_days: number;
  is_active: boolean;
  is_online: boolean;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbTask {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id: string | null;
  creator_id: string | null;
  team_id: string | null;
  due_date: string | null;
  due_time?: string | null;
  start_date?: string | null;
  depends_on?: string[];
  reminder?: string | null;
  duration_minutes?: number | null;
  is_recurring?: boolean;
  recurrence_pattern?: string | null;
  recurrence_day?: number | null;
  source_task_id?: string | null;
  is_carry_forward?: boolean;
  tags: string[];
  estimated_hours: number | null;
  actual_hours: number | null;
  order_index: number;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbSubtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  order_index: number;
  created_at: string;
}

export interface DbLead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp_status: string | null;
  status: 'new_lead' | 'interested' | 'follow_up' | 'joined_webinar' | 'converted' | 'not_interested';
  source: string | null;
  notes: string | null;
  assigned_to: string | null;
  value: number;
  created_at: string;
  updated_at: string;
}

export interface DbCalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  type: 'meeting' | 'webinar' | 'task' | 'reminder' | 'event';
  color: string | null;
  creator_id: string | null;
  attendees: string[];
  location: string | null;
  created_at: string;
}

export interface DbChannel {
  id: string;
  name: string;
  description: string | null;
  type: 'public' | 'private' | 'direct';
  is_group: boolean;
  avatar_url: string | null;
  admin_ids: string[];
  members: string[];
  created_by: string | null;
  created_at: string;
}

export interface DbMessage {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  attachments: string[];
  reactions: Record<string, string[]>;
  reply_to: string | null;
  status: 'sent' | 'delivered' | 'read';
  read_by: Record<string, string>;
  created_at: string;
}

export interface DbNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

export interface DbAttendance {
  id: string;
  user_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'leave' | 'paid_leave' | 'unpaid_leave' | 'on_break' | 'checked_out' | 'wfh' | 'company_wfh' | 'weekly_off' | 'holiday';
  fine_amount?: number;
  late_minutes?: number;
  ot_hours?: number;
  notes: string | null;
  user?: DbUser;
  created_at: string;
}

export interface DbAttendanceLog {
  id: string;
  user_id: string;
  date: string;
  action_type: 'break';
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

export interface DbTeam {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

export interface DbEmployeeProfile {
  user_id: string;
  address?: string | null;
  emergency_contact?: string | null;
  dob?: string | null;
  joining_date?: string | null;
  employment_type?: 'full_time' | 'intern';
  reporting_manager_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbHrPolicySettings {
  id: string;
  weekday_start: string;
  weekday_end: string;
  saturday_start: string;
  saturday_end: string;
  grace_period_time: string;
  late_mark_time: string;
  half_day_report_cutoff: string;
  late_minute_deduction_rate: number;
  allowed_lates_before_halfday: number;
  allowed_lates_before_fullday: number;
  max_lunch_duration_minutes: number;
  max_lunch_breaks_per_day: number;
  overtime_threshold_minutes: number;
  max_employee_wfh_per_month: number;
  monthly_leave_credit: number;
  max_leave_balance_cap: number;
  intern_exam_leave_bonus: number;
  updated_at?: string;
}

export interface DbCompanyWfh {
  id: string;
  date: string;
  reason: string;
  target_type: 'all' | 'department' | 'selected_users';
  target_department?: string | null;
  affected_user_ids?: string[] | null;
  created_by?: string | null;
  created_at?: string;
}

export interface DbLeaveRequest {
  id: string;
  user_id: string;
  leave_type: 'casual' | 'sick' | 'birthday' | 'marriage' | 'bereavement' | 'emergency' | 'lwp' | 'wfh' | 'exam' | 'half_day' | 'earned' | 'maternity' | 'paternity' | 'permission';
  category?: 'planned' | 'short_notice' | 'emergency';
  start_date: string;
  end_date: string;
  reason: string;
  short_notice_reason?: string | null;
  emergency_reason?: string | null;
  planned_work?: string | null;
  exam_timetable_url?: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'dept_head_approved';
  dept_head_status?: 'pending' | 'approved' | 'rejected';
  dept_head_approved_by?: string | null;
  office_manager_status?: 'pending' | 'approved' | 'rejected';
  office_manager_approved_by?: string | null;
  approved_by?: string | null;
  attachment_url?: string | null;
  user?: DbUser;
  created_at: string;
  updated_at: string;
}

export interface DbHrmsAuditLog {
  id: string;
  action: string;
  performed_by: string | null;
  target_user_id: string | null;
  details?: string | null;
  previous_value?: any;
  updated_value?: any;
  created_at: string;
  performer?: DbUser;
  target_user?: DbUser;
}

