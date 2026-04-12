import { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { cn } from '@/lib/utils';
import { usePermissionsContext } from '@/contexts/PermissionsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const SIDEBAR_COLLAPSED_KEY = 'admin-sidebar-collapsed';

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved === 'true';
  });
  const { isAdmin, loading: permissionsLoading } = usePermissionsContext();
  const { user, loading: authLoading } = useAuth();

  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);

  useEffect(() => {
    const handleStorageChange = () => {
      const savedCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      const savedSubmenu = localStorage.getItem('admin-sidebar-submenu-open');
      setIsCollapsed(savedCollapsed === 'true');
      setIsSubmenuOpen(savedSubmenu === 'true');
    };

    const interval = setInterval(handleStorageChange, 100);
    return () => clearInterval(interval);
  }, []);

  if (authLoading || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-white">
      <AdminSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <main
        className={cn(
          'transition-all duration-300 min-h-screen',
          // Mobile: add margin when sidebar is open
          sidebarOpen && 'ml-56 lg:ml-0',
          // Desktop: margin based on collapsed and submenu state
          isCollapsed ? (isSubmenuOpen ? 'lg:ml-[328px]' : 'lg:ml-[104px]') : (isSubmenuOpen ? 'lg:ml-[472px]' : 'lg:ml-[248px]')
        )}
      >
        <div className="p-4 pt-20 lg:p-8 lg:pt-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
