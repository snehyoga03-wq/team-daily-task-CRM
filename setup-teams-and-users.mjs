import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmiauuwpepzqbygzutkn.supabase.co';
const supabaseAnonKey = 'sb_publishable_pDCkREj5YvRspHTOHxB2-A_ODVELfqy';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const teamsToCreate = [
  { name: 'Video Editors', color: '#ec4899' },
  { name: 'Social Media Manager', color: '#8b5cf6' },
  { name: 'Graphic Designer', color: '#10b981' },
  { name: 'E.A.', color: '#f59e0b' },
  { name: 'Videographer', color: '#06b6d4' },
  { name: 'Digital Marketer', color: '#ef4444' },
  { name: 'Others', color: '#6b7280' }
];

const newUsers = [
  // Video Editors
  { full_name: 'Atharva Bhilare', phone: '0000000001', teamName: 'Video Editors' },
  { full_name: 'Harshvardhan Nale', phone: '0000000002', teamName: 'Video Editors' },
  { full_name: 'Suyash Burle', phone: '0000000003', teamName: 'Video Editors' },
  { full_name: 'Shantanu Sathe', phone: '0000000004', teamName: 'Video Editors' },
  // Social Media Manager
  { full_name: 'Pranjali Kohad', phone: '0000000005', teamName: 'Social Media Manager' },
  { full_name: 'Tejshri Mane', phone: '0000000006', teamName: 'Social Media Manager' },
  { full_name: 'Tanvi Pathak', phone: '0000000007', teamName: 'Social Media Manager' },
  // Graphic Designer
  { full_name: 'Omkar Zanje', phone: '0000000008', teamName: 'Graphic Designer' },
  // Videographer
  { full_name: 'Omkar Shete', phone: '0000000009', teamName: 'Videographer' },
  // Digital Marketer
  { full_name: 'Sanika Kharode', phone: '0000000010', teamName: 'Digital Marketer' },
];

async function setup() {
  console.log('Fetching existing teams...');
  const { data: existingTeams, error: fetchTeamsError } = await supabase.from('teams').select('*');
  if (fetchTeamsError) {
    console.error('Error fetching teams:', fetchTeamsError);
    return;
  }

  const teamMap = {};
  for (const team of existingTeams) {
    teamMap[team.name] = team.id;
  }

  console.log('Creating missing teams...');
  for (const team of teamsToCreate) {
    if (!teamMap[team.name]) {
      const { data, error } = await supabase.from('teams').insert({ name: team.name, color: team.color }).select().single();
      if (error) {
        console.error('Error creating team:', team.name, error);
      } else {
        console.log(`Created team: ${team.name}`);
        teamMap[team.name] = data.id;
      }
    }
  }

  console.log('Fetching existing users...');
  const { data: existingUsers, error: fetchUsersError } = await supabase.from('users').select('*');
  if (fetchUsersError) {
    console.error('Error fetching users:', fetchUsersError);
    return;
  }

  const userPhoneMap = {};
  for (const user of existingUsers) {
    if (user.phone) {
      userPhoneMap[user.phone] = user;
    }
  }

  console.log('Creating missing users...');
  for (const user of newUsers) {
    if (!userPhoneMap[user.phone]) {
      const { data, error } = await supabase.from('users').insert({
        full_name: user.full_name,
        phone: user.phone,
        team_id: teamMap[user.teamName],
        role: 'member'
      }).select().single();
      
      if (error) {
        console.error('Error creating user:', user.full_name, error);
      } else {
        console.log(`Created user: ${user.full_name}`);
      }
    } else {
      // Update team id if needed
      const existingUser = userPhoneMap[user.phone];
      if (existingUser.team_id !== teamMap[user.teamName]) {
        await supabase.from('users').update({ team_id: teamMap[user.teamName] }).eq('id', existingUser.id);
        console.log(`Updated team for user: ${user.full_name}`);
      }
    }
  }

  console.log('Updating existing users (Yogita and others)...');
  for (const user of existingUsers) {
    if (user.full_name.toLowerCase().includes('yogita')) {
      await supabase.from('users').update({ team_id: teamMap['E.A.'] }).eq('id', user.id);
      console.log(`Updated Yogita's team to E.A.`);
    } else if (!newUsers.find(nu => nu.phone === user.phone)) {
      // They are not in the new users list. We should move them to 'Others' if they aren't already there or somewhere else?
      // Only move them if they don't have a team, or just put all non-image users into "Others"
      await supabase.from('users').update({ team_id: teamMap['Others'] }).eq('id', user.id);
      console.log(`Moved ${user.full_name} to Others`);
    }
  }

  console.log('Setup complete.');
}

setup();
