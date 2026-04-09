import { Outlet } from 'react-router-dom';
import { ClientSidebar } from './ClientSidebar';
import { useRoleRedirect } from '@/hooks/useRoleRedirect';

export function ClientLayout() {
  const { loading } = useRoleRedirect();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <ClientSidebar />
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
