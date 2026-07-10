import { createClient } from '@supabase/supabase-js';

const meta = import.meta as any;

export const adminClient = createClient(
  meta.env.VITE_SUPABASE_URL || '',
  meta.env.VITE_SUPABASE_ANON_KEY || ''
);
