import { createClient } from '@supabase/supabase-js';
import { env, hasSupabaseEnv } from './config';

export function getSupabaseAdminClient() {
  if (!hasSupabaseEnv) {
    throw new Error('Supabase env vars are missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  return createClient(env.supabaseUrl!, env.supabaseServiceRoleKey!, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
