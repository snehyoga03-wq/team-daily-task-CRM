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
  xp_points: number;
  level: number;
  streak_days: number;
  is_active: boolean;
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
  status: 'present' | 'absent' | 'late' | 'half_day' | 'leave' | 'on_break' | 'checked_out';
  notes: string | null;
  created_at: string;
}

export interface DbTeam {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}
