-- Allow users who can manage Users to list Roles (needed for assigning a role in UserModal)
DROP POLICY IF EXISTS "Users with view permission can see roles" ON public.roles;

CREATE POLICY "Users with view permission can see roles"
ON public.roles
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid())
  OR has_permission(auth.uid(), 'roles'::app_module, 'view'::permission_action)
  OR has_permission(auth.uid(), 'users'::app_module, 'create'::permission_action)
  OR has_permission(auth.uid(), 'users'::app_module, 'edit'::permission_action)
);
