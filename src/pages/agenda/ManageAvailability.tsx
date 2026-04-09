import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Loader2, CalendarClock, Plus, Trash2, CalendarOff, Copy } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const DAY_NAMES = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

interface AvailabilityRow {
  id?: string;
  professional_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  slot_interval: number;
}

interface ExceptionRow {
  id?: string;
  professional_id: string;
  exception_date: string;
  is_available: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
}

export default function ManageAvailability() {
  const queryClient = useQueryClient();
  const [selectedProfessional, setSelectedProfessional] = useState<string>("");
  const [availabilities, setAvailabilities] = useState<AvailabilityRow[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionRow[]>([]);
  const [saving, setSaving] = useState(false);

  // New exception form state
  const [newExceptionDate, setNewExceptionDate] = useState<Date | undefined>(undefined);
  const [newExceptionReason, setNewExceptionReason] = useState("");
  const [newExceptionAvailable, setNewExceptionAvailable] = useState(false);

  const { data: professionals = [] } = useQuery({
    queryKey: ["professionals-availability"],
    queryFn: async () => {
      const { data, error } = await supabase.from("professionals").select("id, name").eq("status", "active").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: savedAvailabilities = [], refetch: refetchAvailabilities } = useQuery({
    queryKey: ["professional-availability-config", selectedProfessional],
    queryFn: async () => {
      if (!selectedProfessional) return [];
      const { data, error } = await supabase
        .from("professional_availability")
        .select("*")
        .eq("professional_id", selectedProfessional)
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProfessional,
  });

  const { data: savedExceptions = [], refetch: refetchExceptions } = useQuery({
    queryKey: ["professional-exceptions", selectedProfessional],
    queryFn: async () => {
      if (!selectedProfessional) return [];
      const { data, error } = await supabase
        .from("professional_availability_exceptions")
        .select("*")
        .eq("professional_id", selectedProfessional)
        .order("exception_date");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProfessional,
  });

  useEffect(() => {
    if (savedAvailabilities.length > 0) {
      setAvailabilities(savedAvailabilities);
    } else if (selectedProfessional) {
      // Create default schedule (Mon-Sat 09:00-18:00)
      const defaults: AvailabilityRow[] = [];
      for (let day = 1; day <= 6; day++) {
        defaults.push({
          professional_id: selectedProfessional,
          day_of_week: day,
          start_time: "09:00",
          end_time: "18:00",
          is_active: true,
          slot_interval: 30,
        });
      }
      // Sunday off
      defaults.push({
        professional_id: selectedProfessional,
        day_of_week: 0,
        start_time: "09:00",
        end_time: "18:00",
        is_active: false,
        slot_interval: 30,
      });
      setAvailabilities(defaults.sort((a, b) => a.day_of_week - b.day_of_week));
    }
  }, [savedAvailabilities, selectedProfessional]);

  useEffect(() => {
    setExceptions(savedExceptions);
  }, [savedExceptions]);

  const [copyFromDay, setCopyFromDay] = useState<string>("");

  const handleBulkFill = () => {
    setAvailabilities((prev) =>
      prev.map((a) => ({
        ...a,
        start_time: "09:00",
        end_time: "18:00",
        is_active: a.day_of_week !== 0,
        slot_interval: 30,
      }))
    );
  };

  const handleCopyFromDay = () => {
    const sourceDay = Number(copyFromDay);
    const source = availabilities.find((a) => a.day_of_week === sourceDay);
    if (!source) return;
    setAvailabilities((prev) =>
      prev.map((a) =>
        a.day_of_week === sourceDay
          ? a
          : {
              ...a,
              start_time: source.start_time,
              end_time: source.end_time,
              is_active: source.is_active,
              slot_interval: source.slot_interval,
            }
      )
    );
    toast.success(`Configuração de ${DAY_NAMES[sourceDay]} replicada para os demais dias`);
  };

  const updateAvailability = (dayOfWeek: number, field: string, value: any) => {
    setAvailabilities((prev) =>
      prev.map((a) => (a.day_of_week === dayOfWeek ? { ...a, [field]: value } : a))
    );
  };

  const handleSave = async () => {
    if (!selectedProfessional) return;
    setSaving(true);
    try {
      // Delete existing and re-insert
      await supabase.from("professional_availability").delete().eq("professional_id", selectedProfessional);
      
      const toInsert = availabilities.map((a) => ({
        professional_id: selectedProfessional,
        day_of_week: a.day_of_week,
        start_time: a.start_time + ":00",
        end_time: a.end_time + ":00",
        is_active: a.is_active,
        slot_interval: a.slot_interval,
      }));

      const { error } = await supabase.from("professional_availability").insert(toInsert);
      if (error) throw error;
      toast.success("Disponibilidade salva com sucesso!");
      refetchAvailabilities();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleAddException = async () => {
    if (!selectedProfessional || !newExceptionDate) return;
    try {
      const { error } = await supabase.from("professional_availability_exceptions").insert({
        professional_id: selectedProfessional,
        exception_date: format(newExceptionDate, "yyyy-MM-dd"),
        is_available: newExceptionAvailable,
        reason: newExceptionReason || null,
      });
      if (error) throw error;
      toast.success("Exceção adicionada!");
      setNewExceptionDate(undefined);
      setNewExceptionReason("");
      setNewExceptionAvailable(false);
      refetchExceptions();
    } catch (error: any) {
      toast.error(error.message || "Erro ao adicionar exceção");
    }
  };

  const handleDeleteException = async (id: string) => {
    try {
      await supabase.from("professional_availability_exceptions").delete().eq("id", id);
      toast.success("Exceção removida!");
      refetchExceptions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <CalendarClock className="h-6 w-6" />
          Gerenciar Agenda
        </h1>
        <p className="text-muted-foreground">Configure os dias e horários de disponibilidade de cada profissional</p>
      </div>

      {/* Professional selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profissional</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
            <SelectTrigger className="max-w-sm">
              <SelectValue placeholder="Selecione um profissional" />
            </SelectTrigger>
            <SelectContent>
              {professionals.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedProfessional && (
        <>
          {/* Weekly schedule */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Horário Semanal</CardTitle>
                  <CardDescription>Configure o horário recorrente por dia da semana</CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Select value={copyFromDay} onValueChange={setCopyFromDay}>
                      <SelectTrigger className="w-44 h-9">
                        <SelectValue placeholder="Copiar de..." />
                      </SelectTrigger>
                      <SelectContent>
                        {DAY_NAMES.map((name, i) => (
                          <SelectItem key={i} value={String(i)}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={handleCopyFromDay} disabled={copyFromDay === ""}>
                      <Copy className="h-4 w-4 mr-1" /> Replicar
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleBulkFill}>
                    Preencher Padrão
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dia</TableHead>
                      <TableHead>Ativo</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Fim</TableHead>
                      <TableHead>Intervalo (min)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availabilities
                      .sort((a, b) => a.day_of_week - b.day_of_week)
                      .map((avail) => (
                        <TableRow key={avail.day_of_week}>
                          <TableCell className="font-medium">{DAY_NAMES[avail.day_of_week]}</TableCell>
                          <TableCell>
                            <Switch
                              checked={avail.is_active}
                              onCheckedChange={(checked) => updateAvailability(avail.day_of_week, "is_active", checked)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="time"
                              value={avail.start_time}
                              onChange={(e) => updateAvailability(avail.day_of_week, "start_time", e.target.value)}
                              disabled={!avail.is_active}
                              className="w-28"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="time"
                              value={avail.end_time}
                              onChange={(e) => updateAvailability(avail.day_of_week, "end_time", e.target.value)}
                              disabled={!avail.is_active}
                              className="w-28"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={avail.slot_interval}
                              onChange={(e) => updateAvailability(avail.day_of_week, "slot_interval", Number(e.target.value))}
                              disabled={!avail.is_active}
                              className="w-20"
                              min={10}
                              max={120}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end mt-4">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar Horários
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Exceptions (block/open specific dates) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarOff className="h-5 w-5" />
                Exceções (Bloqueios e Liberações)
              </CardTitle>
              <CardDescription>Bloqueie ou libere datas específicas fora do horário regular</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-4 p-4 border rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-40">
                        {newExceptionDate ? format(newExceptionDate, "dd/MM/yyyy") : "Selecionar data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={newExceptionDate} onSelect={setNewExceptionDate} locale={ptBR} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={newExceptionAvailable ? "open" : "blocked"} onValueChange={(v) => setNewExceptionAvailable(v === "open")}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blocked">Bloquear</SelectItem>
                      <SelectItem value="open">Liberar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex-1 min-w-[150px]">
                  <Label>Motivo</Label>
                  <Input value={newExceptionReason} onChange={(e) => setNewExceptionReason(e.target.value)} placeholder="Motivo (opcional)" />
                </div>
                <Button onClick={handleAddException} disabled={!newExceptionDate}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>

              {exceptions.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exceptions.map((exc) => (
                      <TableRow key={exc.id}>
                        <TableCell>{format(new Date(exc.exception_date + "T12:00:00"), "dd/MM/yyyy")}</TableCell>
                        <TableCell>
                          <Badge variant={exc.is_available ? "default" : "destructive"}>
                            {exc.is_available ? "Liberado" : "Bloqueado"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{exc.reason || "-"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => exc.id && handleDeleteException(exc.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
