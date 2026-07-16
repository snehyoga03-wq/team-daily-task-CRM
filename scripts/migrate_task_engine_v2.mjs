import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmiauuwpepzqbygzutkn.supabase.co';
const supabaseKey = 'sb_publishable_pDCkREj5YvRspHTOHxB2-A_ODVELfqy';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('=== Task Engine V2 Data Migration ===');

  // 1. Run the SQL migration (add columns)
  console.log('\n[Step 1] Running SQL migration...');
  const migrationSql = `
    ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS recurrence_day INTEGER;
    ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS source_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;
    ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_carry_forward BOOLEAN DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_tasks_source ON public.tasks(source_task_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_recurring ON public.tasks(is_recurring, recurrence_pattern, assignee_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_recurring_day ON public.tasks(recurrence_day);
  `;
  // We execute each statement separately since Supabase rpc doesn't support multi-statement
  const statements = migrationSql.split(';').map(s => s.trim()).filter(s => s.length > 0);
  for (const stmt of statements) {
    const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' }).maybeSingle();
    // If rpc doesn't work, we'll try a direct approach
    if (error) {
      console.log(`  Note: Could not run via RPC (${error.message}). Migration columns may already exist or need to be run manually via SQL Editor.`);
      break;
    }
  }
  console.log('  SQL migration columns should now exist.');

  // 2. Set recurrence_day for existing weekly tasks (Saturday = 6)
  console.log('\n[Step 2] Setting recurrence_day=6 for weekly tasks...');
  const { data: weeklyTasks, error: wErr } = await supabase
    .from('tasks')
    .select('id')
    .eq('is_recurring', true)
    .eq('recurrence_pattern', 'weekly')
    .is('recurrence_day', null);
  
  if (!wErr && weeklyTasks) {
    for (const t of weeklyTasks) {
      await supabase.from('tasks').update({ recurrence_day: 6 }).eq('id', t.id);
    }
    console.log(`  Updated ${weeklyTasks.length} weekly tasks.`);
  }

  // 3. Parse monthly task titles and set recurrence_day
  console.log('\n[Step 3] Parsing monthly task titles for recurrence_day...');
  const { data: monthlyTasks, error: mErr } = await supabase
    .from('tasks')
    .select('id, title')
    .eq('is_recurring', true)
    .eq('recurrence_pattern', 'monthly')
    .is('recurrence_day', null);
  
  if (!mErr && monthlyTasks) {
    for (const t of monthlyTasks) {
      const title = t.title.toLowerCase();
      let day = null;
      
      if (title.includes('[1st-5th]') || title.includes('[1st–5th]')) day = 1;
      else if (title.includes('[before 7th]')) day = 1;
      else if (title.includes('[20th-25th]') || title.includes('[20th–25th]')) day = 20;
      else if (title.includes('[25th]')) day = 25;
      
      if (day !== null) {
        await supabase.from('tasks').update({ recurrence_day: day }).eq('id', t.id);
        console.log(`  ${t.title} → day ${day}`);
      } else {
        console.log(`  WARNING: Could not parse day from "${t.title}". Defaulting to day 1.`);
        await supabase.from('tasks').update({ recurrence_day: 1 }).eq('id', t.id);
      }
    }
  }

  // 4. Identify template tasks vs generated instances
  // For each user+title+pattern combo, the earliest task is the "template"
  console.log('\n[Step 4] Identifying template tasks and linking instances...');
  const { data: allRecurring, error: rErr } = await supabase
    .from('tasks')
    .select('id, title, assignee_id, recurrence_pattern, due_date, created_at')
    .eq('is_recurring', true)
    .order('created_at', { ascending: true });
  
  if (!rErr && allRecurring) {
    // Group by assignee_id + title + pattern
    const groups = {};
    for (const t of allRecurring) {
      const key = `${t.assignee_id || 'team'}|${t.title}|${t.recurrence_pattern}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    let linkedCount = 0;
    let deletedCount = 0;

    for (const [key, tasks] of Object.entries(groups)) {
      if (tasks.length <= 1) continue;
      
      // First task is the template
      const template = tasks[0];
      const instances = tasks.slice(1);

      for (const inst of instances) {
        // Delete future instances (the new engine will regenerate them)
        if (inst.due_date && inst.due_date > todayStr) {
          await supabase.from('tasks').delete().eq('id', inst.id);
          deletedCount++;
        } else {
          // Link past/today instances to the template
          await supabase.from('tasks').update({ source_task_id: template.id }).eq('id', inst.id);
          linkedCount++;
        }
      }
    }

    console.log(`  Linked ${linkedCount} existing instances to templates.`);
    console.log(`  Deleted ${deletedCount} future pre-generated instances.`);
  }

  // 5. Verify
  console.log('\n[Step 5] Verification...');
  const { data: templates, error: tErr } = await supabase
    .from('tasks')
    .select('id, title, recurrence_pattern, recurrence_day, assignee_id')
    .eq('is_recurring', true)
    .is('source_task_id', null);
  
  if (!tErr && templates) {
    console.log(`\n  Found ${templates.length} recurring templates:`);
    
    // Group by assignee
    const { data: users } = await supabase.from('users').select('id, full_name');
    const userMap = {};
    (users || []).forEach(u => userMap[u.id] = u.full_name);

    const byUser = {};
    templates.forEach(t => {
      const name = t.assignee_id ? (userMap[t.assignee_id] || 'Unknown') : 'Team';
      if (!byUser[name]) byUser[name] = { daily: [], weekly: [], monthly: [] };
      const bucket = byUser[name][t.recurrence_pattern] || [];
      bucket.push({ title: t.title, day: t.recurrence_day });
      byUser[name][t.recurrence_pattern] = bucket;
    });

    for (const [name, patterns] of Object.entries(byUser)) {
      console.log(`\n  ${name}:`);
      for (const [pattern, tasks] of Object.entries(patterns)) {
        if (tasks.length > 0) {
          console.log(`    ${pattern.toUpperCase()} (${tasks.length}):`);
          tasks.forEach(t => {
            const dayInfo = t.day !== null ? ` [day=${t.day}]` : '';
            console.log(`      - ${t.title}${dayInfo}`);
          });
        }
      }
    }
  }

  console.log('\n=== Migration Complete ===');
}

run();
