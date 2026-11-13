import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://omkpwhlvidwyhdivqpoe.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ta3B3aGx2aWR3eWhkaXZxcG9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1MzA3OTAsImV4cCI6MjExMDEwNjc5MH0.SQJg3p_400dPWFp_DZgfOAR-Y96OSarc2xCuoyoBHJw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
