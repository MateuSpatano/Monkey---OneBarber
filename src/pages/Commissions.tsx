import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Search, Percent, Check, Eye, Settings2, Loader2, Plus, DollarSign, History } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { CommissionsTab } from '@/components/professionals/tabs/CommissionsTab';
import { cn } from '@/lib/utils';

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

type Professional = {
  id: string;
  name: string;
  specialty: string | null;
  commission_rate: number | null;
  status: string | null;
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

interface CommissionSettings {
  service_percentage_enabled: boolean;
  service_percentage_rate: number;
  revenue_percentage_enabled: boolean;
  revenue_percentage_rate: number;
  fixed_per_service_enabled: boolean;
  fixed_per_service_amount: number;
  product_sales_enabled: boolean;
  product_sales_percentage: number;
  combo_enabled: boolean;
  combo_percentage: number;
  chair_rental_enabled: boolean;
  chair_rental_amount: number;
  chair_rental_period: string;
}

const defaultSettings: CommissionSettings = {
  service_percentage_enabled: false,
  service_percentage_rate: 0,
  revenue_percentage_enabled: false,
  revenue_percentage_rate: 0,
  fixed_per_service_enabled: false,
  fixed_per_service_amount: 0,
  product_sales_enabled: false,
  product_sales_percentage: 0,
  combo_enabled: false,
  combo_percentage: 0,
  chair_rental_enabled: false,
  chair_rental_amount: 0,
  chair_rental_period: 'monthly',
};

export default function Commissions() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [commissionSettings, setCommissionSettings] = useState<CommissionSettings>(defaultSettings);
  const [savingSettings, setSavingSettings] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentProfessional, setPaymentProfessional] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [savingPayment, setSavingPayment] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch user's establishment
  const { data: userEstablishment } = useQuery({
    queryKey: ['user-establishment', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('user_establishments')
        .select('establishment_id')
        .eq('user_id', user.id)
        .maybeSingle();
      return data?.establishment_id || null;
    },
    enabled: !!user,
  });

  // Fetch professionals for this establishment
  const { data: professionals } = useQuery({
    queryKey: ['professionals-for-commissions', userEstablishment],
    queryFn: async () => {
      let query = supabase
        .from('professionals')
        .select('id, name, specialty, commission_rate, status')
        .eq('status', 'active')
        .order('name');

      if (userEstablishment) {
        query = query.eq('establishment_id', userEstablishment);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Professional[];
    },
  });

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
    onError: () => toast.error('Erro ao atualizar comissão'),
  });

  // Load commission settings when a professional is selected
  useEffect(() => {
    if (!selectedProfessional) return;
    loadProfessionalSettings(selectedProfessional.id);
  }, [selectedProfessional?.id]);

  const loadProfessionalSettings = async (professionalId: string) => {
    const { data } = await supabase
      .from('professional_commission_settings')
      .select('*')
      .eq('professional_id', professionalId)
      .maybeSingle();

    if (data) {
      setCommissionSettings({
        service_percentage_enabled: data.service_percentage_enabled ?? false,
        service_percentage_rate: data.service_percentage_rate ?? 0,
        revenue_percentage_enabled: data.revenue_percentage_enabled ?? false,
        revenue_percentage_rate: data.revenue_percentage_rate ?? 0,
        fixed_per_service_enabled: data.fixed_per_service_enabled ?? false,
        fixed_per_service_amount: data.fixed_per_service_amount ?? 0,
        product_sales_enabled: data.product_sales_enabled ?? false,
        product_sales_percentage: data.product_sales_percentage ?? 0,
        combo_enabled: data.combo_enabled ?? false,
        combo_percentage: data.combo_percentage ?? 0,
        chair_rental_enabled: data.chair_rental_enabled ?? false,
        chair_rental_amount: data.chair_rental_amount ?? 0,
        chair_rental_period: data.chair_rental_period ?? 'monthly',
      });
    } else {
      setCommissionSettings(defaultSettings);
    }
  };

  const handleSaveSettings = async () => {
    if (!selectedProfessional) return;
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('professional_commission_settings')
        .upsert({
          professional_id: selectedProfessional.id,
          ...commissionSettings,
        }, { onConflict: 'professional_id' });

      if (error) throw error;

      const rate = commissionSettings.service_percentage_enabled
        ? commissionSettings.service_percentage_rate
        : commissionSettings.revenue_percentage_enabled
          ? commissionSettings.revenue_percentage_rate
          : 0;

      await supabase
        .from('professionals')
        .update({ commission_rate: rate })
        .eq('id', selectedProfessional.id);

      if ((window as any).saveExtendedCommissions) {
        await (window as any).saveExtendedCommissions();
      }

      toast.success(`Regras de comissão de ${selectedProfessional.name} salvas com sucesso`);
      queryClient.invalidateQueries({ queryKey: ['professionals-for-commissions'] });
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar configurações');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreatePayment = async () => {
    if (!paymentProfessional || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    setSavingPayment(true);
    try {
      const { error } = await supabase
        .from('commissions')
        .insert({
          professional_id: paymentProfessional,
          amount: parseFloat(paymentAmount),
          reference_date: paymentDate,
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
          reference_type: 'repasse',
          notes: paymentNotes || 'Repasse manual',
        });
      if (error) throw error;
      toast.success('Repasse registrado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      queryClient.invalidateQueries({ queryKey: ['commissions-stats'] });
      setPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentNotes('');
      setPaymentProfessional('');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao registrar repasse');
    } finally {
      setSavingPayment(false);
    }
  };

  const filteredCommissions = commissions?.filter((comm) => {
    const matchesSearch =
      comm.professionals?.name?.toLowerCase().includes(search.toLowerCase()) ||
      comm.notes?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || comm.payment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight underline decoration-primary/20 underline-offset-8 flex items-center gap-2">
            <Percent className="h-7 w-7 text-primary/40" />
            Comissões
          </h1>
          <p className="text-muted-foreground font-medium text-sm sm:text-base">
            Gerencie as regras de comissionamento e pagamentos dos profissionais
          </p>
        </div>
        <Button onClick={() => setPaymentModalOpen(true)} className="premium-button-solid h-11 sm:h-12 shadow-xl px-6">
          <Plus className="h-5 w-5 mr-2" />
          Lançar Repasse
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="premium-card rounded-[32px] border-none shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Pendente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-black tracking-tighter text-amber-600">
              {formatCurrency(stats?.totalPending || 0)}
            </div>
          </CardContent>
        </Card>
        <Card className="premium-card rounded-[32px] border-none shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-black tracking-tighter text-emerald-600">
              {formatCurrency(stats?.totalPaid || 0)}
            </div>
          </CardContent>
        </Card>
        <Card className="premium-card rounded-[32px] border-none shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Lançamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-black tracking-tighter">
              {commissions?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Centralized Commission Rules */}
      <Card className="premium-card border-none shadow-2xl rounded-[32px] overflow-hidden">
        <CardHeader className="p-8 bg-zinc-50 border-b border-black/5">
          <CardTitle className="flex items-center gap-3 text-lg font-black tracking-tight uppercase text-zinc-900">
            <div className="p-2 rounded-2xl bg-zinc-100 text-zinc-900">
              <Settings2 className="h-5 w-5" />
            </div>
            Regras de Comissionamento por Profissional
          </CardTitle>
          <CardDescription className="ml-12 font-medium">
            Selecione um profissional para definir ou editar suas regras de comissão
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {professionals?.map((prof) => (
              <Button
                key={prof.id}
                variant={selectedProfessional?.id === prof.id ? 'default' : 'outline'}
                className={cn(
                  "justify-start h-auto py-4 rounded-2xl border-none shadow-sm transition-all hover:scale-105",
                  selectedProfessional?.id === prof.id ? "bg-primary text-white shadow-xl" : "bg-white hover:bg-zinc-50"
                  )}
                onClick={() => setSelectedProfessional(prof)}
              >
                <div className="text-left">
                  <div className="font-bold">{prof.name}</div>
                  <div className={cn(
                    "text-[10px] uppercase font-black tracking-widest mt-1",
                    selectedProfessional?.id === prof.id ? "text-white/60" : "text-zinc-400"
                  )}>
                    {prof.specialty || 'Sem especialidade'} • {prof.commission_rate ?? 0}%
                  </div>
                </div>
              </Button>
            ))}
            {!professionals?.length && (
              <div className="text-center py-8 text-zinc-400 font-bold uppercase tracking-widest text-xs col-span-full italic">
                Nenhum profissional encontrado
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Commission Settings Dialog */}
      <Dialog open={!!selectedProfessional} onOpenChange={(open) => !open && setSelectedProfessional(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Comissões — {selectedProfessional?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedProfessional && (
            <div className="space-y-4">
              <CommissionsTab
                professionalId={selectedProfessional.id}
                isReadOnly={false}
                onCommissionSettingsChange={setCommissionSettings}
                commissionSettings={commissionSettings}
              />
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSaveSettings} disabled={savingSettings}>
                  {savingSettings ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Salvar Regras
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Launch Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Lançar Repasse
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Profissional *</Label>
              <Select value={paymentProfessional} onValueChange={setPaymentProfessional}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o profissional" />
                </SelectTrigger>
                <SelectContent>
                  {professionals?.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Referência</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Motivo / Observação</Label>
              <Textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Motivo do repasse..."
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreatePayment} disabled={savingPayment}>
                {savingPayment ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Confirmar Repasse
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Commissions History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Comissões e Repasses
          </CardTitle>
          <CardDescription>
            Visualize todos os lançamentos para fins de auditoria
          </CardDescription>
          <div className="flex flex-col sm:flex-row gap-4 mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar profissional ou motivo..."
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
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredCommissions?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma comissão encontrada</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data Referência</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Pagamento</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCommissions?.map((comm) => (
                    <TableRow key={comm.id}>
                      <TableCell className="font-medium">{comm.professionals?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {comm.reference_type === 'repasse' ? 'Repasse' : comm.reference_type || 'Comissão'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(comm.reference_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(Number(comm.amount))}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[comm.payment_status]}>
                          {statusLabels[comm.payment_status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {comm.paid_at
                          ? format(new Date(comm.paid_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                          : '-'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {comm.notes || '-'}
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
