import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface CreateExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateExpenseModal({ open, onOpenChange, onSuccess }: CreateExpenseModalProps) {
  const { user } = useAuth();
  const [category, setCategory] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const { data: openCashRegister } = useQuery({
    queryKey: ["open-cash-register"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_registers")
        .select("id")
        .eq("status", "open")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const createExpenseMutation = useMutation({
    mutationFn: async () => {
      if (!openCashRegister?.id) {
        throw new Error("Não há caixa aberto");
      }

      const amountValue = parseFloat(amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        throw new Error("Valor inválido");
      }

      // Create cash register movement
      const { data: movement, error: movementError } = await supabase
        .from("cash_register_movements")
        .insert({
          cash_register_id: openCashRegister.id,
          type: "expense" as const,
          origin: "manual" as const,
          category: category as "purchase" | "maintenance" | "marketing" | "professional_advance" | "other",
          payment_method: paymentMethod as "cash" | "pix" | "card_credit" | "card_debit" | "other",
          amount: amountValue,
          description,
          created_by_user_id: user?.id,
          is_immutable: false,
        })
        .select()
        .single();

      if (movementError) throw movementError;

      // Create financial transaction
      const { error: transactionError } = await supabase
        .from("financial_transactions")
        .insert({
          type: "expense" as const,
          status: "confirmed" as const,
          origin: "manual" as const,
          category: category as "purchase" | "maintenance" | "marketing" | "professional_advance" | "other",
          payment_method: paymentMethod as "cash" | "pix" | "card_credit" | "card_debit" | "other",
          amount_gross: amountValue,
          fee_amount: 0,
          description,
          cash_register_id: openCashRegister.id,
          cash_movement_id: movement.id,
          is_immutable: false,
        });

      if (transactionError) throw transactionError;

      // Create audit log
      await supabase.from("financial_audit_logs").insert({
        entity_type: "financial_transaction",
        entity_id: movement.id,
        action: "create",
        user_id: user?.id || "",
        after_data: {
          type: "expense",
          origin: "manual",
          amount: amountValue,
          category,
          payment_method: paymentMethod,
        },
      });

      return movement;
    },
    onSuccess: () => {
      toast.success("Despesa registrada com sucesso!");
      resetForm();
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao registrar despesa");
    },
  });

  const resetForm = () => {
    setCategory("");
    setPaymentMethod("cash");
    setAmount("");
    setDescription("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!category) {
      toast.error("Selecione uma categoria");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    if (!description.trim()) {
      toast.error("Informe uma descrição");
      return;
    }

    createExpenseMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-[32px] border-none shadow-2xl p-6 sm:p-8">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl font-black tracking-tight">Registrar Despesa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Categoria *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-zinc-200">
                <SelectItem value="purchase">Compra</SelectItem>
                <SelectItem value="maintenance">Manutenção</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="professional_advance">Vale Profissional</SelectItem>
                <SelectItem value="other">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_method">Forma de Pagamento *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-zinc-200">
                <SelectItem value="cash">Dinheiro</SelectItem>
                <SelectItem value="pix">Pix</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-11 rounded-xl border-zinc-200 focus:border-zinc-400 focus:ring-zinc-400"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              placeholder="Descreva a despesa..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter className="gap-3 pt-6 border-t border-zinc-100 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="premium-button-ghost h-11 px-6 border-none"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createExpenseMutation.isPending}
              className="premium-button-solid h-11 px-8 shadow-xl"
            >
              {createExpenseMutation.isPending ? "Salvando..." : "Registrar Despesa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
