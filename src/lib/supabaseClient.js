import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ryjwhfdlldgzrkhduxdj.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5andoZmRsbGRnenJraGR1eGRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzExNjMxMzMsImV4cCI6MjA0NjczOTEzM30.T0cHdl8w17s520f8A3NU9cKIPGwRbbBwPMO5G4qfZ0U";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
