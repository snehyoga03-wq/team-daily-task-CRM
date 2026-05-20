-- SnehYoga Team CRM — Task Edit & Time Selection Migration
-- Run this SQL in your Supabase SQL Editor to add advanced scheduling features

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_time TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS reminder TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Ensure RLS is updated (not strictly needed since we enabled all on table, but good practice)
-- Allow updates on these columns as part of the existing open policies
