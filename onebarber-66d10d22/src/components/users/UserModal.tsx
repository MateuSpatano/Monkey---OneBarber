import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';

interface Role {
  id: string;
  name: string;
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

export function UserModal({ open, onOpenChange, user, mode, onSuccess }: UserModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState<UserData>({
    full_name: '',
    username: '',
    email: '',
    phone: '',
    status: 'active',
    role_id: ''
  });
  const [password, setPassword] = useState('');

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
        setFormData({
          full_name: '',
          username: '',
          email: '',
          phone: '',
          status: 'active',
          role_id: ''
        });
      }
      setPassword('');
    }
  }, [open, user, mode]);

  const fetchRoles = async () => {
    const { data } = await supabase.from('roles').select('id, name').order('name');
    if (data) setRoles(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'create') {
        // Create new user via Edge Function (Admin API) - doesn't change current session
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
        
        if (!result.success) {
          throw new Error(result.error || 'Erro ao criar usuário');
        }

        toast({
          title: 'Usuário criado',
          description: 'O usuário foi criado com sucesso.',
        });
      } else if (mode === 'edit' && user?.user_id) {
        // Update profile
        await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            username: formData.username,
            phone: formData.phone,
            status: formData.status
          })
          .eq('user_id', user.user_id);

        // Update role
        if (formData.role_id) {
          const { data: existingRole } = await supabase
            .from('user_roles')
            .select('id')
            .eq('user_id', user.user_id)
            .maybeSingle();

          if (existingRole) {
            await supabase
              .from('user_roles')
              .update({ role_id: formData.role_id })
              .eq('user_id', user.user_id);
          } else {
            await supabase
              .from('user_roles')
              .insert({ user_id: user.user_id, role_id: formData.role_id });
          }
        }

        // Update password if provided
        if (password) {
          // Note: Updating another user's password requires admin API
          toast({
            title: 'Atenção',
            description: 'A atualização de senha requer privilégios administrativos.',
            variant: 'destructive'
          });
        }

        toast({
          title: 'Usuário atualizado',
          description: 'O usuário foi atualizado com sucesso.',
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro ao salvar o usuário.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const isViewMode = mode === 'view';
  const title = mode === 'create' ? 'Criar Usuário' : mode === 'edit' ? 'Editar Usuário' : 'Visualizar Usuário';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                disabled={isViewMode}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Usuário (Login)</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                disabled={isViewMode}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={isViewMode || mode === 'edit'}
              required
            />
          </div>

          {!isViewMode && (mode === 'create' || mode === 'edit') && (
            <div className="space-y-2">
              <Label htmlFor="password">
                {mode === 'create' ? 'Senha' : 'Nova Senha (deixe em branco para manter)'}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={mode === 'create'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={isViewMode}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Função</Label>
              <Select
                value={formData.role_id}
                onValueChange={(value) => setFormData({ ...formData, role_id: value })}
                disabled={isViewMode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'active' | 'inactive') => setFormData({ ...formData, status: value })}
                disabled={isViewMode}
              >
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

          {!isViewMode && (
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          )}

          {isViewMode && (
            <div className="flex justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
