-- Add RLS policy for admin to view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (is_admin(auth.uid()));

-- Add RLS policy for admin to update all profiles
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (is_admin(auth.uid()));

-- Add role for Client
INSERT INTO public.roles (name, description, is_system)
VALUES ('Cliente', 'Perfil de cliente para agendamentos e visualização de serviços', true)
ON CONFLICT DO NOTHING;