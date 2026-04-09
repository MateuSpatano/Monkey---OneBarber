import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  opening_cash_amount: z
    .string()
    .min(1, "Informe o valor inicial")
    .refine((val) => !isNaN(parseFloat(val.replace(",", "."))), {
      message: "Valor inválido",
    }),
  notes_opening: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface OpenCashRegisterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OpenCashRegisterModal({
  open,
  onOpenChange,
}: OpenCashRegisterModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      opening_cash_amount: "0",
      notes_opening: "",
    },
  });

  const openMutation = useMutation({
    mutationFn: async (values: FormData) => {
      const amount = parseFloat(values.opening_cash_amount.replace(",", "."));

      // Check if there's already an open cash register
      const { data: existingOpen } = await supabase.rpc("get_open_cash_register");
      if (existingOpen) {
        throw new Error("Já existe um caixa aberto. Feche-o antes de abrir um novo.");
      }

      // Create cash register
      const { data: cashRegister, error: insertError } = await supabase
        .from("cash_registers")
        .insert({
          opened_by_user_id: user?.id,
          opening_cash_amount: amount,
          notes_opening: values.notes_opening || null,
          status: "open",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Create audit log
      await supabase.from("financial_audit_logs").insert({
        entity_type: "cash_register",
        entity_id: cashRegister.id,
        action: "create",
        user_id: user?.id,
        after_data: cashRegister,
      });

      return cashRegister;
    },
    onSuccess: () => {
      toast({
        title: "Caixa aberto",
        description: "O caixa foi aberto com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["cash-registers"] });
      queryClient.invalidateQueries({ queryKey: ["open-cash-register"] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao abrir caixa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormData) => {
    openMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Abrir Caixa</DialogTitle>
          <DialogDescription>
            Informe o valor inicial em dinheiro para abrir o caixa.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="opening_cash_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor inicial em dinheiro (R$)</FormLabel>
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

            <FormField
              control={form.control}
              name="notes_opening"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observação (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações sobre a abertura do caixa..."
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
              <Button type="submit" disabled={openMutation.isPending}>
                {openMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Abrir Caixa
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
