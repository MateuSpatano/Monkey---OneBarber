import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X } from 'lucide-react';

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  clients: 'Clientes',
  appointments: 'Agendamentos',
  services: 'Serviços',
  financial: 'Financeiro',
  reports: 'Relatórios',
  settings: 'Configurações',
  users: 'Usuários',
  roles: 'Permissões',
  professionals: 'Profissionais',
  products: 'Produtos',
  marketing: 'Marketing',
};

const FULL_ACCESS_ROLES = ['Administrador', 'Proprietário'];

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  onSuccess: () => void;
}

export function EditUserModal({ open, onOpenChange, user, onSuccess }: EditUserModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [allPermissions, setAllPermissions] = useState<{ id: string; module: string; action: string }[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    username: '',
    status: 'active',
  });

  const selectedRole = roles.find(r => r.id === selectedRoleId);
  const isFullAccess = selectedRole && FULL_ACCESS_ROLES.includes(selectedRole.name);

  useEffect(() => {
    if (open && user) {
      fetchData();
      setFormData({
        full_name: user.full_name || '',
        phone: user.phone || '',
        username: user.username || '',
        status: user.status || 'active',
      });
      setSelectedRoleId(user.role_id || '');
      setAvatarPreview(user.avatar_url || null);
      setAvatarFile(null);
    }
  }, [open, user]);

  const fetchData = async () => {
    const [rolesRes, permsRes] = await Promise.all([
      supabase.from('roles').select('id, name').order('name'),
      supabase.from('permissions').select('id, module, action'),
    ]);
    if (rolesRes.data) setRoles(rolesRes.data);
    if (permsRes.data) setAllPermissions(permsRes.data);

    if (user?.role_id) {
      const { data: rolePerms } = await supabase
        .from('role_permissions')
        .select('permissions:permission_id (module)')
        .eq('role_id', user.role_id);
      
      if (rolePerms) {
        const modules = [...new Set(rolePerms.map((rp: any) => {
          const p = rp.permissions;
          return Array.isArray(p) ? p[0]?.module : p?.module;
        }).filter(Boolean))];
        setSelectedModules(modules as string[]);
      }
    }
  };

  useEffect(() => {
    if (isFullAccess) {
      const allModules = [...new Set(allPermissions.map(p => p.module))];
      setSelectedModules(allModules);
    }
  }, [selectedRoleId, isFullAccess, allPermissions]);

  const toggleModule = (module: string) => {
    if (isFullAccess) return;
    setSelectedModules(prev =>
      prev.includes(module) ? prev.filter(m => m !== module) : [...prev, module]
    );
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.user_id) return;

    setLoading(true);
    try {
      // Upload avatar if changed
      let avatarUrl = user.avatar_url;
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop();
        const fileName = `${user.user_id}.${ext}`;
        await supabase.storage.from('user-avatars').upload(fileName, avatarFile, { upsert: true });
        const { data: { publicUrl } } = supabase.storage.from('user-avatars').getPublicUrl(fileName);
        avatarUrl = publicUrl;
      }

      // Update profile with all fields
      await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          username: formData.username || null,
          status: formData.status,
          avatar_url: avatarUrl,
        })
        .eq('user_id', user.user_id);

      // Update role
      if (selectedRoleId) {
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', user.user_id)
          .maybeSingle();

        if (existingRole) {
          await supabase.from('user_roles').update({ role_id: selectedRoleId }).eq('user_id', user.user_id);
        } else {
          await supabase.from('user_roles').insert({ user_id: user.user_id, role_id: selectedRoleId });
        }

        // Update role permissions
        await supabase.from('role_permissions').delete().eq('role_id', selectedRoleId);
        
        const permissionIds = allPermissions
          .filter(p => selectedModules.includes(p.module))
          .map(p => p.id);

        if (permissionIds.length > 0) {
          await supabase.from('role_permissions').insert(
            permissionIds.map(pid => ({ role_id: selectedRoleId, permission_id: pid }))
          );
        }
      }

      toast({ title: 'Usuário atualizado', description: 'As alterações foram salvas.' });
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro ao atualizar.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const modules = [...new Set(allPermissions.map(p => p.module))];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar */}
          <div className="space-y-2">
            <Label>Foto do Usuário</Label>
            <div className="flex items-center gap-4">
              {avatarPreview ? (
                <div className="relative">
                  <img src={avatarPreview} alt="Avatar" className="w-14 h-14 rounded-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setAvatarFile(null); setAvatarPreview(null); }}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <Input type="file" accept="image/*" onChange={handleAvatarChange} className="max-w-[220px]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ''} disabled />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Usuário</Label>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedRoleId && !isFullAccess && (
            <div className="space-y-3">
              <Label>Permissões de Módulos</Label>
              <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-muted/30">
                {modules.map((module) => (
                  <label key={module} className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer">
                    <Checkbox
                      checked={selectedModules.includes(module)}
                      onCheckedChange={() => toggleModule(module)}
                    />
                    <span className="text-sm">{MODULE_LABELS[module] || module}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {isFullAccess && selectedRoleId && (
            <p className="text-sm text-muted-foreground p-3 border rounded-lg bg-muted/30">
              ✅ Acesso total — todos os módulos habilitados automaticamente.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
