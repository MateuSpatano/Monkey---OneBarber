import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, Shield, TrendingUp, Clock, HeadphonesIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { SupportTicketModal } from '@/components/support/SupportTicketModal';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalRoles: number;
  totalPermissions: number;
}

interface RecentUser {
  id: string;
  full_name: string | null;
  email: string;
  created_at: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalRoles: 0,
    totalPermissions: 0,
  });
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, status, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const totalUsers = profiles?.length || 0;
      const activeUsers = profiles?.filter(p => p.status === 'active').length || 0;

      const { count: rolesCount, error: rolesError } = await supabase
        .from('roles')
        .select('id', { count: 'exact', head: true });

      if (rolesError) throw rolesError;

      const { count: permissionsCount, error: permissionsError } = await supabase
        .from('permissions')
        .select('id', { count: 'exact', head: true });

      if (permissionsError) throw permissionsError;

      setStats({
        totalUsers,
        activeUsers,
        totalRoles: rolesCount || 0,
        totalPermissions: permissionsCount || 0,
      });

      setRecentUsers((profiles || []).slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    return `${diffDays}d atrás`;
  };

  const statsCards = [
    {
      title: 'Total de Usuários',
      value: stats.totalUsers.toString(),
      icon: Users,
      description: 'Usuários cadastrados',
    },
    {
      title: 'Usuários Ativos',
      value: stats.activeUsers.toString(),
      icon: UserCheck,
      description: 'Com status ativo',
    },
    {
      title: 'Funções',
      value: stats.totalRoles.toString(),
      icon: Shield,
      description: 'Perfis de acesso',
    },
    {
      title: 'Permissões',
      value: stats.totalPermissions.toString(),
      icon: TrendingUp,
      description: 'Total de permissões',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral do seu painel administrativo</p>
        </div>
        <Button variant="outline" onClick={() => setSupportModalOpen(true)}>
          <HeadphonesIcon className="mr-2 h-4 w-4" />
          Abrir Suporte
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="card-shadow border-0">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="card-shadow border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Usuários Recentes
            </CardTitle>
            <CardDescription>Últimos usuários cadastrados no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : recentUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum usuário cadastrado ainda
              </div>
            ) : (
              <div className="space-y-4">
                {recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-medium text-primary">
                        {user.full_name
                          ? user.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                          : user.email[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {user.full_name || 'Sem nome'}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTimeAgo(user.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-shadow border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Informações do Sistema
            </CardTitle>
            <CardDescription>Status do sistema RBAC</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <span className="text-sm text-muted-foreground">Sistema de Permissões</span>
                <span className="text-sm font-medium text-success">Ativo</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <span className="text-sm text-muted-foreground">Autenticação</span>
                <span className="text-sm font-medium text-success">Configurado</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <span className="text-sm text-muted-foreground">Funções Cadastradas</span>
                <span className="text-sm font-medium">{loading ? '...' : stats.totalRoles}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <span className="text-sm text-muted-foreground">Permissões Disponíveis</span>
                <span className="text-sm font-medium">{loading ? '...' : stats.totalPermissions}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <SupportTicketModal open={supportModalOpen} onOpenChange={setSupportModalOpen} />
    </div>
  );
}
