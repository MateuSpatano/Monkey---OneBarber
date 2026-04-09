import { supabase } from '@/integrations/supabase/client';

export type UserRoleType = 'Administrador' | 'Cliente' | 'Barbeiro' | string | null;

/**
 * Fetches the user's role from the database and returns the appropriate redirect path
 */
export async function getUserRoleAndRedirectPath(userId: string): Promise<{
  roleName: UserRoleType;
  redirectPath: string;
}> {
  const { data: userRoleData } = await supabase
    .from('user_roles')
    .select(`
      roles:role_id (
        name
      )
    `)
    .eq('user_id', userId)
    .maybeSingle();

  const roleName = (userRoleData?.roles as any)?.name as UserRoleType;

  // Determine redirect path based on role
  let redirectPath = '/client'; // Default to client for new signups
  
  if (roleName === 'Administrador') {
    redirectPath = '/admin';
  } else if (roleName === 'Cliente') {
    redirectPath = '/client';
  } else if (roleName) {
    // Any other role (Barbeiro, Gerente, etc.) goes to dashboard
    redirectPath = '/dashboard';
  }

  return { roleName, redirectPath };
}
