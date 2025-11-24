import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://jdcgentybdjrjatqkepi.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkY2dlbnR5YmRqcmphdHFrZXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzEyMjUsImV4cCI6MjA3ODQ0NzIyNX0.49OCMPIbFmU6A6g6bQzqJnDre__qu6L0Fc1h4H1JmAM"   
);
