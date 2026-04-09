import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, ChevronLeft, ChevronRight, Calendar, Clock, User, Scissors, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { usePermissionsContext } from "@/contexts/PermissionsContext";
import { AppointmentModal } from "@/components/agenda/AppointmentModal";
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
  clients: { name: string } | null;
  professionals: { name: string } | null;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  confirmed: { label: "Confirmado", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  present: { label: "Presente", variant: "default" },
  rescheduled: { label: "Reagendado", variant: "outline" },
  in_progress: { label: "Em Atendimento", variant: "default" },
  completed: { label: "Finalizado", variant: "outline" },
};

export default function Agenda() {
  const { isAdmin } = usePermissionsContext();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: appointments = [], refetch } = useQuery({
    queryKey: ["appointments", format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      
      const { data, error } = await (supabase as any)
        .from("appointments")
        .select(`
          *,
          clients(name),
          professionals(name)
        `)
        .gte("appointment_date", format(start, "yyyy-MM-dd"))
        .lte("appointment_date", format(end, "yyyy-MM-dd"))
        .order("appointment_time", { ascending: true });

      if (error) throw error;
      return (data || []) as Appointment[];
    },
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: ptBR });
  const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getDayAppointments = (date: Date) => {
    return appointments.filter((apt) => {
      // Parse appointment_date as local date to avoid timezone issues
      const [year, month, day] = apt.appointment_date.split("-").map(Number);
      const aptDate = new Date(year, month - 1, day);
      return isSameDay(aptDate, date);
    });
  };

  const selectedDayAppointments = selectedDate ? getDayAppointments(selectedDate) : [];

  // Filtered appointments based on search query (case-insensitive)
  const filteredAppointments = useMemo(() => {
    if (!searchQuery.trim()) {
      return selectedDayAppointments;
    }
    const query = searchQuery.toLowerCase();
    return selectedDayAppointments.filter((apt) => {
      const clientName = apt.clients?.name ?? "";
      return clientName.toLowerCase().includes(query);
    });
  }, [selectedDayAppointments, searchQuery]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleNewAppointment = () => {
    setEditingAppointment(null);
    setIsModalOpen(true);
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingAppointment(null);
  };

  const handleSaveSuccess = () => {
    refetch();
    handleModalClose();
  };

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Agenda</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os agendamentos e eventos da barbearia
          </p>
        </div>
        {isAdmin && (
          <Button 
            onClick={handleNewAppointment}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold shadow-lg shadow-amber-500/25"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Agendamento
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-2 border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
              </CardTitle>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Week days header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const dayAppointments = getDayAppointments(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isToday = isSameDay(day, new Date());

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "relative aspect-square p-2 rounded-lg text-sm font-medium transition-all duration-200",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus:outline-none focus:ring-2 focus:ring-amber-500/50",
                      !isCurrentMonth && "text-muted-foreground/50",
                      isSelected && "bg-amber-500 text-black hover:bg-amber-600",
                      isToday && !isSelected && "ring-2 ring-amber-500/50",
                    )}
                  >
                    <span>{format(day, "d")}</span>
                    {dayAppointments.length > 0 && (
                      <span
                        className={cn(
                          "absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full",
                          isSelected ? "bg-black" : "bg-amber-500"
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Side Panel */}
        <Card className="border-border/50 bg-card/50 backdrop-blur flex flex-col lg:max-h-[calc(100vh-220px)]">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-amber-500" />
              {selectedDate
                ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR })
                : "Selecione uma data"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {!selectedDate ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  Clique em uma data no calendário para ver os agendamentos do dia
                </p>
              </div>
            ) : selectedDayAppointments.length === 0 ? (
              <div className="text-center py-8">
                <Scissors className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  Nenhum agendamento para este dia
                </p>
                {isAdmin && (
                  <Button
                    variant="outline"
                    className="mt-4 border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                    onClick={handleNewAppointment}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Agendar
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3 min-h-0 flex-1">
                {/* Search Input - Fixed */}
                <div className="relative flex-shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome do cliente..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-background/50 border-border/50 focus:border-amber-500/50"
                  />
                </div>

                {/* Scrollable List */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  <ScrollArea className="h-full max-h-[320px] lg:max-h-full">
                    <div className="space-y-3 pr-3">
                      {filteredAppointments.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                          Nenhum agendamento encontrado
                        </div>
                      ) : (
                        filteredAppointments.map((appointment) => (
                          <div
                            key={appointment.id}
                            onClick={() => handleEditAppointment(appointment)}
                            className="p-4 rounded-lg bg-background/50 border border-border/50 cursor-pointer hover:border-amber-500/50 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <span className="font-semibold text-foreground">
                                {appointment.clients?.name || "Cliente não definido"}
                              </span>
                              <Badge variant={statusConfig[appointment.status]?.variant || "secondary"}>
                                {statusConfig[appointment.status]?.label || appointment.status}
                              </Badge>
                            </div>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Scissors className="h-3.5 w-3.5" />
                                <span>{appointment.service}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{appointment.appointment_time.slice(0, 5)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <User className="h-3.5 w-3.5" />
                                <span>{appointment.professionals?.name || "Profissional não definido"}</span>
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
      </div>

      <AppointmentModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        appointment={editingAppointment}
        selectedDate={selectedDate}
        onSuccess={handleSaveSuccess}
      />
    </div>
  );
}
