import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Search, Clock, AlertCircle, CheckCircle, XCircle, MessageSquare, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { SupportChat } from '@/components/support/SupportChat';

export default function AdminSupport() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['admin-support-tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Realtime for ticket updates
  useEffect(() => {
    const channel = supabase
      .channel('admin-tickets')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) => {
      const updates: any = { status };
      if (status === 'completed') updates.resolved_at = new Date().toISOString();
      const { error } = await supabase.from('support_tickets').update(updates).eq('id', ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
      toast({ title: 'Status atualizado' });
    },
  });

  const stats = {
    pending: tickets?.filter((t) => t.status === 'pending').length || 0,
    inProgress: tickets?.filter((t) => t.status === 'in_progress').length || 0,
    completed: tickets?.filter((t) => t.status === 'completed').length || 0,
    cancelled: tickets?.filter((t) => t.status === 'cancelled').length || 0,
  };

  const chartData = [
    { name: 'Em Espera', value: stats.pending, fill: '#eab308' },
    { name: 'Em Andamento', value: stats.inProgress, fill: '#3b82f6' },
    { name: 'Concluídos', value: stats.completed, fill: '#22c55e' },
    { name: 'Cancelados', value: stats.cancelled, fill: '#ef4444' },
  ];

  const filteredTickets = tickets?.filter((ticket) => {
    const matchesSearch =
      ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      pending: { cls: 'bg-yellow-100 text-yellow-800', label: 'Em Espera' },
      in_progress: { cls: 'bg-blue-100 text-blue-800', label: 'Em Andamento' },
      completed: { cls: 'bg-green-100 text-green-800', label: 'Concluído' },
      cancelled: { cls: '', label: 'Cancelado' },
    };
    const s = map[status] || { cls: '', label: status };
    return s.cls ? <Badge className={s.cls}>{s.label}</Badge> : <Badge variant="secondary">{s.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      urgent: { cls: 'destructive', label: 'Urgente' },
      high: { cls: 'bg-orange-100 text-orange-800', label: 'Alta' },
      medium: { cls: 'bg-blue-100 text-blue-800', label: 'Média' },
      low: { cls: '', label: 'Baixa' },
    };
    const p = map[priority];
    if (!p) return <Badge variant="secondary">{priority}</Badge>;
    if (priority === 'urgent') return <Badge variant="destructive">{p.label}</Badge>;
    if (priority === 'low') return <Badge variant="secondary">{p.label}</Badge>;
    return <Badge className={p.cls}>{p.label}</Badge>;
  };

  // Chat view when a ticket is selected
  if (selectedTicket) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedTicket(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{selectedTicket.subject}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge(selectedTicket.status)}
              {getPriorityBadge(selectedTicket.priority)}
              <span className="text-xs text-muted-foreground">
                {format(new Date(selectedTicket.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </span>
            </div>
          </div>
          <Select
            value={selectedTicket.status}
            onValueChange={(value) => {
              updateStatusMutation.mutate({ ticketId: selectedTicket.id, status: value });
              setSelectedTicket({ ...selectedTicket, status: value });
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Em Espera</SelectItem>
              <SelectItem value="in_progress">Em Andamento</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedTicket.description && (
          <Card>
            <CardContent className="p-3">
              <p className="text-sm text-muted-foreground">{selectedTicket.description}</p>
            </CardContent>
          </Card>
        )}

        <Card className="flex flex-col" style={{ height: 'calc(100vh - 300px)' }}>
          <SupportChat ticketId={selectedTicket.id} isAdmin={true} />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight underline decoration-primary/20 underline-offset-8 flex items-center gap-2">
          Suporte Central
        </h1>
        <p className="text-muted-foreground font-medium text-sm sm:text-base">
          Gerencie e responda aos chamados de suporte dos estabelecimentos
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="premium-card border-l-8 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Em Espera</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent><div className="text-3xl font-black tracking-tighter">{stats.pending}</div></CardContent>
        </Card>
        <Card className="premium-card border-l-8 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Em Andamento</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-3xl font-black tracking-tighter">{stats.inProgress}</div></CardContent>
        </Card>
        <Card className="premium-card border-l-8 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Concluídos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-3xl font-black tracking-tighter">{stats.completed}</div></CardContent>
        </Card>
        <Card className="premium-card border-l-8 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Cancelados</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent><div className="text-3xl font-black tracking-tighter">{stats.cancelled}</div></CardContent>
        </Card>
      </div>

      <Card className="premium-card border-none shadow-xl rounded-[32px] overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-black tracking-tight uppercase text-zinc-900">Distribuição de Chamados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%" cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontWeight: 'bold', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar chamados..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filtrar por status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Em Espera</SelectItem>
            <SelectItem value="in_progress">Em Andamento</SelectItem>
            <SelectItem value="completed">Concluídos</SelectItem>
            <SelectItem value="cancelled">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="premium-card border-none shadow-2xl rounded-[32px] overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-50/50">
            <TableRow className="hover:bg-transparent border-b border-black/5">
              <TableHead className="font-black uppercase tracking-widest text-[10px] px-8 text-zinc-400 h-14">Assunto</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px] px-8 text-zinc-400 h-14">Prioridade</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px] px-8 text-zinc-400 h-14">Status</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px] px-8 text-zinc-400 h-14">Criado em</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px] px-8 text-zinc-400 h-14 w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-zinc-400 font-bold uppercase tracking-widest text-xs">Carregando chamados...</TableCell></TableRow>
            ) : filteredTickets?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16 px-6">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-50 flex items-center justify-center mx-auto mb-4 text-zinc-300">
                    <Search className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-black text-foreground mb-1">Nenhum chamado encontrado</h3>
                  <p className="text-sm font-medium text-zinc-400">Tente ajustar seus filtros.</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredTickets?.map((ticket) => (
                <TableRow key={ticket.id} className="cursor-pointer hover:bg-zinc-50/50 transition-colors border-b border-black/5 last:border-0" onClick={() => setSelectedTicket(ticket)}>
                  <TableCell className="px-8 py-5 font-bold text-zinc-900">{ticket.subject}</TableCell>
                  <TableCell className="px-8 py-5 font-semibold text-zinc-600">{getPriorityBadge(ticket.priority)}</TableCell>
                  <TableCell className="px-8 py-5 font-semibold text-zinc-600">{getStatusBadge(ticket.status)}</TableCell>
                  <TableCell className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">{format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                  <TableCell className="px-8 py-5 text-right">
                    <Button variant="ghost" size="sm" className="h-9 w-9 rounded-xl hover:bg-white hover:shadow-md transition-all text-zinc-400 hover:text-primary"><MessageSquare className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
