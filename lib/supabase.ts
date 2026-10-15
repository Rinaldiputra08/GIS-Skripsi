import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseUrl.startsWith('http') && supabaseAnonKey && supabaseAnonKey.length > 10
);

// Client-safe Supabase instance (uses anon key)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

// Server/Admin-only Supabase instance (uses service role key for migrations/batch scripts)
export const getSupabaseAdmin = () => {
  if (
    supabaseUrl &&
    supabaseServiceRoleKey &&
    supabaseServiceRoleKey !== 'your-service-role-key-here' &&
    supabaseServiceRoleKey.length > 20
  ) {
    return createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabase;
};
