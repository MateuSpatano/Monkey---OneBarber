import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X } from 'lucide-react';

interface EstablishmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  establishment: any;
  onSuccess: () => void;
}

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export function EstablishmentModal({ open, onOpenChange, mode, establishment, onSuccess }: EstablishmentModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    document_number: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    trade_name: '',
  });
  const [openingHours, setOpeningHours] = useState<Record<string, { open: string; close: string; enabled: boolean }>>({});

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && establishment) {
        setFormData({
          name: establishment.name || '',
          document_number: establishment.document_number || '',
          phone: establishment.phone || '',
          email: establishment.email || '',
          address: establishment.address || '',
          city: establishment.city || '',
          state: establishment.state || '',
          zip_code: establishment.zip_code || '',
          trade_name: establishment.trade_name || '',
        });
        setLogoPreview(establishment.logo_url || null);
        const hours = (establishment.opening_hours as any) || {};
        const parsed: Record<string, { open: string; close: string; enabled: boolean }> = {};
        DAYS.forEach(day => {
          parsed[day] = hours[day] || { open: '09:00', close: '18:00', enabled: day !== 'Domingo' };
        });
        setOpeningHours(parsed);
      } else {
        setFormData({ name: '', document_number: '', phone: '', email: '', address: '', city: '', state: '', zip_code: '', trade_name: '' });
        setLogoPreview(null);
        const defaults: Record<string, { open: string; close: string; enabled: boolean }> = {};
        DAYS.forEach(day => {
          defaults[day] = { open: '09:00', close: '18:00', enabled: day !== 'Domingo' };
        });
        setOpeningHours(defaults);
      }
      setLogoFile(null);
    }
  }, [open, mode, establishment]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast({ title: 'Campo obrigatório', description: 'O nome da barbearia é obrigatório.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      let logoUrl = mode === 'edit' ? establishment?.logo_url : null;

      if (logoFile) {
        const ext = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('establishment-logos')
          .upload(fileName, logoFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('establishment-logos')
          .getPublicUrl(fileName);
        logoUrl = publicUrl;
      }

      const payload = {
        name: formData.name,
        trade_name: formData.trade_name || null,
        document_number: formData.document_number || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        zip_code: formData.zip_code || null,
        logo_url: logoUrl,
        opening_hours: openingHours as any,
      };

      if (mode === 'edit' && establishment) {
        const { error } = await supabase.from('establishments').update(payload).eq('id', establishment.id);
        if (error) throw error;
        toast({ title: 'Unidade atualizada', description: 'Os dados foram salvos com sucesso.' });
      } else {
        const { error } = await supabase.from('establishments').insert(payload);
        if (error) throw error;
        toast({ title: 'Unidade criada', description: 'A barbearia foi cadastrada com sucesso.' });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro ao salvar.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const updateHours = (day: string, field: string, value: any) => {
    setOpeningHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nova Unidade' : 'Editar Unidade'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Logo */}
          <div className="space-y-2">
            <Label>Logo da Barbearia</Label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div className="relative">
                  <img src={logoPreview} alt="Logo" className="w-16 h-16 rounded-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="max-w-[250px]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome da Barbearia *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Nome Fantasia</Label>
              <Input
                value={formData.trade_name}
                onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input
                value={formData.document_number}
                onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>CEP</Label>
              <Input
                value={formData.zip_code}
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>UF</Label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                maxLength={2}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Endereço</Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          {/* Opening Hours */}
          <div className="space-y-3">
            <Label>Horário de Funcionamento</Label>
            <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
              {/* Bulk fill */}
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <span className="text-sm font-medium w-28">Horário fixo:</span>
                <Input
                  type="time"
                  defaultValue="09:00"
                  id="bulk-open"
                  className="w-28"
                />
                <span className="text-sm text-muted-foreground">às</span>
                <Input
                  type="time"
                  defaultValue="18:00"
                  id="bulk-close"
                  className="w-28"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const openEl = document.getElementById('bulk-open') as HTMLInputElement;
                    const closeEl = document.getElementById('bulk-close') as HTMLInputElement;
                    const bulkOpen = openEl?.value || '09:00';
                    const bulkClose = closeEl?.value || '18:00';
                    setOpeningHours(prev => {
                      const updated = { ...prev };
                      DAYS.forEach(day => {
                        updated[day] = { ...updated[day], open: bulkOpen, close: bulkClose };
                      });
                      return updated;
                    });
                  }}
                >
                  Aplicar a todos
                </Button>
              </div>
              {DAYS.map(day => (
                <div key={day} className="flex items-center gap-3">
                  <label className="flex items-center gap-2 w-28">
                    <input
                      type="checkbox"
                      checked={openingHours[day]?.enabled ?? true}
                      onChange={(e) => updateHours(day, 'enabled', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">{day}</span>
                  </label>
                  {openingHours[day]?.enabled ? (
                    <>
                      <Input
                        type="time"
                        value={openingHours[day]?.open || '09:00'}
                        onChange={(e) => updateHours(day, 'open', e.target.value)}
                        className="w-28"
                      />
                      <span className="text-sm text-muted-foreground">às</span>
                      <Input
                        type="time"
                        value={openingHours[day]?.close || '18:00'}
                        onChange={(e) => updateHours(day, 'close', e.target.value)}
                        className="w-28"
                      />
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Fechado</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'Cadastrar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
