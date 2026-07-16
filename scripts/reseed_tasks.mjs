import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmiauuwpepzqbygzutkn.supabase.co';
const supabaseKey = 'sb_publishable_pDCkREj5YvRspHTOHxB2-A_ODVELfqy';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: users, error: userError } = await supabase.from('users').select('id, full_name, team_id');
  if (userError) return console.error(userError);

  const targetNames = ['Tejshri Mane', 'Tanvi Pathak', 'Pranjali Kohad'];
  const targets = users.filter(u => targetNames.some(name => u.full_name?.toLowerCase().includes(name.toLowerCase().split(' ')[0])));
  
  console.log('Target Users:', targets.map(t => t.full_name));

  // 1. Delete all existing recurring tasks for these users
  for (const user of targets) {
    const { data: existing, error: err } = await supabase
      .from('tasks')
      .select('id')
      .eq('assignee_id', user.id)
      .eq('is_recurring', true);
      
    if (err) {
      console.error('Error fetching existing tasks:', err);
      continue;
    }
    
    if (existing.length > 0) {
      console.log(`Deleting ${existing.length} recurring tasks for ${user.full_name}...`);
      // Delete in batches of 100 if necessary, but we can try deleting by IDs
      const ids = existing.map(e => e.id);
      
      for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100);
        await supabase.from('tasks').delete().in('id', batch);
      }
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  // Common Task Definitions
  const tejshriTanviDaily = [
    { title: 'Reply to all pending comments on all client accounts', pattern: 'daily' },
    { title: 'Check Client Tracker Sheet', pattern: 'daily' },
    { title: 'Review all client sheets for updates', pattern: 'daily' },
    { title: 'Update Daily Task Sheet', pattern: 'daily' },
    { title: 'Complete or update all pending tasks', pattern: 'daily' },
    { title: 'Reply to all pending DMs on all client accounts', pattern: 'daily' },
    { title: 'Update the client if any approval or content is pending', pattern: 'daily' },
    { title: 'Spend 10 minutes on Trend Spotting', desc: 'Check Instagram Reels, YouTube Trends, Meta Ad Library, and other relevant platforms.\nIf a relevant trend is found, create a quick content idea/script and share it with the team or client.', pattern: 'daily' },
    { title: 'Spend 20 minutes on Outbound Engagement', desc: 'Engage meaningfully on posts from industry leaders, creators, potential customers, and relevant communities to increase organic visibility.', pattern: 'daily' },
  ];

  const pranjaliDaily = [
    { title: 'Reply to all pending comments on all client accounts', pattern: 'daily' },
    { title: 'Review all client sheets for updates', pattern: 'daily' },
    { title: 'Update Daily Task Sheet', pattern: 'daily' },
    { title: 'Complete or update all pending tasks', pattern: 'daily' },
    { title: 'Reply to all pending DMs on all client accounts', pattern: 'daily' },
    { title: 'Update the client if any approval or content is pending', pattern: 'daily' },
    { title: 'Spend 10 minutes on Trend Spotting', desc: 'Check Instagram Reels, YouTube Trends, Meta Ad Library, and other relevant platforms.\nIf a relevant trend is found, create a quick content idea/script and share it with the team or client.', pattern: 'daily' },
    { title: 'Spend 20 minutes on Outbound Engagement', desc: 'Engage meaningfully on posts from industry leaders, creators, potential customers, and relevant communities to increase organic visibility.', pattern: 'daily' },
  ];

  const commonWeekly = [
    { title: 'Complete Guest Outreach Target', pattern: 'weekly' },
    { title: 'Share Content Planned vs Content Published report', pattern: 'weekly' },
    { title: 'Analyze all client data', desc: 'What worked?\nWhy did it work?\nWhat did not work?', pattern: 'weekly' },
    { title: 'Share the complete weekly analysis in the Microsoft Teams channel', pattern: 'weekly' },
  ];

  const tejshriTanviMonthly = [
    { title: '[1st-5th] Share Festival List with clients', pattern: 'monthly' },
    { title: '[1st-5th] Share Social Media Report with clients', pattern: 'monthly' },
    { title: '[1st-5th] Update Client Report Sheet', pattern: 'monthly' },
    { title: '[1st-5th] Share Content Calendar with clients', pattern: 'monthly' },
    { title: '[1st-5th] Analyze the previous month’s performance', desc: 'What worked?\nWhy did it work?\nWhat did not work?', pattern: 'monthly' },
    { title: '[1st-5th] Identify high-performing content and add it to the Repost / Recycle Library for future reuse', pattern: 'monthly' },
    { title: '[1st-5th] Share the complete monthly analysis in the Microsoft Teams channel', pattern: 'monthly' },
    { title: '[Before 7th] Assign festival creatives to the Graphic Designer', pattern: 'monthly' },
    { title: '[20th-25th] Create the content strategy for the upcoming month', pattern: 'monthly' },
    { title: '[20th-25th] Share the content strategy with the client', pattern: 'monthly' },
    { title: '[20th-25th] Get client approval before the new month begins', pattern: 'monthly' },
    { title: '[25th] Share Shoot Booking Link with clients', pattern: 'monthly' },
    { title: '[25th] Pin the message in the chat', pattern: 'monthly' },
  ];

  const pranjaliMonthly = [
    { title: '[1st-5th] Share Social Media Report with clients', pattern: 'monthly' },
    { title: '[1st-5th] Update Client Report Sheet', pattern: 'monthly' },
    { title: '[1st-5th] Share Content Calendar with clients', pattern: 'monthly' },
    { title: '[1st-5th] Analyze the previous month’s performance', desc: 'What worked?\nWhy did it work?\nWhat did not work?', pattern: 'monthly' },
    { title: '[1st-5th] Identify high-performing content and add it to the Repost / Recycle Library for future reuse', pattern: 'monthly' },
    { title: '[1st-5th] Share the complete monthly analysis in the Microsoft Teams channel', pattern: 'monthly' },
    { title: '[20th-25th] Create the content strategy for the upcoming month', pattern: 'monthly' },
    { title: '[20th-25th] Share the content strategy with the client', pattern: 'monthly' },
    { title: '[20th-25th] Get client approval before the new month begins', pattern: 'monthly' },
  ];

  const buildPayloads = (user, daily, weekly, monthly) => {
    const tasks = [...daily, ...weekly, ...monthly];
    return tasks.map((t, index) => ({
      title: t.title,
      description: t.desc || null,
      assignee_id: user.id,
      team_id: user.team_id,
      status: 'todo',
      priority: 'high',
      due_date: todayStr,
      is_recurring: true,
      recurrence_pattern: t.pattern,
      tags: [t.pattern],
      order_index: index,
    }));
  };

  for (const user of targets) {
    let payloads = [];
    if (user.full_name.includes('Tejshri') || user.full_name.includes('Tanvi')) {
      payloads = buildPayloads(user, tejshriTanviDaily, commonWeekly, tejshriTanviMonthly);
    } else if (user.full_name.includes('Pranjali')) {
      payloads = buildPayloads(user, pranjaliDaily, commonWeekly, pranjaliMonthly);
    }

    console.log(`Inserting ${payloads.length} new tasks for ${user.full_name}...`);
    const { error } = await supabase.from('tasks').insert(payloads);
    if (error) {
      console.error(`Failed to insert tasks for ${user.full_name}:`, error);
    }
  }

  console.log('Update complete!');
}

run();
