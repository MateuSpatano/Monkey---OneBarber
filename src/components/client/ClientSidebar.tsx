import { useNavigate } from 'react-router-dom';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Scissors, Calendar, Settings, LogOut, Home, Clock, User, Store } from 'lucide-react';
import logoIcon from '@/assets/sidebarlog.png';
import logoText from '@/assets/sidebar.png';

const menuItems = [
  { icon: Home, label: 'Início', path: '/client' },
  { icon: Scissors, label: 'Serviços', path: '/client/services' },
  { icon: Calendar, label: 'Agendar', path: '/client/book' },
  { icon: Clock, label: 'Meus Agendamentos', path: '/client/appointments' },
  { icon: User, label: 'Meu Perfil', path: '/client/profile' },
  { icon: Settings, label: 'Configurações', path: '/client/settings' },
];

interface ClientSidebarProps {
  onChangeEstablishment?: () => void;
}

export function ClientSidebar({ onChangeEstablishment }: ClientSidebarProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 transition-all duration-300 transform",
      "m-3 rounded-3xl bg-black shadow-2xl border border-white/10 w-64 lg:static lg:translate-x-0"
    )}>
      <div className="flex flex-col h-full overflow-hidden text-white">
        <div className="p-8 border-b border-white/10 flex flex-col items-start justify-center">
          <div className="flex flex-col items-start animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="flex items-center gap-4">
              <img src={logoIcon} alt="Logo" className="h-[46px] w-auto" />
              <img src={logoText} alt="OneBarber" className="h-[34px] w-auto relative -top-[6px]" />
            </div>
            <span className="text-[10px] text-white/40 mt-1 uppercase tracking-widest font-medium ml-12">Portal do Cliente</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/client'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-white/10 text-zinc-400'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          {onChangeEstablishment && (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3"
              onClick={onChangeEstablishment}
            >
              <Store className="h-5 w-5" />
              <span>Trocar Barbearia</span>
            </Button>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            <span>Sair</span>
          </Button>
        </div>
      </div>
    </aside>
  );
}
