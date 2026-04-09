import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CommissionSettings {
  service_percentage_enabled: boolean;
  service_percentage_rate: number;
  revenue_percentage_enabled: boolean;
  revenue_percentage_rate: number;
  fixed_per_service_enabled: boolean;
  fixed_per_service_amount: number;
  product_sales_enabled: boolean;
  product_sales_percentage: number;
  combo_enabled: boolean;
  combo_percentage: number;
  chair_rental_enabled: boolean;
  chair_rental_amount: number;
  chair_rental_period: string;
}

interface ServiceCommission {
  id?: string;
  service_id: string;
  service_name?: string;
  commission_type: 'percentage' | 'fixed';
  commission_value: number;
}

interface CommissionTier {
  id?: string;
  tier_type: 'progressive' | 'performance';
  min_value: number;
  max_value: number | null;
  commission_rate: number;
  bonus_amount: number;
}

interface CommissionsTabProps {
  professionalId?: string;
  isReadOnly: boolean;
  onCommissionSettingsChange: (settings: CommissionSettings) => void;
  commissionSettings: CommissionSettings;
}

const defaultSettings: CommissionSettings = {
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

export function CommissionsTab({ 
  professionalId, 
  isReadOnly, 
  onCommissionSettingsChange,
  commissionSettings 
}: CommissionsTabProps) {
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);
  const [serviceCommissions, setServiceCommissions] = useState<ServiceCommission[]>([]);
  const [progressiveTiers, setProgressiveTiers] = useState<CommissionTier[]>([]);
  const [performanceBonuses, setPerformanceBonuses] = useState<CommissionTier[]>([]);
  const [differentiatedEnabled, setDifferentiatedEnabled] = useState(false);
  const [progressiveEnabled, setProgressiveEnabled] = useState(false);
  const [performanceEnabled, setPerformanceEnabled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchServices();
    if (professionalId) {
      fetchCommissionData();
    }
  }, [professionalId]);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('type', 'service')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchCommissionData = async () => {
    if (!professionalId) return;

    setLoading(true);
    try {
      // Fetch service commissions
      const { data: serviceData } = await supabase
        .from('professional_service_commissions')
        .select('*, products(name)')
        .eq('professional_id', professionalId);

      if (serviceData && serviceData.length > 0) {
        setDifferentiatedEnabled(true);
        setServiceCommissions(
          serviceData.map((s: any) => ({
            id: s.id,
            service_id: s.service_id,
            service_name: s.products?.name,
            commission_type: s.commission_type,
            commission_value: s.commission_value,
          }))
        );
      }

      // Fetch tiers
      const { data: tiersData } = await supabase
        .from('professional_commission_tiers')
        .select('*')
        .eq('professional_id', professionalId);

      if (tiersData) {
        const progressive = tiersData
          .filter((t) => t.tier_type === 'progressive')
          .map((t) => ({ ...t, tier_type: 'progressive' as const }));
        const performance = tiersData
          .filter((t) => t.tier_type === 'performance')
          .map((t) => ({ ...t, tier_type: 'performance' as const }));
        
        if (progressive.length > 0) {
          setProgressiveEnabled(true);
          setProgressiveTiers(progressive);
        }
        if (performance.length > 0) {
          setPerformanceEnabled(true);
          setPerformanceBonuses(performance);
        }
      }
    } catch (error: any) {
      console.error('Error fetching commission data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: keyof CommissionSettings, value: any) => {
    const newSettings = { ...commissionSettings, [key]: value };
    
    // If chair rental is enabled, show warning about other commissions
    if (key === 'chair_rental_enabled' && value === true) {
      // Disable other commission types when chair rental is enabled
      newSettings.service_percentage_enabled = false;
      newSettings.revenue_percentage_enabled = false;
      newSettings.fixed_per_service_enabled = false;
      newSettings.product_sales_enabled = false;
      newSettings.combo_enabled = false;
    }
    
    onCommissionSettingsChange(newSettings);
  };

  const addServiceCommission = () => {
    setServiceCommissions([
      ...serviceCommissions,
      { service_id: '', commission_type: 'percentage', commission_value: 0 },
    ]);
  };

  const updateServiceCommission = (index: number, field: string, value: any) => {
    const updated = [...serviceCommissions];
    updated[index] = { ...updated[index], [field]: value };
    setServiceCommissions(updated);
  };

  const removeServiceCommission = (index: number) => {
    setServiceCommissions(serviceCommissions.filter((_, i) => i !== index));
  };

  const addProgressiveTier = () => {
    setProgressiveTiers([
      ...progressiveTiers,
      { tier_type: 'progressive', min_value: 0, max_value: null, commission_rate: 0, bonus_amount: 0 },
    ]);
  };

  const updateProgressiveTier = (index: number, field: string, value: any) => {
    const updated = [...progressiveTiers];
    updated[index] = { ...updated[index], [field]: value };
    setProgressiveTiers(updated);
  };

  const removeProgressiveTier = (index: number) => {
    setProgressiveTiers(progressiveTiers.filter((_, i) => i !== index));
  };

  const addPerformanceBonus = () => {
    setPerformanceBonuses([
      ...performanceBonuses,
      { tier_type: 'performance', min_value: 0, max_value: null, commission_rate: 0, bonus_amount: 0 },
    ]);
  };

  const updatePerformanceBonus = (index: number, field: string, value: any) => {
    const updated = [...performanceBonuses];
    updated[index] = { ...updated[index], [field]: value };
    setPerformanceBonuses(updated);
  };

  const removePerformanceBonus = (index: number) => {
    setPerformanceBonuses(performanceBonuses.filter((_, i) => i !== index));
  };

  // Save service commissions and tiers when professional is saved
  const saveExtendedCommissions = async () => {
    if (!professionalId) return;

    try {
      // Save service commissions
      if (differentiatedEnabled) {
        // Delete existing and insert new
        await supabase
          .from('professional_service_commissions')
          .delete()
          .eq('professional_id', professionalId);

        for (const sc of serviceCommissions.filter((s) => s.service_id)) {
          await supabase.from('professional_service_commissions').insert({
            professional_id: professionalId,
            service_id: sc.service_id,
            commission_type: sc.commission_type,
            commission_value: sc.commission_value,
          });
        }
      }

      // Save tiers
      await supabase
        .from('professional_commission_tiers')
        .delete()
        .eq('professional_id', professionalId);

      if (progressiveEnabled) {
        for (const tier of progressiveTiers) {
          await supabase.from('professional_commission_tiers').insert({
            professional_id: professionalId,
            tier_type: 'progressive',
            min_value: tier.min_value,
            max_value: tier.max_value,
            commission_rate: tier.commission_rate,
            bonus_amount: 0,
          });
        }
      }

      if (performanceEnabled) {
        for (const bonus of performanceBonuses) {
          await supabase.from('professional_commission_tiers').insert({
            professional_id: professionalId,
            tier_type: 'performance',
            min_value: bonus.min_value,
            max_value: bonus.max_value || null,
            commission_rate: 0,
            bonus_amount: bonus.bonus_amount,
          });
        }
      }
    } catch (error: any) {
      throw error;
    }
  };

  // Expose save function through props or context
  useEffect(() => {
    (window as any).saveExtendedCommissions = saveExtendedCommissions;
    return () => {
      delete (window as any).saveExtendedCommissions;
    };
  }, [professionalId, serviceCommissions, progressiveTiers, performanceBonuses, differentiatedEnabled, progressiveEnabled, performanceEnabled]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isChairRental = commissionSettings.chair_rental_enabled;

  return (
    <div className="space-y-6">
      {isChairRental && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            O modo "Aluguel de Cadeira" está ativo. Neste modelo, o profissional paga um valor fixo à barbearia e não recebe comissões sobre serviços.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        {/* Aluguel de Cadeira */}
        <Card className={isChairRental ? 'border-primary' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Aluguel de Cadeira</CardTitle>
                <CardDescription>
                  Profissional paga valor fixo à barbearia (desativa outras comissões)
                </CardDescription>
              </div>
              <Switch
                checked={commissionSettings.chair_rental_enabled}
                onCheckedChange={(checked) => handleSettingChange('chair_rental_enabled', checked)}
                disabled={isReadOnly}
              />
            </div>
          </CardHeader>
          {commissionSettings.chair_rental_enabled && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={commissionSettings.chair_rental_amount}
                    onChange={(e) => handleSettingChange('chair_rental_amount', parseFloat(e.target.value) || 0)}
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <Label>Período</Label>
                  <Select
                    value={commissionSettings.chair_rental_period}
                    onValueChange={(value) => handleSettingChange('chair_rental_period', value)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {!isChairRental && (
          <>
            {/* Percentual por Serviço */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Percentual por Serviço</CardTitle>
                    <CardDescription>Porcentagem padrão sobre qualquer serviço</CardDescription>
                  </div>
                  <Switch
                    checked={commissionSettings.service_percentage_enabled}
                    onCheckedChange={(checked) => handleSettingChange('service_percentage_enabled', checked)}
                    disabled={isReadOnly}
                  />
                </div>
              </CardHeader>
              {commissionSettings.service_percentage_enabled && (
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={commissionSettings.service_percentage_rate}
                      onChange={(e) => handleSettingChange('service_percentage_rate', parseFloat(e.target.value) || 0)}
                      disabled={isReadOnly}
                      className="w-24"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Percentual sobre Faturamento Total */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Percentual sobre Faturamento Total</CardTitle>
                    <CardDescription>Porcentagem sobre o total bruto gerado</CardDescription>
                  </div>
                  <Switch
                    checked={commissionSettings.revenue_percentage_enabled}
                    onCheckedChange={(checked) => handleSettingChange('revenue_percentage_enabled', checked)}
                    disabled={isReadOnly}
                  />
                </div>
              </CardHeader>
              {commissionSettings.revenue_percentage_enabled && (
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={commissionSettings.revenue_percentage_rate}
                      onChange={(e) => handleSettingChange('revenue_percentage_rate', parseFloat(e.target.value) || 0)}
                      disabled={isReadOnly}
                      className="w-24"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Fixa por Serviço */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Valor Fixo por Serviço</CardTitle>
                    <CardDescription>Valor monetário fixo por atendimento</CardDescription>
                  </div>
                  <Switch
                    checked={commissionSettings.fixed_per_service_enabled}
                    onCheckedChange={(checked) => handleSettingChange('fixed_per_service_enabled', checked)}
                    disabled={isReadOnly}
                  />
                </div>
              </CardHeader>
              {commissionSettings.fixed_per_service_enabled && (
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">R$</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={commissionSettings.fixed_per_service_amount}
                      onChange={(e) => handleSettingChange('fixed_per_service_amount', parseFloat(e.target.value) || 0)}
                      disabled={isReadOnly}
                      className="w-32"
                    />
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Venda de Produtos */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Venda de Produtos</CardTitle>
                    <CardDescription>Porcentagem sobre venda de produtos/cosméticos</CardDescription>
                  </div>
                  <Switch
                    checked={commissionSettings.product_sales_enabled}
                    onCheckedChange={(checked) => handleSettingChange('product_sales_enabled', checked)}
                    disabled={isReadOnly}
                  />
                </div>
              </CardHeader>
              {commissionSettings.product_sales_enabled && (
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={commissionSettings.product_sales_percentage}
                      onChange={(e) => handleSettingChange('product_sales_percentage', parseFloat(e.target.value) || 0)}
                      disabled={isReadOnly}
                      className="w-24"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Pacotes/Combos */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Pacotes/Combos</CardTitle>
                    <CardDescription>Regra específica para combos</CardDescription>
                  </div>
                  <Switch
                    checked={commissionSettings.combo_enabled}
                    onCheckedChange={(checked) => handleSettingChange('combo_enabled', checked)}
                    disabled={isReadOnly}
                  />
                </div>
              </CardHeader>
              {commissionSettings.combo_enabled && (
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={commissionSettings.combo_percentage}
                      onChange={(e) => handleSettingChange('combo_percentage', parseFloat(e.target.value) || 0)}
                      disabled={isReadOnly}
                      className="w-24"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Diferenciada por Serviço */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Diferenciada por Serviço</CardTitle>
                    <CardDescription>Valores específicos para cada serviço</CardDescription>
                  </div>
                  <Switch
                    checked={differentiatedEnabled}
                    onCheckedChange={setDifferentiatedEnabled}
                    disabled={isReadOnly}
                  />
                </div>
              </CardHeader>
              {differentiatedEnabled && (
                <CardContent className="pt-0 space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Serviço</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {serviceCommissions.map((sc, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Select
                              value={sc.service_id}
                              onValueChange={(value) => updateServiceCommission(index, 'service_id', value)}
                              disabled={isReadOnly}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {services.map((service) => (
                                  <SelectItem key={service.id} value={service.id}>
                                    {service.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={sc.commission_type}
                              onValueChange={(value) => updateServiceCommission(index, 'commission_type', value)}
                              disabled={isReadOnly}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percentage">%</SelectItem>
                                <SelectItem value="fixed">R$</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={sc.commission_value}
                              onChange={(e) => updateServiceCommission(index, 'commission_value', parseFloat(e.target.value) || 0)}
                              disabled={isReadOnly}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            {!isReadOnly && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeServiceCommission(index)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {!isReadOnly && (
                    <Button variant="outline" size="sm" onClick={addServiceCommission}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Serviço
                    </Button>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Progressiva por Metas */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Progressiva por Metas</CardTitle>
                    <CardDescription>Faixas de comissão baseadas no faturamento</CardDescription>
                  </div>
                  <Switch
                    checked={progressiveEnabled}
                    onCheckedChange={setProgressiveEnabled}
                    disabled={isReadOnly}
                  />
                </div>
              </CardHeader>
              {progressiveEnabled && (
                <CardContent className="pt-0 space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>De (R$)</TableHead>
                        <TableHead>Até (R$)</TableHead>
                        <TableHead>Comissão (%)</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {progressiveTiers.map((tier, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={tier.min_value}
                              onChange={(e) => updateProgressiveTier(index, 'min_value', parseFloat(e.target.value) || 0)}
                              disabled={isReadOnly}
                              className="w-28"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={tier.max_value || ''}
                              onChange={(e) => updateProgressiveTier(index, 'max_value', e.target.value ? parseFloat(e.target.value) : null)}
                              disabled={isReadOnly}
                              placeholder="Sem limite"
                              className="w-28"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={tier.commission_rate}
                              onChange={(e) => updateProgressiveTier(index, 'commission_rate', parseFloat(e.target.value) || 0)}
                              disabled={isReadOnly}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            {!isReadOnly && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeProgressiveTier(index)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {!isReadOnly && (
                    <Button variant="outline" size="sm" onClick={addProgressiveTier}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Faixa
                    </Button>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Performance (Bônus) */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Performance (Bônus)</CardTitle>
                    <CardDescription>Bônus fixo ao atingir metas de atendimentos ou faturamento</CardDescription>
                  </div>
                  <Switch
                    checked={performanceEnabled}
                    onCheckedChange={setPerformanceEnabled}
                    disabled={isReadOnly}
                  />
                </div>
              </CardHeader>
              {performanceEnabled && (
                <CardContent className="pt-0 space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Meta Mínima (R$ ou Qtd)</TableHead>
                        <TableHead>Meta Máxima</TableHead>
                        <TableHead>Bônus (R$)</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {performanceBonuses.map((bonus, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={bonus.min_value}
                              onChange={(e) => updatePerformanceBonus(index, 'min_value', parseFloat(e.target.value) || 0)}
                              disabled={isReadOnly}
                              className="w-28"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={bonus.max_value || ''}
                              onChange={(e) => updatePerformanceBonus(index, 'max_value', e.target.value ? parseFloat(e.target.value) : null)}
                              disabled={isReadOnly}
                              placeholder="Sem limite"
                              className="w-28"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={bonus.bonus_amount}
                              onChange={(e) => updatePerformanceBonus(index, 'bonus_amount', parseFloat(e.target.value) || 0)}
                              disabled={isReadOnly}
                              className="w-28"
                            />
                          </TableCell>
                          <TableCell>
                            {!isReadOnly && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removePerformanceBonus(index)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {!isReadOnly && (
                    <Button variant="outline" size="sm" onClick={addPerformanceBonus}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Bônus
                    </Button>
                  )}
                </CardContent>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
