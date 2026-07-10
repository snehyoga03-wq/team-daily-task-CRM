-- Migration: Create app_settings table for storing WhatsApp Business & Workspace configurations across the team

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow public/authenticated read access to settings
DROP POLICY IF EXISTS "Allow public read app_settings" ON public.app_settings;
CREATE POLICY "Allow public read app_settings" ON public.app_settings
  FOR SELECT USING (true);

-- Allow insert/update access to settings
DROP POLICY IF EXISTS "Allow insert update app_settings" ON public.app_settings;
CREATE POLICY "Allow insert update app_settings" ON public.app_settings
  FOR ALL USING (true);

-- Seed default WhatsApp settings if not already present
INSERT INTO public.app_settings (key, value)
VALUES (
  'whatsapp_config',
  jsonb_build_object(
    'accessToken', 'EAAUtxeqjxA8BRLBdwqWW9M82vyK9FzA9IwxYN5H2UJBIRN8LdfVmdmBzowcCcdIYeTVwetxGezGyBupLDu73lLmKZCuZAtZCYZAAmOxGhQK1qjUTZBc1K7G4134CZAilHKo5B6OscaZCzqOCGS90eYcgWiLT9P0ZC83rOoKeltDYh8IIFVELaWRBjeMS2icfXvU3AwZDZD',
    'phoneId', '808910018982018',
    'templateName', 'daily_yoga_05',
    'languageCode', 'en',
    'enabled', true
  )
)
ON CONFLICT (key) DO NOTHING;
