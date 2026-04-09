import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, DollarSign, TrendingUp, TrendingDown } from "lucide-react";

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

interface CloseCashRegisterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cashRegister: CashRegister;
  totals: CashRegisterTotals;
}

export function CloseCashRegisterModal({
  open,
  onOpenChange,
  cashRegister,
  totals,
}: CloseCashRegisterModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const expectedCash =
    Number(cashRegister.opening_cash_amount) +
    Number(totals.total_income_cash) -
    Number(totals.total_expenses_cash);

  const totalIncome =
    Number(totals.total_income_cash) +
    Number(totals.total_income_pix) +
    Number(totals.total_income_card_credit) +
    Number(totals.total_income_card_debit) +
    Number(totals.total_income_other);

  const formSchema = z
    .object({
      closing_cash_counted: z
        .string()
        .min(1, "Informe o valor contado")
        .refine((val) => !isNaN(parseFloat(val.replace(",", "."))), {
          message: "Valor inválido",
        }),
      pix_received: z.string().optional(),
      card_credit_received: z.string().optional(),
      card_debit_received: z.string().optional(),
      notes_closing: z.string().optional(),
    })
    .refine(
      (data) => {
        const counted = parseFloat(data.closing_cash_counted.replace(",", "."));
        const difference = counted - expectedCash;
        // If there's a difference, notes are required
        if (Math.abs(difference) > 0.01 && (!data.notes_closing || data.notes_closing.trim() === "")) {
          return false;
        }
        return true;
      },
      {
        message: "Informe uma justificativa para a diferença no caixa",
        path: ["notes_closing"],
      }
    );

  type FormData = z.infer<typeof formSchema>;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      closing_cash_counted: expectedCash.toFixed(2).replace(".", ","),
      pix_received: Number(totals.total_income_pix).toFixed(2).replace(".", ","),
      card_credit_received: Number(totals.total_income_card_credit).toFixed(2).replace(".", ","),
      card_debit_received: Number(totals.total_income_card_debit).toFixed(2).replace(".", ","),
      notes_closing: "",
    },
  });

  const watchedCashCounted = form.watch("closing_cash_counted");
  const cashCounted = parseFloat((watchedCashCounted || "0").replace(",", ".")) || 0;
  const difference = cashCounted - expectedCash;

  const closeMutation = useMutation({
    mutationFn: async (values: FormData) => {
      const closingCash = parseFloat(values.closing_cash_counted.replace(",", "."));
      const pixReceived = parseFloat((values.pix_received || "0").replace(",", "."));
      const cardCreditReceived = parseFloat((values.card_credit_received || "0").replace(",", "."));
      const cardDebitReceived = parseFloat((values.card_debit_received || "0").replace(",", "."));
      const diff = closingCash - expectedCash;

      const closingPaymentSummary = {
        cash_counted: closingCash,
        pix_received: pixReceived,
        card_credit_received: cardCreditReceived,
        card_debit_received: cardDebitReceived,
        expected_cash: expectedCash,
        total_income: totalIncome,
        total_expenses: Number(totals.total_expenses),
      };

      // Get current data for audit
      const { data: beforeData } = await supabase
        .from("cash_registers")
        .select("*")
        .eq("id", cashRegister.id)
        .single();

      // Update cash register
      const { data: updatedRegister, error } = await supabase
        .from("cash_registers")
        .update({
          status: "closed",
          closed_at: new Date().toISOString(),
          closed_by_user_id: user?.id,
          closing_cash_counted: closingCash,
          expected_cash_amount: expectedCash,
          cash_difference: diff,
          closing_payment_summary: closingPaymentSummary,
          notes_closing: values.notes_closing || null,
        })
        .eq("id", cashRegister.id)
        .select()
        .single();

      if (error) throw error;

      // Create audit log
      await supabase.from("financial_audit_logs").insert({
        entity_type: "cash_register",
        entity_id: cashRegister.id,
        action: "close",
        user_id: user?.id,
        before_data: beforeData,
        after_data: updatedRegister,
        reason: values.notes_closing || null,
      });

      return updatedRegister;
    },
    onSuccess: () => {
      toast({
        title: "Caixa fechado",
        description: "O caixa foi fechado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["cash-registers"] });
      queryClient.invalidateQueries({ queryKey: ["open-cash-register"] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao fechar caixa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormData) => {
    closeMutation.mutate(values);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fechar Caixa</DialogTitle>
          <DialogDescription>
            Confira os valores e informe o dinheiro contado para fechar o caixa.
          </DialogDescription>
        </DialogHeader>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 py-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                Valor Inicial
              </div>
              <p className="text-lg font-bold">
                {formatCurrency(Number(cashRegister.opening_cash_amount))}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Entradas (Dinheiro)
              </div>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(Number(totals.total_income_cash))}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TrendingDown className="h-4 w-4 text-red-600" />
                Saídas (Dinheiro)
              </div>
              <p className="text-lg font-bold text-red-600">
                {formatCurrency(Number(totals.total_expenses_cash))}
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                Dinheiro Esperado
              </div>
              <p className="text-lg font-bold text-primary">
                {formatCurrency(expectedCash)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="closing_cash_counted"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dinheiro contado (R$)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0,00"
                      {...field}
                      type="text"
                      inputMode="decimal"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Show difference alert */}
            {Math.abs(difference) > 0.01 && (
              <Alert variant={difference < 0 ? "destructive" : "default"}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {difference > 0
                    ? `Sobra de ${formatCurrency(difference)} no caixa`
                    : `Falta de ${formatCurrency(Math.abs(difference))} no caixa`}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="pix_received"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pix (R$)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0,00"
                        {...field}
                        type="text"
                        inputMode="decimal"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="card_credit_received"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Crédito (R$)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0,00"
                        {...field}
                        type="text"
                        inputMode="decimal"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="card_debit_received"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Débito (R$)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0,00"
                        {...field}
                        type="text"
                        inputMode="decimal"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes_closing"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Observação{" "}
                    {Math.abs(difference) > 0.01 && (
                      <span className="text-destructive">(obrigatória)</span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações sobre o fechamento..."
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={closeMutation.isPending}>
                {closeMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Fechar Caixa
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
