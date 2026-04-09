import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BusinessRule {
  key: string;
  value: any;
  description: string;
  category: string;
}

const DEFAULT_RULES: BusinessRule[] = [
  {
    key: 'appointment_duration_default',
    value: 30,
    description: 'Duração padrão de agendamentos (minutos)',
    category: 'appointments',
  },
  {
    key: 'appointment_advance_booking_days',
    value: 30,
    description: 'Dias de antecedência máxima para agendamento',
    category: 'appointments',
  },
  {
    key: 'appointment_cancellation_hours',
    value: 24,
    description: 'Horas mínimas para cancelamento sem penalidade',
    category: 'appointments',
  },
  {
    key: 'commission_default_rate',
    value: 30,
    description: 'Taxa de comissão padrão (%)',
    category: 'financial',
  },
  {
    key: 'loyalty_points_per_real',
    value: 1,
    description: 'Pontos de fidelidade por R$ gasto',
    category: 'marketing',
  },
  {
    key: 'loyalty_enabled',
    value: true,
    description: 'Programa de fidelidade ativo',
    category: 'marketing',
  },
  {
    key: 'send_appointment_reminder',
    value: true,
    description: 'Enviar lembrete de agendamento',
    category: 'notifications',
  },
  {
    key: 'reminder_hours_before',
    value: 24,
    description: 'Horas antes do agendamento para enviar lembrete',
    category: 'notifications',
  },
];

export default function BusinessRules() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<BusinessRule[]>(DEFAULT_RULES);
  const { toast } = useToast();

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('business_rules')
        .select('*');

      if (error) throw error;

      if (data && data.length > 0) {
        const updatedRules = DEFAULT_RULES.map((rule) => {
          const savedRule = data.find((r) => r.key === rule.key);
          return savedRule ? { ...rule, value: savedRule.value } : rule;
        });
        setRules(updatedRules);
      }
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      for (const rule of rules) {
        const { error } = await supabase
          .from('business_rules')
          .upsert(
            {
              key: rule.key,
              value: rule.value,
              description: rule.description,
              category: rule.category,
            },
            { onConflict: 'key' }
          );

        if (error) throw error;
      }

      toast({
        title: 'Salvo com sucesso',
        description: 'As regras de negócio foram atualizadas.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar as regras.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRuleChange = (key: string, value: any) => {
    setRules((prev) =>
      prev.map((rule) => (rule.key === key ? { ...rule, value } : rule))
    );
  };

  const groupedRules = rules.reduce((acc, rule) => {
    if (!acc[rule.category]) {
      acc[rule.category] = [];
    }
    acc[rule.category].push(rule);
    return acc;
  }, {} as Record<string, BusinessRule[]>);

  const categoryLabels: Record<string, string> = {
    appointments: 'Agendamentos',
    financial: 'Financeiro',
    marketing: 'Marketing',
    notifications: 'Notificações',
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
          <BookOpen className="h-6 w-6" />
          Regras de Negócio
        </h1>
        <p className="text-muted-foreground">
          Configure as regras e parâmetros do sistema
        </p>
      </div>

      {Object.entries(groupedRules).map(([category, categoryRules]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{categoryLabels[category] || category}</CardTitle>
            <CardDescription>
              Configurações relacionadas a {categoryLabels[category]?.toLowerCase() || category}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryRules.map((rule, index) => (
              <div key={rule.key}>
                {index > 0 && <Separator className="my-4" />}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor={rule.key}>{rule.description}</Label>
                    <p className="text-xs text-muted-foreground">{rule.key}</p>
                  </div>
                  {typeof rule.value === 'boolean' ? (
                    <Switch
                      id={rule.key}
                      checked={rule.value}
                      onCheckedChange={(checked) => handleRuleChange(rule.key, checked)}
                    />
                  ) : (
                    <Input
                      id={rule.key}
                      type="number"
                      value={rule.value}
                      onChange={(e) => handleRuleChange(rule.key, Number(e.target.value))}
                      className="w-24 text-right"
                    />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Alterações
        </Button>
      </div>
    </div>
  );
}
