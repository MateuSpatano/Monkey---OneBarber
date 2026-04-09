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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profissionais</h1>
          <p className="text-muted-foreground">Gerencie os profissionais do sistema</p>
        </div>
        {(canCreate('professionals') || isAdmin) && (
          <Button onClick={() => openModal('create')}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Profissional
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar profissionais..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <AdvancedFilter
          filters={professionalFilters}
          values={filterValues}
          onChange={setFilterValues}
          onClear={() => setFilterValues({})}
        />
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Especialidade</TableHead>
              <TableHead>Comissão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredProfessionals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum profissional encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredProfessionals.map((professional) => (
                <TableRow key={professional.id}>
                  <TableCell className="font-medium">{professional.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm">
                      {professional.email && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {professional.email}
                        </span>
                      )}
                      {professional.phone && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {professional.phone}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{professional.specialty || '-'}</TableCell>
                  <TableCell>{professional.commission_rate}%</TableCell>
                  <TableCell>
                    <Badge variant={professional.status === 'active' ? 'default' : 'secondary'}>
                      {professional.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        <DropdownMenuItem onClick={() => openModal('view', professional)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        {(canEdit('professionals') || isAdmin) && (
                          <DropdownMenuItem onClick={() => openModal('edit', professional)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {(canDelete('professionals') || isAdmin) && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setSelectedProfessional(professional);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
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

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir profissional</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o profissional "{selectedProfessional?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Professional Modal */}
      <ProfessionalModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        professional={selectedProfessional}
        onSuccess={fetchProfessionals}
      />
    </div>
  );
}
