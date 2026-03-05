import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 👇 AGREGA ESTO TEMPORALMENTE
console.log("URL:", supabaseUrl)
console.log("KEY:", supabaseAnonKey)

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey)

export default customSupabaseClient

export {
    customSupabaseClient,
    customSupabaseClient as supabase,
}