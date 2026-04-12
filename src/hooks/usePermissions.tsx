import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppModule = 'dashboard' | 'clients' | 'professionals' | 'products' | 'appointments' | 'services' | 'financial' | 'reports' | 'settings' | 'users' | 'roles';
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

interface Permission {
  module: AppModule;
  action: PermissionAction;
}

interface UserRole {
  id: string;
  name: string;
  description: string | null;
}

type UserRolesResponse = {
  role_id: string;
  roles: UserRole | UserRole[] | null;
} | null;

type RolePermissionsResponse = Array<{
  permissions: Permission | null;
}>;

export function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchUserPermissions = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Fetch user's role
      const { data: userRoleData } = await supabase
        .from('user_roles')
        .select(`
          role_id,
          roles:role_id (
            id,
            name,
            description
          )
        `)
        .eq('user_id', user.id)
        .maybeSingle() as { data: UserRolesResponse | null };

      // Depending on relationship metadata, PostgREST can return embedded relations
      // as either an object or an array. Normalize here.
      const embedded = userRoleData?.roles;
      const role: UserRole | null = Array.isArray(embedded)
        ? (embedded[0] ?? null)
        : (embedded ?? null);

      if (role) {
        setUserRole(role);
        setIsAdmin(role.name === 'Administrador' || role.name === 'Proprietário');

        // Fetch permissions for this role
        const { data: rolePermissions } = await supabase
          .from('role_permissions')
          .select(`
            permissions:permission_id (
              module,
              action
            )
          `)
          .eq('role_id', role.id) as { data: RolePermissionsResponse | null };

        if (rolePermissions) {
          const perms = rolePermissions
            .map(rp => rp.permissions)
            .filter(Boolean) as Permission[];
          setPermissions(perms);
        }
      } else {
        setUserRole(null);
        setIsAdmin(false);
        setPermissions([]);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setUserRole(null);
      setIsAdmin(false);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUserPermissions();
    } else {
      setPermissions([]);
      setUserRole(null);
      setIsAdmin(false);
      setLoading(false);
    }
  }, [fetchUserPermissions, user]);

  const hasPermission = useCallback((module: AppModule, action: PermissionAction): boolean => {
    if (isAdmin) return true;
    // When no role is assigned, grant all permissions (matches sidebar behavior)
    if (!userRole) return true;
    return permissions.some(p => p.module === module && p.action === action);
  }, [permissions, isAdmin, userRole]);

  const canView = useCallback((module: AppModule) => hasPermission(module, 'view'), [hasPermission]);
  const canCreate = useCallback((module: AppModule) => hasPermission(module, 'create'), [hasPermission]);
  const canEdit = useCallback((module: AppModule) => hasPermission(module, 'edit'), [hasPermission]);
  const canDelete = useCallback((module: AppModule) => hasPermission(module, 'delete'), [hasPermission]);

  return {
    permissions,
    userRole,
    loading,
    isAdmin,
    hasPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    refetch: fetchUserPermissions
  };
}
