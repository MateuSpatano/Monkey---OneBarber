import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Percent, Check, X, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

type Commission = {
  id: string;
  professional_id: string;
  amount: number;
  reference_date: string;
  payment_status: 'pending' | 'paid' | 'cancelled';
  paid_at: string | null;
  reference_type: string | null;
  notes: string | null;
  professionals?: { name: string } | null;
};

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  cancelled: 'Cancelado',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-700',
  paid: 'bg-green-500/20 text-green-700',
  cancelled: 'bg-red-500/20 text-red-700',
};

export default function Commissions() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  const { data: commissions, isLoading } = useQuery({
    queryKey: ['commissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commissions')
        .select('*, professionals(name)')
        .order('reference_date', { ascending: false });

      if (error) throw error;
      return data as Commission[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['commissions-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commissions')
        .select('amount, payment_status');

      if (error) throw error;

      const totalPending = data
        .filter((c) => c.payment_status === 'pending')
        .reduce((acc, curr) => acc + Number(curr.amount), 0);
      const totalPaid = data
        .filter((c) => c.payment_status === 'paid')
        .reduce((acc, curr) => acc + Number(curr.amount), 0);

      return { totalPending, totalPaid };
    },
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('commissions')
        .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      queryClient.invalidateQueries({ queryKey: ['commissions-stats'] });
      toast.success('Comissão marcada como paga');
    },
    onError: () => {
      toast.error('Erro ao atualizar comissão');
    },
  });

  const filteredCommissions = commissions?.filter((comm) => {
    const matchesSearch =
      comm.professionals?.name?.toLowerCase().includes(search.toLowerCase()) ||
      comm.notes?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || comm.payment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Percent className="h-6 w-6" />
            Comissões
          </h1>
          <p className="text-muted-foreground">
            Gerencie as comissões dos profissionais
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(stats?.totalPending || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats?.totalPaid || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar profissional..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : filteredCommissions?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma comissão encontrada
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Data Referência</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Pagamento</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCommissions?.map((comm) => (
                    <TableRow key={comm.id}>
                      <TableCell className="font-medium">
                        {comm.professionals?.name || '-'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(comm.reference_date), 'dd/MM/yyyy', {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(Number(comm.amount))}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[comm.payment_status]}>
                          {statusLabels[comm.payment_status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {comm.paid_at
                          ? format(new Date(comm.paid_at), 'dd/MM/yyyy', {
                              locale: ptBR,
                            })
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {comm.payment_status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => markAsPaidMutation.mutate(comm.id)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Pagar
                            </Button>
                          )}
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
