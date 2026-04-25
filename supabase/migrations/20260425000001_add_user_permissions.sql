-- Individual user permissions (overrides/supplements role-based permissions)
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, permission_id)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own permissions"
  ON public.user_permissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage user permissions"
  ON public.user_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('Administrador', 'Proprietário')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('Administrador', 'Proprietário')
    )
  );

CREATE POLICY "Service role bypass"
  ON public.user_permissions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
