export function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lvmeqhmxdykvpgsfrdvh.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2bWVxaG14ZHlrdnBnc2ZyZHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MDYxMzcsImV4cCI6MjEwNjI4MjEzN30._-3IUF_r2i0Eo0f1lQgTwwnnWaGXdtze6RviCPuf4PA'

  return { supabaseUrl, supabaseAnonKey }
}