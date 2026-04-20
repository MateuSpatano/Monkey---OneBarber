import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X, MapPin, Image as ImageIcon } from 'lucide-react';
import { useCepLookup } from '@/hooks/useCepLookup';

interface EstablishmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  establishment: any;
  onSuccess: () => void;
}

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

type FormData = {
  name: string;
  trade_name: string;
  document_number: string;
  phone: string;
  email: string;
  zip_code: string;
  address: string;
  city: string;
  state: string;
  banner_url: string;
};

const EMPTY_FORM: FormData = {
  name: '',
  trade_name: '',
  document_number: '',
  phone: '',
  email: '',
  zip_code: '',
  address: '',
  city: '',
  state: '',
  banner_url: '',
};

export function EstablishmentModal({ open, onOpenChange, mode, establishment, onSuccess }: EstablishmentModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // ── Logo ─────────────────────────────────────────────────────
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // ── Banner ───────────────────────────────────────────────────
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [openingHours, setOpeningHours] = useState<
    Record<string, { open: string; close: string; enabled: boolean }>
  >({});

  const { buscarCep, isLoadingCep } = useCepLookup();

  // ── Populate on open ─────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && establishment) {
      setFormData({
        name: establishment.name ?? '',
        trade_name: establishment.trade_name ?? '',
        document_number: establishment.document_number ?? '',
        phone: establishment.phone ?? '',
        email: establishment.email ?? '',
        zip_code: establishment.zip_code ?? '',
        address: establishment.address ?? '',
        city: establishment.city ?? '',
        state: establishment.state ?? '',
        banner_url: establishment.banner_url ?? '',
      });
      setLogoPreview(establishment.logo_url ?? null);
      setBannerPreview(establishment.banner_url ?? null);

      const hours = (establishment.opening_hours as any) ?? {};
      const parsed: Record<string, { open: string; close: string; enabled: boolean }> = {};
      DAYS.forEach(day => {
        parsed[day] = hours[day] ?? { open: '09:00', close: '18:00', enabled: day !== 'Domingo' };
      });
      setOpeningHours(parsed);
    } else {
      setFormData(EMPTY_FORM);
      setLogoPreview(null);
      setBannerPreview(null);
      const defaults: Record<string, { open: string; close: string; enabled: boolean }> = {};
      DAYS.forEach(day => {
        defaults[day] = { open: '09:00', close: '18:00', enabled: day !== 'Domingo' };
      });
      setOpeningHours(defaults);
    }

    setLogoFile(null);
    setBannerFile(null);
  }, [open, mode, establishment]);

  // ── File handlers ─────────────────────────────────────────────
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setLogoFile(file); setLogoPreview(URL.createObjectURL(file)); }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setBannerFile(file); setBannerPreview(URL.createObjectURL(file)); }
  };

  // ── CEP autocomplete (Mission 3) ──────────────────────────────
  // Adapts useCepLookup (designed for react-hook-form) to plain useState.
  // Field mapping: hook names → formData keys
  const handleCepBlur = () => {
    const setter = (field: string, value: string) => {
      const fieldMap: Record<string, keyof FormData> = {
        rua:    'address',
        cidade: 'city',
        estado: 'state',
      };
      const target = fieldMap[field];
      if (target) setFormData(prev => ({ ...prev, [target]: value }));
    };
    buscarCep(formData.zip_code, setter);
  };

  // ── Upload helper ─────────────────────────────────────────────
  const uploadFile = async (file: File, prefix: string): Promise<string> => {
    const ext = file.name.split('.').pop();
    const fileName = `${prefix}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('establishment-logos')
      .upload(fileName, file, { upsert: true });
    if (error) throw error;
    return supabase.storage.from('establishment-logos').getPublicUrl(fileName).data.publicUrl;
  };

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: 'Campo obrigatório', description: 'O nome da barbearia é obrigatório.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const logoUrl  = logoFile  ? await uploadFile(logoFile,  'logo')   : (mode === 'edit' ? establishment?.logo_url   : null);
      const bannerUrl = bannerFile ? await uploadFile(bannerFile, 'banner') : (formData.banner_url || (mode === 'edit' ? establishment?.banner_url : null));

      const payload = {
        name:            formData.name,
        trade_name:      formData.trade_name      || null,
        document_number: formData.document_number || null,
        phone:           formData.phone           || null,
        email:           formData.email           || null,
        address:         formData.address         || null,
        city:            formData.city            || null,
        state:           formData.state           || null,
        zip_code:        formData.zip_code        || null,
        logo_url:        logoUrl,
        banner_url:      bannerUrl                || null,
        opening_hours:   openingHours as any,
      };

      if (mode === 'edit' && establishment) {
        const { error } = await supabase.from('establishments').update(payload as any).eq('id', establishment.id);
        if (error) throw error;
        toast({ title: 'Unidade atualizada', description: 'Os dados foram salvos com sucesso.' });
      } else {
        const { error } = await supabase.from('establishments').insert(payload as any);
        if (error) throw error;
        toast({ title: 'Unidade criada', description: 'A barbearia foi cadastrada com sucesso.' });
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || 'Erro ao salvar.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const updateHours = (day: string, field: string, value: any) => {
    setOpeningHours(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  };

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData(prev => ({ ...prev, [key]: e.target.value }));

  // ── Render ────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        Mission 1 — overflow fix:
        • DialogContent: flex col + max-h-[90vh] + p-0 (custom padding per section)
        • Body: flex-1 + overflow-y-auto  →  only the fields area scrolls
        • Footer: shrink-0 + border-t     →  always visible at the bottom
      */}
      <DialogContent className="sm:max-w-[620px] flex flex-col max-h-[90vh] p-0 gap-0">

        {/* Fixed header */}
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
          <DialogTitle>{mode === 'create' ? 'Nova Unidade' : 'Editar Unidade'}</DialogTitle>
        </DialogHeader>

        {/* Scrollable body */}
        <form
          id="establishment-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
        >
          {/* ── Logo ── */}
          <div className="space-y-2">
            <Label>Logo da Barbearia</Label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div className="relative">
                  <img src={logoPreview} alt="Logo" className="w-16 h-16 rounded-full object-cover border" />
                  <button
                    type="button"
                    onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border-2 border-dashed">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <Input type="file" accept="image/*" onChange={handleLogoChange} className="max-w-[260px]" />
            </div>
          </div>

          {/* ── Banner (Mission 2) ── */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4" /> Imagem do Banner
            </Label>
            <p className="text-xs text-muted-foreground -mt-1">
              Exibida no topo do perfil da barbearia para os clientes.
            </p>

            {/* Preview */}
            {bannerPreview ? (
              <div className="relative w-full">
                <img
                  src={bannerPreview}
                  alt="Banner"
                  className="w-full h-32 object-cover rounded-lg border"
                />
                <button
                  type="button"
                  onClick={() => {
                    setBannerFile(null);
                    setBannerPreview(null);
                    setFormData(prev => ({ ...prev, banner_url: '' }));
                  }}
                  className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="w-full h-32 rounded-lg bg-muted border-2 border-dashed flex flex-col items-center justify-center gap-1 text-muted-foreground">
                <ImageIcon className="h-6 w-6 opacity-40" />
                <span className="text-xs">Nenhum banner selecionado</span>
              </div>
            )}

            {/* Upload file */}
            <Input type="file" accept="image/*" onChange={handleBannerChange} />

            {/* OR URL input */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              <span>ou cole uma URL</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <Input
              placeholder="https://exemplo.com/banner.jpg"
              value={formData.banner_url}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, banner_url: e.target.value }));
                setBannerPreview(e.target.value || null);
                if (e.target.value) setBannerFile(null);
              }}
            />
          </div>

          {/* ── Nome / Nome Fantasia ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome da Barbearia *</Label>
              <Input value={formData.name} onChange={set('name')} required />
            </div>
            <div className="space-y-2">
              <Label>Nome Fantasia</Label>
              <Input value={formData.trade_name} onChange={set('trade_name')} />
            </div>
          </div>

          {/* ── CNPJ / WhatsApp ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input value={formData.document_number} onChange={set('document_number')} placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input value={formData.phone} onChange={set('phone')} placeholder="(00) 00000-0000" />
            </div>
          </div>

          {/* ── Email ── */}
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={formData.email} onChange={set('email')} />
          </div>

          {/* ── Endereço com CEP autocomplete (Mission 3) ── */}
          <div className="space-y-3">
            <Label className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> Endereço
            </Label>

            <div className="grid grid-cols-3 gap-3">
              {/* CEP — onBlur dispara o autocomplete */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">CEP</Label>
                <div className="relative">
                  <Input
                    value={formData.zip_code}
                    onChange={set('zip_code')}
                    onBlur={handleCepBlur}
                    placeholder="00000-000"
                  />
                  {isLoadingCep && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>

              <div className="space-y-1 col-span-2">
                <Label className="text-xs text-muted-foreground">Logradouro</Label>
                <Input value={formData.address} onChange={set('address')} placeholder="Rua, nº, complemento" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs text-muted-foreground">Cidade</Label>
                <Input value={formData.city} onChange={set('city')} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">UF</Label>
                <Input value={formData.state} onChange={set('state')} maxLength={2} placeholder="SP" />
              </div>
            </div>
          </div>

          {/* ── Horário de funcionamento ── */}
          <div className="space-y-3">
            <Label>Horário de Funcionamento</Label>
            <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
              {/* Bulk fill */}
              <div className="flex flex-wrap items-center gap-3 pb-3 border-b border-border">
                <span className="text-sm font-medium w-24 shrink-0">Horário fixo:</span>
                <Input type="time" defaultValue="09:00" id="bulk-open" className="w-28" />
                <span className="text-sm text-muted-foreground">às</span>
                <Input type="time" defaultValue="18:00" id="bulk-close" className="w-28" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const o = (document.getElementById('bulk-open') as HTMLInputElement)?.value || '09:00';
                    const c = (document.getElementById('bulk-close') as HTMLInputElement)?.value || '18:00';
                    setOpeningHours(prev => {
                      const next = { ...prev };
                      DAYS.forEach(d => { next[d] = { ...next[d], open: o, close: c }; });
                      return next;
                    });
                  }}
                >
                  Aplicar a todos
                </Button>
              </div>

              {DAYS.map(day => (
                <div key={day} className="flex items-center gap-3">
                  <label className="flex items-center gap-2 w-28 shrink-0">
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
                      <Input type="time" value={openingHours[day]?.open || '09:00'} onChange={(e) => updateHours(day, 'open', e.target.value)} className="w-28" />
                      <span className="text-sm text-muted-foreground">às</span>
                      <Input type="time" value={openingHours[day]?.close || '18:00'} onChange={(e) => updateHours(day, 'close', e.target.value)} className="w-28" />
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">Fechado</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Fixed footer — always visible, never scrolls away */}
        <DialogFooter className="px-6 py-4 shrink-0 border-t bg-background">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="establishment-form" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Cadastrar' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
