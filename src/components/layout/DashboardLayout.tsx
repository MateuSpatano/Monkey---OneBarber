import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved === 'true';
  });
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);

  // Sync collapsed/submenu state instantly via custom event from Sidebar
  useEffect(() => {
    const handler = (e: Event) => {
      const { isCollapsed: c, hasSubmenu } = (e as CustomEvent).detail;
      setIsCollapsed(c);
      setIsSubmenuOpen(hasSubmenu);
    };
    window.addEventListener('sidebar-state-change', handler);
    return () => window.removeEventListener('sidebar-state-change', handler);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-white">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      {/* Main content */}
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
