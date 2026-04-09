import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Plug,
  CreditCard,
  MessageSquare,
  Calendar,
  Mail,
  Loader2,
  Settings,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Integration {
  id?: string;
  name: string;
  type: string;
  provider: string;
  is_active: boolean;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const AVAILABLE_INTEGRATIONS: Omit<Integration, 'id' | 'is_active'>[] = [
  {
    name: 'Stripe',
    type: 'payment',
    provider: 'stripe',
    description: 'Processamento de pagamentos online com cartão de crédito e débito',
    icon: CreditCard,
  },
  {
    name: 'WhatsApp Business',
    type: 'messaging',
    provider: 'whatsapp',
    description: 'Envio de mensagens e notificações via WhatsApp',
    icon: MessageSquare,
  },
  {
    name: 'Google Calendar',
    type: 'calendar',
    provider: 'google_calendar',
    description: 'Sincronização de agendamentos com Google Calendar',
    icon: Calendar,
  },
  {
    name: 'SendGrid',
    type: 'email',
    provider: 'sendgrid',
    description: 'Envio de e-mails transacionais e marketing',
    icon: Mail,
  },
];

export default function Integrations() {
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('integrations')
        .select('*');

      if (error) throw error;

      // Merge available integrations with saved ones
      const mergedIntegrations = AVAILABLE_INTEGRATIONS.map((available) => {
        const saved = data?.find((d) => d.provider === available.provider);
        return {
          ...available,
          id: saved?.id,
          is_active: saved?.is_active || false,
        };
      });

      setIntegrations(mergedIntegrations);
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (integration: Integration) => {
    try {
      setTogglingId(integration.provider);

      if (integration.id) {
        // Update existing
        const { error } = await supabase
          .from('integrations')
          .update({ is_active: !integration.is_active })
          .eq('id', integration.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase.from('integrations').insert({
          name: integration.name,
          type: integration.type,
          provider: integration.provider,
          is_active: true,
        });

        if (error) throw error;
      }

      setIntegrations((prev) =>
        prev.map((i) =>
          i.provider === integration.provider
            ? { ...i, is_active: !i.is_active }
            : i
        )
      );

      toast({
        title: integration.is_active ? 'Integração desativada' : 'Integração ativada',
        description: `${integration.name} foi ${integration.is_active ? 'desativada' : 'ativada'} com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível alterar a integração.',
        variant: 'destructive',
      });
    } finally {
      setTogglingId(null);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      payment: 'Pagamento',
      messaging: 'Mensagens',
      calendar: 'Calendário',
      email: 'E-mail',
    };
    return labels[type] || type;
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
          <Plug className="h-6 w-6" />
          Integrações
        </h1>
        <p className="text-muted-foreground">
          Conecte serviços externos ao seu sistema
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          return (
            <Card key={integration.provider} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <Badge variant="secondary" className="mt-1">
                        {getTypeLabel(integration.type)}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={integration.is_active}
                    onCheckedChange={() => handleToggle(integration)}
                    disabled={togglingId === integration.provider}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  {integration.description}
                </CardDescription>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!integration.is_active}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configurar
                  </Button>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Documentação
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Placeholder for future integrations */}
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          <Plug className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">Mais integrações em breve</p>
          <p className="text-sm">
            Estamos trabalhando para adicionar mais integrações ao sistema
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
