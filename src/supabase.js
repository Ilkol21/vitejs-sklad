import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://lngggifqwpkbjjogibv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuZ2dnaWZxd3BrYmpqam9naWJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMDM0MjUsImV4cCI6MjEwNzU3OTQyNX0.bz9jiRKhQFwMd9AkHEIu2dPjTtuD8vRRCn3ykiTChtg'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)