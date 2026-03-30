import { createClient } from "@supabase/supabase-js";

// Anon key é pública por design (segura para uso no frontend)
const SUPABASE_URL = "https://ccdxjncjmflgazxqvyqv.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjZHhqbmNqbWZsZ2F6eHF2eXF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MzEyNzMsImV4cCI6MjA5MDQwNzI3M30.wYL5QUVsyBcayKlUsIy3vCtlWY_rkKHSCsO_39HWwzc";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);