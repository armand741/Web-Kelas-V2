import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://phiuwxbuybwofagltwwv.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoaXV3eGJ1eWJ3b2ZhZ2x0d3d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NTMyNzIsImV4cCI6MjA2OTUyOTI3Mn0.6ZlWnwbWBKulU5qBp1O0wRGwxZDxvaLRFcFYy_nBkvE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const auth = supabase.auth
