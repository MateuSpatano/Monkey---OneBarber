import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useRoleRedirect() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [roleLoading, setRoleLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [roleName, setRoleName] = useState<string | null>(null);

  const userRole = useMemo(
    () => (roleName ? { id: '', name: roleName, description: null as string | null } : null),
    [roleName]
  );

  // Load role flags using SECURITY DEFINER functions (works even when clients can't SELECT from roles)
  useEffect(() => {
    let cancelled = false;

    async function loadRole() {
      if (authLoading) return;

      if (!user) {
        setRoleLoading(false);
        setIsAdmin(false);
        setIsClient(false);
        setRoleName(null);
        return;
      }

      setRoleLoading(true);

      const [adminRes, clientRes, roleNameRes] = await Promise.all([
        supabase.rpc('is_admin', { _user_id: user.id }),
        supabase.rpc('is_client', { _user_id: user.id }),
        supabase.rpc('get_user_role_name', { _user_id: user.id }),
      ]);

      if (cancelled) return;

      // If any RPC fails, default to safest behavior: treat as client=false/admin=false
      setIsAdmin(Boolean(adminRes.data));
      setIsClient(Boolean(clientRes.data));
      setRoleName((roleNameRes.data as string | null) ?? null);
      setRoleLoading(false);
    }

    loadRole();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id]);

  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!user) return;

    const isOnAdminRoute = location.pathname.startsWith('/admin');
    const isOnDashboardRoute = location.pathname.startsWith('/dashboard');
    const isOnClientRoute = location.pathname.startsWith('/client');

    // Redirect admin from client routes
    if (isAdmin && isOnClientRoute) {
      navigate('/admin', { replace: true });
    }

    // Redirect non-admin from admin routes
    if (!isAdmin && isOnAdminRoute) {
      if (isClient) {
        navigate('/client', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }

    // Redirect client from dashboard routes
    if (isClient && isOnDashboardRoute) {
      navigate('/client', { replace: true });
    }

    // Redirect non-client professional from client routes
    if (!isClient && !isAdmin && isOnClientRoute) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAdmin, isClient, authLoading, roleLoading, user, location.pathname, navigate]);

  return { isAdmin, isClient, userRole, loading: authLoading || roleLoading };
}
