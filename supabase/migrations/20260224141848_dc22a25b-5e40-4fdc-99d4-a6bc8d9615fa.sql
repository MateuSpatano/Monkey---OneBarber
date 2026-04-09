
-- Create a security definer function to get the current user's email
CREATE OR REPLACE FUNCTION public.get_auth_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid()
$$;

-- Drop the broken policy
DROP POLICY IF EXISTS "Clients can view their own client record" ON public.clients;

-- Recreate using the security definer function
CREATE POLICY "Clients can view their own client record"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    is_client(auth.uid())
    AND email = get_auth_email()
  );

-- Also fix the appointments policies that reference auth.users directly
DROP POLICY IF EXISTS "Clients can view their own appointments" ON public.appointments;
CREATE POLICY "Clients can view their own appointments"
  ON public.appointments
  FOR SELECT
  TO authenticated
  USING (
    is_client(auth.uid())
    AND client_id IN (
      SELECT id FROM public.clients WHERE email = get_auth_email()
    )
  );

DROP POLICY IF EXISTS "Clients can update their own appointments" ON public.appointments;
CREATE POLICY "Clients can update their own appointments"
  ON public.appointments
  FOR UPDATE
  TO authenticated
  USING (
    is_client(auth.uid())
    AND client_id IN (
      SELECT id FROM public.clients WHERE email = get_auth_email()
    )
  );
