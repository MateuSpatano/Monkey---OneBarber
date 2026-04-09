import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePermissionsContext } from '@/contexts/PermissionsContext';
import { Loader2, Eye, EyeOff } from 'lucide-react';

interface Role {
  id: string;
  name: string;
}

interface Permission {
  id: string;
  module: string;
  action: string;
  description: string | null;
}

interface UserData {
  id?: string;
  user_id?: string;
  full_name: string;
  username: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  role_id?: string;
}

interface UserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserData | null;
  mode: 'create' | 'edit' | 'view';
  onSuccess: () => void;
}

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  clients: 'Clientes',
  professionals: 'Profissionais',
  products: 'Produtos/Serviços',
  appointments: 'Agendamentos',
  services: 'Serviços',
  financial: 'Financeiro',
  reports: 'Relatórios',
  settings: 'Configurações',
  users: 'Usuários',
  roles: 'Permissões',
  marketing: 'Marketing',
};

const ACTION_LABELS: Record<string, string> = {
  view: 'Visualizar',
  create: 'Criar',
  edit: 'Editar',
  delete: 'Excluir',
};

// Roles allowed for owner (Proprietário)
const OWNER_ALLOWED_ROLES = ['Barbeiro', 'Recepcionista'];

export function UserModal({ open, onOpenChange, user, mode, onSuccess }: UserModalProps) {
  const { toast } = useToast();
  const { isAdmin: currentUserIsAdmin, userRole } = usePermissionsContext();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const isOwner = userRole?.name === 'Proprietário';

  const [formData, setFormData] = useState<UserData>({
    full_name: '',
    username: '',
    email: '',
    phone: '',
    status: 'active',
    role_id: ''
  });
  const [password, setPassword] = useState('');

  // Fetch all permissions
  const { data: allPermissions = [] } = useQuery({
    queryKey: ['all-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('permissions').select('*').order('module').order('action');
      if (error) throw error;
      return data as Permission[];
    },
    enabled: open && mode === 'create',
  });

  // Fetch existing role permissions when editing
  const { data: existingRolePermissions = [] } = useQuery({
    queryKey: ['role-permissions-edit', formData.role_id],
    queryFn: async () => {
      if (!formData.role_id) return [];
      const { data, error } = await supabase.from('role_permissions').select('permission_id').eq('role_id', formData.role_id);
      if (error) throw error;
      return data.map(rp => rp.permission_id);
    },
    enabled: !!formData.role_id && open && mode !== 'view',
  });

  // Group permissions by module
  const groupedPermissions = allPermissions.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  useEffect(() => {
    if (open) {
      fetchRoles();
      if (user && (mode === 'edit' || mode === 'view')) {
        setFormData({
          id: user.id,
          user_id: user.user_id,
          full_name: user.full_name || '',
          username: user.username || '',
          email: user.email || '',
          phone: user.phone || '',
          status: user.status || 'active',
          role_id: user.role_id || ''
        });
      } else {
        setFormData({ full_name: '', username: '', email: '', phone: '', status: 'active', role_id: '' });
        setSelectedPermissions([]);
      }
      setPassword('');
    }
  }, [open, user, mode]);

  // Sync selected permissions with role's existing permissions
  useEffect(() => {
    if (existingRolePermissions.length > 0) {
      setSelectedPermissions(existingRolePermissions);
    }
  }, [existingRolePermissions]);

  const fetchRoles = async () => {
    const { data } = await supabase.from('roles').select('id, name').order('name');
    if (data) {
      // Filter roles based on user type
      if (isOwner && !currentUserIsAdmin) {
        // Owner can only create Barbeiro and Recepcionista
        setRoles(data.filter(r => OWNER_ALLOWED_ROLES.includes(r.name)));
      } else {
        setRoles(data);
      }
    }
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId) ? prev.filter(id => id !== permissionId) : [...prev, permissionId]
    );
  };

  const toggleModuleAll = (module: string) => {
    const modulePerms = groupedPermissions[module]?.map(p => p.id) || [];
    const allSelected = modulePerms.every(id => selectedPermissions.includes(id));
    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(id => !modulePerms.includes(id)));
    } else {
      setSelectedPermissions(prev => [...new Set([...prev, ...modulePerms])]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'create') {
        const { data: sessionData } = await supabase.auth.getSession();
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({
            email: formData.email,
            password: password,
            full_name: formData.full_name,
            username: formData.username,
            phone: formData.phone,
            status: formData.status,
            role_id: formData.role_id,
          }),
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Erro ao criar usuário');

        // If permissions were selected and a role was chosen, update role permissions
        if (formData.role_id && selectedPermissions.length > 0) {
          // Note: For custom permission sets, we could create a new role or update the existing one
          // For now, we update the role's permissions directly
          // First check if this is a system role - don't modify system roles
          const selectedRole = roles.find(r => r.id === formData.role_id);
          if (selectedRole) {
            // Delete existing permissions for this role and re-insert
            await supabase.from('role_permissions').delete().eq('role_id', formData.role_id);
            const inserts = selectedPermissions.map(permId => ({
              role_id: formData.role_id!,
              permission_id: permId,
            }));
            await supabase.from('role_permissions').insert(inserts);
          }
        }

        toast({ title: 'Usuário criado', description: 'O usuário foi criado com sucesso.' });
      } else if (mode === 'edit' && user?.user_id) {
        await supabase.from('profiles').update({
          full_name: formData.full_name,
          username: formData.username,
          phone: formData.phone,
          status: formData.status
        }).eq('user_id', user.user_id);

        if (formData.role_id) {
          const { data: existingRole } = await supabase.from('user_roles').select('id').eq('user_id', user.user_id).maybeSingle();
          if (existingRole) {
            await supabase.from('user_roles').update({ role_id: formData.role_id }).eq('user_id', user.user_id);
          } else {
            await supabase.from('user_roles').insert({ user_id: user.user_id, role_id: formData.role_id });
          }
        }

        if (password) {
          toast({ title: 'Atenção', description: 'A atualização de senha requer privilégios administrativos.', variant: 'destructive' });
        }

        toast({ title: 'Usuário atualizado', description: 'O usuário foi atualizado com sucesso.' });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Ocorreu um erro ao salvar o usuário.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const isViewMode = mode === 'view';
  const title = mode === 'create' ? 'Criar Usuário' : mode === 'edit' ? 'Editar Usuário' : 'Visualizar Usuário';

  // Check if selected role is admin-level (auto full access)
  const selectedRoleName = roles.find(r => r.id === formData.role_id)?.name;
  const isAdminRole = selectedRoleName === 'Administrador' || selectedRoleName === 'Proprietário';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 pb-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <Input id="full_name" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} disabled={isViewMode} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Usuário (Login)</Label>
                  <Input id="username" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} disabled={isViewMode} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} disabled={isViewMode || mode === 'edit'} required />
              </div>

              {!isViewMode && (mode === 'create' || mode === 'edit') && (
                <div className="space-y-2">
                  <Label htmlFor="password">{mode === 'create' ? 'Senha' : 'Nova Senha (deixe em branco para manter)'}</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required={mode === 'create'} />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} disabled={isViewMode} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Função *</Label>
                  <Select value={formData.role_id} onValueChange={(value) => setFormData({ ...formData, role_id: value })} disabled={isViewMode}>
                    <SelectTrigger><SelectValue placeholder="Selecione a função" /></SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value: 'active' | 'inactive') => setFormData({ ...formData, status: value })} disabled={isViewMode}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Permissions section - only in create mode */}
              {mode === 'create' && formData.role_id && !isAdminRole && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Permissões do Módulo</Label>
                    <p className="text-xs text-muted-foreground">Selecione quais módulos e ações este usuário poderá acessar</p>
                    <div className="space-y-4">
                      {Object.entries(groupedPermissions).map(([module, perms]) => {
                        const allChecked = perms.every(p => selectedPermissions.includes(p.id));
                        const someChecked = perms.some(p => selectedPermissions.includes(p.id));
                        return (
                          <div key={module} className="border rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Checkbox
                                checked={allChecked}
                                onCheckedChange={() => toggleModuleAll(module)}
                                className={someChecked && !allChecked ? 'opacity-50' : ''}
                              />
                              <Label className="font-medium cursor-pointer" onClick={() => toggleModuleAll(module)}>
                                {MODULE_LABELS[module] || module}
                              </Label>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 ml-6">
                              {perms.map((perm) => (
                                <div key={perm.id} className="flex items-center gap-2">
                                  <Checkbox
                                    checked={selectedPermissions.includes(perm.id)}
                                    onCheckedChange={() => togglePermission(perm.id)}
                                    id={perm.id}
                                  />
                                  <Label htmlFor={perm.id} className="text-sm cursor-pointer">
                                    {ACTION_LABELS[perm.action] || perm.action}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {mode === 'create' && isAdminRole && (
                <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                  Usuários com perfil {selectedRoleName} possuem acesso total ao sistema automaticamente.
                </div>
              )}
            </div>
          </ScrollArea>

          {!isViewMode && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          )}

          {isViewMode && (
            <div className="flex justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
