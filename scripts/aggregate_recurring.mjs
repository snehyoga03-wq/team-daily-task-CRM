import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmiauuwpepzqbygzutkn.supabase.co';
const supabaseKey = 'sb_publishable_pDCkREj5YvRspHTOHxB2-A_ODVELfqy';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: users, error: userError } = await supabase.from('users').select('id, full_name, team_id');
  if (userError) return console.error(userError);

  const { data: tasks, error: taskError } = await supabase.from('tasks').select('title, assignee_id, team_id, is_recurring, recurrence_pattern');
  if (taskError) return console.error(taskError);

  const userMap = {};
  users.forEach(u => userMap[u.id] = u.full_name);

  const recurringTasksMap = {};

  tasks.forEach(t => {
    if (t.is_recurring && t.recurrence_pattern) {
      const owner = t.assignee_id ? userMap[t.assignee_id] : 'Unassigned (Team Task)';
      if (!recurringTasksMap[owner]) {
        recurringTasksMap[owner] = {};
      }
      const pattern = t.recurrence_pattern;
      if (!recurringTasksMap[owner][pattern]) {
        recurringTasksMap[owner][pattern] = new Set();
      }
      recurringTasksMap[owner][pattern].add(t.title);
    }
  });

  console.log('--- RECURRING TASKS BY USER ---');
  for (const [owner, patterns] of Object.entries(recurringTasksMap)) {
    console.log(`\nUser: ${owner}`);
    for (const [pattern, titles] of Object.entries(patterns)) {
      console.log(`  ${pattern.toUpperCase()} Tasks (${titles.size}):`);
      for (const title of titles) {
        console.log(`    - ${title}`);
      }
    }
  }
}

run();
