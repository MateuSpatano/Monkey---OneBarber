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

  // Carrega a Role de forma mais segura usando uma única chamada
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

      // Usamos apenas get_user_role_name para evitar erros de funções RPC ausentes
      const { data: roleNameRes, error } = await supabase.rpc('get_user_role_name', { _user_id: user.id });

      if (cancelled) return;

      if (error) {
        console.error("Erro ao buscar permissão do usuário:", error);
      }

      const role = (roleNameRes as string | null) ?? null;

      // Define as permissões estritamente baseadas no texto do cargo
      setRoleName(role);
      setIsAdmin(role === 'Administrador');
      setIsClient(role === 'Cliente');
      
      setRoleLoading(false);
    }

    loadRole();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id]);

  // Lida com o redirecionamento baseado na Role
  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!user) return;

    const currentPath = location.pathname;
    const isOnAdminRoute = currentPath.startsWith('/admin');
    const isOnDashboardRoute = currentPath.startsWith('/dashboard');
    const isOnClientRoute = currentPath.startsWith('/client');
    
    // Regra nova: Onde o usuário cai logo após logar ou cadastrar?
    const isOnAuthCallback = currentPath === '/' || currentPath === '/login' || currentPath === '/cadastrar';

    // 1. Redirecionamento Pós-Login/Cadastro 
    if (isOnAuthCallback) {
      if (isAdmin) navigate('/admin', { replace: true });
      else if (isClient) navigate('/client', { replace: true });
      else navigate('/dashboard', { replace: true }); // Barbeiros/Recepcionistas
      return;
    }

    // 2. Proteger as rotas de Cliente (Admin não deve ficar aqui)
    if (isAdmin && isOnClientRoute) {
      navigate('/admin', { replace: true });
    }

    // 3. Proteger as rotas de Admin (Ninguém além do admin entra aqui)
    if (!isAdmin && isOnAdminRoute) {
      if (isClient) navigate('/client', { replace: true });
      else navigate('/dashboard', { replace: true });
    }

    // 4. Proteger as rotas de Barbeiro (Cliente não entra no painel interno)
    if (isClient && isOnDashboardRoute) {
      navigate('/client', { replace: true });
    }

    // 5. Redirecionar Barbeiro se ele tentar acessar rotas exclusivas do cliente
    if (!isClient && !isAdmin && isOnClientRoute) {
      navigate('/dashboard', { replace: true });
    }

  }, [isAdmin, isClient, authLoading, roleLoading, user, location.pathname, navigate]);

  return { isAdmin, isClient, userRole, loading: authLoading || roleLoading };
}