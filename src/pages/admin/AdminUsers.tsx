import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CreateUserModal } from '@/components/admin/CreateUserModal';
import { EditUserModal } from '@/components/admin/EditUserModal';
import { DeleteUserDialog } from '@/components/users/DeleteUserDialog';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function AdminUsers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [deleteUser, setDeleteUser] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, email, phone, status, created_at, avatar_url, username')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = profiles?.map(p => p.user_id) || [];
      if (userIds.length === 0) return profiles || [];

      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, roles:role_id (id, name)')
        .in('user_id', userIds);

      return profiles?.map(profile => ({
        ...profile,
        user_roles: rolesData?.filter(r => r.user_id === profile.user_id) || []
      })) || [];
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ userId, newStatus }: { userId: string; newStatus: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'Status atualizado', description: 'O status do usuário foi atualizado.' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível atualizar o status.', variant: 'destructive' });
    },
  });

  const filteredUsers = users?.filter((user: any) =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleName = (userRoles: any) => {
    if (!userRoles || userRoles.length === 0) return 'Sem função';
    const role = userRoles[0]?.roles;
    return Array.isArray(role) ? role[0]?.name || 'Sem função' : role?.name || 'Sem função';
  };

  const getRoleId = (userRoles: any) => {
    if (!userRoles || userRoles.length === 0) return '';
    const role = userRoles[0]?.roles;
    return Array.isArray(role) ? role[0]?.id || '' : role?.id || '';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight underline decoration-primary/20 underline-offset-8 flex items-center gap-2">
            Gerenciar Usuários
          </h1>
          <p className="text-muted-foreground font-medium text-sm sm:text-base">
            Administre os perfis e acessos globais do sistema
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="premium-button-solid h-11 sm:h-12 px-6 shadow-xl">
          <Plus className="mr-2 h-5 w-5" />
          Novo Usuário
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar usuários..."
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
              <TableHead className="font-black uppercase tracking-widest text-[10px] px-8 text-zinc-400 h-14">Nome</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px] px-8 text-zinc-400 h-14">Email</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px] px-8 text-zinc-400 h-14">Função</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px] px-8 text-zinc-400 h-14">Status</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px] px-8 text-zinc-400 h-14">Criado em</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px] px-8 text-zinc-400 h-14 w-[150px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-zinc-400 font-bold uppercase tracking-widest text-xs">Carregando usuários...</TableCell>
              </TableRow>
            ) : filteredUsers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 px-6">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-50 flex items-center justify-center mx-auto mb-4 text-zinc-300">
                    <Search className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-black text-foreground mb-1">Nenhum usuário encontrado</h3>
                  <p className="text-sm font-medium text-zinc-400">Tente ajustar seus termos de busca.</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers?.map((user: any) => (
                <TableRow key={user.id} className="hover:bg-zinc-50/50 transition-colors border-b border-black/5 last:border-0">
                  <TableCell className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-black shadow-sm">
                        {user.full_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <span className="font-bold text-zinc-900">{user.full_name || 'Não informado'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-8 py-5 text-sm font-semibold text-zinc-600">{user.email}</TableCell>
                  <TableCell className="px-8 py-5">
                    <Badge variant="outline" className="text-[10px] items-center gap-1 font-black tracking-widest rounded-lg border-zinc-200 text-zinc-500 uppercase">
                      {getRoleName(user.user_roles)}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={user.status === 'active'}
                        onCheckedChange={(checked) =>
                          toggleStatusMutation.mutate({
                            userId: user.user_id,
                            newStatus: checked ? 'active' : 'inactive',
                          })
                        }
                        className="data-[state=checked]:bg-green-500"
                      />
                      <Badge className={cn(
                        "text-[10px] uppercase font-black tracking-widest rounded-lg border-none",
                        user.status === 'active' 
                          ? 'bg-green-500/10 text-green-600' 
                          : 'bg-zinc-100 text-zinc-400'
                      )}>
                        {user.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    {user.created_at
                      ? format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })
                      : '-'}
                  </TableCell>
                  <TableCell className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl hover:bg-white hover:shadow-md transition-all text-zinc-400 hover:text-primary"
                        onClick={() => setEditUser({
                          ...user,
                          role_id: getRoleId(user.user_roles),
                          avatar_url: user.avatar_url,
                          username: user.username,
                        })}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl hover:bg-red-50 hover:shadow-sm transition-all text-zinc-400 hover:text-destructive"
                        onClick={() => setDeleteUser(user)}
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

      <CreateUserModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-users'] })}
      />

      <EditUserModal
        open={!!editUser}
        onOpenChange={(open) => !open && setEditUser(null)}
        user={editUser}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-users'] });
          setEditUser(null);
        }}
      />

      <DeleteUserDialog
        open={!!deleteUser}
        onOpenChange={(open) => !open && setDeleteUser(null)}
        user={deleteUser}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-users'] });
          setDeleteUser(null);
        }}
      />
    </div>
  );
}
