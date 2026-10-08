// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://welptjgtbfllhyucyikf.supabase.co';
const supabaseAnonKey = 'sb_publishable_zNDkKeIHA2VILcDK37KbnA_vfYs3c7V';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
