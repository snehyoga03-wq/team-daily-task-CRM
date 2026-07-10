import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ID = process.env.SUPABASE_PROJECT_ID || 'cmiauuwpepzqbygzutkn';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';

async function runMigration() {
  const sqlPath = path.join(__dirname, '../supabase/migration_whatsapp_settings.sql');
  const query = fs.readFileSync(sqlPath, 'utf8');

  console.log('Running WhatsApp settings migration on Supabase project:', PROJECT_ID);

  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Migration failed:', data);
      process.exit(1);
    }
    console.log('Migration executed successfully:', data);
  } catch (err) {
    console.error('Error running migration:', err);
    process.exit(1);
  }
}

runMigration();
