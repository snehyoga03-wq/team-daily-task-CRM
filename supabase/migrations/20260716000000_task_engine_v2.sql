-- Migration: Task Engine V2
-- Adds columns needed for the new recurring task engine

-- recurrence_day: For monthly = day of month (1-31). For weekly = day of week (0=Sun..6=Sat).
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS recurrence_day INTEGER;

-- source_task_id: Links a generated instance back to its "template" recurring task
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS source_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;

-- is_carry_forward: Marks a task as carried forward from a previous day
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_carry_forward BOOLEAN DEFAULT false;

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_tasks_source ON public.tasks(source_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_recurring ON public.tasks(is_recurring, recurrence_pattern, assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_recurring_day ON public.tasks(recurrence_day);
