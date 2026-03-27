
-- Fix activity_logs INSERT policy to be more restrictive
DROP POLICY IF EXISTS "Authenticated users can insert logs" ON public.activity_logs;

CREATE POLICY "Users can insert own logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
