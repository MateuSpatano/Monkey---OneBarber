import { useState } from "react";
import { format, isSameDay, isSameMonth, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
}

interface MonthViewProps {
  currentMonth: Date;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  appointments: Appointment[];
  onNewAppointment?: (date: Date) => void;
  onOpenOrder?: (date: Date) => void;
}

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function MonthView({ currentMonth, selectedDate, onSelectDate, appointments, onNewAppointment, onOpenOrder }: MonthViewProps) {
  const [openDropdownDay, setOpenDropdownDay] = useState<string | null>(null);

  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const calendarStart = startOfWeek(monthStart, { locale: ptBR });
  const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getDayCount = (date: Date) => {
    return appointments.filter((apt) => {
      const [y, m, d] = apt.appointment_date.split("-").map(Number);
      return isSameDay(new Date(y, m - 1, d), date);
    }).length;
  };

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day) => {
          const count = getDayCount(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());
          const dayKey = day.toISOString();
          const hasActions = onNewAppointment || onOpenOrder;

          const dayButton = (
            <button
              className={cn(
                "relative aspect-square p-2 rounded-lg text-sm font-medium transition-all duration-200 w-full",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                !isCurrentMonth && "text-muted-foreground/50",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                isToday && !isSelected && "ring-2 ring-primary/50",
              )}
            >
              <span>{format(day, "d")}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full",
                    isSelected ? "bg-primary-foreground" : "bg-primary"
                  )}
                />
              )}
            </button>
          );

          if (hasActions) {
            return (
              <DropdownMenu
                key={dayKey}
                open={openDropdownDay === dayKey}
                onOpenChange={(open) => {
                  setOpenDropdownDay(open ? dayKey : null);
                  if (open) onSelectDate(day);
                }}
              >
                <DropdownMenuTrigger asChild>
                  {dayButton}
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="center"
                  className="z-50 bg-popover border border-border shadow-lg min-w-[180px]"
                >
                  {onNewAppointment && (
                    <DropdownMenuItem
                      onClick={() => {
                        setOpenDropdownDay(null);
                        onNewAppointment(day);
                      }}
                      className="cursor-pointer"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Criar Agendamento
                    </DropdownMenuItem>
                  )}
                  {onOpenOrder && (
                    <DropdownMenuItem
                      onClick={() => {
                        setOpenDropdownDay(null);
                        onOpenOrder(day);
                      }}
                      className="cursor-pointer"
                    >
                      <Receipt className="mr-2 h-4 w-4" />
                      Abrir Comanda
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }

          return (
            <button
              key={dayKey}
              onClick={() => onSelectDate(day)}
              className={cn(
                "relative aspect-square p-2 rounded-lg text-sm font-medium transition-all duration-200",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                !isCurrentMonth && "text-muted-foreground/50",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                isToday && !isSelected && "ring-2 ring-primary/50",
              )}
            >
              <span>{format(day, "d")}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full",
                    isSelected ? "bg-primary-foreground" : "bg-primary"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
