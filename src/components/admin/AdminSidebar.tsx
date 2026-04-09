import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Users,
  HeadphonesIcon,
  LogOut,
  X,
  PanelLeftClose,
  PanelLeft,
  Settings,
  ChevronRight,
  ChevronDown,
  Calendar,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import logoIcon from '@/assets/sidebarlog.png';
import logoText from '@/assets/sidebar.png';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  module?: string;
  children?: NavItem[];
}

const adminNavigation: NavItem[] = [
  {
    label: 'Painel Gerencial',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    label: 'Gerenciar Unidades',
    href: '/admin/establishments',
    icon: Building2,
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
  const [activeModule, setActiveModule] = useState<NavItem | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved === 'true';
  });
  const location = useLocation();
  const { user, signOut } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
  }, [isCollapsed]);

  // Sync submenu state with layout
  useEffect(() => {
    localStorage.setItem('admin-sidebar-submenu-open', activeModule ? 'true' : 'false');
  }, [activeModule]);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => !prev);
    if (!isCollapsed) setActiveModule(null);
  };

  const handleModuleClick = (item: NavItem) => {
    if (item.children && item.children.length > 0) {
      setActiveModule(prev => prev?.label === item.label ? null : item);
    } else {
      setActiveModule(null);
    }
  };

  const isActive = (href: string) => {
    if (href === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <>
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex transition-all duration-300 transform",
          "m-3 rounded-[32px] shadow-2xl border border-white/10 overflow-hidden bg-transparent",
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          activeModule && activeModule.children ? (isCollapsed ? 'w-[304px]' : 'w-[448px]') : (isCollapsed ? 'w-20' : 'w-56')
        )}
      >
        {/* Primary Navigation Column (Solid Black) */}
        <div className={cn(
          "flex flex-col h-full border-r border-white/5 transition-all duration-300 bg-black relative",
          isCollapsed ? 'w-20' : 'w-56'
        )}>
          {/* Header - Now the logo icon is the toggle */}
          <div className={cn(
            'flex items-center justify-start py-6 border-b border-white/5',
            isCollapsed ? 'px-2 justify-center' : 'px-6'
          )}>
            <button
              onClick={toggleCollapsed}
              className={cn(
                "flex flex-col w-full transition-all active:scale-95 hover:opacity-80 group outline-none",
                isCollapsed ? "items-center" : "items-start"
              )}
            >
              <div className="flex items-center gap-4 overflow-hidden">
                <img 
                  src={logoIcon} 
                  alt="Logo" 
                  className={cn(
                    "h-[46px] w-auto transition-all duration-300",
                    isCollapsed ? "h-10" : "h-[46px]",
                    "group-hover:scale-110"
                  )} 
                />
                {!isCollapsed && (
                  <img 
                    src={logoText} 
                    alt="OneBarber" 
                    className="h-[34px] w-auto relative -top-[6px] animate-in fade-in slide-in-from-left-2 duration-500" 
                  />
                )}
              </div>
              {!isCollapsed && (
                <span className="text-white/50 font-bold text-[10px] mt-1 ml-13 uppercase tracking-widest animate-in fade-in duration-700">Admin</span>
              )}
            </button>
          </div>

          {/* Main Nav */}
          <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto custom-scrollbar font-medium">
            {adminNavigation.map((item) => {
              const hasChildren = item.children && item.children.length > 0;
              const isModuleActive = activeModule?.label === item.label;
              const active = isActive(item.href);

              const content = (
                <div key={item.href}>
                  {hasChildren ? (
                    <button
                      onClick={() => handleModuleClick(item)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-300 relative group',
                        'text-white/60 hover:bg-white/5 hover:text-white',
                        (isModuleActive || active) && 'bg-white/10 text-white shadow-sm',
                        isCollapsed && 'justify-center px-2'
                      )}
                    >
                      <item.icon className={cn(
                        "h-5 w-5 flex-shrink-0 transition-transform duration-300",
                        isModuleActive && "scale-110"
                      )} />
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 text-left font-medium">{item.label}</span>
                          <ChevronRight className={cn(
                            "h-4 w-4 transition-all duration-300",
                            isModuleActive ? "rotate-90 lg:rotate-0 translate-x-1 opacity-100" : "opacity-40 group-hover:opacity-100"
                          )} />
                        </>
                      )}

                      {/* Connection Indicator */}
                      {isModuleActive && !isCollapsed && (
                        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary rounded-l-full animate-in fade-in slide-in-from-right-1 duration-300" />
                      )}
                    </button>
                  ) : (
                    <NavLink
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                        'text-white/60 hover:bg-white/5 hover:text-white',
                        active && 'bg-primary text-primary-foreground shadow-lg',
                        isCollapsed && 'justify-center px-2'
                      )}
                      onClick={() => {
                        setActiveModule(null);
                        window.innerWidth < 1024 && onToggle();
                      }}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && <span>{item.label}</span>}
                    </NavLink>
                  )}
                </div>
              );

              if (isCollapsed) {
                return (
                  <Tooltip key={item.href} delayDuration={0}>
                    <TooltipTrigger asChild>{content}</TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }
              return content;
            })}
          </nav>

          {/* User section */}
          <div className="p-3 border-t border-white/5">
            {!isCollapsed && (
              <div className="flex items-center gap-3 px-3 py-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{user?.email?.[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0 text-white">
                  <p className="text-sm font-medium truncate">{user?.email}</p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              className={cn("w-full text-white/40 hover:text-white hover:bg-white/5", isCollapsed ? "justify-center px-0" : "justify-start")}
              onClick={signOut}
            >
              <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
              {!isCollapsed && <span>Sair</span>}
            </Button>
          </div>
        </div>

        {/* Secondary Submenu Column (Admin Integrated & Light Glassmorphism) */}
        {activeModule && activeModule.children && (
          <div
            className={cn(
              'w-56 glass-sidebar flex flex-col relative',
              'animate-in slide-in-from-left-4 fade-in duration-500 ease-out border-l border-black/5'
            )}
          >
            {/* Divider Gradient Effect */}
            <div className="absolute left-0 top-0 bottom-0 w-8 sidebar-divider-gradient z-10 opacity-20" />

            <div className="p-6 border-b border-black/5 flex items-center justify-between relative z-20">
              <div>
                <h2 className="text-zinc-900 font-bold text-xl tracking-tight">{activeModule.label}</h2>
                <p className="text-primary text-[10px] mt-1.5 uppercase tracking-[0.2em] font-black opacity-60">Navegação Admin</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-black/20 hover:text-black hover:bg-black/5 rounded-full transition-colors" onClick={() => setActiveModule(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar relative z-20">
              {activeModule.children.map((child) => (
                <NavLink
                  key={child.href}
                  to={child.href}
                  onClick={() => {
                    setActiveModule(null);
                    window.innerWidth < 1024 && onToggle();
                  }}
                  className={({ isActive: linkActive }) =>
                    cn(
                      'flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300 group',
                      'text-zinc-500 hover:bg-black/5 hover:text-zinc-900 hover:translate-x-1',
                      linkActive && 'bg-black text-white shadow-xl shadow-black/10 scale-[1.02]'
                    )
                  }
                >
                  <div className={cn(
                    "p-2 rounded-xl transition-all duration-300",
                    "bg-black/5 group-hover:bg-black/10 group-hover:scale-110"
                  )}>
                    <child.icon className="h-4 w-4 flex-shrink-0" />
                  </div>
                  <span className="tracking-tight">{child.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </div>

      {/* Mobile overlay */}
      {(isOpen || (activeModule && window.innerWidth < 1024)) && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => {
            if (activeModule) setActiveModule(null);
            else if (isOpen) onToggle();
          }}
        />
      )}
    </>
  );
}
