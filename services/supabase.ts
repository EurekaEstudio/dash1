
import { createClient } from '@supabase/supabase-js';
import { ChatMessage } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided.');
}

export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey);

export const parseChatMessage = (data: any): ChatMessage => {
  return {
    id: data.id,
    session_id: data.session_id,
    message: data.message,
    created_at: data.created_at,
    correo_enviado: data.correo_enviado,
  };
};
