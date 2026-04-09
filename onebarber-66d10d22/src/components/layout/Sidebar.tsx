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
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissionsContext } from '@/contexts/PermissionsContext';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import logoOneBarber from '@/assets/logo-onebarber.png';

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
        children: [
          {
            label: 'WhatsApp',
            href: '/dashboard/marketing/comunicacao/whatsapp',
            icon: MessageSquare,
            module: 'marketing',
          },
          {
            label: 'SMS',
            href: '/dashboard/marketing/comunicacao/sms',
            icon: Phone,
            module: 'marketing',
          },
          {
            label: 'E-mail',
            href: '/dashboard/marketing/comunicacao/email',
            icon: Mail,
            module: 'marketing',
          },
        ],
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
        label: 'Dashboard',
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
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
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

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => !prev);
  };

  const toggleExpand = (label: string) => {
    if (isCollapsed) return; // Don't expand when collapsed
    setExpandedItems((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
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
    const isExpanded = expandedItems.includes(item.label);
    const active = isActive(item.href);

    const content = (
      <div key={item.href}>
        {hasChildren ? (
          <>
            <button
              onClick={() => toggleExpand(item.label)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                active && 'bg-sidebar-accent text-sidebar-foreground',
                isCollapsed && 'justify-center px-2'
              )}
              style={{ paddingLeft: isCollapsed ? undefined : `${12 + depth * 16}px` }}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </>
              )}
            </button>
            {isExpanded && !isCollapsed && (
              <div className="mt-1 space-y-1">
                {item.children?.map((child) => renderNavItem(child, depth + 1))}
              </div>
            )}
          </>
        ) : (
          <NavLink
            to={item.href}
            className={({ isActive: linkActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                (linkActive || active) && 'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90',
                isCollapsed && 'justify-center px-2'
              )
            }
            style={{ paddingLeft: isCollapsed ? undefined : `${12 + depth * 16}px` }}
            onClick={() => window.innerWidth < 1024 && onToggle()}
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
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full sidebar-gradient transition-all duration-300 lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={cn(
            'flex items-center h-16 px-4 border-b border-sidebar-border',
            isCollapsed ? 'justify-center' : 'justify-between'
          )}>
            {!isCollapsed && (
              <div className="flex items-center gap-3">
                <img 
                  src={logoOneBarber} 
                  alt="OneBarber" 
                  className="h-8 w-auto"
                />
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
              className="lg:hidden text-sidebar-foreground/80 hover:text-sidebar-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Collapse Toggle Button (Desktop only) */}
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
                  className="text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8"
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

          {/* Navigation */}
          <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
            {navigation.map((item) => renderNavItem(item))}
          </nav>

          {/* User section */}
          <div className="p-3 border-t border-sidebar-border">
            {!isCollapsed && (
              <div className="flex items-center gap-3 px-3 py-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center">
                  <span className="text-sidebar-primary text-sm font-medium">
                    {user?.email?.[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {user?.email}
                  </p>
                  {userRole && (
                    <p className="text-xs text-sidebar-muted truncate">
                      {userRole.name}
                    </p>
                  )}
                </div>
              </div>
            )}
            {isCollapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
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
                className="w-full justify-start text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            )}
          </div>
        </div>
      </aside>

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
