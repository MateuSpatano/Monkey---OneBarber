
-- Allow clients to create their own client record (for auto-registration during booking)
CREATE POLICY "Clients can create their own client record"
  ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_client(auth.uid())
    AND email = get_auth_email()
  );
