import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Loader2, Save, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePermissionsContext } from '@/contexts/PermissionsContext';

interface Permission {
  id: string;
  module: string;
  action: string;
  description: string;
}

interface ModulePermissions {
  module: string;
  label: string;
  permissions: Permission[];
}

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  clients: 'Clientes',
  appointments: 'Agendamentos',
  services: 'Serviços',
  financial: 'Financeiro',
  reports: 'Relatórios',
  settings: 'Configurações',
  users: 'Usuários',
  roles: 'Funções'
};

const ACTION_LABELS: Record<string, string> = {
  view: 'Visualizar',
  create: 'Criar',
  edit: 'Editar',
  delete: 'Excluir'
};

export default function RoleForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const { canEdit, canCreate } = usePermissionsContext();
  
  const isEditing = !!id && id !== 'new';
  const isViewOnly = !!id && !id.includes('edit') && id !== 'new' && !canEdit('roles');
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [allPermissions, setAllPermissions] = useState<ModulePermissions[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPermissions();
    if (isEditing) {
      fetchRole();
    }
  }, [id]);

  const fetchPermissions = async () => {
    const { data } = await supabase
      .from('permissions')
      .select('*')
      .order('module')
      .order('action');

    if (data) {
      // Group by module
      const grouped: Record<string, Permission[]> = {};
      data.forEach((perm) => {
        if (!grouped[perm.module]) {
          grouped[perm.module] = [];
        }
        grouped[perm.module].push(perm);
      });

      const moduleOrder = ['dashboard', 'clients', 'appointments', 'services', 'financial', 'reports', 'settings', 'users', 'roles'];
      
      const sortedModules = moduleOrder
        .filter(m => grouped[m])
        .map(module => ({
          module,
          label: MODULE_LABELS[module] || module,
          permissions: grouped[module]
        }));

      setAllPermissions(sortedModules);
    }
  };

  const fetchRole = async () => {
    setLoading(true);
    try {
      const roleId = id?.replace('/edit', '');
      
      const { data: role } = await supabase
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .maybeSingle();

      if (role) {
        setName(role.name);
        setDescription(role.description || '');

        // Fetch role permissions
        const { data: rolePerms } = await supabase
          .from('role_permissions')
          .select('permission_id')
          .eq('role_id', role.id);

        if (rolePerms) {
          setSelectedPermissions(new Set(rolePerms.map(rp => rp.permission_id)));
        }
      }
    } catch (error) {
      console.error('Error fetching role:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permissionId: string) => {
    if (isViewOnly) return;
    
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId);
    } else {
      newSelected.add(permissionId);
    }
    setSelectedPermissions(newSelected);
  };

  const toggleModule = (modulePerms: Permission[]) => {
    if (isViewOnly) return;
    
    const newSelected = new Set(selectedPermissions);
    const allSelected = modulePerms.every(p => newSelected.has(p.id));
    
    if (allSelected) {
      modulePerms.forEach(p => newSelected.delete(p.id));
    } else {
      modulePerms.forEach(p => newSelected.add(p.id));
    }
    setSelectedPermissions(newSelected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: 'Erro',
        description: 'O nome da função é obrigatório.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      let roleId = id?.replace('/edit', '');

      if (isEditing) {
        // Update existing role
        const { error } = await supabase
          .from('roles')
          .update({ name, description })
          .eq('id', roleId);

        if (error) throw error;

        // Delete existing permissions
        await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', roleId);
      } else {
        // Create new role
        const { data, error } = await supabase
          .from('roles')
          .insert({ name, description })
          .select()
          .single();

        if (error) throw error;
        roleId = data.id;
      }

      // Insert new permissions
      if (selectedPermissions.size > 0 && roleId) {
        const permissionsToInsert = Array.from(selectedPermissions).map(permId => ({
          role_id: roleId,
          permission_id: permId
        }));

        const { error: permError } = await supabase
          .from('role_permissions')
          .insert(permissionsToInsert);

        if (permError) throw permError;
      }

      toast({
        title: isEditing ? 'Função atualizada' : 'Função criada',
        description: `A função "${name}" foi ${isEditing ? 'atualizada' : 'criada'} com sucesso.`,
      });

      navigate('/dashboard/roles');
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro ao salvar a função.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/roles')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? 'Editar Função' : isViewOnly ? 'Visualizar Função' : 'Nova Função'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Atualize as informações da função' : isViewOnly ? 'Detalhes da função' : 'Configure as permissões da nova função'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Informações da Função
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Função</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Administrador, Barbeiro, Recepcionista"
                    disabled={isViewOnly}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descrição breve da função"
                    disabled={isViewOnly}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Permissões</CardTitle>
              <CardDescription>
                Selecione as permissões que esta função terá acesso no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {allPermissions.map((moduleGroup) => {
                  const allModuleSelected = moduleGroup.permissions.every(p => selectedPermissions.has(p.id));
                  const someModuleSelected = moduleGroup.permissions.some(p => selectedPermissions.has(p.id));
                  
                  return (
                    <div key={moduleGroup.module} className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <Checkbox
                          id={`module-${moduleGroup.module}`}
                          checked={allModuleSelected}
                          onCheckedChange={() => toggleModule(moduleGroup.permissions)}
                          disabled={isViewOnly}
                          className={someModuleSelected && !allModuleSelected ? 'opacity-50' : ''}
                        />
                        <Label
                          htmlFor={`module-${moduleGroup.module}`}
                          className="text-lg font-semibold cursor-pointer"
                        >
                          {moduleGroup.label}
                        </Label>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 ml-7">
                        {moduleGroup.permissions.map((perm) => (
                          <div key={perm.id} className="flex items-center gap-2">
                            <Checkbox
                              id={perm.id}
                              checked={selectedPermissions.has(perm.id)}
                              onCheckedChange={() => togglePermission(perm.id)}
                              disabled={isViewOnly}
                            />
                            <Label htmlFor={perm.id} className="cursor-pointer text-sm">
                              {ACTION_LABELS[perm.action] || perm.action}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {!isViewOnly && (
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => navigate('/dashboard/roles')}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Salvar
              </Button>
            </div>
          )}

          {isViewOnly && (
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={() => navigate('/dashboard/roles')}>
                Voltar
              </Button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
