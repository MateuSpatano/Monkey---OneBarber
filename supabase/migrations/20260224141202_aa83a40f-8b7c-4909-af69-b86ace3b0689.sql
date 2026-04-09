
-- Fix appointments RLS: Convert conflicting RESTRICTIVE policies to PERMISSIVE
-- With PERMISSIVE policies, ANY passing policy grants access (OR logic)
-- This correctly allows staff to see all + clients to see only their own

-- Drop all existing SELECT policies
DROP POLICY IF EXISTS "Users with view permission can see appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clients can view their own appointments" ON public.appointments;

-- Create PERMISSIVE SELECT policies
CREATE POLICY "Staff can view all appointments"
  ON public.appointments
  FOR SELECT
  TO authenticated
  USING (
    is_admin(auth.uid())
    OR has_permission(auth.uid(), 'appointments'::app_module, 'view'::permission_action)
  );

CREATE POLICY "Clients can view their own appointments"
  ON public.appointments
  FOR SELECT
  TO authenticated
  USING (
    is_client(auth.uid())
    AND client_id IN (
      SELECT id FROM public.clients
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Drop all existing INSERT policies
DROP POLICY IF EXISTS "Users with create permission can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clients can create their own appointments" ON public.appointments;

-- Create PERMISSIVE INSERT policies
CREATE POLICY "Staff can create appointments"
  ON public.appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin(auth.uid())
    OR has_permission(auth.uid(), 'appointments'::app_module, 'create'::permission_action)
  );

CREATE POLICY "Clients can create their own appointments"
  ON public.appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_client(auth.uid())
  );

-- Drop all existing UPDATE policies
DROP POLICY IF EXISTS "Users with edit permission can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clients can update their own appointments" ON public.appointments;

-- Create PERMISSIVE UPDATE policies
CREATE POLICY "Staff can update appointments"
  ON public.appointments
  FOR UPDATE
  TO authenticated
  USING (
    is_admin(auth.uid())
    OR has_permission(auth.uid(), 'appointments'::app_module, 'edit'::permission_action)
  );

CREATE POLICY "Clients can update their own appointments"
  ON public.appointments
  FOR UPDATE
  TO authenticated
  USING (
    is_client(auth.uid())
    AND client_id IN (
      SELECT id FROM public.clients
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );
