import { useState, useCallback, useRef } from "react";
import { isSameDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Scissors, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
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

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  confirmed: { label: "Confirmado", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  present: { label: "Presente", variant: "default" },
  rescheduled: { label: "Reagendado", variant: "outline" },
  in_progress: { label: "Em Atendimento", variant: "default" },
  completed: { label: "Finalizado", variant: "outline" },
};

// Generate half-hour slots from 07:00 to 21:00
const timeSlots = Array.from({ length: 29 }, (_, i) => {
  const hour = 7 + Math.floor(i / 2);
  const min = (i % 2) * 30;
  return `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
});

interface DayViewProps {
  selectedDate: Date;
  appointments: Appointment[];
  onSelectAppointment: (apt: Appointment) => void;
  onTimeRangeSelect?: (startTime: string, endTime: string) => void;
}

export function DayView({ selectedDate, appointments, onSelectAppointment, onTimeRangeSelect }: DayViewProps) {
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const isDragging = useRef(false);

  const dayAppointments = appointments
    .filter((apt) => {
      const [y, m, d] = apt.appointment_date.split("-").map(Number);
      return isSameDay(new Date(y, m - 1, d), selectedDate);
    })
    .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

  const getAppointmentsForSlot = (slot: string) => {
    const [slotH, slotM] = slot.split(":").map(Number);
    const slotMinutes = slotH * 60 + slotM;
    return dayAppointments.filter((apt) => {
      const [h, m] = apt.appointment_time.split(":").map(Number);
      const aptStartMin = h * 60 + m;
      const duration = (apt as any).duration_minutes || 30;
      const aptEndMin = aptStartMin + duration;
      return slotMinutes >= aptStartMin && slotMinutes < aptEndMin;
    });
  };

  const handleMouseDown = (index: number) => {
    isDragging.current = true;
    setDragStart(index);
    setDragEnd(index);
  };

  const handleMouseEnter = (index: number) => {
    if (isDragging.current && dragStart !== null) {
      setDragEnd(index);
    }
  };

  const handleMouseUp = useCallback(() => {
    if (isDragging.current && dragStart !== null && dragEnd !== null && onTimeRangeSelect) {
      const start = Math.min(dragStart, dragEnd);
      const end = Math.max(dragStart, dragEnd);
      const startTime = timeSlots[start] + ":00";
      // End time is the end of the last selected slot (+ 30 min)
      const endIdx = end + 1;
      const endTime = endIdx < timeSlots.length ? timeSlots[endIdx] + ":00" : "21:30:00";
      onTimeRangeSelect(startTime, endTime);
    }
    isDragging.current = false;
    setDragStart(null);
    setDragEnd(null);
  }, [dragStart, dragEnd, onTimeRangeSelect]);

  const isSlotInRange = (index: number) => {
    if (dragStart === null || dragEnd === null) return false;
    const start = Math.min(dragStart, dragEnd);
    const end = Math.max(dragStart, dragEnd);
    return index >= start && index <= end;
  };

  return (
    <ScrollArea className="h-[500px]" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <div className="space-y-0 select-none">
        {timeSlots.map((slot, index) => {
          const slotApts = getAppointmentsForSlot(slot);
          const isHour = slot.endsWith(":00");
          const inRange = isSlotInRange(index);

          return (
            <div
              key={slot}
              className={cn(
                "flex min-h-[40px]",
                isHour ? "border-t border-border/50" : "border-t border-border/20",
                inRange && "bg-primary/10"
              )}
              onMouseDown={(e) => {
                if (slotApts.length === 0) {
                  e.preventDefault();
                  handleMouseDown(index);
                }
              }}
              onMouseEnter={() => handleMouseEnter(index)}
            >
              <div className="w-16 shrink-0 py-1 pr-3 text-right">
                {isHour && (
                  <span className="text-xs font-mono text-muted-foreground">{slot}</span>
                )}
              </div>
              <div className={cn(
                "flex-1 py-1 pl-3 border-l",
                isHour ? "border-border/50" : "border-border/20",
                slotApts.length === 0 && !inRange && "cursor-crosshair"
              )}>
                {slotApts.length > 0 ? (
                  <div className="space-y-1">
                    {slotApts.map((apt) => {
                      const [slotH, slotM] = slot.split(":").map(Number);
                      const slotMinutes = slotH * 60 + slotM;
                      const [h, m] = apt.appointment_time.split(":").map(Number);
                      const aptStartMin = h * 60 + m;
                      const isStart = slotMinutes === aptStartMin;

                      if (!isStart) {
                        return (
                          <div
                            key={apt.id}
                            className="h-2 rounded-full bg-primary/20"
                            title={`Continuação: ${apt.clients?.name || "Sem cliente"}`}
                          />
                        );
                      }

                      return (
                        <div
                          key={apt.id}
                          onClick={() => onSelectAppointment(apt)}
                          className="p-2 rounded-md bg-primary/10 border border-primary/20 cursor-pointer hover:bg-primary/15 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {apt.appointment_time.slice(0, 5)} ({(apt as any).duration_minutes || 30} min) — {apt.clients?.name || "Sem cliente"}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                <span className="flex items-center gap-1">
                                  <Scissors className="h-3 w-3" />
                                  {apt.service}
                                </span>
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {apt.professionals?.name || "—"}
                                </span>
                              </div>
                            </div>
                            <Badge variant={statusConfig[apt.status]?.variant || "secondary"} className="text-[10px] shrink-0">
                              {statusConfig[apt.status]?.label || apt.status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : inRange ? (
                  <div className="text-xs text-primary font-medium py-0.5">
                    {dragStart !== null && dragEnd !== null && index === Math.min(dragStart, dragEnd) && "Novo agendamento"}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
