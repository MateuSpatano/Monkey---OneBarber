import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfWeek, endOfWeek, isSameDay, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, ChevronLeft, ChevronRight, Calendar, Clock, User, Scissors, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { usePermissionsContext } from "@/contexts/PermissionsContext";
import { AppointmentModal, statusConfig } from "@/components/agenda/AppointmentModal";
import { MonthView } from "@/components/agenda/MonthView";
import { WeekView } from "@/components/agenda/WeekView";
import { DayView } from "@/components/agenda/DayView";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  client_id: string | null;
  professional_id: string | null;
  service: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes: string | null;
  duration_minutes?: number | null;
  clients: { name: string } | null;
  professionals: { name: string } | null;
}

type ViewMode = "month" | "week" | "day";

const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function Agenda() {
  const { isAdmin } = usePermissionsContext();
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [filterProfessional, setFilterProfessional] = useState("all");
  const [filterMonth, setFilterMonth] = useState<string>(String(new Date().getMonth()));
  const [filterYear, setFilterYear] = useState<string>(String(new Date().getFullYear()));

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  // Fetch professionals for filter
  const { data: professionals = [] } = useQuery({
    queryKey: ["agenda-professionals"],
    queryFn: async () => {
      const { data } = await supabase.from("professionals").select("id, name").eq("status", "active").order("name");
      return data || [];
    },
  });

  const queryRange = useMemo(() => {
    if (viewMode === "month") return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
    if (viewMode === "week") return { start: startOfWeek(currentDate, { locale: ptBR }), end: endOfWeek(currentDate, { locale: ptBR }) };
    const target = selectedDate || currentDate;
    return { start: target, end: target };
  }, [viewMode, currentDate, selectedDate]);

  const { data: appointments = [], refetch } = useQuery({
    queryKey: ["appointments", format(queryRange.start, "yyyy-MM-dd"), format(queryRange.end, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("appointments")
        .select(`*, clients(name), professionals(name)`)
        .gte("appointment_date", format(queryRange.start, "yyyy-MM-dd"))
        .lte("appointment_date", format(queryRange.end, "yyyy-MM-dd"))
        .order("appointment_time", { ascending: true });
      if (error) throw error;
      return (data || []) as Appointment[];
    },
  });

  // Apply global filters
  const filteredByGlobal = useMemo(() => {
    let result = appointments;
    if (filterProfessional !== "all") {
      result = result.filter(a => a.professional_id === filterProfessional);
    }
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase();
      result = result.filter(a =>
        (a.clients?.name ?? "").toLowerCase().includes(q) ||
        a.service.toLowerCase().includes(q) ||
        (a.professionals?.name ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [appointments, filterProfessional, globalSearch]);

  const handlePrev = () => {
    if (viewMode === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(subWeeks(currentDate, 1));
    else { const d = subDays(selectedDate || currentDate, 1); setSelectedDate(d); setCurrentDate(d); }
  };
  const handleNext = () => {
    if (viewMode === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(addWeeks(currentDate, 1));
    else { const d = addDays(selectedDate || currentDate, 1); setSelectedDate(d); setCurrentDate(d); }
  };
  const handleToday = () => { const t = new Date(); setCurrentDate(t); setSelectedDate(t); };

  // Jump to filter month/year
  const handleFilterMonthYear = () => {
    const d = new Date(parseInt(filterYear), parseInt(filterMonth), 1);
    setCurrentDate(d);
  };

  const headerTitle = useMemo(() => {
    if (viewMode === "month") return format(currentDate, "MMMM yyyy", { locale: ptBR });
    if (viewMode === "week") {
      const ws = startOfWeek(currentDate, { locale: ptBR });
      const we = endOfWeek(currentDate, { locale: ptBR });
      return `${format(ws, "dd/MM")} — ${format(we, "dd/MM/yyyy")}`;
    }
    return format(selectedDate || currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR });
  }, [viewMode, currentDate, selectedDate]);

  const selectedDayAppointments = useMemo(() => {
    if (!selectedDate) return [];
    return filteredByGlobal.filter((apt) => {
      const [y, m, d] = apt.appointment_date.split("-").map(Number);
      return isSameDay(new Date(y, m - 1, d), selectedDate);
    });
  }, [filteredByGlobal, selectedDate]);

  const filteredAppointments = useMemo(() => {
    if (!searchQuery.trim()) return selectedDayAppointments;
    const q = searchQuery.toLowerCase();
    return selectedDayAppointments.filter((apt) => (apt.clients?.name ?? "").toLowerCase().includes(q));
  }, [selectedDayAppointments, searchQuery]);

  const handleNewAppointment = () => { setEditingAppointment(null); setIsModalOpen(true); };
  const handleNewAppointmentForDate = (date: Date) => { setSelectedDate(date); setEditingAppointment(null); setIsModalOpen(true); };
  const handleOpenOrderForDate = (date: Date) => { setSelectedDate(date); setEditingAppointment(null); setIsModalOpen(true); };
  const handleEditAppointment = (appointment: Appointment) => { setEditingAppointment(appointment); setIsModalOpen(true); };
  const handleModalClose = () => { setIsModalOpen(false); setEditingAppointment(null); };
  const handleSaveSuccess = () => { refetch(); handleModalClose(); };
  const handleSelectDate = (date: Date) => { setSelectedDate(date); if (viewMode !== "month") setCurrentDate(date); };

  const showSidePanel = viewMode === "month";

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in p-2 sm:p-0 text-foreground">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight underline decoration-primary/20 underline-offset-8">Agenda Profissional</h1>
          <p className="text-muted-foreground font-medium text-sm sm:text-base">Controle total dos horários e serviços</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleNewAppointment} className="premium-button-solid h-11 sm:h-12 shadow-xl flex-1 sm:flex-none">
            <Plus className="h-5 w-5 mr-2" />
            Novo Agendamento
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
        <div className="flex flex-wrap items-center gap-3 p-2 bg-secondary/30 rounded-[28px] overflow-x-auto no-scrollbar whitespace-nowrap w-full lg:w-fit">
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar agendamento..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="pl-10 bg-white border-none shadow-sm rounded-xl h-10 font-medium w-full"
            />
          </div>
          
          <div className="h-6 w-[1px] bg-zinc-300 mx-1 hidden sm:block" />
          
          <Select value={filterProfessional} onValueChange={setFilterProfessional}>
            <SelectTrigger className="w-[180px] rounded-xl border-none bg-white shadow-sm font-semibold h-10">
              <SelectValue placeholder="Colaborador" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-none shadow-xl">
              <SelectItem value="all">Todos os profissionais</SelectItem>
              {professionals.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-[110px] rounded-xl border-none bg-white shadow-sm font-semibold h-10">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-xl">
                {monthNames.map((name, idx) => (
                  <SelectItem key={idx} value={String(idx)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-[100px] rounded-xl border-none bg-white shadow-sm font-semibold h-10">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-xl">
                {years.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={handleFilterMonthYear} className="rounded-xl font-bold bg-white/50 h-10 px-4">Ir</Button>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className={cn("grid gap-6 sm:gap-8", showSidePanel ? "lg:grid-cols-3" : "lg:grid-cols-1")}>
        {/* Calendar Card */}
        <Card className={cn("premium-card border-none shadow-2xl overflow-hidden flex flex-col", showSidePanel ? "lg:col-span-2" : "")}>
          <div className="p-4 sm:p-8 border-b border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50/50">
            <div className="flex items-center gap-4 text-zinc-900">
              <div className="p-3 bg-white rounded-2xl shadow-sm">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black capitalize tracking-tight">
                  {format(currentDate, "MMMM yyyy", { locale: ptBR })}
                </h2>
                <p className="text-xs font-bold text-primary uppercase tracking-widest mt-0.5">Visão Mensal</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <ToggleGroup 
                type="single" 
                value={viewMode} 
                onValueChange={(v) => v && setViewMode(v as ViewMode)}
                className="bg-zinc-200/50 p-1 rounded-xl"
              >
                <ToggleGroupItem value="month" className="rounded-lg font-bold text-xs px-3 data-[state=on]:bg-white data-[state=on]:shadow-sm">Mês</ToggleGroupItem>
                <ToggleGroupItem value="week" className="rounded-lg font-bold text-xs px-3 data-[state=on]:bg-white data-[state=on]:shadow-sm">Semana</ToggleGroupItem>
                <ToggleGroupItem value="day" className="rounded-lg font-bold text-xs px-3 data-[state=on]:bg-white data-[state=on]:shadow-sm">Dia</ToggleGroupItem>
              </ToggleGroup>
              <div className="w-[1px] h-6 bg-zinc-300 mx-1 hidden sm:block" />
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={handlePrev} className="rounded-lg h-9 w-9 hover:bg-zinc-200/60">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button variant="outline" onClick={handleToday} className="h-9 px-3 rounded-lg border-zinc-200 font-bold text-xs hover:bg-zinc-100">Hoje</Button>
                <Button variant="ghost" size="icon" onClick={handleNext} className="rounded-lg h-9 w-9 hover:bg-zinc-200/60">
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
          
          <CardContent className="p-4 sm:p-6 flex-1 min-h-[500px]">
            {viewMode === "month" && <MonthView currentMonth={currentDate} selectedDate={selectedDate} onSelectDate={handleSelectDate} appointments={filteredByGlobal} onNewAppointment={handleNewAppointmentForDate} onOpenOrder={handleOpenOrderForDate} />}
            {viewMode === "week" && <WeekView currentDate={currentDate} appointments={filteredByGlobal} onSelectAppointment={handleEditAppointment} selectedDate={selectedDate} onSelectDate={handleSelectDate} onNewAppointment={handleNewAppointmentForDate} onOpenOrder={handleOpenOrderForDate} />}
            {viewMode === "day" && <DayView selectedDate={selectedDate || currentDate} appointments={filteredByGlobal} onSelectAppointment={handleEditAppointment} onTimeRangeSelect={() => { setEditingAppointment(null); setIsModalOpen(true); }} />}
          </CardContent>
        </Card>

        {/* Appointments List - Only in month view */}
        {showSidePanel && (
          <Card className="premium-card overflow-hidden flex flex-col lg:max-h-[calc(100vh-220px)] shadow-2xl">
            <CardHeader className="flex-shrink-0 bg-zinc-50 border-b border-black/5 pb-4">
              <CardTitle className="flex items-center gap-3 text-lg font-black tracking-tight">
                <div className="p-2 rounded-2xl bg-primary/10 text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : "Próximos"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden p-0">
              {!selectedDate ? (
                <div className="text-center py-12 px-6">
                  <div className="w-16 h-16 rounded-[24px] bg-zinc-100 flex items-center justify-center mx-auto mb-6">
                    <Calendar className="h-8 w-8 text-zinc-400" />
                  </div>
                  <p className="text-sm font-bold text-zinc-500 leading-relaxed">Clique em uma data no calendário para gerenciar horários</p>
                </div>
              ) : selectedDayAppointments.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <div className="w-16 h-16 rounded-[24px] bg-primary/5 flex items-center justify-center mx-auto mb-6 text-primary">
                    <Scissors className="h-8 w-8" />
                  </div>
                  <p className="text-sm font-bold text-zinc-500 mb-6">Nenhum agendamento para este dia</p>
                  <Button variant="outline" className="premium-button-ghost border-none h-11 w-full" onClick={handleNewAppointment}><Plus className="mr-2 h-4 w-4" /> Agendar Agora</Button>
                </div>
              ) : (
                <div className="flex flex-col gap-0 min-h-0 flex-1">
                  <div className="p-4 border-b border-black/5 bg-zinc-50/30">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Filtrar por cliente..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-white border-none shadow-sm rounded-xl h-9" />
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <ScrollArea className="h-full">
                      <div className="divide-y divide-black/5">
                        {filteredAppointments.length === 0 ? (
                          <div className="text-center py-8 text-zinc-400 font-bold italic">Sem resultados</div>
                        ) : (
                          filteredAppointments.map((appointment) => (
                            <div key={appointment.id} onClick={() => handleEditAppointment(appointment)}
                              className="p-5 cursor-pointer hover:bg-zinc-50 transition-all group border-l-4 border-l-transparent hover:border-l-primary">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <span className="font-bold text-foreground group-hover:text-primary transition-colors">{appointment.clients?.name || "Cliente Final"}</span>
                                <Badge className={cn("text-[10px] uppercase font-black tracking-widest rounded-lg border-none", 
                                  appointment.status === 'confirmed' ? "bg-green-100 text-green-700" : 
                                  appointment.status === 'pending' ? "bg-yellow-100 text-yellow-700" :
                                  "bg-zinc-100 text-zinc-600"
                                )}>
                                  {statusConfig[appointment.status as keyof typeof statusConfig]?.label || appointment.status}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-1 gap-2 text-xs font-bold text-zinc-500">
                                <div className="flex items-center gap-2"><Scissors className="h-3.5 w-3.5 text-zinc-400" /><span>{appointment.service}</span></div>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1.5 bg-zinc-100 px-2 py-0.5 rounded-md">
                                    <Clock className="h-3.5 w-3.5" /><span>{appointment.appointment_time.slice(0, 5)}</span>
                                  </div>
                                  <div className="flex items-center gap-2"><User className="h-3.5 w-3.5" /><span>{appointment.professionals?.name || "Livre"}</span></div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <AppointmentModal open={isModalOpen} onOpenChange={setIsModalOpen} appointment={editingAppointment} selectedDate={selectedDate} onSuccess={handleSaveSuccess} />
    </div>
  );
}
