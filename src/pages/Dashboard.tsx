import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CalendarCheck, DollarSign, TrendingUp, Clock, Scissors, HeadphonesIcon, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SupportTicketModal } from '@/components/support/SupportTicketModal';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProfessionalMetric {
  id: string;
  name: string;
  specialty: string | null;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  totalRevenue: number;
}

const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [totalClients, setTotalClients] = useState(0);
  const [monthAppointments, setMonthAppointments] = useState(0);
  const [weekAppointments, setWeekAppointments] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [todayAppointments, setTodayAppointments] = useState(0);
  const [professionalMetrics, setProfessionalMetrics] = useState<ProfessionalMetric[]>([]);

  // Filters
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const [selectedMonth, setSelectedMonth] = useState<string>(String(currentMonth));
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
  const [selectedProfessional, setSelectedProfessional] = useState<string>('all');

  // All professionals for filter
  const [allProfessionals, setAllProfessionals] = useState<{ id: string; name: string }[]>([]);

  // Chart data
  const [monthlyLineData, setMonthlyLineData] = useState<{ name: string; servicos: number }[]>([]);
  const [yearlyBarData, setYearlyBarData] = useState<{ name: string; receita: number }[]>([]);
  const [allYearAppointments, setAllYearAppointments] = useState<any[]>([]);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedMonth, selectedYear, selectedProfessional]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const selYear = parseInt(selectedYear);
      const selMonth = parseInt(selectedMonth);

      const filterDate = new Date(selYear, selMonth, 1);
      const monthStart = format(startOfMonth(filterDate), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(filterDate), 'yyyy-MM-dd');
      const weekStart = format(startOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd');
      const today = format(now, 'yyyy-MM-dd');

      // Year range for annual chart
      const yearStart = format(startOfYear(new Date(selYear, 0, 1)), 'yyyy-MM-dd');
      const yearEnd = format(endOfYear(new Date(selYear, 0, 1)), 'yyyy-MM-dd');

      const [
        { count: clientsCount },
        { data: monthApts },
        { data: weekApts },
        { data: todayApts },
        { data: professionals },
        { data: yearApts },
      ] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('appointments').select('id, status, total_amount, professional_id, appointment_date').gte('appointment_date', monthStart).lte('appointment_date', monthEnd),
        supabase.from('appointments').select('id').gte('appointment_date', weekStart).lte('appointment_date', weekEnd),
        supabase.from('appointments').select('id').eq('appointment_date', today),
        supabase.from('professionals').select('id, name, specialty').eq('status', 'active'),
        supabase.from('appointments').select('id, status, total_amount, professional_id, appointment_date').gte('appointment_date', yearStart).lte('appointment_date', yearEnd),
      ]);

      setTotalClients(clientsCount || 0);
      setAllProfessionals(professionals || []);
      setAllYearAppointments(yearApts || []);

      // Apply professional filter
      const filterByProfessional = (apts: any[]) => {
        if (selectedProfessional === 'all') return apts;
        return apts.filter(a => a.professional_id === selectedProfessional);
      };

      const filteredMonthApts = filterByProfessional(monthApts || []);
      const filteredYearApts = filterByProfessional(yearApts || []);

      setMonthAppointments(filteredMonthApts.length);
      setWeekAppointments(filterByProfessional(weekApts || []).length);
      setTodayAppointments(filterByProfessional(todayApts || []).length);

      const revenue = filteredMonthApts
        .filter(a => a.status === 'completed' || a.status === 'closed')
        .reduce((sum, a) => sum + (a.total_amount || 0), 0);
      setMonthRevenue(revenue);

      // Monthly line chart: days of the selected month
      const daysInMonth = endOfMonth(filterDate).getDate();
      const lineData = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dayStr = `${selectedYear}-${String(selMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const count = filteredMonthApts.filter(a => a.appointment_date === dayStr).length;
        return { name: String(day), servicos: count };
      });
      setMonthlyLineData(lineData);

      // Yearly bar chart: revenue per month
      const barData = monthNames.map((name, idx) => {
        const mApts = filteredYearApts.filter(a => {
          const m = parseInt(a.appointment_date.split('-')[1]) - 1;
          return m === idx;
        });
        const rev = mApts
          .filter(a => a.status === 'completed' || a.status === 'closed')
          .reduce((s, a) => s + (a.total_amount || 0), 0);
        return { name, receita: rev };
      });
      setYearlyBarData(barData);

      // Per-professional metrics (for ranking chart)
      const metrics: ProfessionalMetric[] = (professionals || []).map(prof => {
        const profApts = filteredMonthApts.filter(a => a.professional_id === prof.id);
        return {
          id: prof.id,
          name: prof.name,
          specialty: prof.specialty,
          totalAppointments: profApts.length,
          completedAppointments: profApts.filter(a => a.status === 'completed' || a.status === 'closed').length,
          cancelledAppointments: profApts.filter(a => a.status === 'cancelled').length,
          totalRevenue: profApts.filter(a => a.status === 'completed' || a.status === 'closed').reduce((s, a) => s + (a.total_amount || 0), 0),
        };
      }).sort((a, b) => b.totalRevenue - a.totalRevenue);

      setProfessionalMetrics(metrics);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const statsCards = [
    { title: 'Clientes Cadastrados', value: totalClients, icon: Users, description: 'Total de clientes' },
    { title: 'Agendamentos do Mês', value: monthAppointments, icon: CalendarCheck, description: `${monthNames[parseInt(selectedMonth)]} ${selectedYear}` },
    { title: 'Agendamentos Hoje', value: todayAppointments, icon: Clock, description: format(new Date(), "dd/MM/yyyy") },
    { title: 'Receita do Mês', value: formatCurrency(monthRevenue), icon: DollarSign, description: 'Serviços finalizados' },
  ];

  const lineChartConfig = {
    servicos: { label: 'Serviços', color: 'hsl(var(--primary))' },
  };

  const barChartConfig = {
    receita: { label: 'Receita', color: 'hsl(var(--primary))' },
  };

  const horizontalBarData = professionalMetrics.slice(0, 10).map(p => ({
    name: p.name.length > 15 ? p.name.slice(0, 15) + '...' : p.name,
    receita: p.totalRevenue,
    atendimentos: p.completedAppointments,
  }));

  const horizontalChartConfig = {
    receita: { label: 'Receita', color: 'hsl(var(--primary))' },
    atendimentos: { label: 'Atendimentos', color: 'hsl(var(--chart-2))' },
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in p-2 sm:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight underline decoration-primary/20 underline-offset-8">Dashboard</h1>
          <p className="text-muted-foreground font-medium text-sm sm:text-base">Geral e desempenho em tempo real do seu negócio</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setSupportModalOpen(true)}
          className="premium-button-ghost border-none h-11 sm:h-12 shadow-xl w-full sm:w-auto justify-center px-6"
        >
          <HeadphonesIcon className="mr-2 h-5 w-5 opacity-60" />
          Suporte Especializado
        </Button>
      </div>

      {/* Filters Overlay Scrollable */}
      <div className="flex bg-secondary/30 rounded-[24px] p-2 gap-3 overflow-x-auto no-scrollbar sm:w-fit">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[120px] sm:w-[140px] shrink-0 rounded-xl border-none bg-white shadow-sm font-semibold h-10">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-none shadow-xl">
            {monthNames.map((name, idx) => (
              <SelectItem key={idx} value={String(idx)}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[100px] sm:w-[110px] shrink-0 rounded-xl border-none bg-white shadow-sm font-semibold h-10">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-none shadow-xl">
            {years.map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
          <SelectTrigger className="w-[180px] sm:w-[200px] shrink-0 rounded-xl border-none bg-white shadow-sm font-semibold h-10">
            <SelectValue placeholder="Colaborador" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-none shadow-xl">
            <SelectItem value="all">Todos os colaboradores</SelectItem>
            {allProfessionals.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* General Metrics */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="premium-card rounded-[32px] border-none shadow-xl transition-all hover:shadow-2xl hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-6 pt-6">
              <CardTitle className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{stat.title}</CardTitle>
              <div className="p-2 rounded-xl bg-primary/5 text-primary">
                <stat.icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="text-2xl sm:text-3xl font-black tracking-tighter text-zinc-900">{loading ? '...' : stat.value}</div>
              <p className="text-[10px] text-zinc-300 font-bold uppercase tracking-widest mt-2">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Line Chart - Monthly Services Evolution */}
      <Card className="premium-card rounded-[32px] border-none shadow-2xl overflow-hidden">
        <CardHeader className="pb-0 p-8 bg-zinc-50/50 border-b border-black/5">
          <CardTitle className="flex items-center gap-3 text-xl font-black tracking-tight uppercase text-zinc-900">
            <div className="p-2 rounded-2xl bg-primary/10 text-primary">
              <TrendingUp className="h-6 w-6" />
            </div>
            Evolução Mensal de Serviços
          </CardTitle>
          <CardDescription className="ml-13 font-bold text-zinc-400 uppercase text-[10px] tracking-widest">Fluxo de agendamentos por dia em {monthNames[parseInt(selectedMonth)]}</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground animate-pulse font-bold">Carregando dados estatísticos...</div>
          ) : (
            <ChartContainer config={lineChartConfig} className="h-[300px] w-full">
              <LineChart data={monthlyLineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600 }} />
                <ChartTooltip content={<ChartTooltipContent className="rounded-2xl border-none shadow-2xl" />} />
                <Line type="monotone" dataKey="servicos" stroke="var(--color-servicos)" strokeWidth={4} dot={{ r: 4, fill: "var(--color-servicos)", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Vertical Bar Chart - Annual Revenue */}
        <Card className="premium-card">
          <CardHeader className="pb-4 p-8 bg-zinc-50/50 border-b border-black/5">
            <CardTitle className="flex items-center gap-3 text-lg font-black tracking-tight uppercase text-zinc-900">
              <div className="p-2 rounded-2xl bg-zinc-100 text-zinc-900">
                <BarChart3 className="h-5 w-5" />
              </div>
              Receita Anual — {selectedYear}
            </CardTitle>
            <CardDescription className="ml-12 font-bold text-zinc-400 uppercase text-[10px] tracking-widest">Comparativo mensal de faturamento</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Analizando faturamento...</div>
            ) : (
              <ChartContainer config={barChartConfig} className="h-[250px] w-full">
                <BarChart data={yearlyBarData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600 }} />
                  <ChartTooltip content={<ChartTooltipContent className="rounded-2xl border-none shadow-2xl" />} />
                  <Bar dataKey="receita" fill="var(--color-receita)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Horizontal Bar Chart - Professional Ranking */}
        <Card className="premium-card">
          <CardHeader className="pb-4 p-8 bg-zinc-50/50 border-b border-black/5">
            <CardTitle className="flex items-center gap-3 text-lg font-black tracking-tight uppercase text-zinc-900">
              <div className="p-2 rounded-2xl bg-primary/10 text-primary">
                <BarChart3 className="h-5 w-5" />
              </div>
              Ranking de Barbeiros — {monthNames[parseInt(selectedMonth)]}
            </CardTitle>
            <CardDescription className="ml-12 font-bold text-zinc-400 uppercase text-[10px] tracking-widest">Líderes em faturamento no período</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Cruzando dados...</div>
            ) : horizontalBarData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground bg-secondary/20 rounded-3xl">Nenhum profissional cadastrado</div>
            ) : (
              <ChartContainer config={horizontalChartConfig} className="h-[250px] w-full">
                <BarChart data={horizontalBarData} layout="vertical" margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis type="number" axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <ChartTooltip content={<ChartTooltipContent className="rounded-2xl border-none shadow-2xl" />} />
                  <Bar dataKey="receita" fill="var(--color-receita)" radius={[0, 8, 8, 0]} barSize={20} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Professional Performance Table - Using Glass effect */}
      <Card className="premium-card overflow-hidden">
        <CardHeader className="bg-zinc-50 border-b border-black/5">
          <CardTitle className="flex items-center gap-3 text-xl font-black tracking-tight">
            <div className="p-2 rounded-2xl bg-black text-white shadow-lg">
              <BarChart3 className="h-6 w-6" />
            </div>
            Desempenho Individual
          </CardTitle>
          <CardDescription className="ml-13 font-medium text-zinc-500">Métricas consolidadas de {monthNames[parseInt(selectedMonth)]} {selectedYear}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-16 text-muted-foreground">Calculando métricas...</div>
          ) : professionalMetrics.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">Sem dados disponíveis</div>
          ) : (
            <div className="divide-y divide-black/5">
              {professionalMetrics.map((prof, index) => (
                <div key={prof.id} className="flex items-center gap-6 p-6 hover:bg-zinc-50/80 transition-all group">
                  <div className="w-12 h-12 rounded-[20px] bg-black shadow-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <span className="text-sm font-black text-white">{index + 1}º</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <p className="text-base font-bold text-foreground truncate">{prof.name}</p>
                      {prof.specialty && (
                        <Badge variant="outline" className="text-[9px] uppercase tracking-widest bg-zinc-100 border-none font-bold">{prof.specialty}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-6 mt-2 text-xs font-semibold text-zinc-500">
                      <span className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full shadow-sm">
                        <CalendarCheck className="h-3.5 w-3.5 text-primary" />
                        {prof.totalAppointments} Agendamentos
                      </span>
                      <span className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full shadow-sm">
                        <Scissors className="h-3.5 w-3.5 text-zinc-400" />
                        {prof.completedAppointments} Finalizados
                      </span>
                      {prof.cancelledAppointments > 0 && (
                        <span className="text-destructive/80 bg-destructive/5 px-3 py-1 rounded-full">
                          {prof.cancelledAppointments} Cancelados
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-black text-primary tracking-tighter">{formatCurrency(prof.totalRevenue)}</p>
                    <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest mt-0.5">Faturamento</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SupportTicketModal open={supportModalOpen} onOpenChange={setSupportModalOpen} />
    </div>
  );
}
