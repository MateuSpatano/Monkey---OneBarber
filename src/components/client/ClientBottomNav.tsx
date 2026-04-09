import { NavLink } from 'react-router-dom';
import { Home, Calendar, Clock, User, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Início', path: '/client' },
  { icon: Calendar, label: 'Agendar', path: '/client/book' },
  { icon: Clock, label: 'Agenda', path: '/client/appointments' },
  { icon: User, label: 'Perfil', path: '/client/profile' },
  { icon: Settings, label: 'Config', path: '/client/settings' },
];

export function ClientBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t border-border">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/client'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-0.5 min-w-[3rem] min-h-[2.75rem] rounded-lg px-2 py-1 transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-zinc-400 hover:text-white'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-tight">{item.label}</span>
          </NavLink>
        ))}
      </div>
      {/* Safe area for iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
