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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Estornar Lançamento</DialogTitle>
          <DialogDescription>
            Esta ação irá criar um lançamento de estorno para neutralizar o lançamento original.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Você está prestes a estornar um lançamento de{" "}
              <strong>{typeLabels[transaction.type]}</strong> no valor de{" "}
              <strong>R$ {Number(transaction.amount_gross).toFixed(2)}</strong> do dia{" "}
              <strong>
                {format(new Date(transaction.occurred_at), "dd/MM/yyyy", { locale: ptBR })}
              </strong>.
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={reverseMutation.isPending || !openCashRegister}
            >
              {reverseMutation.isPending ? "Estornando..." : "Confirmar Estorno"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
