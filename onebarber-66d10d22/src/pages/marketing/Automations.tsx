import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Search, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { AutomationModal } from '@/components/marketing/AutomationModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Automation = {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  action: string;
  status: 'active' | 'inactive' | 'draft';
  execution_count: number | null;
  created_at: string;
};

const triggerLabels: Record<string, string> = {
  new_client: 'Novo Cliente',
  appointment_completed: 'Atendimento Concluído',
  birthday: 'Aniversário',
  inactivity: 'Inatividade',
  points_reached: 'Pontos Atingidos',
  custom: 'Personalizado',
};

const actionLabels: Record<string, string> = {
  send_whatsapp: 'Enviar WhatsApp',
  send_sms: 'Enviar SMS',
  send_email: 'Enviar E-mail',
  add_points: 'Adicionar Pontos',
  create_voucher: 'Criar Voucher',
  notify_staff: 'Notificar Equipe',
};

const statusLabels: Record<string, string> = {
  active: 'Ativa',
  inactive: 'Inativa',
  draft: 'Rascunho',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-700',
  inactive: 'bg-muted text-muted-foreground',
  draft: 'bg-yellow-500/20 text-yellow-700',
};

export default function Automations() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const [automationToDelete, setAutomationToDelete] = useState<Automation | null>(null);
  const queryClient = useQueryClient();

  const { data: automations, isLoading } = useQuery({
    queryKey: ['automations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Automation[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('automations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Automação excluída com sucesso');
      setAutomationToDelete(null);
    },
    onError: () => {
      toast.error('Erro ao excluir automação');
    },
  });

  const filteredAutomations = automations?.filter(
    (automation) =>
      automation.name.toLowerCase().includes(search.toLowerCase()) ||
      automation.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (automation: Automation) => {
    setSelectedAutomation(automation);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAutomation(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-6 w-6" />
            Automações
          </h1>
          <p className="text-muted-foreground">
            Gerencie regras de automação de marketing
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Automação
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar automações..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : filteredAutomations?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma automação encontrada
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Gatilho</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Execuções</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAutomations?.map((automation) => (
                    <TableRow key={automation.id}>
                      <TableCell className="font-medium">
                        {automation.name}
                      </TableCell>
                      <TableCell>
                        {triggerLabels[automation.trigger] || automation.trigger}
                      </TableCell>
                      <TableCell>
                        {actionLabels[automation.action] || automation.action}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[automation.status]}>
                          {statusLabels[automation.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{automation.execution_count || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(automation)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setAutomationToDelete(automation)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AutomationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        automation={selectedAutomation}
      />

      <AlertDialog
        open={!!automationToDelete}
        onOpenChange={() => setAutomationToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a automação "{automationToDelete?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                automationToDelete && deleteMutation.mutate(automationToDelete.id)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
