-- Allow users to read their own role via user_roles join
CREATE POLICY "Users can read their own assigned role"
ON public.roles
FOR SELECT
USING (
  id IN (SELECT role_id FROM public.user_roles WHERE user_id = auth.uid())
);
