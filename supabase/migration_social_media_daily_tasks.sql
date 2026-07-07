-- SnehYoga CRM — Social Media Management Team & Daily Tasks
-- Run this SQL in your Supabase SQL Editor to seed the Social Media Management team and standup meetings.

-- 1. Create Social Media Management team if not exists
INSERT INTO public.teams (id, name, description, color)
VALUES (
  'a0000001-0000-0000-0000-000000000006',
  'Social Media Management',
  'Social Media & Content Management Team',
  '#ec4899'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Morning & Evening Standup Meetings at top of task list (order_index = -10 and -9)
DO $$
DECLARE
  sm_team_id UUID;
  admin_user_id UUID;
BEGIN
  -- Get Team ID for Social Media Management
  SELECT id INTO sm_team_id FROM public.teams WHERE name ILIKE '%Social Media%' LIMIT 1;
  IF sm_team_id IS NULL THEN
    sm_team_id := 'a0000001-0000-0000-0000-000000000006'::UUID;
  END IF;

  -- Get any active user/admin to be creator if needed
  SELECT id INTO admin_user_id FROM public.users WHERE role = 'admin' LIMIT 1;

  -- Insert Morning Standup Meeting
  INSERT INTO public.tasks (
    id, title, description, status, priority, team_id, creator_id,
    is_recurring, recurrence_pattern, tags, order_index, due_date, created_at, updated_at
  )
  VALUES (
    'd0000001-0000-0000-0000-000000000001',
    'morning Standup meeting',
    'Daily morning alignment and task planning for Social Media Management team',
    'todo',
    'high',
    sm_team_id,
    admin_user_id,
    true,
    'daily',
    ARRAY['daily', 'standup', 'Planned'],
    -10,
    CURRENT_DATE,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    order_index = EXCLUDED.order_index,
    recurrence_pattern = 'daily',
    is_recurring = true;

  -- Insert Evening Standup Meeting
  INSERT INTO public.tasks (
    id, title, description, status, priority, team_id, creator_id,
    is_recurring, recurrence_pattern, tags, order_index, due_date, created_at, updated_at
  )
  VALUES (
    'd0000001-0000-0000-0000-000000000002',
    'Evening standup meeting',
    'Daily evening review of content output, reels, and pending social media tasks',
    'todo',
    'high',
    sm_team_id,
    admin_user_id,
    true,
    'daily',
    ARRAY['daily', 'standup', 'Planned'],
    -9,
    CURRENT_DATE,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    order_index = EXCLUDED.order_index,
    recurrence_pattern = 'daily',
    is_recurring = true;

END $$;
