import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Scissors, User, Plus, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

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

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  confirmed: { label: "Confirmado", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  present: { label: "Presente", variant: "default" },
  rescheduled: { label: "Reagendado", variant: "outline" },
  in_progress: { label: "Em Atendimento", variant: "default" },
  completed: { label: "Finalizado", variant: "outline" },
  open: { label: "Em aberto", variant: "secondary" },
  closed: { label: "Fechado", variant: "outline" },
  no_show: { label: "Não compareceu", variant: "destructive" },
};

interface WeekViewProps {
  currentDate: Date;
  appointments: Appointment[];
  onSelectAppointment: (apt: Appointment) => void;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  onNewAppointment?: (date: Date) => void;
  onOpenOrder?: (date: Date) => void;
}

export function WeekView({ currentDate, appointments, onSelectAppointment, selectedDate, onSelectDate, onNewAppointment, onOpenOrder }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { locale: ptBR });
  const weekEnd = endOfWeek(currentDate, { locale: ptBR });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getDayAppointments = (date: Date) => {
    return appointments.filter((apt) => {
      const [y, m, d] = apt.appointment_date.split("-").map(Number);
      return isSameDay(new Date(y, m - 1, d), date);
    }).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
  };

  const isToday = (date: Date) => isSameDay(date, new Date());

  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-1">
        {days.map((day) => {
          const dayApts = getDayAppointments(day);
          const selected = selectedDate && isSameDay(day, selectedDate);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "rounded-lg border border-border/50 overflow-hidden transition-colors",
                selected && "border-primary/50",
                isToday(day) && "ring-1 ring-primary/30"
              )}
            >
              <div className="flex items-center justify-between px-4 py-2">
                <button
                  onClick={() => onSelectDate(day)}
                  className={cn(
                    "flex-1 text-left hover:bg-accent/50 transition-colors rounded px-2 py-1",
                    selected && "bg-primary/10"
                  )}
                >
                  <span className={cn(
                    "text-sm font-semibold capitalize",
                    isToday(day) && "text-primary"
                  )}>
                    {format(day, "EEEE, dd/MM", { locale: ptBR })}
                  </span>
                </button>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {dayApts.length} agendamento{dayApts.length !== 1 ? "s" : ""}
                  </Badge>
                  {onNewAppointment && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Criar Agendamento"
                      onClick={(e) => { e.stopPropagation(); onNewAppointment(day); }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {onOpenOrder && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Abrir Comanda"
                      onClick={(e) => { e.stopPropagation(); onOpenOrder(day); }}
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {dayApts.length > 0 && (
                <div className="px-4 pb-3 space-y-2">
                  {dayApts.map((apt) => (
                    <div
                      key={apt.id}
                      onClick={() => onSelectAppointment(apt)}
                      className="flex items-center gap-3 p-2 rounded-md bg-background/50 cursor-pointer hover:bg-accent/30 transition-colors"
                    >
                      <div className="text-sm font-mono font-semibold text-primary w-12 shrink-0">
                        {apt.appointment_time.slice(0, 5)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{apt.clients?.name || "Sem cliente"}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Scissors className="h-3 w-3" />
                          {apt.service}
                        </p>
                      </div>
                      <Badge variant={statusConfig[apt.status]?.variant || "secondary"} className="text-[10px] shrink-0">
                        {statusConfig[apt.status]?.label || apt.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
