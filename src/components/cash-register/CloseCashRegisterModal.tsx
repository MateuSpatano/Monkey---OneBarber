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
import { Loader2, AlertTriangle, DollarSign, TrendingUp, TrendingDown, Lock } from "lucide-react";

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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-[32px] border-none shadow-2xl p-6 sm:p-8">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl font-black tracking-tight">Fechar Caixa</DialogTitle>
          <DialogDescription className="text-zinc-500 font-medium">
            Confira os valores e informe o dinheiro contado para fechar o caixa.
          </DialogDescription>
        </DialogHeader>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 py-4">
          <Card className="premium-card rounded-xl border-none shadow-sm bg-zinc-50/50">
            <CardContent className="pt-5 p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-1">
                <DollarSign className="h-3 w-3" />
                Valor Inicial
              </div>
              <p className="text-lg font-black text-zinc-900">
                {formatCurrency(Number(cashRegister.opening_cash_amount))}
              </p>
            </CardContent>
          </Card>

          <Card className="premium-card rounded-xl border-none shadow-sm bg-green-50/50">
            <CardContent className="pt-5 p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-green-600/70 mb-1">
                <TrendingUp className="h-3 w-3" />
                Entradas (Dinheiro)
              </div>
              <p className="text-lg font-black text-green-600">
                {formatCurrency(Number(totals.total_income_cash))}
              </p>
            </CardContent>
          </Card>

          <Card className="premium-card rounded-xl border-none shadow-sm bg-red-50/50">
            <CardContent className="pt-5 p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-red-600/70 mb-1">
                <TrendingDown className="h-3 w-3" />
                Saídas (Dinheiro)
              </div>
              <p className="text-lg font-black text-red-600">
                {formatCurrency(Number(totals.total_expenses_cash))}
              </p>
            </CardContent>
          </Card>

          <Card className="premium-card rounded-xl border-none shadow-md bg-zinc-900 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-2 opacity-10">
              <Lock className="h-10 w-10 text-white" />
            </div>
            <CardContent className="pt-5 p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                <DollarSign className="h-3 w-3" />
                Dinheiro Esperado
              </div>
              <p className="text-xl font-black text-white">
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
                  <FormLabel className="font-bold text-zinc-600">Dinheiro contado em mãos (R$)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0,00"
                      {...field}
                      type="text"
                      inputMode="decimal"
                      className="h-12 rounded-xl border-zinc-200 focus:border-zinc-400 focus:ring-zinc-400 text-lg font-bold"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Show difference alert */}
            {Math.abs(difference) > 0.01 && (
              <Alert variant={difference < 0 ? "destructive" : "default"} className="rounded-xl border-none bg-red-50 text-red-700">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="font-bold">
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

            <DialogFooter className="gap-3 pt-6 border-t border-zinc-100 mt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="premium-button-ghost h-11 px-6 border-none"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={closeMutation.isPending} className="premium-button-solid h-11 px-8 shadow-xl">
                {closeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Encerrar Caixa Agora
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
