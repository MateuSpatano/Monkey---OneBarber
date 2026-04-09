import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Loader2,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCcw,
} from "lucide-react";
import { usePermissionsContext } from "@/contexts/PermissionsContext";
import { RegisterExpenseModal } from "./RegisterExpenseModal";

interface CashRegister {
  id: string;
  status: "open" | "closed";
  opened_at: string;
  opened_by_user_id: string;
  opening_cash_amount: number;
  notes_opening: string | null;
  closed_at: string | null;
  closed_by_user_id: string | null;
  closing_cash_counted: number | null;
  expected_cash_amount: number | null;
  cash_difference: number | null;
  closing_payment_summary: any;
  notes_closing: string | null;
}

interface CashRegisterTotals {
  total_income_cash: number;
  total_income_pix: number;
  total_income_card_credit: number;
  total_income_card_debit: number;
  total_income_other: number;
  total_expenses: number;
  total_expenses_cash: number;
}

interface Movement {
  id: string;
  type: string;
  origin: string;
  payment_method: string | null;
  category: string | null;
  amount: number;
  occurred_at: string;
  created_by_user_id: string | null;
  description: string | null;
}

interface CashRegisterDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cashRegister: CashRegister;
  totals: CashRegisterTotals;
}

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

const originLabels: Record<string, string> = {
  sale: "Venda",
  appointment: "Atendimento",
  manual: "Manual",
  adjustment: "Ajuste",
};

const typeLabels: Record<string, string> = {
  income: "Entrada",
  expense: "Saída",
  adjustment: "Ajuste",
  reversal: "Estorno",
};

export function CashRegisterDetailsModal({
  open,
  onOpenChange,
  cashRegister,
  totals,
}: CashRegisterDetailsModalProps) {
  const { isAdmin, canCreate } = usePermissionsContext();
  const queryClient = useQueryClient();
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);

  const { data: movements, isLoading: loadingMovements } = useQuery({
    queryKey: ["cash-register-movements", cashRegister.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_register_movements")
        .select("*")
        .eq("cash_register_id", cashRegister.id)
        .order("occurred_at", { ascending: false });

      if (error) throw error;
      return data as Movement[];
    },
    enabled: open,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const totalIncome =
    Number(totals.total_income_cash) +
    Number(totals.total_income_pix) +
    Number(totals.total_income_card_credit) +
    Number(totals.total_income_card_debit) +
    Number(totals.total_income_other);

  const expectedCash =
    Number(cashRegister.opening_cash_amount) +
    Number(totals.total_income_cash) -
    Number(totals.total_expenses_cash);

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "income":
        return <ArrowUpCircle className="h-4 w-4 text-green-600" />;
      case "expense":
        return <ArrowDownCircle className="h-4 w-4 text-red-600" />;
      case "adjustment":
        return <RefreshCcw className="h-4 w-4 text-blue-600" />;
      case "reversal":
        return <RefreshCcw className="h-4 w-4 text-orange-600" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const handleExpenseAdded = () => {
    queryClient.invalidateQueries({ queryKey: ["cash-register-movements", cashRegister.id] });
    queryClient.invalidateQueries({ queryKey: ["cash-registers"] });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col rounded-[32px] border-none shadow-2xl p-6 sm:p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="flex items-center gap-3 text-2xl font-black tracking-tight">
              Detalhes do Caixa
              <Badge
                className={
                  cashRegister.status === "open"
                    ? "bg-green-500/15 text-green-700 hover:bg-green-500/20 border-none px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                    : "bg-zinc-100 text-zinc-500 border-none px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                }
              >
                {cashRegister.status === "open" ? "Caixa Aberto" : "Caixa Fechado"}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="premium-card rounded-2xl border-none shadow-sm bg-zinc-50/50">
                  <CardContent className="pt-5 p-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/70 mb-1">
                      <DollarSign className="h-3 w-3" />
                      Valor Inicial
                    </div>
                    <p className="text-xl font-black text-zinc-900">
                      {formatCurrency(Number(cashRegister.opening_cash_amount))}
                    </p>
                  </CardContent>
                </Card>

                <Card className="premium-card rounded-2xl border-none shadow-sm bg-green-50/50">
                  <CardContent className="pt-5 p-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-green-600/70 mb-1">
                      <TrendingUp className="h-3 w-3" />
                      Total Entradas
                    </div>
                    <p className="text-xl font-black text-green-600">
                      {formatCurrency(totalIncome)}
                    </p>
                  </CardContent>
                </Card>

                <Card className="premium-card rounded-2xl border-none shadow-sm bg-red-50/50">
                  <CardContent className="pt-5 p-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-600/70 mb-1">
                      <TrendingDown className="h-3 w-3" />
                      Total Saídas
                    </div>
                    <p className="text-xl font-black text-red-600">
                      {formatCurrency(Number(totals.total_expenses))}
                    </p>
                  </CardContent>
                </Card>

                <Card className="premium-card rounded-2xl border-none shadow-sm bg-blue-50/50">
                  <CardContent className="pt-5 p-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600/70 mb-1">
                      <DollarSign className="h-3 w-3" />
                      Dinheiro Esperado
                    </div>
                    <p className="text-xl font-black text-blue-600">{formatCurrency(expectedCash)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Breakdown by payment method */}
              <Card className="premium-card rounded-2xl border-none shadow-md overflow-hidden bg-white">
                <CardHeader className="py-4 px-6 bg-zinc-50 border-b border-zinc-100">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">Entradas por Forma de Pagamento</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-sm">
                    <div>
                      <span className="text-xs font-bold text-zinc-400 uppercase">Dinheiro</span>
                      <p className="text-base font-black text-zinc-900 mt-1">
                        {formatCurrency(Number(totals.total_income_cash))}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-400 uppercase">Pix</span>
                      <p className="text-base font-black text-zinc-900 mt-1">
                        {formatCurrency(Number(totals.total_income_pix))}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-400 uppercase">Cartão Crédito</span>
                      <p className="text-base font-black text-zinc-900 mt-1">
                        {formatCurrency(Number(totals.total_income_card_credit))}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-400 uppercase">Cartão Débito</span>
                      <p className="text-base font-black text-zinc-900 mt-1">
                        {formatCurrency(Number(totals.total_income_card_debit))}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-400 uppercase">Outros</span>
                      <p className="text-base font-black text-zinc-900 mt-1">
                        {formatCurrency(Number(totals.total_income_other))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Info about opening and closing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">Abertura</CardTitle>
                  </CardHeader>
                  <CardContent className="py-0 pb-4 space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Data/Hora:</span>{" "}
                      {format(new Date(cashRegister.opened_at), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </div>
                    {cashRegister.notes_opening && (
                      <div>
                        <span className="text-muted-foreground">Observação:</span>{" "}
                        {cashRegister.notes_opening}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {cashRegister.status === "closed" && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-base">Fechamento</CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 pb-4 space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Data/Hora:</span>{" "}
                        {cashRegister.closed_at &&
                          format(new Date(cashRegister.closed_at), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Dinheiro Contado:</span>{" "}
                        {formatCurrency(Number(cashRegister.closing_cash_counted))}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Diferença:</span>{" "}
                        <span
                          className={
                            Number(cashRegister.cash_difference) < 0
                              ? "text-destructive"
                              : Number(cashRegister.cash_difference) > 0
                              ? "text-green-600"
                              : ""
                          }
                        >
                          {formatCurrency(Number(cashRegister.cash_difference))}
                        </span>
                      </div>
                      {cashRegister.notes_closing && (
                        <div>
                          <span className="text-muted-foreground">Observação:</span>{" "}
                          {cashRegister.notes_closing}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Actions for open cash register */}
              {cashRegister.status === "open" && (isAdmin || canCreate("financial")) && (
                <div className="flex gap-2">
                  <Button onClick={() => setExpenseModalOpen(true)} className="premium-button-ghost bg-zinc-900 text-white hover:bg-zinc-800 transition-all border-none h-11 px-6 shadow-xl">
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Saída (Sangria)
                  </Button>
                </div>
              )}

              <Separator />

              {/* Movements table */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Movimentações</h3>
                {loadingMovements ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : movements && movements.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Origem</TableHead>
                          <TableHead>Forma/Categoria</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Data/Hora</TableHead>
                          <TableHead>Descrição</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movements.map((movement) => (
                          <TableRow key={movement.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getMovementIcon(movement.type)}
                                <span>{typeLabels[movement.type] || movement.type}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {originLabels[movement.origin] || movement.origin}
                            </TableCell>
                            <TableCell>
                              {movement.type === "income" && movement.payment_method
                                ? paymentMethodLabels[movement.payment_method] ||
                                  movement.payment_method
                                : movement.category
                                ? categoryLabels[movement.category] || movement.category
                                : "-"}
                            </TableCell>
                            <TableCell
                              className={`text-right font-medium ${
                                movement.type === "income"
                                  ? "text-green-600"
                                  : movement.type === "expense"
                                  ? "text-red-600"
                                  : ""
                              }`}
                            >
                              {movement.type === "expense" ? "-" : ""}
                              {formatCurrency(Number(movement.amount))}
                            </TableCell>
                            <TableCell>
                              {format(new Date(movement.occurred_at), "dd/MM HH:mm", {
                                locale: ptBR,
                              })}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {movement.description || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma movimentação registrada
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <RegisterExpenseModal
        open={expenseModalOpen}
        onOpenChange={setExpenseModalOpen}
        cashRegisterId={cashRegister.id}
        onSuccess={handleExpenseAdded}
      />
    </>
  );
}
