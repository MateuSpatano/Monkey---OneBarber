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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  category: z.string().min(1, "Selecione uma categoria"),
  payment_method: z.string().min(1, "Selecione a forma de saída"),
  amount: z
    .string()
    .min(1, "Informe o valor")
    .refine((val) => !isNaN(parseFloat(val.replace(",", "."))) && parseFloat(val.replace(",", ".")) > 0, {
      message: "Valor deve ser maior que zero",
    }),
  description: z.string().min(1, "Informe uma descrição"),
});

type FormData = z.infer<typeof formSchema>;

interface RegisterExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cashRegisterId: string;
  onSuccess?: () => void;
}

const categories = [
  { value: "purchase", label: "Compra" },
  { value: "maintenance", label: "Manutenção" },
  { value: "marketing", label: "Marketing" },
  { value: "professional_advance", label: "Vale Profissional" },
  { value: "other", label: "Outros" },
];

const paymentMethods = [
  { value: "cash", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
  { value: "other", label: "Outro" },
];

export function RegisterExpenseModal({
  open,
  onOpenChange,
  cashRegisterId,
  onSuccess,
}: RegisterExpenseModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "",
      payment_method: "cash",
      amount: "",
      description: "",
    },
  });

  const expenseMutation = useMutation({
    mutationFn: async (values: FormData) => {
      const amount = parseFloat(values.amount.replace(",", "."));

      // Check if cash register is still open
      const { data: cashRegister } = await supabase
        .from("cash_registers")
        .select("status")
        .eq("id", cashRegisterId)
        .single();

      if (cashRegister?.status !== "open") {
        throw new Error("Este caixa já foi fechado.");
      }

      // Create movement
      const { data: movement, error } = await supabase
        .from("cash_register_movements")
        .insert({
          cash_register_id: cashRegisterId,
          type: "expense",
          origin: "manual",
          category: values.category as any,
          payment_method: values.payment_method as any,
          amount,
          description: values.description,
          created_by_user_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create audit log
      await supabase.from("financial_audit_logs").insert({
        entity_type: "cash_movement",
        entity_id: movement.id,
        action: "create",
        user_id: user?.id,
        after_data: movement,
      });

      return movement;
    },
    onSuccess: () => {
      toast({
        title: "Saída registrada",
        description: "A saída foi registrada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["cash-register-movements"] });
      queryClient.invalidateQueries({ queryKey: ["cash-registers"] });
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao registrar saída",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormData) => {
    expenseMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Saída</DialogTitle>
          <DialogDescription>
            Registre uma saída de dinheiro do caixa.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Forma de saída</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a forma" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor (R$)</FormLabel>
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o motivo da saída..."
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
              <Button type="submit" disabled={expenseMutation.isPending}>
                {expenseMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Registrar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
