import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, DollarSign, Headphones, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [
        { count: usersCount },
        { count: professionalsCount },
        { count: clientsCount },
        { count: appointmentsCount },
        { count: pendingTickets },
        { count: inProgressTickets },
        { count: completedTickets },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('professionals').select('*', { count: 'exact', head: true }),
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('appointments').select('*', { count: 'exact', head: true }),
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      ]);

      return {
        users: usersCount || 0,
        professionals: professionalsCount || 0,
        clients: clientsCount || 0,
        appointments: appointmentsCount || 0,
        pendingTickets: pendingTickets || 0,
        inProgressTickets: inProgressTickets || 0,
        completedTickets: completedTickets || 0,
      };
    },
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['admin-recent-activity'],
    queryFn: async () => {
      const { data: recentAppointments } = await supabase
        .from('appointments')
        .select(`
          id,
          service,
          status,
          created_at,
          clients:client_id (name),
          professionals:professional_id (name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: recentTickets } = await supabase
        .from('support_tickets')
        .select('id, subject, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      return {
        appointments: recentAppointments || [],
        tickets: recentTickets || [],
      };
    },
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black text-foreground tracking-tight underline decoration-primary/20 underline-offset-8">Painel Gerencial</h1>
        <p className="text-muted-foreground mt-3 font-medium">Controle central e visão estratégica do sistema</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Total de Usuários</CardTitle>
            <div className="p-2 rounded-xl bg-primary/5">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter">{stats?.users || 0}</div>
            <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-widest opacity-60">
              {stats?.professionals || 0} profissionais ativos
            </p>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Clientes</CardTitle>
            <div className="p-2 rounded-xl bg-zinc-100">
              <Users className="h-4 w-4 text-zinc-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter">{stats?.clients || 0}</div>
            <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-widest opacity-60">Cadastrados no sistema</p>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Agendamentos</CardTitle>
            <div className="p-2 rounded-xl bg-green-50">
              <Calendar className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter">{stats?.appointments || 0}</div>
            <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-widest opacity-60">Volume total histórico</p>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Chamados Pendentes</CardTitle>
            <div className="p-2 rounded-xl bg-red-50">
              <Headphones className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter">{stats?.pendingTickets || 0}</div>
            <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-widest opacity-60">
              {stats?.inProgressTickets || 0} chamados em andamento
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="premium-card border-l-8 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-yellow-600">Em Espera</CardTitle>
            <Clock className="h-5 w-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{stats?.pendingTickets || 0}</div>
          </CardContent>
        </Card>

        <Card className="premium-card border-l-8 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-blue-600">Em Andamento</CardTitle>
            <AlertCircle className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{stats?.inProgressTickets || 0}</div>
          </CardContent>
        </Card>

        <Card className="premium-card border-l-8 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-green-600">Concluídos</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{stats?.completedTickets || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="premium-card border-none shadow-2xl rounded-[32px] overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-black tracking-tight uppercase flex items-center gap-3 text-zinc-900">
              <Calendar className="h-6 w-6 text-primary" />
              Últimos Agendamentos
            </CardTitle>
            <CardDescription className="font-medium text-zinc-500">Agendamentos recentes realizados no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity?.appointments?.length === 0 && (
                <p className="text-sm text-muted-foreground font-medium">Nenhum agendamento recente</p>
              )}
              {recentActivity?.appointments?.map((appointment: any) => (
                <div key={appointment.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-zinc-50 transition-colors border border-transparent hover:border-black/5">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-zinc-900">{appointment.service}</p>
                    <p className="text-xs font-semibold text-zinc-400">
                      {appointment.clients?.name || 'Cliente'} • {appointment.professionals?.name || 'Profissional'}
                    </p>
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    {format(new Date(appointment.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card border-none shadow-2xl rounded-[32px] overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-black tracking-tight uppercase flex items-center gap-3 text-zinc-900">
              <Headphones className="h-6 w-6 text-primary" />
              Últimos Chamados
            </CardTitle>
            <CardDescription className="font-medium text-zinc-500">Tickets de suporte abertos recentemente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity?.tickets?.length === 0 && (
                <p className="text-sm text-muted-foreground font-medium">Nenhum chamado recente</p>
              )}
              {recentActivity?.tickets?.map((ticket: any) => (
                <div key={ticket.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-zinc-50 transition-colors border border-transparent hover:border-black/5">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-zinc-900">{ticket.subject}</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${ticket.status === 'pending' ? 'bg-yellow-500' : ticket.status === 'in_progress' ? 'bg-blue-500' : 'bg-green-500'}`} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        {ticket.status === 'pending' ? 'Em Espera' : ticket.status === 'in_progress' ? 'Em andamento' : 'Concluído'}
                      </p>
                    </div>
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    {format(new Date(ticket.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
