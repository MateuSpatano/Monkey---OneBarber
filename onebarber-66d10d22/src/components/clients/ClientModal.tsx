import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { useToast } from '@/hooks/use-toast';
import { useCepLookup } from '@/hooks/useCepLookup';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

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
}

interface ClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'view' | 'create' | 'edit';
  client: Client | null;
  onSuccess: () => void;
}

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
  }
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
};

const formatCep = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits.replace(/(\d{5})(\d{0,3})/, '$1-$2').trim();
};

export function ClientModal({ open, onOpenChange, mode, client, onSuccess }: ClientModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    birth_date: '',
    zip_code: '',
    street: '',
    neighborhood: '',
    city: '',
    state: '',
    notes: '',
    status: 'active',
  });
  const { toast } = useToast();
  const { lookupCep, loading: cepLoading } = useCepLookup();

  useEffect(() => {
    if (client && (mode === 'view' || mode === 'edit')) {
      setFormData({
        name: client.name,
        email: client.email || '',
        phone: client.phone || '',
        cpf: client.cpf || '',
        birth_date: client.birth_date || '',
        zip_code: client.zip_code || '',
        street: client.street || '',
        neighborhood: client.neighborhood || '',
        city: client.city || '',
        state: client.state || '',
        notes: client.notes || '',
        status: client.status,
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        cpf: '',
        birth_date: '',
        zip_code: '',
        street: '',
        neighborhood: '',
        city: '',
        state: '',
        notes: '',
        status: 'active',
      });
    }
  }, [client, mode, open]);

  const handleCepChange = async (value: string) => {
    const formattedCep = formatCep(value);
    setFormData({ ...formData, zip_code: formattedCep });

    const cleanCep = value.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      const address = await lookupCep(cleanCep);
      if (address) {
        setFormData((prev) => ({
          ...prev,
          zip_code: formattedCep,
          street: address.street,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
        }));
      }
    }
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    setFormData({ ...formData, phone: formatted });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'view') return;

    if (!formData.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'O nome é obrigatório.',
      });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        cpf: formData.cpf || null,
        birth_date: formData.birth_date || null,
        zip_code: formData.zip_code || null,
        street: formData.street || null,
        neighborhood: formData.neighborhood || null,
        city: formData.city || null,
        state: formData.state || null,
        notes: formData.notes || null,
        status: formData.status,
      };

      if (mode === 'create') {
        const { error } = await supabase.from('clients').insert(payload);
        if (error) throw error;
        toast({ title: 'Cliente criado com sucesso!' });
      } else {
        const { error } = await supabase
          .from('clients')
          .update(payload)
          .eq('id', client!.id);
        if (error) throw error;
        toast({ title: 'Cliente atualizado com sucesso!' });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const isReadOnly = mode === 'view';
  const title = mode === 'create' ? 'Novo Cliente' : mode === 'edit' ? 'Editar Cliente' : 'Detalhes do Cliente';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campos Obrigatórios */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isReadOnly}
                required
                placeholder="Digite o nome completo"
              />
            </div>

            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isReadOnly}
                placeholder="email@exemplo.com"
              />
            </div>

            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                disabled={isReadOnly}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>
          </div>

          {/* Mais Informações - Seção Expansível */}
          <CollapsibleSection 
            title="Mais Informações" 
            defaultOpen={mode === 'view' || mode === 'edit'}
          >
            <div className="space-y-4 pt-2">
              <div>
                <Label htmlFor="birth_date">Data de Nascimento</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  disabled={isReadOnly}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Endereço</Label>
                
                <div className="relative">
                  <Input
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) => handleCepChange(e.target.value)}
                    disabled={isReadOnly}
                    placeholder="CEP (00000-000)"
                    maxLength={9}
                  />
                  {cepLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                <Input
                  id="street"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  disabled={isReadOnly}
                  placeholder="Logradouro"
                />

                <Input
                  id="neighborhood"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  disabled={isReadOnly}
                  placeholder="Bairro"
                />

                <div className="grid grid-cols-3 gap-2">
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    disabled={isReadOnly}
                    placeholder="Cidade"
                    className="col-span-2"
                  />
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                    disabled={isReadOnly}
                    placeholder="UF"
                    maxLength={2}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  disabled={isReadOnly}
                  rows={3}
                  placeholder="Observações sobre o cliente"
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                  disabled={isReadOnly}
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
          </CollapsibleSection>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {isReadOnly ? 'Fechar' : 'Cancelar'}
            </Button>
            {!isReadOnly && (
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
