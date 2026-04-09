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
import { ProfessionalModal } from '@/components/professionals/ProfessionalModal';
import { AdvancedFilter, FilterOption, FilterValue } from '@/components/filters/AdvancedFilter';
import { cn } from '@/lib/utils';

interface Professional {
  id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  specialty: string | null;
  commission_rate: number;
  status: string;
  created_at: string;
}

const professionalFilters: FilterOption[] = [
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
    key: 'specialty',
    label: 'Especialidade',
    type: 'text',
    placeholder: 'Filtrar por especialidade',
  },
];

export default function Professionals() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValues, setFilterValues] = useState<FilterValue>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'create' | 'edit'>('view');
  const { toast } = useToast();
  const { canCreate, canEdit, canDelete, isAdmin } = usePermissionsContext();

  useEffect(() => {
    fetchProfessionals();
  }, []);

  const fetchProfessionals = async () => {
    try {
      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .order('name');

      if (error) throw error;
      setProfessionals(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar profissionais',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProfessional) return;

    try {
      const { error } = await supabase
        .from('professionals')
        .delete()
        .eq('id', selectedProfessional.id);

      if (error) throw error;

      toast({
        title: 'Profissional excluído',
        description: 'O profissional foi excluído com sucesso.',
      });
      fetchProfessionals();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir profissional',
        description: error.message,
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedProfessional(null);
    }
  };

  const openModal = (mode: 'view' | 'create' | 'edit', professional?: Professional) => {
    setModalMode(mode);
    setSelectedProfessional(professional || null);
    setModalOpen(true);
  };

  const filteredProfessionals = professionals.filter((professional) => {
    // Text search
    const matchesSearch =
      professional.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      professional.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      professional.specialty?.toLowerCase().includes(searchTerm.toLowerCase());

    // Advanced filters
    const matchesStatus = !filterValues.status || professional.status === filterValues.status;
    const matchesSpecialty =
      !filterValues.specialty ||
      professional.specialty?.toLowerCase().includes(filterValues.specialty.toLowerCase());

    return matchesSearch && matchesStatus && matchesSpecialty;
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in p-2 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight underline decoration-primary/20 underline-offset-8">Profissionais</h1>
          <p className="text-muted-foreground mt-2 sm:mt-3 font-medium text-sm sm:text-base">Equipe e talentos da sua barbearia</p>
        </div>
        {(canCreate('professionals') || isAdmin) && (
          <Button onClick={() => openModal('create')} className="premium-button-solid h-11 sm:h-12 shadow-xl w-full sm:w-auto">
            <Plus className="h-5 w-5 mr-2" />
            Novo Profissional
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="flex items-center gap-3 p-2 bg-secondary/30 rounded-[28px] overflow-x-auto no-scrollbar whitespace-nowrap w-full sm:w-fit">
          <div className="relative w-full sm:w-[350px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, especialidade ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-none shadow-sm rounded-xl h-10 font-medium w-full"
            />
          </div>
          <div className="h-6 w-[1px] bg-zinc-300 mx-1 hidden sm:block" />
          <AdvancedFilter
            filters={professionalFilters}
            values={filterValues}
            onChange={setFilterValues}
            onClear={() => setFilterValues({})}
          />
        </div>
      </div>

      {/* Table Section */}
      <Card className="premium-card overflow-hidden border-none shadow-2xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50/50">
              <TableRow className="hover:bg-transparent border-b border-black/5">
                <TableHead className="w-[300px] text-[11px] font-black uppercase tracking-widest text-zinc-500 py-5 pl-8">Profissional</TableHead>
                <TableHead className="text-[11px] font-black uppercase tracking-widest text-zinc-500 py-5">Contato</TableHead>
                <TableHead className="text-[11px] font-black uppercase tracking-widest text-zinc-500 py-5">Especialidade</TableHead>
                <TableHead className="text-[11px] font-black uppercase tracking-widest text-zinc-500 py-5">Comissão</TableHead>
                <TableHead className="text-[11px] font-black uppercase tracking-widest text-zinc-500 py-5 text-center">Status</TableHead>
                <TableHead className="w-[80px] py-5 pr-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-zinc-400 font-bold">Carregando profissionais...</TableCell>
                </TableRow>
              ) : filteredProfessionals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-zinc-400 font-bold">Nenhum profissional encontrado.</TableCell>
                </TableRow>
              ) : (
                filteredProfessionals.map((professional) => (
                  <TableRow key={professional.id} className="group hover:bg-zinc-50/50 transition-colors border-b border-black/5 last:border-0">
                    <TableCell className="py-5 pl-8">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center text-primary font-black group-hover:bg-primary/10 transition-colors">
                          {professional.name?.charAt(0) || '?'}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-zinc-900 group-hover:text-primary transition-colors">{professional.name || 'Sem nome'}</span>
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{professional.specialty || 'Geral'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-zinc-600 font-semibold text-sm">
                          <Mail className="h-3.5 w-3.5 text-zinc-400" />
                          <span>{professional.email || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-600 font-semibold text-sm">
                          <Phone className="h-3.5 w-3.5 text-zinc-400" />
                          <span>{professional.phone || '-'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-5">
                      <span className="text-zinc-600 font-bold text-sm bg-zinc-100 px-3 py-1 rounded-full whitespace-nowrap">
                        {professional.specialty || 'Geral'}
                      </span>
                    </TableCell>
                    <TableCell className="py-5">
                      <div className="flex flex-col">
                        <span className="text-zinc-900 font-black">{professional.commission_rate}%</span>
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-tight">Comissão</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-5 text-center">
                      <Badge className={cn(
                        "text-[10px] uppercase font-black tracking-widest rounded-lg border-none",
                        professional.status === 'active' ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-600"
                      )}>
                        {professional.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-5 pr-8">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 rounded-xl hover:bg-zinc-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl border-none shadow-2xl p-2 min-w-[170px]">
                          <DropdownMenuItem onClick={() => openModal('view', professional)} className="rounded-xl px-4 py-2.5 font-bold text-xs flex gap-3 focus:bg-zinc-50 transition-colors">
                            <Eye className="h-4 w-4 text-zinc-400" /> Ver Perfil
                          </DropdownMenuItem>
                          {(canEdit('professionals') || isAdmin) && (
                            <DropdownMenuItem onClick={() => openModal('edit', professional)} className="rounded-xl px-4 py-2.5 font-bold text-xs flex gap-3 focus:bg-zinc-50 transition-colors">
                              <Pencil className="h-4 w-4 text-zinc-400" /> Editar Dados
                            </DropdownMenuItem>
                          )}
                          {(canDelete('professionals') || isAdmin) && (
                            <DropdownMenuItem onClick={() => { setSelectedProfessional(professional); setDeleteDialogOpen(true); }} className="rounded-xl px-4 py-2.5 font-bold text-xs flex gap-3 text-red-600 focus:bg-red-50 focus:text-red-700 transition-colors">
                              <Trash2 className="h-4 w-4" /> Excluir Profissional
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

      <ProfessionalModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        professional={selectedProfessional}
        onSuccess={fetchProfessionals}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[32px] border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black tracking-tight">Deseja excluir este profissional?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-zinc-500">
              Esta ação não pode ser desfeita. O profissional perderá o acesso e todo o histórico de comissões será arquivado.
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
