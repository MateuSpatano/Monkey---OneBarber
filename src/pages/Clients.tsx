import { useState, useEffect } from 'react';
import { Plus, Search, MoreHorizontal, Eye, Pencil, Trash2, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePermissionsContext } from '@/contexts/PermissionsContext';
import { useAuth } from '@/contexts/AuthContext';
import { ClientModal } from '@/components/clients/ClientModal';
import { AdvancedFilter, FilterOption, FilterValue } from '@/components/filters/AdvancedFilter';
import { cn } from '@/lib/utils';

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  birth_date: string | null;
  address: string | null;
  zip_code: string | null;
  street: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

const clientFilters: FilterOption[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Ativo' },
      { value: 'inactive', label: 'Inativo' },
    ],
  },
  {
    key: 'city',
    label: 'Cidade',
    type: 'text',
    placeholder: 'Filtrar por cidade',
  },
  {
    key: 'state',
    label: 'Estado (UF)',
    type: 'text',
    placeholder: 'Ex: SP',
  },
];

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValues, setFilterValues] = useState<FilterValue>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'create' | 'edit'>('view');
  const [userEstablishmentId, setUserEstablishmentId] = useState<string | null>(null);
  const { toast } = useToast();
  const { canView, canCreate, canEdit, canDelete, isAdmin } = usePermissionsContext();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUserEstablishment();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchClients();
    }
  }, [userEstablishmentId]);

  const fetchUserEstablishment = async () => {
    try {
      const { data } = await supabase
        .from('user_establishments')
        .select('establishment_id')
        .eq('user_id', user!.id)
        .limit(1)
        .maybeSingle();
      setUserEstablishmentId(data?.establishment_id || null);
    } catch {
      setUserEstablishmentId(null);
    }
  };

  const fetchClients = async () => {
    try {
      let query = supabase.from('clients').select('*').order('name');

      // Filter by establishment for non-admin users
      if (userEstablishmentId) {
        query = query.or(`establishment_id.eq.${userEstablishmentId},establishment_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar clientes',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedClient) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', selectedClient.id);

      if (error) throw error;

      toast({
        title: 'Cliente excluído',
        description: 'O cliente foi excluído com sucesso.',
      });
      fetchClients();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir cliente',
        description: error.message,
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedClient(null);
    }
  };

  const openModal = (mode: 'view' | 'create' | 'edit', client?: Client) => {
    setModalMode(mode);
    setSelectedClient(client || null);
    setModalOpen(true);
  };

  const filteredClients = clients.filter((client) => {
    // Text search
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone?.includes(searchTerm);

    // Advanced filters
    const matchesStatus = !filterValues.status || client.status === filterValues.status;
    const matchesCity =
      !filterValues.city ||
      client.city?.toLowerCase().includes(filterValues.city.toLowerCase());
    const matchesState =
      !filterValues.state ||
      client.state?.toLowerCase().includes(filterValues.state.toLowerCase());

    return matchesSearch && matchesStatus && matchesCity && matchesState;
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in p-2 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight underline decoration-primary/20 underline-offset-8">Clientes</h1>
          <p className="text-muted-foreground mt-2 sm:mt-3 font-medium text-sm sm:text-base">Gestão e fidelização da sua base de clientes</p>
        </div>
        {(canCreate('clients') || isAdmin) && (
          <Button onClick={() => openModal('create')} className="premium-button-solid h-11 sm:h-12 shadow-xl w-full sm:w-auto">
            <Plus className="h-5 w-5 mr-2" />
            Novo Cliente
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="flex items-center gap-3 p-2 bg-secondary/30 rounded-[28px] overflow-x-auto no-scrollbar whitespace-nowrap w-full sm:w-fit">
          <div className="relative w-full sm:w-[350px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-none shadow-sm rounded-xl h-10 font-medium w-full"
            />
          </div>
          <div className="h-6 w-[1px] bg-zinc-300 mx-1 hidden sm:block" />
          <AdvancedFilter
            filters={clientFilters}
            values={filterValues}
            onChange={setFilterValues}
            onClear={() => setFilterValues({})}
          />
        </div>
      </div>

      {/* Table Section */}
      <Card className="premium-card overflow-hidden shadow-2xl border-none">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50/50">
              <TableRow className="hover:bg-transparent border-b border-black/5">
                <TableHead className="w-[300px] text-[11px] font-black uppercase tracking-widest text-zinc-500 py-5 pl-8">Cliente</TableHead>
                <TableHead className="text-[11px] font-black uppercase tracking-widest text-zinc-500 py-5">Contato</TableHead>
                <TableHead className="text-[11px] font-black uppercase tracking-widest text-zinc-500 py-5">Localização</TableHead>
                <TableHead className="text-[11px] font-black uppercase tracking-widest text-zinc-500 py-5 text-center">Status</TableHead>
                <TableHead className="w-[80px] py-5 pr-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-zinc-400 font-bold">Carregando clientes...</TableCell>
                </TableRow>
              ) : filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-zinc-400 font-bold">Nenhum cliente encontrado.</TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => (
                  <TableRow key={client.id} className="group hover:bg-zinc-50/50 transition-colors border-b border-black/5 last:border-0">
                    <TableCell className="py-5 pl-8">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center text-primary font-black group-hover:bg-primary/10 transition-colors">
                          {client.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground group-hover:text-primary transition-colors">{client.name}</span>
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{client.cpf || 'Sem CPF'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-zinc-600 font-semibold text-sm">
                          <Mail className="h-3.5 w-3.5 text-zinc-400" />
                          <span>{client.email || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-600 font-semibold text-sm">
                          <Phone className="h-3.5 w-3.5 text-zinc-400" />
                          <span>{client.phone || '-'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-5">
                      <div className="flex flex-col">
                        <span className="text-zinc-600 font-bold text-sm">{client.city || '-'}</span>
                        <span className="text-xs text-zinc-400 font-semibold">{client.state || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-5 text-center">
                      <Badge className={cn(
                        "text-[10px] uppercase font-black tracking-widest rounded-lg border-none",
                        client.status === 'active' ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-600"
                      )}>
                        {client.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-5 pr-8">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 rounded-xl hover:bg-zinc-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl border-none shadow-2xl p-2 min-w-[160px]">
                          <DropdownMenuItem onClick={() => openModal('view', client)} className="rounded-xl px-4 py-2.5 font-bold text-xs flex gap-3 focus:bg-zinc-50 transition-colors">
                            <Eye className="h-4 w-4 text-zinc-400" /> Ver Detalhes
                          </DropdownMenuItem>
                          {(canEdit('clients') || isAdmin) && (
                            <DropdownMenuItem onClick={() => openModal('edit', client)} className="rounded-xl px-4 py-2.5 font-bold text-xs flex gap-3 focus:bg-zinc-50 transition-colors">
                              <Pencil className="h-4 w-4 text-zinc-400" /> Editar Cliente
                            </DropdownMenuItem>
                          )}
                          {(canDelete('clients') || isAdmin) && (
                            <DropdownMenuItem onClick={() => { setSelectedClient(client); setDeleteDialogOpen(true); }} className="rounded-xl px-4 py-2.5 font-bold text-xs flex gap-3 text-red-600 focus:bg-red-50 focus:text-red-700 transition-colors">
                              <Trash2 className="h-4 w-4" /> Excluir Cliente
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <ClientModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        client={selectedClient}
        onSuccess={fetchClients}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[32px] border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black tracking-tight">Deseja excluir este cliente?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-zinc-500">
              Esta ação não pode ser desfeita. Todos os dados históricos vinculados a este cliente serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-2xl border-none bg-zinc-100 font-bold h-11">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-2xl bg-red-600 hover:bg-red-700 font-bold h-11">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
