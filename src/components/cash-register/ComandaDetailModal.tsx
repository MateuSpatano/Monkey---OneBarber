import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Receipt, CreditCard } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { OrderTab } from "@/components/agenda/OrderTab";

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

interface OpenOrder {
  id: string;
  client_id: string | null;
  professional_id: string | null;
  service: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  total_amount: number | null;
  checked_in_at: string | null;
  clients: { name: string } | null;
  professionals: { name: string } | null;
}

interface ComandaDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: OpenOrder | null;
}

export function ComandaDetailModal({ open, onOpenChange, appointment }: ComandaDetailModalProps) {
  const queryClient = useQueryClient();
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");

  // Fetch service details
  const { data: serviceDetails } = useQuery({
    queryKey: ["service-details-comanda", appointment?.service],
    queryFn: async () => {
      if (!appointment?.service) return null;
      const { data } = await supabase
        .from("products")
        .select("id, name, price")
        .eq("name", appointment.service)
        .eq("type", "service")
        .maybeSingle();
      return data;
    },
    enabled: !!appointment?.service && open,
  });

  // Fetch existing order items
  const { data: existingOrderItems = [] } = useQuery({
    queryKey: ["order-items-comanda", appointment?.id],
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
    enabled: !!appointment?.id && open,
  });

  // Sync order items correctly
  useEffect(() => {
    if (existingOrderItems.length > 0) {
      setOrderItems(existingOrderItems);
    }
  }, [existingOrderItems]);

  const totalAmount = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
  }, [orderItems]);

  const handleSaveItems = async () => {
    if (!appointment) return;
    setIsLoading(true);
    try {
      // Delete existing items and re-insert
      await (supabase as any).from("order_items").delete().eq("appointment_id", appointment.id);
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
        const { error } = await (supabase as any).from("order_items").insert(itemsToInsert);
        if (error) throw error;
      }
      // Update total_amount on appointment
      await (supabase as any).from("appointments").update({ total_amount: totalAmount }).eq("id", appointment.id);
      toast.success("Comanda atualizada!");
      queryClient.invalidateQueries({ queryKey: ["open-orders"] });
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar comanda");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!appointment) return;
    if (!paymentMethod) {
      toast.error("Selecione uma forma de pagamento");
      return;
    }
    setIsLoading(true);
    try {
      // Save order items first
      await (supabase as any).from("order_items").delete().eq("appointment_id", appointment.id);
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

      // Update appointment status
      const { error: aptError } = await (supabase as any).from("appointments").update({
        status: "completed",
        total_amount: totalAmount,
        checkout_at: new Date().toISOString(),
      }).eq("id", appointment.id);
      if (aptError) throw aptError;

      // Create financial transaction
      const { error: paymentError } = await supabase.rpc("confirm_payment", {
        p_type: "income",
        p_origin: "appointment",
        p_reference_type: "appointment",
        p_reference_id: appointment.id,
        p_professional_id: appointment.professional_id,
        p_payment_method: paymentMethod as any,
        p_amount_gross: totalAmount,
        p_fee_amount: 0,
        p_description: `Atendimento - ${appointment.service}`,
      });

      if (paymentError) {
        toast.warning("Comanda fechada, mas houve um erro ao registrar no caixa. Verifique se há um caixa aberto.");
      } else {
        toast.success("Comanda fechada e registrada no caixa!");
      }

      // Update product stock and raw materials
      for (const item of orderItems) {
        if (item.item_type === "product" && item.product_id) {
          const { data: product } = await supabase.from("products").select("stock_quantity").eq("id", item.product_id).single();
          if (product) {
            const newStock = Math.max(0, (product.stock_quantity || 0) - item.quantity);
            await supabase.from("products").update({ stock_quantity: newStock }).eq("id", item.product_id);
          }
        } else if (item.item_type === "service" && item.product_id) {
          // Deduct raw materials for services
          const { data: materials } = await supabase
            .from("product_raw_materials")
            .select("product_id, quantity")
            .eq("service_id", item.product_id);
          
          if (materials && materials.length > 0) {
            for (const mat of materials) {
              const { data: p } = await supabase.from("products").select("stock_quantity").eq("id", mat.product_id).single();
              if (p) {
                const totalDeduction = mat.quantity * item.quantity;
                const newStock = Math.max(0, (p.stock_quantity || 0) - totalDeduction);
                await supabase.from("products").update({ stock_quantity: newStock }).eq("id", mat.product_id);
              }
            }
          }
        }
      }

      setShowCheckoutDialog(false);
      queryClient.invalidateQueries({ queryKey: ["open-orders"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["cash-registers"] });
      queryClient.invalidateQueries({ queryKey: ["open-cash-register-totals"] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao fechar comanda");
    } finally {
      setIsLoading(false);
    }
  };

  if (!appointment) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Comanda
              </DialogTitle>
              <Badge variant="default">{appointment.clients?.name || "Sem cliente"}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {appointment.professionals?.name} • {appointment.service}
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <OrderTab
              appointmentId={appointment.id}
              initialService={serviceDetails}
              professionalId={appointment.professional_id}
              orderItems={orderItems}
              onItemsChange={setOrderItems}
            />
          </div>

          <DialogFooter className="gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleSaveItems} disabled={isLoading}>
              Salvar Itens
            </Button>
            <Button onClick={() => setShowCheckoutDialog(true)} disabled={isLoading || orderItems.length === 0}
              className="gap-2 bg-green-600 hover:bg-green-700">
              <CreditCard className="h-4 w-4" />
              Fechar Comanda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar Comanda</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Total: <span className="font-bold text-primary">R$ {totalAmount.toFixed(2)}</span>
                </p>
                <div className="space-y-2">
                  <Label className="text-foreground">Forma de Pagamento *</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="card_credit">Cartão de Crédito</SelectItem>
                      <SelectItem value="card_debit">Cartão de Débito</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCheckout} className="bg-green-600 hover:bg-green-700" disabled={!paymentMethod}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar Fechamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
