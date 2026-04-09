import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, MessageSquare, Mail, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Template = {
  id: string;
  name: string;
  channel: string;
  action_type: string;
  subject: string | null;
  body: string;
  is_active: boolean;
  created_at: string;
};

const actionTypeLabels: Record<string, string> = {
  new_client: 'Novo Cliente',
  appointment_completed: 'Atendimento Concluído',
  birthday: 'Aniversário',
  inactivity: 'Inatividade',
  points_reached: 'Pontos Atingidos',
  custom: 'Personalizado',
  appointment_reminder: 'Lembrete de Agendamento',
  welcome: 'Boas-vindas',
};

interface CommunicationsProps {
  filterType?: 'whatsapp' | 'sms' | 'email';
}

export default function Communications({ filterType }: CommunicationsProps) {
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>(filterType || 'all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const queryClient = useQueryClient();

  // Form state
  const [formName, setFormName] = useState('');
  const [formChannel, setFormChannel] = useState<string>('whatsapp');
  const [formActionType, setFormActionType] = useState<string>('custom');
  const [formSubject, setFormSubject] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formActive, setFormActive] = useState(true);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['communication-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communication_templates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Template[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: formName,
        channel: formChannel,
        action_type: formActionType,
        subject: formChannel === 'email' ? formSubject : null,
        body: formBody,
        is_active: formActive,
      };

      if (selectedTemplate) {
        const { error } = await supabase
          .from('communication_templates')
          .update(payload)
          .eq('id', selectedTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('communication_templates')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-templates'] });
      toast.success(selectedTemplate ? 'Template atualizado' : 'Template criado');
      closeModal();
    },
    onError: () => toast.error('Erro ao salvar template'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('communication_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-templates'] });
      toast.success('Template excluído');
      setTemplateToDelete(null);
    },
    onError: () => toast.error('Erro ao excluir template'),
  });

  const openNew = () => {
    setSelectedTemplate(null);
    setFormName('');
    setFormChannel(filterType === 'email' ? 'email' : 'whatsapp');
    setFormActionType('custom');
    setFormSubject('');
    setFormBody('');
    setFormActive(true);
    setIsModalOpen(true);
  };

  const openEdit = (t: Template) => {
    setSelectedTemplate(t);
    setFormName(t.name);
    setFormChannel(t.channel);
    setFormActionType(t.action_type);
    setFormSubject(t.subject || '');
    setFormBody(t.body);
    setFormActive(t.is_active);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTemplate(null);
  };

  const filteredTemplates = templates?.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.body.toLowerCase().includes(search.toLowerCase());
    const matchesChannel = channelFilter === 'all' || t.channel === channelFilter;
    return matchesSearch && matchesChannel;
  });

  const getChannelIcon = (channel: string) => {
    return channel === 'email'
      ? <Mail className="h-4 w-4" />
      : <MessageSquare className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Comunicação — Templates
          </h1>
          <p className="text-muted-foreground">
            Crie modelos de mensagens para WhatsApp e E-mail conectados às automações
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredTemplates?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum template encontrado. Crie o primeiro!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Tipo de Ação</TableHead>
                    <TableHead>Prévia</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates?.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {getChannelIcon(t.channel)}
                          {t.channel === 'whatsapp' ? 'WhatsApp' : 'E-mail'}
                        </div>
                      </TableCell>
                      <TableCell>{actionTypeLabels[t.action_type] || t.action_type}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground text-sm">
                        {t.body.substring(0, 60)}...
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.is_active ? 'default' : 'secondary'}>
                          {t.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setTemplateToDelete(t)}>
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

      {/* Template Modal */}
      <Dialog open={isModalOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate ? 'Editar Template' : 'Novo Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome do Template</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Boas-vindas WhatsApp" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Canal</Label>
                <Select value={formChannel} onValueChange={setFormChannel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Ação</Label>
                <Select value={formActionType} onValueChange={setFormActionType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Personalizado</SelectItem>
                    <SelectItem value="new_client">Novo Cliente</SelectItem>
                    <SelectItem value="appointment_completed">Atendimento Concluído</SelectItem>
                    <SelectItem value="birthday">Aniversário</SelectItem>
                    <SelectItem value="inactivity">Inatividade</SelectItem>
                    <SelectItem value="points_reached">Pontos Atingidos</SelectItem>
                    <SelectItem value="appointment_reminder">Lembrete de Agendamento</SelectItem>
                    <SelectItem value="welcome">Boas-vindas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formChannel === 'email' && (
              <div className="space-y-2">
                <Label>Assunto do E-mail</Label>
                <Input value={formSubject} onChange={(e) => setFormSubject(e.target.value)} placeholder="Assunto..." />
              </div>
            )}

            <div className="space-y-2">
              <Label>Corpo da Mensagem</Label>
              <Textarea
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                placeholder="Digite o corpo da mensagem..."
                rows={8}
              />
              <p className="text-xs text-muted-foreground">
                Variáveis disponíveis: {'{{nome}}'}, {'{{telefone}}'}, {'{{data}}'}, {'{{servico}}'}, {'{{barbearia}}'}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Template Ativo</Label>
                <p className="text-xs text-muted-foreground">Templates inativos não serão usados pelas automações</p>
              </div>
              <Switch checked={formActive} onCheckedChange={setFormActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !formName || !formBody}>
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o template "{templateToDelete?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => templateToDelete && deleteMutation.mutate(templateToDelete.id)}
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
