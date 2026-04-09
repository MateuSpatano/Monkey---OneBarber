import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Filter, Search, ArrowUpCircle, ArrowDownCircle, RotateCcw, Settings2, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreateExpenseModal } from "@/components/transactions/CreateExpenseModal";
import { TransactionDetailsModal } from "@/components/transactions/TransactionDetailsModal";
import { ReverseTransactionModal } from "@/components/transactions/ReverseTransactionModal";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Transaction = Database["public"]["Tables"]["financial_transactions"]["Row"] & {
  professional?: { name: string } | null;
};

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

export default function Transactions() {
  const { isAdmin, hasPermission } = usePermissions();
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionToReverse, setTransactionToReverse] = useState<Transaction | null>(null);
  
  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [originFilter, setOriginFilter] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");

  const canView = isAdmin || hasPermission("financial", "view");
  const canCreate = isAdmin || hasPermission("financial", "create");

  const { data: transactions, isLoading, refetch } = useQuery({
    queryKey: ["financial-transactions", dateFrom, dateTo, typeFilter, statusFilter, originFilter, paymentMethodFilter],
    queryFn: async () => {
      let query = supabase
        .from("financial_transactions")
        .select(`
          *,
          professional:professionals(name)
        `)
        .order("occurred_at", { ascending: false });

      if (dateFrom) {
        query = query.gte("occurred_at", `${dateFrom}T00:00:00`);
      }
      if (dateTo) {
        query = query.lte("occurred_at", `${dateTo}T23:59:59`);
      }
      if (typeFilter && typeFilter !== "all") {
        query = query.eq("type", typeFilter as "income" | "expense" | "adjustment" | "reversal");
      }
      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter as "pending" | "confirmed" | "reversed" | "cancelled");
      }
      if (originFilter && originFilter !== "all") {
        query = query.eq("origin", originFilter as "sale" | "appointment" | "manual" | "adjustment");
      }
      if (paymentMethodFilter && paymentMethodFilter !== "all") {
        query = query.eq("payment_method", paymentMethodFilter as "cash" | "pix" | "card_credit" | "card_debit" | "other");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: canView,
  });

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
  });

  const handleCreateExpense = () => {
    if (!openCashRegister) {
      toast.error("Não há caixa aberto. Abra um caixa antes de registrar despesas.");
      return;
    }
    setShowExpenseModal(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "income":
        return <ArrowUpCircle className="h-4 w-4 text-green-600" />;
      case "expense":
        return <ArrowDownCircle className="h-4 w-4 text-red-600" />;
      case "reversal":
        return <RotateCcw className="h-4 w-4 text-orange-600" />;
      default:
        return <Settings2 className="h-4 w-4 text-blue-600" />;
    }
  };

  if (!canView) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Você não tem permissão para visualizar lançamentos.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight underline decoration-primary/20 underline-offset-8">Lançamentos Financeiros</h1>
          <p className="text-muted-foreground font-medium text-sm sm:text-base">Gerencie receitas e despesas do estabelecimento</p>
        </div>
        {canCreate && (
          <Button onClick={handleCreateExpense} className="premium-button-solid h-11 px-6 shadow-xl">
            <Plus className="h-4 w-4 mr-2" />
            Registrar Despesa
          </Button>
        )}
      </div>

      {!openCashRegister && (
        <Card className="border-none bg-amber-500/10 dark:bg-amber-500/5 rounded-2xl shadow-sm overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500" />
          <CardContent className="flex items-center gap-3 p-5">
            <span className="text-amber-800 dark:text-amber-300 font-semibold text-sm">
              ⚠️ Não há caixa aberto no momento. Abra um caixa para registrar novos lançamentos financeiros.
            </span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3 px-6 pt-6">
          <CardTitle className="text-lg font-black tracking-tight uppercase text-zinc-400 flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros para Consulta
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
            <div>
              <label className="text-sm font-medium mb-1 block">Data Início</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Data Fim</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Tipo</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="adjustment">Ajuste</SelectItem>
                  <SelectItem value="reversal">Estorno</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="reversed">Estornado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Origem</label>
              <Select value={originFilter} onValueChange={setOriginFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="sale">Venda</SelectItem>
                  <SelectItem value="appointment">Atendimento</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="adjustment">Ajuste</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Pagamento</label>
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="cash">Dinheiro</SelectItem>
                  <SelectItem value="pix">Pix</SelectItem>
                  <SelectItem value="card_credit">Cartão Crédito</SelectItem>
                  <SelectItem value="card_debit">Cartão Débito</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="text-right">Valor Bruto</TableHead>
                  <TableHead className="text-right">Taxas</TableHead>
                  <TableHead className="text-right">Valor Líquido</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : transactions?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      Nenhum lançamento encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions?.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {format(new Date(transaction.occurred_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(transaction.type)}
                          <span>{typeLabels[transaction.type] || transaction.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>{originLabels[transaction.origin] || transaction.origin}</TableCell>
                      <TableCell>
                        {transaction.category ? categoryLabels[transaction.category] || transaction.category : "-"}
                      </TableCell>
                      <TableCell>{transaction.professional?.name || "-"}</TableCell>
                      <TableCell>
                        {transaction.payment_method
                          ? paymentMethodLabels[transaction.payment_method] || transaction.payment_method
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {Number(transaction.amount_gross).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        R$ {Number(transaction.fee_amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {Number(transaction.amount_net).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[transaction.status] || ""} rounded-full px-3 py-1 border-none font-bold text-[10px] uppercase tracking-wider`}>
                          {statusLabels[transaction.status] || transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedTransaction(transaction)}
                            className="h-8 w-8 rounded-xl hover:bg-zinc-100 transition-all text-zinc-500"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isAdmin && transaction.status === "confirmed" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setTransactionToReverse(transaction)}
                              title="Estornar"
                              className="h-8 w-8 rounded-xl hover:bg-red-50 transition-all text-orange-600"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CreateExpenseModal
        open={showExpenseModal}
        onOpenChange={setShowExpenseModal}
        onSuccess={() => {
          refetch();
          setShowExpenseModal(false);
        }}
      />

      <TransactionDetailsModal
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />

      <ReverseTransactionModal
        transaction={transactionToReverse}
        onClose={() => setTransactionToReverse(null)}
        onSuccess={() => {
          refetch();
          setTransactionToReverse(null);
        }}
      />
    </div>
  );
}
