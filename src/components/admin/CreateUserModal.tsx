import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, Upload, X } from 'lucide-react';

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
const ALLOWED_ROLES = ['Recepcionista', 'Administrador', 'Barbeiro', 'Proprietário', 'Cliente'];

interface Role {
  id: string;
  name: string;
}

interface Permission {
  id: string;
  module: string;
  action: string;
}

interface Establishment {
  id: string;
  name: string;
}

interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateUserModal({ open, onOpenChange, onSuccess }: CreateUserModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
  });

  const selectedRole = roles.find(r => r.id === selectedRoleId);
  const isFullAccess = selectedRole && FULL_ACCESS_ROLES.includes(selectedRole.name);
  const isOwnerRole = selectedRole?.name === 'Proprietário';

  useEffect(() => {
    if (open) {
      fetchData();
      resetForm();
    }
  }, [open]);

  useEffect(() => {
    if (isFullAccess) {
      const allModules = [...new Set(allPermissions.map(p => p.module))];
      setSelectedModules(allModules);
    }
  }, [selectedRoleId, isFullAccess, allPermissions]);

  const resetForm = () => {
    setFormData({ fullName: '', email: '', password: '', phone: '' });
    setSelectedRoleId('');
    setSelectedModules([]);
    setSelectedEstablishmentId('');
    setShowPassword(false);
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const fetchData = async () => {
    const [rolesRes, permsRes, estRes] = await Promise.all([
      supabase.from('roles').select('id, name').order('name'),
      supabase.from('permissions').select('id, module, action'),
      supabase.from('establishments').select('id, name').order('name'),
    ]);
    if (rolesRes.data) setRoles(rolesRes.data.filter(r => ALLOWED_ROLES.includes(r.name)));
    if (permsRes.data) setAllPermissions(permsRes.data);
    if (estRes.data) setEstablishments(estRes.data);
  };

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
    if (!formData.email || !formData.password || !formData.fullName || !selectedRoleId) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha todos os campos obrigatórios.', variant: 'destructive' });
      return;
    }

    if (isOwnerRole && !selectedEstablishmentId) {
      toast({ title: 'Campo obrigatório', description: 'Selecione a barbearia para o proprietário.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const permissionIds = allPermissions
        .filter(p => selectedModules.includes(p.module))
        .map(p => p.id);

      // Use fetch directly instead of supabase.functions.invoke.
      // Reason: invoke omits the required "apikey" header and swallows HTTP
      // error details, turning every failure into the generic
      // "Failed to send a request to the Edge Function" message.
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.access_token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            fullName: formData.fullName,
            phone: formData.phone,
            role_id: selectedRoleId,
            permission_ids: permissionIds,
            establishment_id: isOwnerRole ? selectedEstablishmentId : undefined,
          }),
        }
      );

      // Parse the response body regardless of status code so we can show
      // the real error message coming from the Edge Function.
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
          `Erro na Edge Function (HTTP ${response.status}). Verifique se ela está deployada no Supabase.`
        );
      }
      if (data && !data.success) throw new Error(data.error);

      // Upload avatar if provided
      if (avatarFile && data?.user?.id) {
        const ext = avatarFile.name.split('.').pop();
        const fileName = `${data.user.id}.${ext}`;
        await supabase.storage.from('user-avatars').upload(fileName, avatarFile, { upsert: true });
        const { data: { publicUrl } } = supabase.storage.from('user-avatars').getPublicUrl(fileName);
        await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('user_id', data.user.id);
      }

      toast({ title: 'Usuário criado', description: 'O usuário foi criado com sucesso.' });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Não foi possível criar o usuário.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const modules = [...new Set(allPermissions.map(p => p.module))];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Usuário</DialogTitle>
          <DialogDescription>Preencha os dados do novo usuário.</DialogDescription>
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
              <Label>Nome Completo *</Label>
              <Input
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email *</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Senha *</Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
              <Button
                type="button" variant="ghost" size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Usuário *</Label>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Establishment selection for Owner role */}
          {isOwnerRole && (
            <div className="space-y-2">
              <Label>Barbearia (Unidade) *</Label>
              <Select value={selectedEstablishmentId} onValueChange={setSelectedEstablishmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a barbearia" />
                </SelectTrigger>
                <SelectContent>
                  {establishments.map((est) => (
                    <SelectItem key={est.id} value={est.id}>{est.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {establishments.length === 0 && (
                <p className="text-sm text-destructive">Cadastre uma unidade primeiro em Gerenciar Unidades.</p>
              )}
            </div>
          )}

          {/* Only show module permissions for non-full-access roles */}
          {selectedRoleId && !isFullAccess && (
            <div className="space-y-3">
              <Label>Permissões de Módulos</Label>
              <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-muted/30">
                {modules.map((module) => (
                  <label
                    key={module}
                    className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                  >
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Usuário
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
