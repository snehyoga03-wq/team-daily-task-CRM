import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          avatar_url: string | null;
          role: string;
          team_id: string | null;
          xp_points: number;
          level: number;
          streak_days: number;
          created_at: string;
          updated_at: string;
        };
      };
      teams: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          color: string;
          created_at: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          status: 'todo' | 'in_progress' | 'review' | 'done';
          priority: 'low' | 'medium' | 'high' | 'urgent';
          assignee_id: string | null;
          creator_id: string;
          team_id: string | null;
          due_date: string | null;
          tags: string[];
          estimated_hours: number | null;
          actual_hours: number | null;
          parent_task_id: string | null;
          is_recurring: boolean;
          recurrence_pattern: string | null;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
      };
      subtasks: {
        Row: {
          id: string;
          task_id: string;
          title: string;
          is_completed: boolean;
          order_index: number;
          created_at: string;
        };
      };
      task_comments: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
      };
      crm_leads: {
        Row: {
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
        };
      };
      crm_notes: {
        Row: {
          id: string;
          lead_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
      };
      crm_followups: {
        Row: {
          id: string;
          lead_id: string;
          user_id: string;
          scheduled_at: string;
          completed_at: string | null;
          notes: string | null;
          type: string;
          created_at: string;
        };
      };
      calendar_events: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          start_time: string;
          end_time: string;
          type: 'meeting' | 'webinar' | 'task' | 'reminder' | 'event';
          color: string | null;
          creator_id: string;
          attendees: string[];
          is_recurring: boolean;
          recurrence_pattern: string | null;
          location: string | null;
          created_at: string;
        };
      };
      focus_sessions: {
        Row: {
          id: string;
          user_id: string;
          duration_minutes: number;
          completed_minutes: number;
          type: string;
          started_at: string;
          ended_at: string | null;
          created_at: string;
        };
      };
      attendance: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          check_in: string | null;
          check_out: string | null;
          status: 'present' | 'absent' | 'late' | 'half_day' | 'leave';
          notes: string | null;
          created_at: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          is_read: boolean;
          action_url: string | null;
          created_at: string;
        };
      };
      messages: {
        Row: {
          id: string;
          channel_id: string;
          user_id: string;
          content: string;
          attachments: string[];
          reactions: Record<string, string[]>;
          reply_to: string | null;
          created_at: string;
        };
      };
      channels: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          type: 'public' | 'private' | 'direct';
          members: string[];
          created_by: string;
          created_at: string;
        };
      };
      leaderboards: {
        Row: {
          id: string;
          user_id: string;
          period: string;
          tasks_completed: number;
          focus_hours: number;
          xp_earned: number;
          streak_days: number;
          rank: number;
          created_at: string;
        };
      };
    };
  };
};
