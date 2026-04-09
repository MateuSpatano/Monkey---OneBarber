-- Fix RLS policies for roles table - change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Users with view permission can see roles" ON public.roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.roles;

-- Recreate as PERMISSIVE policies (default)
CREATE POLICY "Admins can manage roles"
ON public.roles
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users with view permission can see roles"
ON public.roles
FOR SELECT
TO authenticated
USING (has_permission(auth.uid(), 'roles'::app_module, 'view'::permission_action) OR is_admin(auth.uid()));

-- Fix RLS policies for role_permissions table
DROP POLICY IF EXISTS "Users with view permission can see role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can manage role_permissions" ON public.role_permissions;

CREATE POLICY "Admins can manage role_permissions"
ON public.role_permissions
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users with view permission can see role_permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (has_permission(auth.uid(), 'roles'::app_module, 'view'::permission_action) OR is_admin(auth.uid()));

-- Fix RLS policies for profiles table
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Admins can manage profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix RLS policies for user_roles table  
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user_roles" ON public.user_roles;

CREATE POLICY "Admins can manage user_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Fix RLS policy for permissions table
DROP POLICY IF EXISTS "Authenticated users can view permissions" ON public.permissions;

CREATE POLICY "Authenticated users can view permissions"
ON public.permissions
FOR SELECT
TO authenticated
USING (true);