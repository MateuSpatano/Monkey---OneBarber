import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, DollarSign, Megaphone } from 'lucide-react';

export default function Reports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Relatórios
        </h1>
        <p className="text-muted-foreground">
          Dashboard de relatórios e métricas do negócio
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Relatório de Vendas */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Relatório de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-40 bg-muted/50 rounded-lg flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Em breve</p>
                <p className="text-xs">Análise de vendas e faturamento</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Relatório de Marketing */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-purple-500" />
              Relatório de Marketing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-40 bg-muted/50 rounded-lg flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Megaphone className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Em breve</p>
                <p className="text-xs">Performance de campanhas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Relatório Financeiro */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Relatório Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-40 bg-muted/50 rounded-lg flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Em breve</p>
                <p className="text-xs">DRE, fluxo de caixa, comissões</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Área expandida para mais relatórios futuros */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Mais relatórios</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="py-6 text-center text-muted-foreground">
              <p className="text-sm">Relatório de Clientes</p>
              <p className="text-xs">Em desenvolvimento</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="py-6 text-center text-muted-foreground">
              <p className="text-sm">Relatório de Profissionais</p>
              <p className="text-xs">Em desenvolvimento</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="py-6 text-center text-muted-foreground">
              <p className="text-sm">Relatório de Agendamentos</p>
              <p className="text-xs">Em desenvolvimento</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="py-6 text-center text-muted-foreground">
              <p className="text-sm">Relatório de Fidelidade</p>
              <p className="text-xs">Em desenvolvimento</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
