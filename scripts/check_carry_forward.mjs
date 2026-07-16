import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmiauuwpepzqbygzutkn.supabase.co';
// We use the anon key for data fetch if we don't have it, but wait, the project requires an anon key.
// Let's read it from .env.local
import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const anonKeyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\n]+)/);
const anonKey = anonKeyMatch ? anonKeyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, anonKey);

async function run() {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, due_date, status, is_recurring, source_task_id, recurrence_pattern')
    .lt('due_date', '2026-07-17')
    .neq('status', 'done');

  if (error) {
    console.error(error);
    return;
  }

  const filtered = (data || []).filter(t => {
    if (t.is_recurring && !t.source_task_id) return false;
    if (t.recurrence_pattern === 'daily' && new Date(t.due_date).getDay() === 0) return false;
    return true;
  });

  console.log('Total carry forward tasks:', filtered.length);
  const byAssignee = {};
  filtered.forEach(t => {
    console.log(`[${t.due_date}] ${t.title}`);
  });
}

run();
