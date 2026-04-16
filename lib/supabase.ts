import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oxtlbhaakfobdpxeipcd.supabase.co';
const supabaseAnonKey = 'sb_publishable_6forIDublm0vvpuHyfDybw_qdjpok8d';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);