import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AutomationTrigger = Database['public']['Enums']['automation_trigger'];
type AutomationAction = Database['public']['Enums']['automation_action'];
type AutomationStatus = Database['public']['Enums']['automation_status'];

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  trigger: z.string().min(1, 'Gatilho é obrigatório'),
  action: z.string().min(1, 'Ação é obrigatória'),
  status: z.enum(['active', 'inactive', 'draft']),
  campaign_id: z.string().optional(),
  template_id: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

type Automation = {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  action: string;
  status: 'active' | 'inactive' | 'draft';
  campaign_id?: string | null;
  template_id?: string | null;
};

interface AutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
  automation: Automation | null;
}

export function AutomationModal({ isOpen, onClose, automation }: AutomationModalProps) {
  const queryClient = useQueryClient();

  // Fetch campaigns
  const { data: campaigns } = useQuery({
    queryKey: ['campaigns-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name, status')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  // Fetch templates
  const { data: templates } = useQuery({
    queryKey: ['communication-templates-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communication_templates')
        .select('id, name, channel, action_type')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      trigger: '',
      action: '',
      status: 'draft',
      campaign_id: '',
      template_id: '',
    },
  });

  useEffect(() => {
    if (automation) {
      form.reset({
        name: automation.name,
        description: automation.description || '',
        trigger: automation.trigger,
        action: automation.action,
        status: automation.status,
        campaign_id: automation.campaign_id || '',
        template_id: automation.template_id || '',
      });
    } else {
      form.reset({
        name: '',
        description: '',
        trigger: '',
        action: '',
        status: 'draft',
        campaign_id: '',
        template_id: '',
      });
    }
  }, [automation, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        name: data.name,
        description: data.description || null,
        trigger: data.trigger as AutomationTrigger,
        action: data.action as AutomationAction,
        status: data.status as AutomationStatus,
        campaign_id: data.campaign_id || null,
        template_id: data.template_id || null,
      };

      if (automation) {
        const { error } = await supabase.from('automations').update(payload).eq('id', automation.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('automations').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success(automation ? 'Automação atualizada' : 'Automação criada');
      onClose();
    },
    onError: () => toast.error('Erro ao salvar automação'),
  });

  const actionValue = form.watch('action');
  const showTemplate = ['send_whatsapp', 'send_email'].includes(actionValue);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{automation ? 'Editar Automação' : 'Nova Automação'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl><Input {...field} placeholder="Nome da automação" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl><Textarea {...field} placeholder="Descrição da automação" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="trigger" render={({ field }) => (
              <FormItem>
                <FormLabel>Gatilho</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="new_client">Novo Cliente</SelectItem>
                    <SelectItem value="appointment_completed">Atendimento Concluído</SelectItem>
                    <SelectItem value="birthday">Aniversário</SelectItem>
                    <SelectItem value="inactivity">Inatividade</SelectItem>
                    <SelectItem value="points_reached">Pontos Atingidos</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="action" render={({ field }) => (
              <FormItem>
                <FormLabel>Ação</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="send_whatsapp">Enviar WhatsApp</SelectItem>
                    <SelectItem value="send_email">Enviar E-mail</SelectItem>
                    <SelectItem value="add_points">Adicionar Pontos</SelectItem>
                    <SelectItem value="create_voucher">Criar Voucher</SelectItem>
                    <SelectItem value="notify_staff">Notificar Equipe</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="campaign_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Campanha Vinculada</FormLabel>
                <Select onValueChange={(val) => field.onChange(val === "none" ? "" : val)} value={field.value || "none"}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Nenhuma (opcional)" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {campaigns?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Associar a uma campanha de marketing</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            {showTemplate && (
              <FormField control={form.control} name="template_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Template de Mensagem</FormLabel>
                  <Select onValueChange={(val) => field.onChange(val === "none" ? "" : val)} value={field.value || "none"}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione um template" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {templates
                        ?.filter((t) =>
                          (actionValue === 'send_whatsapp' && t.channel === 'whatsapp') ||
                          (actionValue === 'send_email' && t.channel === 'email')
                        )
                        .map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Template criado no módulo de Comunicação</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="active">Ativa</SelectItem>
                    <SelectItem value="inactive">Inativa</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
