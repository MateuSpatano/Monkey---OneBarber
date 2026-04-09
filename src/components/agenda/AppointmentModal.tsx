import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Trash2, CheckCircle, XCircle, UserCheck, AlertTriangle, Lock } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

import { supabase } from "@/integrations/supabase/client";
import { usePermissionsContext } from "@/contexts/PermissionsContext";
import { AppointmentFormTab } from "./AppointmentFormTab";

const formSchema = z.object({
  client_id: z.string().min(1, "Selecione um cliente"),
  professional_id: z.string().min(1, "Selecione um profissional"),
  service_ids: z.array(z.string()).min(1, "Selecione pelo menos um serviço"),
  service_names: z.array(z.string()).min(1, "Serviço obrigatório"),
  appointment_date: z.date({ required_error: "Selecione uma data" }),
  appointment_time: z.string().min(1, "Informe o horário"),
  status: z.string().min(1, "Selecione o status"),
  notes: z.string().optional().default(""),
  duration_minutes: z.number().min(1).default(30),
});

type FormValues = z.infer<typeof formSchema>;

interface Appointment {
  id: string;
  client_id: string | null;
  professional_id: string | null;
  service: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes: string | null;
  total_amount?: number;
  duration_minutes?: number | null;
  checked_in_at?: string | null;
  checkout_at?: string | null;
}

interface AppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  selectedDate: Date | null;
  onSuccess: () => void;
}

export const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  open: { label: "Em Aberto", variant: "secondary" },
  confirmed: { label: "Confirmado", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  no_show: { label: "No-show", variant: "outline" },
  pending: { label: "Em Aberto", variant: "secondary" },
  present: { label: "Confirmado", variant: "default" },
  in_progress: { label: "Confirmado", variant: "default" },
  completed: { label: "Fechado", variant: "outline" },
  closed: { label: "Fechado", variant: "outline" },
};

export function AppointmentModal({ open, onOpenChange, appointment, selectedDate, onSuccess }: AppointmentModalProps) {
  const { isAdmin } = usePermissionsContext();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>(appointment?.status || "pending");

  const isEditing = !!appointment;
  const isClosed = currentStatus === "closed" || currentStatus === "completed";
  const canEditAppointment = isAdmin && !isClosed;
  const canDeleteAppointment = isAdmin && !isClosed;

  // Fetch all services to resolve names → ids when editing
  const { data: allServices = [] } = useQuery({
    queryKey: ["services-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, duration_minutes")
        .eq("type", "service")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_id: "",
      professional_id: "",
      service_ids: [],
      service_names: [],
      appointment_date: selectedDate || new Date(),
      appointment_time: "",
      status: "pending",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (appointment) {
        setCurrentStatus(appointment.status);
        const [year, month, day] = appointment.appointment_date.split("-").map(Number);
        const localDate = new Date(year, month - 1, day);

        // Resolve stored service names back to IDs
        const storedNames = appointment.service
          ? appointment.service.split(", ").map((n) => n.trim())
          : [];
        const resolvedIds: string[] = [];
        const resolvedNames: string[] = [];
        for (const name of storedNames) {
          const found = allServices.find((s: any) => s.name === name);
          if (found) {
            resolvedIds.push(found.id);
            resolvedNames.push(found.name);
          } else {
            // Keep name even if service was deleted/renamed
            resolvedNames.push(name);
          }
        }

        form.reset({
          client_id: appointment.client_id || "",
          professional_id: appointment.professional_id || "",
          service_ids: resolvedIds,
          service_names: resolvedNames,
          appointment_date: localDate,
          appointment_time: appointment.appointment_time.slice(0, 5),
          status: appointment.status,
          notes: appointment.notes || "",
          duration_minutes: appointment.duration_minutes || 30,
        });
      } else {
        setCurrentStatus("pending");
        form.reset({
          client_id: "",
          professional_id: "",
          service_ids: [],
          service_names: [],
          appointment_date: selectedDate || new Date(),
          appointment_time: "",
          status: "pending",
          notes: "",
          duration_minutes: 30,
        });
      }
    }
  }, [open, appointment, selectedDate, form, allServices]);

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const year = values.appointment_date.getFullYear();
      const month = String(values.appointment_date.getMonth() + 1).padStart(2, "0");
      const day = String(values.appointment_date.getDate()).padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}`;

      // Calculate total from selected services
      const totalAmount = allServices
        .filter((s: any) => values.service_ids.includes(s.id))
        .reduce((sum: number, s: any) => sum + (s.price || 0), 0);

      const payload = {
        client_id: values.client_id,
        professional_id: values.professional_id,
        service: values.service_names.join(", "),
        appointment_date: formattedDate,
        appointment_time: values.appointment_time.length === 5 ? values.appointment_time + ":00" : values.appointment_time,
        status: values.status,
        notes: values.notes || null,
        total_amount: totalAmount,
        duration_minutes: values.duration_minutes,
      };

      if (isEditing) {
        const { error } = await (supabase as any).from("appointments").update(payload).eq("id", appointment.id);
        if (error) throw error;
        toast.success("Agendamento atualizado com sucesso!");
      } else {
        const { error } = await (supabase as any).from("appointments").insert(payload);
        if (error) throw error;
        toast.success("Agendamento criado com sucesso!");
      }

      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar agendamento");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!appointment) return;
    setIsLoading(true);
    try {
      const updateData: any = { status: newStatus };

      if (newStatus === "confirmed") {
        updateData.checked_in_at = new Date().toISOString();

        // Auto-create order items for all services
        const serviceNames = appointment.service ? appointment.service.split(", ").map((n) => n.trim()) : [];
        for (const name of serviceNames) {
          const svc = allServices.find((s: any) => s.name === name);
          if (svc) {
            await (supabase as any).from("order_items").insert({
              appointment_id: appointment.id,
              item_type: "service",
              product_id: svc.id,
              name: svc.name,
              quantity: 1,
              unit_price: svc.price,
              total_price: svc.price,
              professional_id: appointment.professional_id,
            });
          }
        }
      }

      const { error } = await (supabase as any)
        .from("appointments")
        .update(updateData)
        .eq("id", appointment.id);

      if (error) throw error;

      toast.success(`Status alterado para ${statusConfig[newStatus]?.label || newStatus}`);
      setCurrentStatus(newStatus);
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["open-orders"] });
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!appointment) return;
    setIsLoading(true);
    try {
      const { error } = await (supabase as any).from("appointments").delete().eq("id", appointment.id);
      if (error) throw error;
      toast.success("Agendamento excluído com sucesso!");
      setShowDeleteDialog(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir agendamento");
    } finally {
      setIsLoading(false);
    }
  };

  const renderActionButtons = () => {
    if (!isEditing || !appointment) return null;
    const status = currentStatus;

    return (
      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
        {(status === "open" || status === "pending") && (
          <>
            <Button type="button" onClick={() => handleStatusChange("confirmed")}
              disabled={isLoading} className="premium-button-solid bg-amber-500 hover:bg-amber-600 text-black h-10 px-4 shadow-md border-none">
              <UserCheck className="h-4 w-4 mr-2" /> Check-in
            </Button>
            <Button type="button" variant="ghost" onClick={() => handleStatusChange("cancelled")}
              disabled={isLoading} className="premium-button-ghost text-destructive hover:text-white hover:bg-destructive h-10 px-4 border-none">
              <XCircle className="h-4 w-4 mr-2" /> Cancelar
            </Button>
            <Button type="button" variant="ghost" onClick={() => handleStatusChange("no_show")}
              disabled={isLoading} className="premium-button-ghost h-10 px-4 border-none">
              <AlertTriangle className="h-4 w-4 mr-2" /> No-show
            </Button>
          </>
        )}
        {status === "confirmed" && (
          <Badge variant="default" className="text-sm py-1.5 px-3">
            <CheckCircle className="h-4 w-4 mr-1" />
            Atendimento em andamento — Comanda aberta no Caixa
          </Badge>
        )}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col rounded-[32px] border-none shadow-2xl p-6 sm:p-8">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight">{isEditing ? "Detalhes do Agendamento" : "Novo Agendamento"}</DialogTitle>
                <DialogDescription>
                  {isEditing
                    ? "Gerencie o agendamento do cliente"
                    : "Preencha os dados para criar um novo agendamento"}
                </DialogDescription>
              </div>
              {isEditing && (
                <Badge variant={statusConfig[currentStatus]?.variant || "secondary"}>
                  {statusConfig[currentStatus]?.label || currentStatus}
                </Badge>
              )}
            </div>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto py-4">
                <AppointmentFormTab form={form} isEditing={isEditing} canEdit={canEditAppointment && !isClosed} />
              </div>

              {isClosed && isEditing && (
                <div className="px-1 py-3">
                  <Badge variant="outline" className="text-sm py-1.5 px-3 w-full justify-center">
                    <Lock className="h-4 w-4 mr-1" />
                    Comanda fechada — edição bloqueada
                  </Badge>
                </div>
              )}

              {renderActionButtons()}

              <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t mt-4">
                {isEditing && canDeleteAppointment && (
                  <Button type="button" variant="ghost" onClick={() => setShowDeleteDialog(true)} disabled={isLoading} className="premium-button-ghost text-destructive border-none h-11 px-6 mr-auto">
                    <Trash2 className="mr-2 h-4 w-4" /> Excluir
                  </Button>
                )}
                {!isClosed && (
                  <Button type="submit" disabled={isLoading || (isEditing && !canEditAppointment)}
                    className="premium-button-solid h-11 px-8 shadow-xl">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditing ? "Salvar Alterações" : "Criar Agendamento"}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-[32px] border-none shadow-2xl p-8">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 pt-6">
            <AlertDialogCancel className="premium-button-ghost border-none h-11 px-6 m-0">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="premium-button-solid bg-destructive hover:bg-destructive/90 text-white border-none h-11 px-8 shadow-lg m-0">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
