import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PersonalInfoTab } from './tabs/PersonalInfoTab';
import { AttachmentsTab } from './tabs/AttachmentsTab';
import { CommissionsTab } from './tabs/CommissionsTab';
import { User, Paperclip, Percent } from 'lucide-react';

interface Professional {
  id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  specialty: string | null;
  commission_rate: number;
  status: string;
  birth_date?: string | null;
  avatar_url?: string | null;
  zip_code?: string | null;
  street?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
}

interface ProfessionalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'view' | 'create' | 'edit';
  professional: Professional | null;
  onSuccess: () => void;
}

const defaultPersonalInfo = {
  name: '',
  phone: '',
  email: '',
  birth_date: '',
  avatar_url: '',
  zip_code: '',
  street: '',
  neighborhood: '',
  city: '',
  state: '',
  specialty: '',
  status: 'active',
};

const defaultCommissionSettings = {
  service_percentage_enabled: false,
  service_percentage_rate: 0,
  revenue_percentage_enabled: false,
  revenue_percentage_rate: 0,
  fixed_per_service_enabled: false,
  fixed_per_service_amount: 0,
  product_sales_enabled: false,
  product_sales_percentage: 0,
  combo_enabled: false,
  combo_percentage: 0,
  chair_rental_enabled: false,
  chair_rental_amount: 0,
  chair_rental_period: 'monthly',
};

export function ProfessionalModal({ open, onOpenChange, mode, professional, onSuccess }: ProfessionalModalProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [personalInfo, setPersonalInfo] = useState(defaultPersonalInfo);
  const [commissionSettings, setCommissionSettings] = useState(defaultCommissionSettings);
  const [professionalId, setProfessionalId] = useState<string | undefined>(undefined);
  const { toast } = useToast();

  useEffect(() => {
    if (professional && (mode === 'view' || mode === 'edit')) {
      setPersonalInfo({
        name: professional.name || '',
        email: professional.email || '',
        phone: professional.phone || '',
        birth_date: professional.birth_date || '',
        avatar_url: professional.avatar_url || '',
        zip_code: professional.zip_code || '',
        street: professional.street || '',
        neighborhood: professional.neighborhood || '',
        city: professional.city || '',
        state: professional.state || '',
        specialty: professional.specialty || '',
        status: professional.status || 'active',
      });
      setProfessionalId(professional.id);
      fetchCommissionSettings(professional.id);
    } else {
      setPersonalInfo(defaultPersonalInfo);
      setCommissionSettings(defaultCommissionSettings);
      setProfessionalId(undefined);
    }
    setActiveTab('personal');
  }, [professional, mode, open]);

  const fetchCommissionSettings = async (id: string) => {
    try {
      const { data } = await supabase
        .from('professional_commission_settings')
        .select('*')
        .eq('professional_id', id)
        .single();

      if (data) {
        setCommissionSettings({
          service_percentage_enabled: data.service_percentage_enabled || false,
          service_percentage_rate: data.service_percentage_rate || 0,
          revenue_percentage_enabled: data.revenue_percentage_enabled || false,
          revenue_percentage_rate: data.revenue_percentage_rate || 0,
          fixed_per_service_enabled: data.fixed_per_service_enabled || false,
          fixed_per_service_amount: data.fixed_per_service_amount || 0,
          product_sales_enabled: data.product_sales_enabled || false,
          product_sales_percentage: data.product_sales_percentage || 0,
          combo_enabled: data.combo_enabled || false,
          combo_percentage: data.combo_percentage || 0,
          chair_rental_enabled: data.chair_rental_enabled || false,
          chair_rental_amount: data.chair_rental_amount || 0,
          chair_rental_period: data.chair_rental_period || 'monthly',
        });
      }
    } catch (error) {
      console.error('Error fetching commission settings:', error);
    }
  };

  const handleSubmit = async () => {
    if (mode === 'view') return;

    if (!personalInfo.name.trim()) {
      toast({ variant: 'destructive', title: 'Erro', description: 'O nome é obrigatório.' });
      return;
    }

    setLoading(true);

    try {
      const professionalPayload = {
        name: personalInfo.name,
        email: personalInfo.email || null,
        phone: personalInfo.phone || null,
        birth_date: personalInfo.birth_date || null,
        avatar_url: personalInfo.avatar_url || null,
        zip_code: personalInfo.zip_code || null,
        street: personalInfo.street || null,
        neighborhood: personalInfo.neighborhood || null,
        city: personalInfo.city || null,
        state: personalInfo.state || null,
        specialty: personalInfo.specialty || null,
        status: personalInfo.status,
        commission_rate: commissionSettings.service_percentage_rate || 0,
      };

      let savedId = professionalId;

      if (mode === 'create') {
        const { data, error } = await supabase.from('professionals').insert(professionalPayload).select('id').single();
        if (error) throw error;
        savedId = data.id;
        setProfessionalId(savedId);
      } else {
        const { error } = await supabase.from('professionals').update(professionalPayload).eq('id', professional!.id);
        if (error) throw error;
      }

      // Save commission settings
      if (savedId) {
        await supabase.from('professional_commission_settings').upsert({
          professional_id: savedId,
          ...commissionSettings,
        }, { onConflict: 'professional_id' });

        // Save extended commissions (tiers, service commissions)
        if ((window as any).saveExtendedCommissions) {
          await (window as any).saveExtendedCommissions();
        }
      }

      toast({ title: mode === 'create' ? 'Profissional criado com sucesso!' : 'Profissional atualizado com sucesso!' });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const isReadOnly = mode === 'view';
  const title = mode === 'create' ? 'Novo Profissional' : mode === 'edit' ? 'Editar Profissional' : 'Detalhes do Profissional';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Cadastro
            </TabsTrigger>
            <TabsTrigger value="attachments" className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Anexos
            </TabsTrigger>
            <TabsTrigger value="commissions" className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Comissões
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4 pr-2">
            <TabsContent value="personal" className="mt-0">
              <PersonalInfoTab
                data={personalInfo}
                onChange={setPersonalInfo}
                isReadOnly={isReadOnly}
                professionalId={professionalId}
              />
            </TabsContent>

            <TabsContent value="attachments" className="mt-0">
              <AttachmentsTab
                professionalId={professionalId}
                isReadOnly={isReadOnly}
              />
            </TabsContent>

            <TabsContent value="commissions" className="mt-0">
              <CommissionsTab
                professionalId={professionalId}
                isReadOnly={isReadOnly}
                commissionSettings={commissionSettings}
                onCommissionSettingsChange={setCommissionSettings}
              />
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {isReadOnly ? 'Fechar' : 'Cancelar'}
          </Button>
          {!isReadOnly && (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
