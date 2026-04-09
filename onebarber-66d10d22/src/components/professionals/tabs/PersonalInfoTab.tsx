import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, User, Loader2 } from 'lucide-react';
import { useCepLookup } from '@/hooks/useCepLookup';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PersonalInfoData {
  name: string;
  phone: string;
  email: string;
  birth_date: string;
  avatar_url: string;
  zip_code: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  specialty: string;
  status: string;
}

interface PersonalInfoTabProps {
  data: PersonalInfoData;
  onChange: (data: PersonalInfoData) => void;
  isReadOnly: boolean;
  professionalId?: string;
}

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

const brazilianStates = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export function PersonalInfoTab({ data, onChange, isReadOnly, professionalId }: PersonalInfoTabProps) {
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { toast } = useToast();
  const { lookupCep, loading: isLoadingCep } = useCepLookup();

  const handleCepLookup = async () => {
    if (data.zip_code.replace(/\D/g, '').length === 8) {
      const result = await lookupCep(data.zip_code);
      if (result) {
        onChange({
          ...data,
          street: result.street || data.street,
          neighborhood: result.neighborhood || data.neighborhood,
          city: result.city || data.city,
          state: result.state || data.state,
        });
      }
    }
  };

  const handleCepBlur = () => {
    handleCepLookup();
  };

  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Por favor, selecione uma imagem.',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'A imagem deve ter no máximo 5MB.',
      });
      return;
    }

    setUploadingAvatar(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${professionalId || 'new'}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('professional-avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('professional-avatars')
        .getPublicUrl(filePath);

      onChange({ ...data, avatar_url: publicUrl });
      toast({ title: 'Foto atualizada com sucesso!' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar foto',
        description: error.message,
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Avatar Upload */}
      <div className="flex items-center gap-6">
        <div className="relative">
          <Avatar className="h-24 w-24">
            <AvatarImage src={data.avatar_url} alt={data.name} />
            <AvatarFallback className="bg-muted">
              <User className="h-12 w-12 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          {!isReadOnly && (
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
            >
              {uploadingAvatar ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar || isReadOnly}
              />
            </label>
          )}
        </div>
        <div>
          <h3 className="font-medium">Foto de Perfil</h3>
          <p className="text-sm text-muted-foreground">
            JPG, PNG ou GIF. Máximo 5MB.
          </p>
        </div>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="name">Nome Completo *</Label>
          <Input
            id="name"
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            disabled={isReadOnly}
            required
          />
        </div>

        <div>
          <Label htmlFor="phone">Telefone *</Label>
          <Input
            id="phone"
            value={data.phone}
            onChange={(e) => onChange({ ...data, phone: formatPhone(e.target.value) })}
            disabled={isReadOnly}
            placeholder="(00) 00000-0000"
            maxLength={16}
          />
        </div>

        <div>
          <Label htmlFor="email">E-mail *</Label>
          <Input
            id="email"
            type="email"
            value={data.email}
            onChange={(e) => onChange({ ...data, email: e.target.value })}
            disabled={isReadOnly}
          />
        </div>

        <div>
          <Label htmlFor="birth_date">Data de Nascimento</Label>
          <Input
            id="birth_date"
            type="date"
            value={data.birth_date}
            onChange={(e) => onChange({ ...data, birth_date: e.target.value })}
            disabled={isReadOnly}
          />
        </div>

        <div>
          <Label htmlFor="specialty">Especialidade</Label>
          <Input
            id="specialty"
            value={data.specialty}
            onChange={(e) => onChange({ ...data, specialty: e.target.value })}
            disabled={isReadOnly}
            placeholder="Ex: Corte, Barba, Coloração"
          />
        </div>

        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            value={data.status}
            onValueChange={(value) => onChange({ ...data, status: value })}
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

      {/* Address */}
      <div className="space-y-4">
        <h3 className="font-medium text-lg border-b pb-2">Endereço</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="zip_code">CEP</Label>
            <div className="relative">
              <Input
                id="zip_code"
                value={data.zip_code}
                onChange={(e) => onChange({ ...data, zip_code: formatCep(e.target.value) })}
                onBlur={handleCepBlur}
                disabled={isReadOnly || isLoadingCep}
                placeholder="00000-000"
                maxLength={9}
              />
              {isLoadingCep && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="street">Logradouro</Label>
            <Input
              id="street"
              value={data.street}
              onChange={(e) => onChange({ ...data, street: e.target.value })}
              disabled={isReadOnly}
              placeholder="Rua, Avenida, etc."
            />
          </div>

          <div>
            <Label htmlFor="neighborhood">Bairro</Label>
            <Input
              id="neighborhood"
              value={data.neighborhood}
              onChange={(e) => onChange({ ...data, neighborhood: e.target.value })}
              disabled={isReadOnly}
            />
          </div>

          <div>
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              value={data.city}
              onChange={(e) => onChange({ ...data, city: e.target.value })}
              disabled={isReadOnly}
            />
          </div>

          <div>
            <Label htmlFor="state">Estado</Label>
            <Select
              value={data.state}
              onValueChange={(value) => onChange({ ...data, state: value })}
              disabled={isReadOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {brazilianStates.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
