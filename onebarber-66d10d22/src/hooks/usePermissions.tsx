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

export function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserPermissions();
    } else {
      setPermissions([]);
      setUserRole(null);
      setIsAdmin(false);
      setLoading(false);
    }
  }, [user]);

  const fetchUserPermissions = async () => {
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
        .maybeSingle();

      // Depending on relationship metadata, PostgREST can return embedded relations
      // as either an object or an array. Normalize here.
      const embedded = (userRoleData as any)?.roles;
      const role: UserRole | null = Array.isArray(embedded)
        ? (embedded[0] ?? null)
        : (embedded ?? null);

      if (role) {
        setUserRole(role);
        setIsAdmin(role.name === 'Administrador');

        // Fetch permissions for this role
        const { data: rolePermissions } = await supabase
          .from('role_permissions')
          .select(`
            permissions:permission_id (
              module,
              action
            )
          `)
          .eq('role_id', role.id);

        if (rolePermissions) {
          const perms = rolePermissions
            .map((rp: any) => rp.permissions)
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
  };

  const hasPermission = useCallback((module: AppModule, action: PermissionAction): boolean => {
    if (isAdmin) return true;
    return permissions.some(p => p.module === module && p.action === action);
  }, [permissions, isAdmin]);

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
