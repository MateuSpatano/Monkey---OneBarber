import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissionsContext } from "@/contexts/PermissionsContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  Eye,
  Lock,
  AlertCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { OpenCashRegisterModal } from "@/components/cash-register/OpenCashRegisterModal";
import { CashRegisterDetailsModal } from "@/components/cash-register/CashRegisterDetailsModal";
import { CloseCashRegisterModal } from "@/components/cash-register/CloseCashRegisterModal";

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

export default function CashRegister() {
  const { user } = useAuth();
  const { isAdmin, canView, canCreate, canEdit } = usePermissionsContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const [openCashModalOpen, setOpenCashModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [selectedCashRegister, setSelectedCashRegister] = useState<CashRegister | null>(null);
  const [selectedTotals, setSelectedTotals] = useState<CashRegisterTotals | null>(null);

  // Check for open cash register
  const { data: openCashRegisterId } = useQuery({
    queryKey: ["open-cash-register"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_open_cash_register");
      if (error) throw error;
      return data as string | null;
    },
  });

  // Fetch all cash registers with filters
  const { data: cashRegisters, isLoading } = useQuery({
    queryKey: ["cash-registers", statusFilter, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from("cash_registers")
        .select("*")
        .order("opened_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as "open" | "closed");
      }

      if (dateFrom) {
        query = query.gte("opened_at", `${dateFrom}T00:00:00`);
      }

      if (dateTo) {
        query = query.lte("opened_at", `${dateTo}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CashRegister[];
    },
  });

  const fetchTotals = async (registerId: string): Promise<CashRegisterTotals> => {
    const { data, error } = await supabase.rpc("calculate_cash_register_totals", {
      register_id: registerId,
    });
    if (error) throw error;
    return data?.[0] || {
      total_income_cash: 0,
      total_income_pix: 0,
      total_income_card_credit: 0,
      total_income_card_debit: 0,
      total_income_other: 0,
      total_expenses: 0,
      total_expenses_cash: 0,
    };
  };

  const handleViewDetails = async (cashRegister: CashRegister) => {
    const totals = await fetchTotals(cashRegister.id);
    setSelectedCashRegister(cashRegister);
    setSelectedTotals(totals);
    setDetailsModalOpen(true);
  };

  const handleCloseCashRegister = async (cashRegister: CashRegister) => {
    const totals = await fetchTotals(cashRegister.id);
    setSelectedCashRegister(cashRegister);
    setSelectedTotals(totals);
    setCloseModalOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    if (status === "open") {
      return <Badge className="bg-green-500 hover:bg-green-600">Aberto</Badge>;
    }
    return <Badge variant="secondary">Fechado</Badge>;
  };

  const hasOpenCashRegister = !!openCashRegisterId;

  return (
    <div className="space-y-6">
      {/* Header with open cash register alert */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Caixa</h1>
          <p className="text-muted-foreground">
            Gerencie a abertura, fechamento e movimentações do caixa
          </p>
        </div>
        {(isAdmin || canCreate("financial")) && (
          <Button
            onClick={() => setOpenCashModalOpen(true)}
            disabled={hasOpenCashRegister}
          >
            <Plus className="h-4 w-4 mr-2" />
            Abrir Caixa
          </Button>
        )}
      </div>

      {/* Alert if cash register is open */}
      {hasOpenCashRegister && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-700 dark:text-green-400 font-medium">
              Existe um caixa aberto no momento. Feche-o antes de abrir um novo.
            </span>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="open">Aberto</SelectItem>
                  <SelectItem value="closed">Fechado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data inicial</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data final</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cash registers table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : cashRegisters && cashRegisters.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Abertura</TableHead>
                    <TableHead>Fechamento</TableHead>
                    <TableHead className="text-right">Valor Inicial</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashRegisters.map((register) => (
                    <TableRow key={register.id}>
                      <TableCell>{getStatusBadge(register.status)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {format(new Date(register.opened_at), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(register.opened_at), "HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {register.closed_at ? (
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {format(new Date(register.closed_at), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(register.closed_at), "HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(register.opening_cash_amount))}
                      </TableCell>
                      <TableCell className="text-right">
                        {register.cash_difference !== null ? (
                          <span
                            className={
                              Number(register.cash_difference) < 0
                                ? "text-destructive"
                                : Number(register.cash_difference) > 0
                                ? "text-green-600"
                                : ""
                            }
                          >
                            {formatCurrency(Number(register.cash_difference))}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(register)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {register.status === "open" && (isAdmin || canEdit("financial")) && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleCloseCashRegister(register)}
                            >
                              <Lock className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhum caixa encontrado</p>
              <p className="text-sm text-muted-foreground">
                Clique em "Abrir Caixa" para começar
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <OpenCashRegisterModal
        open={openCashModalOpen}
        onOpenChange={setOpenCashModalOpen}
      />

      {selectedCashRegister && selectedTotals && (
        <>
          <CashRegisterDetailsModal
            open={detailsModalOpen}
            onOpenChange={setDetailsModalOpen}
            cashRegister={selectedCashRegister}
            totals={selectedTotals}
          />

          <CloseCashRegisterModal
            open={closeModalOpen}
            onOpenChange={setCloseModalOpen}
            cashRegister={selectedCashRegister}
            totals={selectedTotals}
          />
        </>
      )}
    </div>
  );
}
