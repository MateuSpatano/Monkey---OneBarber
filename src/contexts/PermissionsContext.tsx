import { createContext, useContext, ReactNode } from 'react';
import { usePermissions, AppModule, PermissionAction } from '@/hooks/usePermissions';

interface PermissionsContextType {
  permissions: { module: AppModule; action: PermissionAction }[];
  userRole: { id: string; name: string; description: string | null } | null;
  loading: boolean;
  isAdmin: boolean;
  hasPermission: (module: AppModule, action: PermissionAction) => boolean;
  canView: (module: AppModule) => boolean;
  canCreate: (module: AppModule) => boolean;
  canEdit: (module: AppModule) => boolean;
  canDelete: (module: AppModule) => boolean;
  refetch: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const permissionsData = usePermissions();

  return (
    <PermissionsContext.Provider value={permissionsData}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissionsContext() {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissionsContext must be used within a PermissionsProvider');
  }
  return context;
}
