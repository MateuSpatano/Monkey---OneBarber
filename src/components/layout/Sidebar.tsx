import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Shield,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Settings,
  UserCheck,
  Calendar,
  ClipboardList,
  Scissors,
  Package,
  DollarSign,
  Wallet,
  Receipt,
  Megaphone,
  Zap,
  MessageSquare,
  Phone,
  Mail,
  Star,
  Percent,
  BarChart3,
  Building2,
  BookOpen,
  Plug,
  FolderKanban,
  PanelLeftClose,
  PanelLeft,
  Lock,
  Headphones,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissionsContext } from '@/contexts/PermissionsContext';
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

const allNavigation: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    module: 'dashboard',
  },
  {
    label: 'Agenda',
    href: '/dashboard/agendamentos',
    icon: Calendar,
    children: [
      {
        label: 'Agendamentos',
        href: '/dashboard/agendamentos/agenda',
        icon: Calendar,
        module: 'appointments',
      },
      {
        label: 'Gerenciar Agenda',
        href: '/dashboard/agendamentos/disponibilidade',
        icon: Calendar,
        module: 'appointments',
      },
    ],
  },
  {
    label: 'Cadastro',
    href: '/dashboard/cadastro',
    icon: ClipboardList,
    children: [
      {
        label: 'Clientes',
        href: '/dashboard/clients',
        icon: UserCheck,
        module: 'clients',
      },
      {
        label: 'Profissionais',
        href: '/dashboard/professionals',
        icon: Scissors,
        module: 'professionals',
      },
      {
        label: 'Produtos/Serviços',
        href: '/dashboard/products',
        icon: Package,
        module: 'products',
      },
    ],
  },
  {
    label: 'Financeiro',
    href: '/dashboard/financeiro',
    icon: DollarSign,
    children: [
      {
        label: 'Caixa',
        href: '/dashboard/financeiro/caixa',
        icon: Wallet,
        module: 'financial',
      },
      {
        label: 'Lançamentos',
        href: '/dashboard/financeiro/lancamentos',
        icon: Receipt,
        module: 'financial',
      },
      {
        label: 'Comissões',
        href: '/dashboard/financeiro/comissoes',
        icon: Percent,
        module: 'financial',
      },
    ],
  },
  {
    label: 'Marketing',
    href: '/dashboard/marketing',
    icon: Megaphone,
    module: 'marketing',
    children: [
      {
        label: 'Campanhas',
        href: '/dashboard/marketing/campanhas',
        icon: Megaphone,
        module: 'marketing',
      },
      {
        label: 'Automações',
        href: '/dashboard/marketing/automacoes',
        icon: Zap,
        module: 'marketing',
      },
      {
        label: 'Fidelidade',
        href: '/dashboard/marketing/fidelidade',
        icon: Star,
        module: 'marketing',
      },
      {
        label: 'Comunicação',
        href: '/dashboard/marketing/comunicacao',
        icon: MessageSquare,
        module: 'marketing',
      },
    ],
  },
  {
    label: 'Relatórios',
    href: '/dashboard/relatorios',
    icon: BarChart3,
    module: 'reports',
    children: [
      {
        label: 'Dados',
        href: '/dashboard/relatorios',
        icon: BarChart3,
        module: 'reports',
      },
      {
        label: 'Grupos de Relatórios',
        href: '/dashboard/relatorios/grupos',
        icon: FolderKanban,
        module: 'reports',
      },
    ],
  },
  {
    label: 'Segurança',
    href: '/dashboard/security',
    icon: Shield,
    children: [
      {
        label: 'Usuários',
        href: '/dashboard/users',
        icon: Users,
        module: 'users',
      },
      {
        label: 'Permissões',
        href: '/dashboard/roles',
        icon: Lock,
        module: 'roles',
      },
    ],
  },
  {
    label: 'Suporte',
    href: '/dashboard/suporte',
    icon: Headphones,
  },
  {
    label: 'Configurações',
    href: '/dashboard/configuracoes',
    icon: Settings,
    module: 'settings',
    children: [
      {
        label: 'Estabelecimento',
        href: '/dashboard/configuracoes/estabelecimento',
        icon: Building2,
        module: 'settings',
      },
      {
        label: 'Regras de Negócio',
        href: '/dashboard/configuracoes/regras',
        icon: BookOpen,
        module: 'settings',
      },
      {
        label: 'Integrações',
        href: '/dashboard/configuracoes/integracoes',
        icon: Plug,
        module: 'settings',
      },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const [activeModule, setActiveModule] = useState<NavItem | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved === 'true';
  });
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { canView, userRole, isAdmin } = usePermissionsContext();

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
  }, [isCollapsed]);

  // Save submenu state to localStorage to sync with DashboardLayout
  useEffect(() => {
    localStorage.setItem('sidebar-submenu-open', activeModule ? 'true' : 'false');
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
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  // Filter navigation based on permissions
  const filterNavigation = (items: NavItem[]): NavItem[] => {
    return items
      .filter((item) => {
        if (item.module === 'dashboard') return true;
        if (isAdmin) return true;
        if (!userRole) return true;
        return canView(item.module as any);
      })
      .map((item) => ({
        ...item,
        children: item.children ? filterNavigation(item.children) : undefined,
      }))
      .filter((item) => {
        if (item.children !== undefined && item.children.length === 0) {
          return false;
        }
        return true;
      });
  };

  const navigation = filterNavigation(allNavigation);

  const renderNavItem = (item: NavItem, depth = 0) => {
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
              'text-sidebar-foreground/60 hover:bg-white/5 hover:text-white',
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
            
            {/* Connection Indicator (Visual Bridge) */}
            {isModuleActive && !isCollapsed && (
              <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-sidebar-primary rounded-l-full animate-in fade-in slide-in-from-right-1 duration-300" />
            )}
          </button>
        ) : (
          <NavLink
            to={item.href}
            end={item.href === '/dashboard'}
            className={({ isActive: linkActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground hover:translate-x-1',
                (linkActive || active) && 'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 shadow-lg shadow-sidebar-primary/20',
                isCollapsed && 'justify-center px-2 hover:translate-x-0'
              )
            }
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

    // Wrap in tooltip when collapsed
    if (isCollapsed && depth === 0) {
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
  };

  return (
    <>
      {/* Integrated Two-Level Sidebar Container */}
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
            'flex items-center justify-start py-6 border-b border-sidebar-border',
            isCollapsed ? 'px-2 justify-center' : 'px-6'
          )}>
            <button
              onClick={toggleCollapsed}
              className={cn(
                "flex items-center gap-4 w-full transition-all active:scale-95 hover:opacity-80 group outline-none",
                isCollapsed ? "justify-center" : "justify-start"
              )}
            >
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
            </button>
          </div>

          {/* Main Nav */}
          <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto custom-scrollbar">
            {navigation.map((item) => renderNavItem(item))}
          </nav>

          {/* User section */}
          <div className="p-3 border-t border-sidebar-border">
            {!isCollapsed && (
              <div className="flex items-center gap-3 px-3 py-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center">
                  <span className="text-sidebar-primary text-sm font-medium">{user?.email?.[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.email}</p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              className={cn("w-full text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent", isCollapsed ? "justify-center px-0" : "justify-start")}
              onClick={signOut}
            >
              <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
              {!isCollapsed && <span>Sair</span>}
            </Button>
          </div>
        </div>

        {/* Secondary Submenu Column (Integrated & Light Glassmorphism) */}
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
                <p className="text-sidebar-primary text-[10px] mt-1.5 uppercase tracking-[0.2em] font-black opacity-60">Navegação</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-black/20 hover:text-black hover:bg-black/5 rounded-full transition-colors"
                onClick={() => setActiveModule(null)}
              >
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
                      linkActive && 'bg-black text-white shadow-xl shadow-black/10 scale-[1.02] border-none'
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

      {/* Mobile menu button */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-30 lg:hidden p-2 rounded-lg bg-card shadow-md text-foreground hover:bg-accent"
      >
        <Menu className="h-5 w-5" />
      </button>
    </>
  );
}
