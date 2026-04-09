import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";

type Transaction = Database["public"]["Tables"]["financial_transactions"]["Row"];

interface ReverseTransactionModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onSuccess: () => void;
}

const typeLabels: Record<string, string> = {
  income: "Receita",
  expense: "Despesa",
  adjustment: "Ajuste",
  reversal: "Estorno",
};

export function ReverseTransactionModal({ transaction, onClose, onSuccess }: ReverseTransactionModalProps) {
  const [reason, setReason] = useState("");

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
    enabled: !!transaction,
  });

  const reverseMutation = useMutation({
    mutationFn: async () => {
      if (!transaction) throw new Error("Lançamento não encontrado");
      if (!reason.trim()) throw new Error("Motivo é obrigatório");

      const { data, error } = await supabase.rpc("reverse_transaction", {
        p_transaction_id: transaction.id,
        p_reason: reason,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Lançamento estornado com sucesso!");
      setReason("");
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao estornar lançamento");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      toast.error("Informe o motivo do estorno");
      return;
    }

    reverseMutation.mutate();
  };

  if (!transaction) return null;

  return (
    <Dialog open={!!transaction} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md rounded-[32px] border-none shadow-2xl p-6 sm:p-8">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl font-black tracking-tight">Estornar Lançamento</DialogTitle>
          <DialogDescription className="text-zinc-500 font-medium">
            Esta ação irá criar um lançamento de estorno para neutralizar o lançamento original.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert variant="destructive" className="rounded-xl border-none bg-red-50 text-red-700">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="font-bold">
              Você está prestes a estornar um lançamento de{" "}
              <span className="text-red-900">{typeLabels[transaction.type]}</span> no valor de{" "}
              <span className="text-red-900 text-lg">R$ {Number(transaction.amount_gross).toFixed(2)}</span>.
            </AlertDescription>
          </Alert>

          {!openCashRegister && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Não há caixa aberto. Abra um caixa antes de realizar o estorno.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo do Estorno *</Label>
            <Textarea
              id="reason"
              placeholder="Descreva o motivo do estorno..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
            />
          </div>

          <DialogFooter className="gap-3 pt-6 border-t border-zinc-100 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="premium-button-ghost h-11 px-6 border-none"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={reverseMutation.isPending || !openCashRegister}
              className="premium-button-solid h-11 px-8 shadow-xl bg-red-600 hover:bg-red-700"
            >
              {reverseMutation.isPending ? "Estornando..." : "Confirmar Estorno"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
