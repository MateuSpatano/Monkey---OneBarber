import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";

type Transaction = Database["public"]["Tables"]["financial_transactions"]["Row"] & {
  professional?: { name: string } | null;
};

interface TransactionDetailsModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

const typeLabels: Record<string, string> = {
  income: "Receita",
  expense: "Despesa",
  adjustment: "Ajuste",
  reversal: "Estorno",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  reversed: "Estornado",
  cancelled: "Cancelado",
};

const originLabels: Record<string, string> = {
  sale: "Venda",
  appointment: "Atendimento",
  manual: "Manual",
  adjustment: "Ajuste",
};

const paymentMethodLabels: Record<string, string> = {
  cash: "Dinheiro",
  pix: "Pix",
  card_credit: "Cartão Crédito",
  card_debit: "Cartão Débito",
  other: "Outro",
};

const categoryLabels: Record<string, string> = {
  purchase: "Compra",
  maintenance: "Manutenção",
  marketing: "Marketing",
  professional_advance: "Vale Profissional",
  other: "Outros",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  reversed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

export function TransactionDetailsModal({ transaction, onClose }: TransactionDetailsModalProps) {
  const { data: auditLogs } = useQuery({
    queryKey: ["transaction-audit-logs", transaction?.id],
    queryFn: async () => {
      if (!transaction?.id) return [];
      const { data, error } = await supabase
        .from("financial_audit_logs")
        .select("*")
        .eq("entity_id", transaction.id)
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!transaction?.id,
  });

  const { data: cashRegister } = useQuery({
    queryKey: ["cash-register", transaction?.cash_register_id],
    queryFn: async () => {
      if (!transaction?.cash_register_id) return null;
      const { data, error } = await supabase
        .from("cash_registers")
        .select("*")
        .eq("id", transaction.cash_register_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!transaction?.cash_register_id,
  });

  if (!transaction) return null;

  return (
    <Dialog open={!!transaction} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Lançamento</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Tipo</p>
              <p className="font-medium">{typeLabels[transaction.type] || transaction.type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge className={statusColors[transaction.status] || ""}>
                {statusLabels[transaction.status] || transaction.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Origem</p>
              <p className="font-medium">{originLabels[transaction.origin] || transaction.origin}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data/Hora</p>
              <p className="font-medium">
                {format(new Date(transaction.occurred_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Forma de Pagamento</p>
              <p className="font-medium">
                {transaction.payment_method
                  ? paymentMethodLabels[transaction.payment_method] || transaction.payment_method
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Categoria</p>
              <p className="font-medium">
                {transaction.category
                  ? categoryLabels[transaction.category] || transaction.category
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Profissional</p>
              <p className="font-medium">{transaction.professional?.name || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Imutável</p>
              <p className="font-medium">{transaction.is_immutable ? "Sim" : "Não"}</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Valor Bruto</p>
              <p className="font-medium text-lg">R$ {Number(transaction.amount_gross).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Taxas</p>
              <p className="font-medium text-lg text-muted-foreground">
                R$ {Number(transaction.fee_amount).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor Líquido</p>
              <p className="font-medium text-lg">R$ {Number(transaction.amount_net).toFixed(2)}</p>
            </div>
          </div>

          {transaction.description && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Descrição</p>
                <p className="font-medium">{transaction.description}</p>
              </div>
            </>
          )}

          {cashRegister && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Caixa Vinculado</p>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm">
                    <span className="font-medium">Abertura:</span>{" "}
                    {format(new Date(cashRegister.opened_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Status:</span>{" "}
                    {cashRegister.status === "open" ? "Aberto" : "Fechado"}
                  </p>
                </div>
              </div>
            </>
          )}

          {auditLogs && auditLogs.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Histórico de Auditoria</p>
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="bg-muted p-3 rounded-lg text-sm">
                      <div className="flex justify-between items-start">
                        <span className="font-medium capitalize">{log.action}</span>
                        <span className="text-muted-foreground">
                          {format(new Date(log.occurred_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      {log.reason && (
                        <p className="mt-1 text-muted-foreground">Motivo: {log.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
