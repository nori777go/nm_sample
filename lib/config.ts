export const env = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  llmApiKey: process.env.LLM_API_KEY,
  imageApiKey: process.env.IMAGE_API_KEY
};

export const hasSupabaseEnv = Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
