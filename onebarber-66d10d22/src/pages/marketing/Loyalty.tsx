import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Search, Star, Award, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type LoyaltyPoint = {
  id: string;
  client_id: string;
  points: number;
  lifetime_points: number;
  last_interaction_at: string | null;
  tier: string | null;
  clients?: { name: string; email: string | null; phone: string | null } | null;
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
      const tierCounts = data.reduce((acc, curr) => {
        const tier = curr.tier || 'bronze';
        acc[tier] = (acc[tier] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return { totalPoints, totalClients, tierCounts };
    },
  });

  const filteredPoints = loyaltyPoints?.filter(
    (lp) =>
      lp.clients?.name?.toLowerCase().includes(search.toLowerCase()) ||
      lp.clients?.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Star className="h-6 w-6" />
            Fidelidade
          </h1>
          <p className="text-muted-foreground">
            Sistema de pontos e recompensas
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Pontos
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Pontos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalPoints?.toLocaleString('pt-BR') || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clientes no Programa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalClients || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clientes Ouro/Platina
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.tierCounts?.gold || 0) +
                (stats?.tierCounts?.platinum || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Média de Pontos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalClients
                ? Math.round(
                    stats.totalPoints / stats.totalClients
                  ).toLocaleString('pt-BR')
                : 0}
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
                placeholder="Buscar clientes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
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
                    <TableHead>Tier</TableHead>
                    <TableHead>Pontos Atuais</TableHead>
                    <TableHead>Pontos Acumulados</TableHead>
                    <TableHead>Última Interação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPoints?.map((lp) => (
                    <TableRow key={lp.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {lp.clients?.name || '-'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {lp.clients?.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={tierColors[lp.tier || 'bronze']}
                        >
                          <Award className="h-3 w-3 mr-1" />
                          {tierLabels[lp.tier || 'bronze']}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {lp.points.toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        {lp.lifetime_points.toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        {lp.last_interaction_at
                          ? format(
                              new Date(lp.last_interaction_at),
                              'dd/MM/yyyy',
                              { locale: ptBR }
                            )
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm">
                          Gerenciar
                        </Button>
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
