import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, MessageSquare, Mail, Phone, Plus, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Communication = {
  id: string;
  client_id: string | null;
  type: 'whatsapp' | 'sms' | 'email';
  subject: string | null;
  content: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  sent_at: string | null;
  created_at: string;
  clients?: { name: string } | null;
};

const typeLabels: Record<string, string> = {
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  email: 'E-mail',
};

const typeIcons: Record<string, React.ReactNode> = {
  whatsapp: <MessageSquare className="h-4 w-4" />,
  sms: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
};

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  sent: 'Enviado',
  delivered: 'Entregue',
  failed: 'Falhou',
  read: 'Lido',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-700',
  sent: 'bg-blue-500/20 text-blue-700',
  delivered: 'bg-green-500/20 text-green-700',
  failed: 'bg-red-500/20 text-red-700',
  read: 'bg-purple-500/20 text-purple-700',
};

interface CommunicationsProps {
  filterType?: 'whatsapp' | 'sms' | 'email';
}

export default function Communications({ filterType }: CommunicationsProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: communications, isLoading } = useQuery({
    queryKey: ['communications', filterType],
    queryFn: async () => {
      let query = supabase
        .from('communications')
        .select('*, clients(name)')
        .order('created_at', { ascending: false });

      if (filterType) {
        query = query.eq('type', filterType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Communication[];
    },
  });

  const filteredCommunications = communications?.filter((comm) => {
    const matchesSearch =
      comm.subject?.toLowerCase().includes(search.toLowerCase()) ||
      comm.content.toLowerCase().includes(search.toLowerCase()) ||
      comm.clients?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || comm.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getTitle = () => {
    if (filterType === 'whatsapp') return 'WhatsApp';
    if (filterType === 'sms') return 'SMS';
    if (filterType === 'email') return 'E-mail';
    return 'Comunicações';
  };

  const getIcon = () => {
    if (filterType === 'whatsapp') return <MessageSquare className="h-6 w-6" />;
    if (filterType === 'sms') return <Phone className="h-6 w-6" />;
    if (filterType === 'email') return <Mail className="h-6 w-6" />;
    return <MessageSquare className="h-6 w-6" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            {getIcon()}
            {getTitle()}
          </h1>
          <p className="text-muted-foreground">
            Histórico de comunicações enviadas
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Mensagem
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar comunicações..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="sent">Enviado</SelectItem>
                <SelectItem value="delivered">Entregue</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
                <SelectItem value="read">Lido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : filteredCommunications?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma comunicação encontrada
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCommunications?.map((comm) => (
                    <TableRow key={comm.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {typeIcons[comm.type]}
                          {typeLabels[comm.type]}
                        </div>
                      </TableCell>
                      <TableCell>{comm.clients?.name || '-'}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {comm.subject || comm.content.substring(0, 50) + '...'}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[comm.status]}>
                          {statusLabels[comm.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(comm.created_at), 'dd/MM/yyyy HH:mm', {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
