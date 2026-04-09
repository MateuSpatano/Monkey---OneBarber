import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, DollarSign, Megaphone, Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface ReportGroup {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number | null;
  is_active: boolean;
  created_at: string;
}

export default function Reports() {
  const [groups, setGroups] = useState<ReportGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('report_groups')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error fetching report groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (group: ReportGroup, format: 'xlsx' | 'pdf') => {
    if (format === 'xlsx') {
      const wsData = [
        ['Campo', 'Valor'],
        ['Nome', group.name],
        ['Descrição', group.description || '-'],
        ['Status', group.is_active ? 'Ativo' : 'Inativo'],
        ['Ícone', group.icon || '-'],
        ['Cor', group.color || '-'],
        ['Criado em', new Date(group.created_at).toLocaleDateString('pt-BR')],
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [{ wch: 15 }, { wch: 40 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, group.name.slice(0, 31));
      XLSX.writeFile(wb, `relatorio-${group.name.toLowerCase().replace(/\s+/g, '-')}.xlsx`);
      toast({ title: 'XLSX exportado com sucesso' });
    } else {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
          <head><title>Relatório - ${group.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            h1 { font-size: 24px; margin-bottom: 8px; }
            .meta { color: #666; font-size: 14px; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background: #f5f5f5; font-weight: 600; }
          </style></head>
          <body>
            <h1>${group.name}</h1>
            <p class="meta">${group.description || 'Sem descrição'}</p>
            <table>
              <tr><th>Campo</th><th>Valor</th></tr>
              <tr><td>Status</td><td>${group.is_active ? 'Ativo' : 'Inativo'}</td></tr>
              <tr><td>Ícone</td><td>${group.icon || '-'}</td></tr>
              <tr><td>Cor</td><td>${group.color || '-'}</td></tr>
              <tr><td>Criado em</td><td>${new Date(group.created_at).toLocaleDateString('pt-BR')}</td></tr>
            </table>
          </body></html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
      toast({ title: 'PDF gerado para impressão' });
    }
  };

  const handleExportAll = (format: 'xlsx' | 'pdf') => {
    if (groups.length === 0) {
      toast({ title: 'Nenhum grupo disponível para exportar', variant: 'destructive' });
      return;
    }

    if (format === 'xlsx') {
      const wsData = [
        ['Nome', 'Descrição', 'Status', 'Ícone', 'Cor', 'Criado em'],
        ...groups.map((g) => [
          g.name,
          g.description || '-',
          g.is_active ? 'Ativo' : 'Inativo',
          g.icon || '-',
          g.color || '-',
          new Date(g.created_at).toLocaleDateString('pt-BR'),
        ]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [{ wch: 25 }, { wch: 40 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 15 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Todos os Grupos');
      XLSX.writeFile(wb, 'relatorios-todos-grupos.xlsx');
      toast({ title: 'XLSX exportado com sucesso' });
    } else {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const rows = groups
          .map(
            (g) => `<tr>
              <td>${g.name}</td>
              <td>${g.description || '-'}</td>
              <td>${g.is_active ? 'Ativo' : 'Inativo'}</td>
              <td>${new Date(g.created_at).toLocaleDateString('pt-BR')}</td>
            </tr>`
          )
          .join('');
        printWindow.document.write(`
          <html>
          <head><title>Relatório - Todos os Grupos</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            h1 { font-size: 24px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background: #f5f5f5; font-weight: 600; }
          </style></head>
          <body>
            <h1>Todos os Grupos de Relatórios</h1>
            <table>
              <tr><th>Nome</th><th>Descrição</th><th>Status</th><th>Criado em</th></tr>
              ${rows}
            </table>
          </body></html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
      toast({ title: 'PDF gerado para impressão' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight underline decoration-primary/20 underline-offset-8 flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary/40" />
            Relatórios e Dados
          </h1>
          <p className="text-muted-foreground font-medium text-sm sm:text-base">
            Dashboard analítico de métricas e desempenho do negócio
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="premium-button-ghost bg-white border-none h-11 px-6 shadow-xl">
              <Download className="h-5 w-5 mr-2" />
              Exportar Geral
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl border-none shadow-2xl p-2">
            <DropdownMenuItem onClick={() => handleExportAll('xlsx')} className="rounded-xl font-bold py-3">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar XLSX
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExportAll('pdf')} className="rounded-xl font-bold py-3">
              <FileText className="h-4 w-4 mr-2" />
              Exportar PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="premium-card rounded-[32px] border-none shadow-xl hover:shadow-2xl transition-all cursor-pointer group">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-black tracking-tight uppercase text-zinc-900">
              <div className="p-2 rounded-2xl bg-blue-50 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <TrendingUp className="h-5 w-5" />
              </div>
              Relatório de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32 bg-zinc-50 rounded-[24px] flex items-center justify-center p-6 text-center">
              <div>
                <p className="text-xs font-black text-zinc-300 uppercase tracking-widest mb-1">Módulo em breve</p>
                <p className="text-[10px] font-bold text-zinc-400">Análise de vendas e faturamento consolidado</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card rounded-[32px] border-none shadow-xl hover:shadow-2xl transition-all cursor-pointer group">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-black tracking-tight uppercase text-zinc-900">
              <div className="p-2 rounded-2xl bg-purple-50 text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                <Megaphone className="h-5 w-5" />
              </div>
              Relatório de Marketing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32 bg-zinc-50 rounded-[24px] flex items-center justify-center p-6 text-center">
              <div>
                <p className="text-xs font-black text-zinc-300 uppercase tracking-widest mb-1">Módulo em breve</p>
                <p className="text-[10px] font-bold text-zinc-400">Performance de campanhas e novos clientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card rounded-[32px] border-none shadow-xl hover:shadow-2xl transition-all cursor-pointer group">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-black tracking-tight uppercase text-zinc-900">
              <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <DollarSign className="h-5 w-5" />
              </div>
              Relatório Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32 bg-zinc-50 rounded-[24px] flex items-center justify-center p-6 text-center">
              <div>
                <p className="text-xs font-black text-zinc-300 uppercase tracking-widest mb-1">Módulo em breve</p>
                <p className="text-[10px] font-bold text-zinc-400">DRE, fluxo de caixa e gestão de comissões</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grupos de Relatórios com exportação */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Grupos de Relatórios</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : groups.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum grupo de relatório ativo encontrado.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {groups.map((group) => (
              <Card key={group.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{group.name}</p>
                    <p className="text-xs text-muted-foreground">{group.description || 'Sem descrição'}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleExport(group, 'xlsx')}>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        XLSX
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport(group, 'pdf')}>
                        <FileText className="h-4 w-4 mr-2" />
                        PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
