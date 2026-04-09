import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  HeadphonesIcon,
  LogOut,
  X,
  PanelLeftClose,
  PanelLeft,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import logoOneBarber from '@/assets/logo-onebarber.png';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const adminNavigation: NavItem[] = [
  {
    label: 'Painel Gerencial',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    label: 'Gerenciar Usuários',
    href: '/admin/users',
    icon: Users,
  },
  {
    label: 'Suporte',
    href: '/admin/support',
    icon: HeadphonesIcon,
  },
  {
    label: 'Configurações',
    href: '/admin/settings',
    icon: Settings,
  },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const SIDEBAR_COLLAPSED_KEY = 'admin-sidebar-collapsed';

export function AdminSidebar({ isOpen, onToggle }: AdminSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved === 'true';
  });
  const location = useLocation();
  const { user, signOut } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
  }, [isCollapsed]);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => !prev);
  };

  const isActive = (href: string) => {
    if (href === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full bg-primary transition-all duration-300 lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        <div className="flex flex-col h-full">
          <div className={cn(
            'flex items-center h-16 px-4 border-b border-primary-foreground/10',
            isCollapsed ? 'justify-center' : 'justify-between'
          )}>
            {!isCollapsed && (
              <div className="flex items-center gap-3">
                <img 
                  src={logoOneBarber} 
                  alt="OneBarber Admin" 
                  className="h-8 w-auto"
                />
                <span className="text-primary-foreground font-semibold text-sm">Admin</span>
              </div>
            )}
            {isCollapsed && (
              <img 
                src={logoOneBarber} 
                alt="OneBarber" 
                className="h-6 w-auto"
              />
            )}
            <button
              onClick={onToggle}
              className="lg:hidden text-primary-foreground/80 hover:text-primary-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className={cn(
            'hidden lg:flex px-3 py-2',
            isCollapsed ? 'justify-center' : 'justify-end'
          )}>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleCollapsed}
                  className="text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8"
                >
                  {isCollapsed ? (
                    <PanelLeft className="h-4 w-4" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {isCollapsed ? 'Expandir menu' : 'Minimizar menu'}
              </TooltipContent>
            </Tooltip>
          </div>

          <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
            {adminNavigation.map((item) => {
              const content = (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    'text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground',
                    isActive(item.href) && 'bg-primary-foreground/20 text-primary-foreground',
                    isCollapsed && 'justify-center px-2'
                  )}
                  onClick={() => window.innerWidth < 1024 && onToggle()}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </NavLink>
              );

              if (isCollapsed) {
                return (
                  <Tooltip key={item.href} delayDuration={0}>
                    <TooltipTrigger asChild>
                      {content}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return content;
            })}
          </nav>

          <div className="p-3 border-t border-primary-foreground/10">
            {!isCollapsed && (
              <div className="flex items-center gap-3 px-3 py-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <span className="text-primary-foreground text-sm font-medium">
                    {user?.email?.[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary-foreground truncate">
                    {user?.email}
                  </p>
                  <p className="text-xs text-primary-foreground/60 truncate">
                    Administrador
                  </p>
                </div>
              </div>
            )}
            {isCollapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10"
                    onClick={signOut}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sair</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
