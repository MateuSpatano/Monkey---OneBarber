
-- Allow clients to read their own client record (matched by email)
CREATE POLICY "Clients can view their own client record"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    is_client(auth.uid())
    AND email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
  );
