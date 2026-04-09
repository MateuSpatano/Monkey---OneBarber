import { useEffect, useState, useCallback } from "react";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Search, Loader2, Check, Scissors } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
  phone: string | null;
}

interface Professional {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

interface AvailabilitySlot {
  start_time: string;
  end_time: string;
  slot_interval: number;
}

export interface AppointmentFormValues {
  client_id: string;
  professional_id: string;
  service_ids: string[];
  service_names: string[];
  appointment_date: Date;
  appointment_time: string;
  status: string;
  notes: string;
  duration_minutes: number;
}

interface AppointmentFormTabProps {
  form: any;
  isEditing: boolean;
  canEdit: boolean;
}

const applyDateMask = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
  return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
};

const applyTimeMask = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 2) return numbers;
  return `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}`;
};

export function AppointmentFormTab({ form, isEditing, canEdit }: AppointmentFormTabProps) {
  const [clientSearch, setClientSearch] = useState("");
  const [clientOpen, setClientOpen] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceOpen, setServiceOpen] = useState(false);
  const [dateInput, setDateInput] = useState("");
  const [timeInput, setTimeInput] = useState("");

  const watchedProfessionalId = form.watch("professional_id");
  const watchedDate = form.watch("appointment_date");
  const watchedServiceIds: string[] = form.watch("service_ids") || [];

  // Fetch clients with search
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["clients-search", clientSearch],
    queryFn: async () => {
      let query = supabase.from("clients").select("id, name, phone").eq("status", "active").order("name").limit(20);
      if (clientSearch) query = query.ilike("name", `%${clientSearch}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data as Client[];
    },
  });

  // Fetch professionals
  const { data: professionals = [] } = useQuery({
    queryKey: ["professionals-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("professionals").select("id, name").eq("status", "active").order("name");
      if (error) throw error;
      return data as Professional[];
    },
  });

  // Fetch services
  const { data: services = [] } = useQuery({
    queryKey: ["services-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, name, price, duration_minutes").eq("type", "service").eq("status", "active").order("name");
      if (error) throw error;
      return data as Service[];
    },
  });

  // Fetch professional availability for selected date
  const selectedDayOfWeek = watchedDate && isValid(watchedDate) ? watchedDate.getDay() : null;

  const { data: availabilitySlots = [] } = useQuery({
    queryKey: ["professional-availability", watchedProfessionalId, selectedDayOfWeek],
    queryFn: async () => {
      if (!watchedProfessionalId || selectedDayOfWeek === null) return [];
      const { data, error } = await supabase
        .from("professional_availability")
        .select("start_time, end_time, slot_interval")
        .eq("professional_id", watchedProfessionalId)
        .eq("day_of_week", selectedDayOfWeek)
        .eq("is_active", true);
      if (error) throw error;
      return (data || []) as AvailabilitySlot[];
    },
    enabled: !!watchedProfessionalId && selectedDayOfWeek !== null,
  });

  // Fetch existing appointments for the selected professional and date
  const formattedDate = watchedDate && isValid(watchedDate) ? format(watchedDate, "yyyy-MM-dd") : null;

  const { data: allAppointments = [] } = useQuery({
    queryKey: ["existing-appointments-form", watchedProfessionalId, formattedDate],
    queryFn: async () => {
      if (!watchedProfessionalId || !formattedDate) return [];
      const { data, error } = await supabase
        .from("appointments")
        .select("appointment_time, duration_minutes")
        .eq("professional_id", watchedProfessionalId)
        .eq("appointment_date", formattedDate)
        .not("status", "in", '("cancelled","no_show")');
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!watchedProfessionalId && !!formattedDate,
  });

  const existingAppointments = allAppointments.map((a) => a.appointment_time);

  // Fetch exceptions for the selected professional and date
  const { data: exceptions = [] } = useQuery({
    queryKey: ["professional-exceptions-form", watchedProfessionalId, formattedDate],
    queryFn: async () => {
      if (!watchedProfessionalId || !formattedDate) return [];
      const { data, error } = await supabase
        .from("professional_availability_exceptions")
        .select("*")
        .eq("professional_id", watchedProfessionalId)
        .eq("exception_date", formattedDate);
      if (error) throw error;
      return data || [];
    },
    enabled: !!watchedProfessionalId && !!formattedDate,
  });

  // Generate available time slots based on availability config
  const availableTimeSlots = (() => {
    // Check if entire day is blocked by exception
    const isDayBlocked = exceptions.some((e: any) => !e.is_available && !e.start_time);
    if (isDayBlocked) return [];

    if (availabilitySlots.length === 0) return [];
    const slots: string[] = [];
    for (const avail of availabilitySlots) {
      const [startH, startM] = avail.start_time.split(":").map(Number);
      const [endH, endM] = avail.end_time.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      const interval = avail.slot_interval || 30;
      const totalDuration = form.watch("duration_minutes") || 30;

      for (let m = startMinutes; m <= endMinutes - totalDuration; m += interval) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        const timeStr = `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}:00`;
        
        // Check if this specific time is blocked by a partial exception or existing appointment
        const isTimeBlocked = exceptions.some((e: any) => {
          if (!e.start_time || !e.end_time || e.is_available) return false;
          const [eStartH, eStartM] = e.start_time.split(":").map(Number);
          const [eEndH, eEndM] = e.end_time.split(":").map(Number);
          const eStart = eStartH * 60 + eStartM;
          const eEnd = eEndH * 60 + eEndM;
          // Check if any part of the requested duration overlaps with the blocked period
          return (m < eEnd && m + totalDuration > eStart);
        });

        // Also check against existing appointments
        const hasConflict = !isTimeBlocked && allAppointments.some((apt: any) => {
          const [aH, aM] = apt.appointment_time.split(":").map(Number);
          const aStart = aH * 60 + aM;
          const aDuration = apt.duration_minutes || 30;
          const aEnd = aStart + aDuration;
          return (m < aEnd && m + totalDuration > aStart);
        });

        if (!isTimeBlocked && !hasConflict) {
          slots.push(timeStr.slice(0, 5));
        }
      }
    }
    return slots;
  })();

  // Sync date input with form value
  useEffect(() => {
    if (watchedDate && isValid(watchedDate)) {
      setDateInput(format(watchedDate, "dd/MM/yyyy"));
    }
  }, [watchedDate]);

  useEffect(() => {
    const time = form.watch("appointment_time");
    if (time) setTimeInput(time);
  }, [form.watch("appointment_time")]);

  const handleDateChange = useCallback((value: string) => {
    const masked = applyDateMask(value);
    setDateInput(masked);
    if (masked.length === 10) {
      const parsed = parse(masked, "dd/MM/yyyy", new Date());
      if (isValid(parsed)) form.setValue("appointment_date", parsed);
    }
  }, [form]);

  const handleTimeChange = useCallback((value: string) => {
    const masked = applyTimeMask(value);
    setTimeInput(masked);
    if (masked.length === 5) {
      const [hours, minutes] = masked.split(":").map(Number);
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        form.setValue("appointment_time", masked);
      }
    }
  }, [form]);

  const handleServiceToggle = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;

    const currentIds: string[] = form.getValues("service_ids") || [];
    const currentNames: string[] = form.getValues("service_names") || [];

    if (currentIds.includes(serviceId)) {
      const idx = currentIds.indexOf(serviceId);
      const newIds = currentIds.filter((_, i) => i !== idx);
      const newNames = currentNames.filter((_, i) => i !== idx);
      form.setValue("service_ids", newIds, { shouldValidate: true });
      form.setValue("service_names", newNames);
      
      // Calculate new total duration
      const newDuration = newIds.reduce((sum, id) => {
        const s = services.find(srv => srv.id === id);
        return sum + (s?.duration_minutes || 30);
      }, 0);
      form.setValue("duration_minutes", newDuration || 30);
    } else {
      const newIds = [...currentIds, serviceId];
      const newNames = [...currentNames, service.name];
      form.setValue("service_ids", newIds, { shouldValidate: true });
      form.setValue("service_names", newNames);

      // Calculate new total duration
      const newDuration = newIds.reduce((sum, id) => {
        const s = services.find(srv => srv.id === id);
        return sum + (s?.duration_minutes || 30);
      }, 0);
      form.setValue("duration_minutes", newDuration || 30);
    }
  };

  const selectedTotal = services
    .filter((s) => watchedServiceIds.includes(s.id))
    .reduce((sum, s) => sum + s.price, 0);

  const selectedClient = clients.find((c) => c.id === form.watch("client_id"));

  return (
    <div className="space-y-4">
      {/* Client */}
      <FormField
        control={form.control}
        name="client_id"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Cliente</FormLabel>
            <Popover open={clientOpen} onOpenChange={setClientOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button variant="outline" role="combobox" disabled={isEditing && !canEdit}
                    className={cn("justify-between", !field.value && "text-muted-foreground")}>
                    {selectedClient ? selectedClient.name : "Selecione um cliente"}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput placeholder="Buscar cliente..." value={clientSearch} onValueChange={setClientSearch} />
                  <CommandList>
                    {loadingClients ? (
                      <div className="flex items-center justify-center py-6"><Loader2 className="h-4 w-4 animate-spin" /></div>
                    ) : (
                      <>
                        <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                        <CommandGroup>
                          {clients.map((client) => (
                            <CommandItem key={client.id} value={client.id} onSelect={() => { field.onChange(client.id); setClientOpen(false); }}>
                              <div className="flex flex-col">
                                <span>{client.name}</span>
                                {client.phone && <span className="text-xs text-muted-foreground">{client.phone}</span>}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Services - Multi-select Combobox */}
      <FormField
        control={form.control}
        name="service_ids"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Serviços</FormLabel>
            <Popover open={serviceOpen} onOpenChange={setServiceOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    role="combobox"
                    disabled={isEditing && !canEdit}
                    className={cn(
                      "justify-between h-auto min-h-[40px] py-2",
                      watchedServiceIds.length === 0 && "text-muted-foreground"
                    )}
                  >
                    <div className="flex flex-wrap gap-1 items-center max-w-[90%]">
                      {watchedServiceIds.length === 0 ? (
                        "Selecione um ou mais serviços"
                      ) : (
                        <div className="flex items-center gap-1 overflow-hidden text-left">
                          <Scissors className="h-3 w-3 shrink-0 mr-1 opacity-50" />
                          <span className="truncate">
                            {services
                              .filter((s) => watchedServiceIds.includes(s.id))
                              .map((s) => s.name)
                              .join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command shouldFilter={true}>
                  <CommandInput 
                    placeholder="Buscar serviço..." 
                    value={serviceSearch} 
                    onValueChange={setServiceSearch} 
                  />
                  <CommandList>
                    <CommandEmpty>Nenhum serviço encontrado.</CommandEmpty>
                    <CommandGroup>
                      {services.map((service) => (
                        <CommandItem
                          key={service.id}
                          value={service.name}
                          onSelect={() => handleServiceToggle(service.id)}
                          className="flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{service.name}</span>
                            <span className="text-xs text-muted-foreground">
                              R$ {service.price.toFixed(2)} • {service.duration_minutes} min
                            </span>
                          </div>
                          {watchedServiceIds.includes(service.id) && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <div className="flex items-center justify-between mt-1 px-1">
              {watchedServiceIds.length > 0 && (
                <p className="text-[11px] text-muted-foreground font-medium italic">
                  {watchedServiceIds.length} selecionado(s) • Total: R$ {selectedTotal.toFixed(2)}
                </p>
              )}
              {form.watch("duration_minutes") > 0 && (
                <p className="text-[11px] text-primary font-bold uppercase tracking-wider">
                  Duração: {form.watch("duration_minutes")} min
                </p>
              )}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Professional */}
      <FormField control={form.control} name="professional_id" render={({ field }) => (
        <FormItem>
          <FormLabel>Profissional</FormLabel>
          <Select onValueChange={field.onChange} value={field.value} disabled={isEditing && !canEdit}>
            <FormControl><SelectTrigger><SelectValue placeholder="Selecione um profissional" /></SelectTrigger></FormControl>
            <SelectContent>
              {professionals.map((professional) => (
                <SelectItem key={professional.id} value={professional.id}>{professional.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )} />

      {/* Date and Time */}
      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="appointment_date" render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Data</FormLabel>
            <div className="flex gap-2">
              <FormControl>
                <Input placeholder="DD/MM/AAAA" value={dateInput} onChange={(e) => handleDateChange(e.target.value)}
                  disabled={isEditing && !canEdit} maxLength={10} className="flex-1" />
              </FormControl>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" disabled={isEditing && !canEdit}><CalendarIcon className="h-4 w-4" /></Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={(date) => { if (date) { field.onChange(date); setDateInput(format(date, "dd/MM/yyyy")); } }}
                    locale={ptBR} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="appointment_time" render={({ field }) => (
          <FormItem>
            <FormLabel>Horário</FormLabel>
            {availableTimeSlots.length > 0 ? (
              <Select onValueChange={(v) => { field.onChange(v); setTimeInput(v); }} value={field.value} disabled={isEditing && !canEdit}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  {availableTimeSlots.map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <FormControl>
                <Input placeholder="HH:MM" value={timeInput} onChange={(e) => handleTimeChange(e.target.value)}
                  disabled={isEditing && !canEdit} maxLength={5} />
              </FormControl>
            )}
            <FormMessage />
          </FormItem>
        )} />
      </div>

      {/* Status - hidden for new appointments (defaults to "open") */}
      {isEditing && (
        <FormField control={form.control} name="status" render={({ field }) => (
          <FormItem>
            <FormLabel>Status</FormLabel>
            <Select onValueChange={field.onChange} value={field.value} disabled={isEditing && !canEdit}>
              <FormControl><SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="pending">Em Aberto</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
                <SelectItem value="no_show">No-show</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
      )}

      {/* Notes */}
      <FormField control={form.control} name="notes" render={({ field }) => (
        <FormItem>
          <FormLabel>Observações</FormLabel>
          <FormControl>
            <Textarea placeholder="Observações adicionais..." className="resize-none" disabled={isEditing && !canEdit} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </div>
  );
}
