import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure these are provided as environment variables when running this script
const PROJECT_ID = process.env.SUPABASE_PROJECT_ID || 'cmiauuwpepzqbygzutkn'; // Derived from earlier script
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';
const NEXTJS_APP_URL = process.env.NEXTJS_APP_URL || 'https://your-production-url.com'; 

const cronSql = `
-- Enable pg_net to make HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Enable pg_cron for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing cron jobs if they exist to avoid duplicates
SELECT cron.unschedule('whatsapp-reminders-user');
SELECT cron.unschedule('whatsapp-reminders-admin');

-- 1. Schedule User Reminders (12 PM and 5 PM IST -> 6:30 AM and 11:30 AM UTC)
SELECT cron.schedule(
  'whatsapp-reminders-user',
  '30 6,11 * * *',
  $$
    SELECT net.http_get(
      url:='${NEXTJS_APP_URL}/api/cron/reminders?type=user',
      headers:='{"Content-Type": "application/json"}'::jsonb
    );
  $$
);

-- 2. Schedule Admin Summary (7 PM IST -> 1:30 PM UTC)
SELECT cron.schedule(
  'whatsapp-reminders-admin',
  '30 13 * * *',
  $$
    SELECT net.http_get(
      url:='${NEXTJS_APP_URL}/api/cron/reminders?type=admin',
      headers:='{"Content-Type": "application/json"}'::jsonb
    );
  $$
);
`;

async function runCronSetup() {
  console.log('Setting up pg_cron jobs on Supabase project:', PROJECT_ID);

  if (!ACCESS_TOKEN) {
    console.error('Error: SUPABASE_ACCESS_TOKEN is required.');
    process.exit(1);
  }

  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: cronSql }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Cron setup failed:', data);
      process.exit(1);
    }
    console.log('Cron setup executed successfully. Check the pg_cron jobs in your database.');
  } catch (err) {
    console.error('Error running cron setup:', err);
    process.exit(1);
  }
}

runCronSetup();
