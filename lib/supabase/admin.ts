import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function getEnvValue(key: string): string {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const [k, ...v] = line.trim().split('=');
        if (k && k.trim() === key) {
          return v.join('=').trim();
        }
      }
    }
  } catch (e) {}
  return process.env[key] || '';
}

let cachedAdmin: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

function getAdminClient(): SupabaseClient {
  const url = getEnvValue('NEXT_PUBLIC_SUPABASE_URL') || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = getEnvValue('SUPABASE_SERVICE_ROLE_KEY') || process.env.SUPABASE_SERVICE_ROLE_KEY || getEnvValue('NEXT_PUBLIC_SUPABASE_ANON_KEY') || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!cachedAdmin || cachedUrl !== url || cachedKey !== key) {
    cachedUrl = url;
    cachedKey = key;
    cachedAdmin = createClient(
      url || 'https://placeholder.supabase.co', 
      key || 'dummy_key',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }
  return cachedAdmin;
}

// Create a dynamic proxy client with the service role key to bypass RLS for administrative actions.
// This automatically picks up changes to .env.local without requiring a server reboot.
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getAdminClient();
    const val = (client as any)[prop];
    return typeof val === 'function' ? val.bind(client) : val;
  }
});
