-- SnehYoga CRM — Team Login Migration
-- This adds a simple team_members login system (name + phone, no Supabase Auth)
-- Run this SQL in your Supabase SQL Editor at: https://cmiauuwpepzqbygzutkn.supabase.co

-- ─── STEP 1: Update users table to support phone-based login ─────
-- Add phone column to existing users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE;
-- Make email optional (since we're using phone login now)
ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;

-- ─── STEP 2: Disable RLS for internal team app ──────────────────
-- Since this is an internal tool with simple name+phone login (no Supabase Auth),
-- we need to allow anon access. The app handles authorization itself.

-- Drop all existing RLS policies first
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END
$$;

-- Create open policies for all tables (internal team app, no external access)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('CREATE POLICY "Allow all for anon" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true)', tbl);
    EXECUTE format('CREATE POLICY "Allow all for authenticated" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END
$$;

-- ─── STEP 3: Insert default team members ─────────────────────────
-- These are the initial team members who can log in

INSERT INTO public.teams (id, name, description, color)
VALUES 
  ('a0000001-0000-0000-0000-000000000001', 'Leadership', 'Management team', '#8b5cf6'),
  ('a0000001-0000-0000-0000-000000000002', 'Marketing', 'Marketing team', '#06b6d4'),
  ('a0000001-0000-0000-0000-000000000003', 'Sales', 'Sales team', '#10b981'),
  ('a0000001-0000-0000-0000-000000000004', 'Support', 'Customer support', '#f59e0b'),
  ('a0000001-0000-0000-0000-000000000005', 'Operations', 'Operations team', '#ec4899')
ON CONFLICT DO NOTHING;

INSERT INTO public.users (id, full_name, phone, email, role, team_id, xp_points, level, streak_days)
VALUES
  ('b0000001-0000-0000-0000-000000000001', 'Sneha Sharma', '9876543210', 'sneha@snehyoga.com', 'admin', 'a0000001-0000-0000-0000-000000000001', 4850, 12, 45),
  ('b0000001-0000-0000-0000-000000000002', 'Priya Patel', '8765432109', 'priya@snehyoga.com', 'member', 'a0000001-0000-0000-0000-000000000002', 3200, 9, 22),
  ('b0000001-0000-0000-0000-000000000003', 'Arjun Mehta', '7654321098', 'arjun@snehyoga.com', 'member', 'a0000001-0000-0000-0000-000000000003', 3750, 10, 30),
  ('b0000001-0000-0000-0000-000000000004', 'Kavya Reddy', '6543210987', 'kavya@snehyoga.com', 'member', 'a0000001-0000-0000-0000-000000000004', 2100, 7, 15),
  ('b0000001-0000-0000-0000-000000000005', 'Ravi Kumar', '5432109876', 'ravi@snehyoga.com', 'member', 'a0000001-0000-0000-0000-000000000005', 4200, 11, 38)
ON CONFLICT DO NOTHING;

-- Insert default channels
INSERT INTO public.channels (id, name, description, type, created_by)
VALUES
  ('c0000001-0000-0000-0000-000000000001', 'general', 'General team discussion', 'public', 'b0000001-0000-0000-0000-000000000001'),
  ('c0000001-0000-0000-0000-000000000002', 'marketing', 'Marketing updates', 'public', 'b0000001-0000-0000-0000-000000000001'),
  ('c0000001-0000-0000-0000-000000000003', 'sales', 'Sales coordination', 'public', 'b0000001-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;
