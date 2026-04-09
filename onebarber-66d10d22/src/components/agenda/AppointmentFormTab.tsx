import { useEffect, useState, useCallback } from "react";
import { UseFormReturn } from "react-hook-form";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Search, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
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
}

export interface AppointmentFormValues {
  client_id: string;
  professional_id: string;
  service_id: string;
  service_name: string;
  appointment_date: Date;
  appointment_time: string;
  status: string;
  notes: string;
}

interface AppointmentFormTabProps {
  form: any; // UseFormReturn with AppointmentFormValues
  isEditing: boolean;
  canEdit: boolean;
}

// Date mask helper
const applyDateMask = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
  return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
};

// Time mask helper
const applyTimeMask = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 2) return numbers;
  return `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}`;
};

export function AppointmentFormTab({ form, isEditing, canEdit }: AppointmentFormTabProps) {
  const [clientSearch, setClientSearch] = useState("");
  const [clientOpen, setClientOpen] = useState(false);
  const [dateInput, setDateInput] = useState("");
  const [timeInput, setTimeInput] = useState("");

  // Fetch clients with search
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["clients-search", clientSearch],
    queryFn: async () => {
      let query = supabase
        .from("clients")
        .select("id, name, phone")
        .eq("status", "active")
        .order("name")
        .limit(20);

      if (clientSearch) {
        query = query.ilike("name", `%${clientSearch}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Client[];
    },
  });

  // Fetch professionals
  const { data: professionals = [] } = useQuery({
    queryKey: ["professionals-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professionals")
        .select("id, name")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data as Professional[];
    },
  });

  // Fetch services (products with type 'service')
  const { data: services = [] } = useQuery({
    queryKey: ["services-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price")
        .eq("type", "service")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data as Service[];
    },
  });

  // Sync date input with form value
  useEffect(() => {
    const date = form.watch("appointment_date");
    if (date && isValid(date)) {
      setDateInput(format(date, "dd/MM/yyyy"));
    }
  }, [form.watch("appointment_date")]);

  // Sync time input with form value
  useEffect(() => {
    const time = form.watch("appointment_time");
    if (time) {
      setTimeInput(time);
    }
  }, [form.watch("appointment_time")]);

  const handleDateChange = useCallback((value: string) => {
    const masked = applyDateMask(value);
    setDateInput(masked);

    // Try to parse complete date
    if (masked.length === 10) {
      const parsed = parse(masked, "dd/MM/yyyy", new Date());
      if (isValid(parsed)) {
        form.setValue("appointment_date", parsed);
      }
    }
  }, [form]);

  const handleTimeChange = useCallback((value: string) => {
    const masked = applyTimeMask(value);
    setTimeInput(masked);

    // Validate time format
    if (masked.length === 5) {
      const [hours, minutes] = masked.split(":").map(Number);
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        form.setValue("appointment_time", masked);
      }
    }
  }, [form]);

  const handleServiceChange = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (service) {
      form.setValue("service_id", serviceId);
      form.setValue("service_name", service.name);
    }
  };

  const selectedClient = clients.find((c) => c.id === form.watch("client_id"));

  return (
    <div className="space-y-4">
      {/* Client - Searchable */}
      <FormField
        control={form.control}
        name="client_id"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Cliente</FormLabel>
            <Popover open={clientOpen} onOpenChange={setClientOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    role="combobox"
                    disabled={isEditing && !canEdit}
                    className={cn(
                      "justify-between",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    {selectedClient ? selectedClient.name : "Selecione um cliente"}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Buscar cliente..."
                    value={clientSearch}
                    onValueChange={setClientSearch}
                  />
                  <CommandList>
                    {loadingClients ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : (
                      <>
                        <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                        <CommandGroup>
                          {clients.map((client) => (
                            <CommandItem
                              key={client.id}
                              value={client.id}
                              onSelect={() => {
                                field.onChange(client.id);
                                setClientOpen(false);
                              }}
                            >
                              <div className="flex flex-col">
                                <span>{client.name}</span>
                                {client.phone && (
                                  <span className="text-xs text-muted-foreground">
                                    {client.phone}
                                  </span>
                                )}
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

      {/* Service */}
      <FormField
        control={form.control}
        name="service_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Serviço</FormLabel>
            <Select
              onValueChange={handleServiceChange}
              value={field.value}
              disabled={isEditing && !canEdit}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o serviço" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} - R$ {service.price.toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Professional */}
      <FormField
        control={form.control}
        name="professional_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Profissional</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value}
              disabled={isEditing && !canEdit}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um profissional" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {professionals.map((professional) => (
                  <SelectItem key={professional.id} value={professional.id}>
                    {professional.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Date and Time */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="appointment_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input
                    placeholder="DD/MM/AAAA"
                    value={dateInput}
                    onChange={(e) => handleDateChange(e.target.value)}
                    disabled={isEditing && !canEdit}
                    maxLength={10}
                    className="flex-1"
                  />
                </FormControl>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={isEditing && !canEdit}
                    >
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        if (date) {
                          field.onChange(date);
                          setDateInput(format(date, "dd/MM/yyyy"));
                        }
                      }}
                      locale={ptBR}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="appointment_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Horário</FormLabel>
              <FormControl>
                <Input
                  placeholder="HH:MM"
                  value={timeInput}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  disabled={isEditing && !canEdit}
                  maxLength={5}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Status */}
      <FormField
        control={form.control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Status</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value}
              disabled={isEditing && !canEdit}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
                <SelectItem value="present">Presente</SelectItem>
                <SelectItem value="rescheduled">Reagendado</SelectItem>
                <SelectItem value="in_progress">Em Atendimento</SelectItem>
                <SelectItem value="completed">Finalizado</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Notes */}
      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Observações</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Observações adicionais..."
                className="resize-none"
                disabled={isEditing && !canEdit}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
