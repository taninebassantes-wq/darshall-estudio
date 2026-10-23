import { createClient } from '@supabase/supabase-js';

// Valores por defecto directos del proyecto para garantizar funcionamiento en Vercel
const DEFAULT_SUPABASE_URL = 'https://vmktdiypvazbdjvjwtil.supabase.co';
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZta3RkaXlwdmF6YmRqdmp3dGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MjM5OTcsImV4cCI6MjEwODI5OTk5N30.CwVSyyJmvtaHvg1hbS-a63WvFxSWkxwQ2321QomnG9U';
const DEFAULT_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZta3RkaXlwdmF6YmRqdmp3dGlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjcyMzk5NywiZXhwIjoyMTA4Mjk5OTk3fQ.04QWdyoV4Fw_n-OnogDYEEnCI7V0vFK01HJwP7xqCKw';

const supabaseUrl = 
  (typeof process !== 'undefined' && process.env?.PUBLIC_SUPABASE_URL) || 
  import.meta.env.PUBLIC_SUPABASE_URL || 
  DEFAULT_SUPABASE_URL;

const supabaseAnonKey = 
  (typeof process !== 'undefined' && process.env?.PUBLIC_SUPABASE_ANON_KEY) || 
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 
  DEFAULT_ANON_KEY;

const supabaseServiceRoleKey = 
  (typeof process !== 'undefined' && process.env?.SUPABASE_SERVICE_ROLE_KEY) || 
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY || 
  DEFAULT_SERVICE_ROLE;

// Cliente estándar para operaciones con RLS (Frontend & SSR)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente con Service Role para operaciones seguras de backend (Cron jobs, bypass de RLS administrativo)
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);
