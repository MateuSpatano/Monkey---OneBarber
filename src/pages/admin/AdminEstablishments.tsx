import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EstablishmentModal } from '@/components/admin/EstablishmentModal';

export default function AdminEstablishments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedEstablishment, setSelectedEstablishment] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: establishments, isLoading } = useQuery({
    queryKey: ['admin-establishments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('establishments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('establishments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-establishments'] });
      toast({ title: 'Unidade excluída', description: 'A barbearia foi excluída com sucesso.' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível excluir a unidade.', variant: 'destructive' });
    },
  });

  const filteredEstablishments = establishments?.filter((e: any) =>
    e.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.trade_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.document_number?.includes(searchTerm)
  );

  const openModal = (mode: 'create' | 'edit', establishment?: any) => {
    setModalMode(mode);
    setSelectedEstablishment(establishment || null);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight underline decoration-primary/20 underline-offset-8 flex items-center gap-2">
            Gerenciar Unidades
          </h1>
          <p className="text-muted-foreground font-medium text-sm sm:text-base">
            Gerencie todas as barbearias cadastradas na plataforma
          </p>
        </div>
        <Button onClick={() => openModal('create')} className="premium-button-solid h-11 sm:h-12 px-6 shadow-xl">
          <Plus className="mr-2 h-5 w-5" />
          Nova Unidade
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar unidades..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card className="premium-card border-none shadow-2xl rounded-[32px] overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-50/50">
            <TableRow className="hover:bg-transparent border-b border-black/5">
              <TableHead className="font-black uppercase tracking-widest text-[10px] px-8 text-zinc-400 h-14">Logo</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px] px-8 text-zinc-400 h-14">Nome</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px] px-8 text-zinc-400 h-14">CNPJ</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px] px-8 text-zinc-400 h-14">WhatsApp</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px] px-8 text-zinc-400 h-14">Cidade/UF</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px] px-8 text-zinc-400 h-14 w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-zinc-400 font-bold uppercase tracking-widest text-xs">Carregando unidades...</TableCell>
              </TableRow>
            ) : filteredEstablishments?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 px-6">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-50 flex items-center justify-center mx-auto mb-4 text-zinc-300">
                    <Search className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-black text-foreground mb-1">Nenhuma unidade encontrada</h3>
                  <p className="text-sm font-medium text-zinc-400">Tente ajustar seus termos de busca.</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredEstablishments?.map((est: any) => (
                <TableRow key={est.id} className="hover:bg-zinc-50/50 transition-colors border-b border-black/5 last:border-0">
                  <TableCell className="px-8 py-5">
                    {est.logo_url ? (
                      <img src={est.logo_url} alt={est.name} className="w-12 h-12 rounded-2xl object-cover shadow-md" />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center border border-primary/10">
                        <span className="text-sm font-black text-primary">
                          {est.name?.[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="font-bold text-zinc-900">{est.name}</span>
                      <span className="text-xs font-semibold text-zinc-400 mt-0.5">{est.trade_name || 'Razão Social não informada'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-8 py-5 text-sm font-semibold text-zinc-600">{est.document_number || '-'}</TableCell>
                  <TableCell className="px-8 py-5 text-sm font-semibold text-zinc-600">{est.phone || '-'}</TableCell>
                  <TableCell className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-600">
                        {est.city && est.state ? `${est.city}/${est.state}` : est.city || est.state || '-'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openModal('edit', est)} className="h-9 w-9 rounded-xl hover:bg-white hover:shadow-md transition-all text-zinc-400 hover:text-primary">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-9 w-9 rounded-xl hover:bg-red-50 hover:shadow-sm transition-all text-zinc-400 hover:text-destructive"
                        onClick={() => { setSelectedEstablishment(est); setDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <EstablishmentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        establishment={selectedEstablishment}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-establishments'] })}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir unidade</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{selectedEstablishment?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedEstablishment) deleteMutation.mutate(selectedEstablishment.id);
                setDeleteDialogOpen(false);
              }}
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
