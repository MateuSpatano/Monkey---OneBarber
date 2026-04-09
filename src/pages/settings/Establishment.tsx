import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Establishment {
  id?: string;
  name: string;
  trade_name: string;
  document_number: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
}

export default function Establishment() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [establishment, setEstablishment] = useState<Establishment>({
    name: '',
    trade_name: '',
    document_number: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchEstablishment();
  }, []);

  const fetchEstablishment = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('establishments')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setEstablishment({
          id: data.id,
          name: data.name || '',
          trade_name: data.trade_name || '',
          document_number: data.document_number || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zip_code: data.zip_code || '',
        });
      }
    } catch (error) {
      console.error('Error fetching establishment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (establishment.id) {
        const { error } = await supabase
          .from('establishments')
          .update({
            name: establishment.name,
            trade_name: establishment.trade_name,
            document_number: establishment.document_number,
            phone: establishment.phone,
            email: establishment.email,
            address: establishment.address,
            city: establishment.city,
            state: establishment.state,
            zip_code: establishment.zip_code,
          })
          .eq('id', establishment.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('establishments')
          .insert({
            name: establishment.name,
            trade_name: establishment.trade_name,
            document_number: establishment.document_number,
            phone: establishment.phone,
            email: establishment.email,
            address: establishment.address,
            city: establishment.city,
            state: establishment.state,
            zip_code: establishment.zip_code,
          })
          .select()
          .single();

        if (error) throw error;
        setEstablishment((prev) => ({ ...prev, id: data.id }));
      }

      toast({
        title: 'Salvo com sucesso',
        description: 'Os dados do estabelecimento foram atualizados.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar os dados.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof Establishment, value: string) => {
    setEstablishment((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          Estabelecimento
        </h1>
        <p className="text-muted-foreground">
          Configure os dados do seu estabelecimento
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do Estabelecimento</CardTitle>
          <CardDescription>
            Informações básicas que serão exibidas em documentos e comunicações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Razão Social *</Label>
              <Input
                id="name"
                value={establishment.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Nome da empresa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trade_name">Nome Fantasia</Label>
              <Input
                id="trade_name"
                value={establishment.trade_name}
                onChange={(e) => handleChange('trade_name', e.target.value)}
                placeholder="Nome comercial"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="document_number">CNPJ/CPF</Label>
              <Input
                id="document_number"
                value={establishment.document_number}
                onChange={(e) => handleChange('document_number', e.target.value)}
                placeholder="00.000.000/0001-00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={establishment.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={establishment.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="contato@empresa.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Textarea
              id="address"
              value={establishment.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Rua, número, bairro"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={establishment.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="Cidade"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Input
                id="state"
                value={establishment.state}
                onChange={(e) => handleChange('state', e.target.value)}
                placeholder="UF"
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip_code">CEP</Label>
              <Input
                id="zip_code"
                value={establishment.zip_code}
                onChange={(e) => handleChange('zip_code', e.target.value)}
                placeholder="00000-000"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={saving || !establishment.name}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
