import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Search, Star, Award, Gift, Settings2, Loader2, Save, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type LoyaltyPoint = {
  id: string;
  client_id: string;
  points: number;
  lifetime_points: number;
  last_interaction_at: string | null;
  tier: string | null;
  clients?: { name: string; email: string | null; phone: string | null } | null;
};

type LoyaltyReward = {
  id: string;
  client_id: string;
  reward_type: string;
  status: string;
  points_used: number;
  redeemed_at: string | null;
  created_at: string;
};

const tierLabels: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Prata',
  gold: 'Ouro',
  platinum: 'Platina',
};

const tierColors: Record<string, string> = {
  bronze: 'bg-amber-700/20 text-amber-700',
  silver: 'bg-slate-400/20 text-slate-600',
  gold: 'bg-yellow-500/20 text-yellow-700',
  platinum: 'bg-purple-500/20 text-purple-700',
};

export default function Loyalty() {
  const [search, setSearch] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Loyalty config from business_rules
  const { data: loyaltyConfig, isLoading: loadingConfig } = useQuery({
    queryKey: ['loyalty-config'],
    queryFn: async () => {
      const { data } = await supabase
        .from('business_rules')
        .select('key, value')
        .in('key', ['loyalty_enabled', 'loyalty_points_per_real', 'loyalty_points_goal']);

      const config: Record<string, any> = {
        loyalty_enabled: true,
        loyalty_points_per_real: 1,
        loyalty_points_goal: 10,
      };

      data?.forEach((r) => {
        config[r.key] = r.value;
      });

      return config;
    },
  });

  const isEnabled = loyaltyConfig?.loyalty_enabled === true;
  const pointsGoal = Number(loyaltyConfig?.loyalty_points_goal) || 10;
  const pointsPerReal = Number(loyaltyConfig?.loyalty_points_per_real) || 1;

  // Local settings state for the dialog
  const [localEnabled, setLocalEnabled] = useState<boolean | null>(null);
  const [localGoal, setLocalGoal] = useState<number | null>(null);
  const [localPointsPerReal, setLocalPointsPerReal] = useState<number | null>(null);

  const openSettings = () => {
    setLocalEnabled(isEnabled);
    setLocalGoal(pointsGoal);
    setLocalPointsPerReal(pointsPerReal);
    setSettingsOpen(true);
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const rules = [
        { key: 'loyalty_enabled', value: localEnabled, description: 'Programa de fidelidade ativo', category: 'marketing' },
        { key: 'loyalty_points_per_real', value: localPointsPerReal, description: 'Pontos de fidelidade por R$ gasto', category: 'marketing' },
        { key: 'loyalty_points_goal', value: localGoal, description: 'Meta de pontos para recompensa', category: 'marketing' },
      ];

      for (const rule of rules) {
        await supabase
          .from('business_rules')
          .upsert(rule, { onConflict: 'key' });
      }

      toast.success('Configurações de fidelidade salvas');
      queryClient.invalidateQueries({ queryKey: ['loyalty-config'] });
      setSettingsOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSavingSettings(false);
    }
  };

  const { data: loyaltyPoints, isLoading } = useQuery({
    queryKey: ['loyalty-points'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_points')
        .select('*, clients(name, email, phone)')
        .order('points', { ascending: false });
      if (error) throw error;
      return data as LoyaltyPoint[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['loyalty-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_points')
        .select('points, tier');
      if (error) throw error;
      const totalPoints = data.reduce((acc, curr) => acc + curr.points, 0);
      const totalClients = data.length;
      const readyForReward = data.filter((lp) => lp.points >= pointsGoal).length;
      return { totalPoints, totalClients, readyForReward };
    },
    enabled: !!loyaltyConfig,
  });

  // Redeem reward (generate free cut)
  const redeemMutation = useMutation({
    mutationFn: async (lp: LoyaltyPoint) => {
      // Create reward
      const { error: rewardError } = await supabase
        .from('loyalty_rewards')
        .insert({
          client_id: lp.client_id,
          reward_type: 'free_cut',
          status: 'available',
          points_used: pointsGoal,
        });
      if (rewardError) throw rewardError;

      // Deduct points
      const { error: pointsError } = await supabase
        .from('loyalty_points')
        .update({
          points: lp.points - pointsGoal,
          last_interaction_at: new Date().toISOString(),
        })
        .eq('id', lp.id);
      if (pointsError) throw pointsError;

      // Log transaction
      await supabase.from('loyalty_transactions').insert({
        client_id: lp.client_id,
        type: 'redeem',
        points: -pointsGoal,
        description: 'Resgate: Corte Grátis',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-points'] });
      queryClient.invalidateQueries({ queryKey: ['loyalty-stats'] });
      toast.success('Corte grátis gerado com sucesso!');
    },
    onError: () => toast.error('Erro ao gerar recompensa'),
  });

  const filteredPoints = loyaltyPoints?.filter(
    (lp) =>
      lp.clients?.name?.toLowerCase().includes(search.toLowerCase()) ||
      lp.clients?.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight underline decoration-primary/20 underline-offset-8 flex items-center gap-2">
            <Star className="h-7 w-7 text-primary/40" />
            Fidelidade
          </h1>
          <p className="text-muted-foreground font-medium text-sm sm:text-base">
            Sistema de pontos e recompensas para retenção de clientes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={isEnabled ? 'default' : 'secondary'} className={cn(
            "text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg border-none",
            isEnabled ? "bg-primary text-white" : "bg-zinc-100 text-zinc-500"
          )}>
            {isEnabled ? 'Ativo' : 'Inativo'}
          </Badge>
          <Button variant="outline" onClick={openSettings} className="premium-button-ghost bg-white border-none h-11 px-5 shadow-xl">
            <Settings2 className="h-5 w-5 mr-2" />
            Configurações
          </Button>
        </div>
      </div>

      {!isEnabled && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Star className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Programa de Fidelidade Desativado</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              Ative o programa nas configurações para que clientes acumulem pontos a cada atendimento concluído e ganhem recompensas.
            </p>
            <Button onClick={openSettings}>
              <Settings2 className="h-4 w-4 mr-2" />
              Ativar Programa
            </Button>
          </CardContent>
        </Card>
      )}

      {isEnabled && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="premium-card rounded-[32px] border-none shadow-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total de Pontos em Circulação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-black tracking-tighter">
                  {stats?.totalPoints?.toLocaleString('pt-BR') || 0}
                </div>
              </CardContent>
            </Card>
            <Card className="premium-card rounded-[32px] border-none shadow-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Clientes no Programa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-black tracking-tighter">{stats?.totalClients || 0}</div>
              </CardContent>
            </Card>
            <Card className="premium-card rounded-[32px] border-none shadow-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Prontos para Resgate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-black tracking-tighter text-primary flex items-center gap-2">
                  <Trophy className="h-6 w-6" />
                  {stats?.readyForReward || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Info card */}
          <Card className="bg-muted/50">
            <CardContent className="py-4">
              <div className="flex flex-wrap gap-6 text-sm">
                <div><span className="text-muted-foreground">Pontos por R$:</span> <strong>{pointsPerReal}</strong></div>
                <div><span className="text-muted-foreground">Meta para resgate:</span> <strong>{pointsGoal} pontos</strong></div>
                <div><span className="text-muted-foreground">Recompensa:</span> <strong>🎉 Corte Grátis</strong></div>
              </div>
            </CardContent>
          </Card>

          {/* Clients table */}
          <Card className="premium-card border-none shadow-2xl rounded-[32px] overflow-hidden">
            <CardHeader>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar clientes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : filteredPoints?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum cliente no programa de fidelidade
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Pontos Atuais</TableHead>
                        <TableHead>Progresso</TableHead>
                        <TableHead>Pontos Acumulados</TableHead>
                        <TableHead>Última Interação</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPoints?.map((lp) => {
                        const progress = Math.min((lp.points / pointsGoal) * 100, 100);
                        const canRedeem = lp.points >= pointsGoal;

                        return (
                          <TableRow key={lp.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{lp.clients?.name || '-'}</div>
                                <div className="text-sm text-muted-foreground">{lp.clients?.email}</div>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {lp.points.toLocaleString('pt-BR')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 min-w-[120px]">
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full transition-all"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {lp.points}/{pointsGoal}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{lp.lifetime_points.toLocaleString('pt-BR')}</TableCell>
                            <TableCell>
                              {lp.last_interaction_at
                                ? format(new Date(lp.last_interaction_at), 'dd/MM/yyyy', { locale: ptBR })
                                : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {canRedeem ? (
                                <Button
                                  size="sm"
                                  onClick={() => redeemMutation.mutate(lp)}
                                  disabled={redeemMutation.isPending}
                                  className="premium-button-solid h-9 px-4 rounded-xl shadow-lg"
                                >
                                  <Gift className="h-4 w-4 mr-1" />
                                  Gerar Corte Grátis
                                </Button>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  Acumulando
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurações do Programa de Fidelidade</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Programa Ativo</Label>
                <p className="text-sm text-muted-foreground">
                  Ativar/desativar a geração de pontos
                </p>
              </div>
              <Switch
                checked={localEnabled ?? false}
                onCheckedChange={setLocalEnabled}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Pontos por R$ gasto</Label>
              <Input
                type="number"
                min={1}
                value={localPointsPerReal ?? 1}
                onChange={(e) => setLocalPointsPerReal(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Quantos pontos o cliente ganha a cada R$ 1,00 gasto
              </p>
            </div>

            <div className="space-y-2">
              <Label>Meta de pontos para recompensa</Label>
              <Input
                type="number"
                min={1}
                value={localGoal ?? 10}
                onChange={(e) => setLocalGoal(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Ao atingir esta meta, o cliente ganha um corte grátis
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveSettings} disabled={savingSettings}>
              {savingSettings ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
