-- =====================
-- Tabela: Campanhas
-- =====================
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  budget NUMERIC DEFAULT 0,
  spent NUMERIC DEFAULT 0,
  status public.campaign_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with view permission can see campaigns" ON public.campaigns
  FOR SELECT USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'marketing'::app_module, 'view'::permission_action));

CREATE POLICY "Users with create permission can insert campaigns" ON public.campaigns
  FOR INSERT WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'marketing'::app_module, 'create'::permission_action));

CREATE POLICY "Users with edit permission can update campaigns" ON public.campaigns
  FOR UPDATE USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'marketing'::app_module, 'edit'::permission_action));

CREATE POLICY "Users with delete permission can delete campaigns" ON public.campaigns
  FOR DELETE USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'marketing'::app_module, 'delete'::permission_action));

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaigns_dates ON public.campaigns(start_date, end_date);

-- =====================
-- Tabela: Automações
-- =====================
CREATE TABLE public.automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger public.automation_trigger NOT NULL,
  trigger_config JSONB DEFAULT '{}',
  action public.automation_action NOT NULL,
  action_config JSONB DEFAULT '{}',
  status public.automation_status NOT NULL DEFAULT 'draft',
  last_executed_at TIMESTAMP WITH TIME ZONE,
  execution_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with view permission can see automations" ON public.automations
  FOR SELECT USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'marketing'::app_module, 'view'::permission_action));

CREATE POLICY "Users with create permission can insert automations" ON public.automations
  FOR INSERT WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'marketing'::app_module, 'create'::permission_action));

CREATE POLICY "Users with edit permission can update automations" ON public.automations
  FOR UPDATE USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'marketing'::app_module, 'edit'::permission_action));

CREATE POLICY "Users with delete permission can delete automations" ON public.automations
  FOR DELETE USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'marketing'::app_module, 'delete'::permission_action));

CREATE TRIGGER update_automations_updated_at
  BEFORE UPDATE ON public.automations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_automations_status ON public.automations(status);

-- =====================
-- Tabela: Comunicações
-- =====================
CREATE TABLE public.communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  type public.communication_type NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  status public.communication_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  automation_id UUID REFERENCES public.automations(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with view permission can see communications" ON public.communications
  FOR SELECT USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'marketing'::app_module, 'view'::permission_action));

CREATE POLICY "Users with create permission can insert communications" ON public.communications
  FOR INSERT WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'marketing'::app_module, 'create'::permission_action));

CREATE POLICY "Users with edit permission can update communications" ON public.communications
  FOR UPDATE USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'marketing'::app_module, 'edit'::permission_action));

CREATE POLICY "Users with delete permission can delete communications" ON public.communications
  FOR DELETE USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'marketing'::app_module, 'delete'::permission_action));

CREATE TRIGGER update_communications_updated_at
  BEFORE UPDATE ON public.communications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_communications_type ON public.communications(type);
CREATE INDEX idx_communications_status ON public.communications(status);
CREATE INDEX idx_communications_client ON public.communications(client_id);

-- =====================
-- Tabela: Fidelidade (Pontos)
-- =====================
CREATE TABLE public.loyalty_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  last_interaction_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  tier TEXT DEFAULT 'bronze',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with view permission can see loyalty_points" ON public.loyalty_points
  FOR SELECT USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'marketing'::app_module, 'view'::permission_action));

CREATE POLICY "Users with create permission can insert loyalty_points" ON public.loyalty_points
  FOR INSERT WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'marketing'::app_module, 'create'::permission_action));

CREATE POLICY "Users with edit permission can update loyalty_points" ON public.loyalty_points
  FOR UPDATE USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'marketing'::app_module, 'edit'::permission_action));

CREATE POLICY "Users with delete permission can delete loyalty_points" ON public.loyalty_points
  FOR DELETE USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'marketing'::app_module, 'delete'::permission_action));

CREATE TRIGGER update_loyalty_points_updated_at
  BEFORE UPDATE ON public.loyalty_points
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_loyalty_points_client ON public.loyalty_points(client_id);

-- =====================
-- Tabela: Histórico de Pontos
-- =====================
CREATE TABLE public.loyalty_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with view permission can see loyalty_transactions" ON public.loyalty_transactions
  FOR SELECT USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'marketing'::app_module, 'view'::permission_action));

CREATE POLICY "Users with create permission can insert loyalty_transactions" ON public.loyalty_transactions
  FOR INSERT WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'marketing'::app_module, 'create'::permission_action));

CREATE INDEX idx_loyalty_transactions_client ON public.loyalty_transactions(client_id);

-- =====================
-- Tabela: Comissões
-- =====================
CREATE TABLE public.commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  reference_date DATE NOT NULL,
  payment_status public.commission_payment_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with view permission can see commissions" ON public.commissions
  FOR SELECT USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'financial'::app_module, 'view'::permission_action));

CREATE POLICY "Users with create permission can insert commissions" ON public.commissions
  FOR INSERT WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'financial'::app_module, 'create'::permission_action));

CREATE POLICY "Users with edit permission can update commissions" ON public.commissions
  FOR UPDATE USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'financial'::app_module, 'edit'::permission_action));

CREATE POLICY "Users with delete permission can delete commissions" ON public.commissions
  FOR DELETE USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'financial'::app_module, 'delete'::permission_action));

CREATE TRIGGER update_commissions_updated_at
  BEFORE UPDATE ON public.commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_commissions_professional ON public.commissions(professional_id);
CREATE INDEX idx_commissions_status ON public.commissions(payment_status);
CREATE INDEX idx_commissions_date ON public.commissions(reference_date);

-- =====================
-- Inserir permissões para marketing
-- =====================
INSERT INTO public.permissions (module, action, description) VALUES
  ('marketing', 'view', 'Visualizar marketing'),
  ('marketing', 'create', 'Criar itens de marketing'),
  ('marketing', 'edit', 'Editar itens de marketing'),
  ('marketing', 'delete', 'Excluir itens de marketing')
ON CONFLICT DO NOTHING;