import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read anon key from .env.local
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const anonKeyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\n]+)/);
const anonKey = anonKeyMatch ? anonKeyMatch[1].trim() : '';

const supabaseUrl = 'https://cmiauuwpepzqbygzutkn.supabase.co';
const supabase = createClient(supabaseUrl, anonKey);

async function run() {
  console.log('Fetching active carry-forward tasks...');
  
  const todayStr = '2026-07-17';

  // 1. Fetch all tasks due before today that are not done
  const { data: tasks, error: fetchError } = await supabase
    .from('tasks')
    .select('id, title, is_recurring, source_task_id')
    .lt('due_date', todayStr)
    .neq('status', 'done');

  if (fetchError) {
    console.error('Error fetching tasks:', fetchError);
    return;
  }

  // 2. Filter out template tasks
  const tasksToComplete = (tasks || []).filter(t => {
    // Exclude templates (recurring tasks without a source)
    if (t.is_recurring && !t.source_task_id) return false;
    return true;
  });

  if (tasksToComplete.length === 0) {
    console.log('No carry forward tasks found to complete.');
    return;
  }

  console.log(`Found ${tasksToComplete.length} carry forward tasks. Marking as done...`);

  // 3. Update them in batches
  const ids = tasksToComplete.map(t => t.id);
  const now = new Date().toISOString();

  let updatedCount = 0;
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ 
        status: 'done'
      })
      .in('id', batch);

    if (updateError) {
      console.error('Error updating batch:', updateError);
    } else {
      updatedCount += batch.length;
      console.log(`  Updated ${updatedCount}/${ids.length}...`);
    }
  }

  console.log(`\nSuccessfully marked ${updatedCount} carry-forward tasks as done!`);
}

run();
