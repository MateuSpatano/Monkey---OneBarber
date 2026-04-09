import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Loader2, Trash2, CheckCircle, XCircle, UserCheck, Play, Receipt } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { OrderTab } from "./OrderTab";

const formSchema = z.object({
  client_id: z.string().min(1, "Selecione um cliente"),
  professional_id: z.string().min(1, "Selecione um profissional"),
  service_id: z.string().min(1, "Selecione um serviço"),
  service_name: z.string().min(1, "Serviço obrigatório"),
  appointment_date: z.date({ required_error: "Selecione uma data" }),
  appointment_time: z.string().min(1, "Informe o horário"),
  status: z.string().min(1, "Selecione o status"),
  notes: z.string().optional().default(""),
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
  checked_in_at?: string | null;
  checkout_at?: string | null;
}

interface OrderItem {
  id?: string;
  item_type: "service" | "product";
  product_id?: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  professional_id?: string;
}

interface AppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  selectedDate: Date | null;
  onSuccess: () => void;
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

export function AppointmentModal({ open, onOpenChange, appointment, selectedDate, onSuccess }: AppointmentModalProps) {
  const { isAdmin } = usePermissionsContext();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("form");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  const isEditing = !!appointment;
  const canEditAppointment = isAdmin;
  const canDeleteAppointment = isAdmin;

  // Check if in order mode (after check-in)
  const isOrderMode = appointment?.status === "present" || appointment?.status === "in_progress";

  // Fetch service details
  const { data: serviceDetails } = useQuery({
    queryKey: ["service-details", appointment?.service],
    queryFn: async () => {
      if (!appointment?.service) return null;
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price")
        .eq("name", appointment.service)
        .eq("type", "service")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!appointment?.service,
  });

  // Fetch existing order items
  const { data: existingOrderItems = [], refetch: refetchOrderItems } = useQuery({
    queryKey: ["order-items", appointment?.id],
    queryFn: async () => {
      if (!appointment?.id) return [];
      const { data, error } = await (supabase as any)
        .from("order_items")
        .select("*")
        .eq("appointment_id", appointment.id)
        .order("created_at");
      if (error) throw error;
      return data as OrderItem[];
    },
    enabled: !!appointment?.id && isOrderMode,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_id: "",
      professional_id: "",
      service_id: "",
      service_name: "",
      appointment_date: selectedDate || new Date(),
      appointment_time: "",
      status: "pending",
      notes: "",
    },
  });

  // Reset form and order items when modal opens/closes
  useEffect(() => {
    if (open) {
      if (appointment) {
        const [year, month, day] = appointment.appointment_date.split("-").map(Number);
        const localDate = new Date(year, month - 1, day);

        form.reset({
          client_id: appointment.client_id || "",
          professional_id: appointment.professional_id || "",
          service_id: "",
          service_name: appointment.service,
          appointment_date: localDate,
          appointment_time: appointment.appointment_time.slice(0, 5),
          status: appointment.status,
          notes: appointment.notes || "",
        });

        // Set active tab based on status
        if (isOrderMode) {
          setActiveTab("order");
        } else {
          setActiveTab("form");
        }
      } else {
        form.reset({
          client_id: "",
          professional_id: "",
          service_id: "",
          service_name: "",
          appointment_date: selectedDate || new Date(),
          appointment_time: "",
          status: "pending",
          notes: "",
        });
        setActiveTab("form");
        setOrderItems([]);
      }
    }
  }, [open, appointment, selectedDate, form, isOrderMode]);

  // Sync existing order items
  useEffect(() => {
    if (existingOrderItems.length > 0) {
      setOrderItems(existingOrderItems);
    } else if (isOrderMode && serviceDetails && orderItems.length === 0) {
      // Auto-add the initial service if no items exist
      setOrderItems([
        {
          item_type: "service",
          product_id: serviceDetails.id,
          name: serviceDetails.name,
          quantity: 1,
          unit_price: serviceDetails.price,
          total_price: serviceDetails.price,
          professional_id: appointment?.professional_id || undefined,
        },
      ]);
    }
  }, [existingOrderItems, isOrderMode, serviceDetails]);

  const totalAmount = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.total_price, 0);
  }, [orderItems]);

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const year = values.appointment_date.getFullYear();
      const month = String(values.appointment_date.getMonth() + 1).padStart(2, "0");
      const day = String(values.appointment_date.getDate()).padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}`;

      const payload = {
        client_id: values.client_id,
        professional_id: values.professional_id,
        service: values.service_name,
        appointment_date: formattedDate,
        appointment_time: values.appointment_time + ":00",
        status: values.status,
        notes: values.notes || null,
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

      if (newStatus === "present") {
        updateData.checked_in_at = new Date().toISOString();
      }

      const { error } = await (supabase as any)
        .from("appointments")
        .update(updateData)
        .eq("id", appointment.id);

      if (error) throw error;

      // If check-in, create initial order item
      if (newStatus === "present" && serviceDetails) {
        const { error: orderError } = await (supabase as any).from("order_items").insert({
          appointment_id: appointment.id,
          item_type: "service",
          product_id: serviceDetails.id,
          name: serviceDetails.name,
          quantity: 1,
          unit_price: serviceDetails.price,
          total_price: serviceDetails.price,
          professional_id: appointment.professional_id,
        });
        if (orderError) console.error("Error creating order item:", orderError);
      }

      toast.success(`Status alterado para ${statusConfig[newStatus]?.label || newStatus}`);
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["order-items", appointment.id] });

      // Switch to order tab if check-in
      if (newStatus === "present") {
        setActiveTab("order");
        refetchOrderItems();
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!appointment) return;
    setIsLoading(true);
    try {
      // Save order items
      // First delete existing items
      await (supabase as any).from("order_items").delete().eq("appointment_id", appointment.id);

      // Insert current items
      if (orderItems.length > 0) {
        const itemsToInsert = orderItems.map((item) => ({
          appointment_id: appointment.id,
          item_type: item.item_type,
          product_id: item.product_id,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          professional_id: item.professional_id || appointment.professional_id,
        }));

        const { error: orderError } = await (supabase as any).from("order_items").insert(itemsToInsert);
        if (orderError) throw orderError;
      }

      // Update appointment status and total
      const { error: aptError } = await (supabase as any)
        .from("appointments")
        .update({
          status: "completed",
          total_amount: totalAmount,
          checkout_at: new Date().toISOString(),
        })
        .eq("id", appointment.id);

      if (aptError) throw aptError;

      // Create financial transaction using confirm_payment
      const { error: paymentError } = await supabase.rpc("confirm_payment", {
        p_type: "income",
        p_origin: "appointment",
        p_reference_type: "appointment",
        p_reference_id: appointment.id,
        p_professional_id: appointment.professional_id,
        p_amount_gross: totalAmount,
        p_fee_amount: 0,
        p_description: `Atendimento - ${appointment.service}`,
      });

      if (paymentError) {
        console.error("Payment error:", paymentError);
        // Don't throw, just warn - the checkout still succeeds
        toast.warning("Comanda fechada, mas houve um erro ao registrar no caixa. Verifique se há um caixa aberto.");
      } else {
        toast.success("Comanda fechada e enviada para o caixa!");
      }

      // Update product stock for products sold
      for (const item of orderItems) {
        if (item.item_type === "product" && item.product_id) {
          // Get current stock and decrement
          const { data: product } = await supabase
            .from("products")
            .select("stock_quantity")
            .eq("id", item.product_id)
            .single();
          
          if (product) {
            const newStock = Math.max(0, (product.stock_quantity || 0) - item.quantity);
            await supabase
              .from("products")
              .update({ stock_quantity: newStock })
              .eq("id", item.product_id);
          }
        }
      }

      setShowCheckoutDialog(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erro ao fechar comanda");
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

    const status = appointment.status;

    return (
      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
        {status === "pending" && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange("confirmed")}
              disabled={isLoading}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Confirmar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => handleStatusChange("cancelled")}
              disabled={isLoading}
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              No-Show
            </Button>
          </>
        )}
        {status === "confirmed" && (
          <>
            <Button
              type="button"
              size="sm"
              onClick={() => handleStatusChange("present")}
              disabled={isLoading}
              className="gap-2 bg-amber-500 hover:bg-amber-600 text-black"
            >
              <UserCheck className="h-4 w-4" />
              Check-in
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => handleStatusChange("cancelled")}
              disabled={isLoading}
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              No-Show
            </Button>
          </>
        )}
        {status === "present" && (
          <Button
            type="button"
            size="sm"
            onClick={() => handleStatusChange("in_progress")}
            disabled={isLoading}
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            Iniciar Atendimento
          </Button>
        )}
        {(status === "present" || status === "in_progress") && (
          <Button
            type="button"
            size="sm"
            onClick={() => setShowCheckoutDialog(true)}
            disabled={isLoading}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <Receipt className="h-4 w-4" />
            Fechar Comanda
          </Button>
        )}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>{isEditing ? "Detalhes do Agendamento" : "Novo Agendamento"}</DialogTitle>
                <DialogDescription>
                  {isEditing
                    ? "Gerencie o agendamento e a comanda do cliente"
                    : "Preencha os dados para criar um novo agendamento"}
                </DialogDescription>
              </div>
              {isEditing && appointment && (
                <Badge variant={statusConfig[appointment.status]?.variant || "secondary"}>
                  {statusConfig[appointment.status]?.label || appointment.status}
                </Badge>
              )}
            </div>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
              {isOrderMode ? (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="form">Agendamento</TabsTrigger>
                    <TabsTrigger value="order">Comanda</TabsTrigger>
                  </TabsList>
                  <div className="flex-1 overflow-y-auto py-4">
                    <TabsContent value="form" className="m-0 h-full">
                      <AppointmentFormTab form={form} isEditing={isEditing} canEdit={canEditAppointment} />
                    </TabsContent>
                    <TabsContent value="order" className="m-0 h-full">
                      <OrderTab
                        appointmentId={appointment?.id || ""}
                        initialService={serviceDetails}
                        professionalId={appointment?.professional_id || null}
                        orderItems={orderItems}
                        onItemsChange={setOrderItems}
                      />
                    </TabsContent>
                  </div>
                </Tabs>
              ) : (
                <div className="flex-1 overflow-y-auto py-4">
                  <AppointmentFormTab form={form} isEditing={isEditing} canEdit={canEditAppointment} />
                </div>
              )}

              {renderActionButtons()}

              <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t mt-4">
                {isEditing && canDeleteAppointment && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={isLoading}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isLoading || (isEditing && !canEditAppointment)}
                  className="bg-amber-500 hover:bg-amber-600 text-black"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? "Salvar" : "Criar Agendamento"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Checkout Confirmation */}
      <AlertDialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar Comanda</AlertDialogTitle>
            <AlertDialogDescription>
              Confirma o fechamento da comanda no valor de{" "}
              <span className="font-bold text-amber-500">R$ {totalAmount.toFixed(2)}</span>?
              <br />
              O valor será enviado para o caixa e o atendimento será finalizado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCheckout}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar Fechamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
