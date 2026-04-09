-- Create new app_module values for settings sub-modules
-- Note: Cannot alter enum in a single migration, so we'll use the existing 'settings' module

-- Create establishments table for store/business settings
CREATE TABLE public.establishments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  trade_name TEXT,
  document_number TEXT, -- CNPJ/CPF
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  logo_url TEXT,
  opening_hours JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;

-- RLS policies for establishments
CREATE POLICY "Authenticated users can view establishments"
  ON public.establishments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert establishments"
  ON public.establishments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update establishments"
  ON public.establishments FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Create business_rules table for business configuration
CREATE TABLE public.business_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies for business_rules
CREATE POLICY "Authenticated users can view business_rules"
  ON public.business_rules FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage business_rules"
  ON public.business_rules FOR ALL
  USING (auth.role() = 'authenticated');

-- Create integrations table for external service configurations
CREATE TABLE public.integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'payment', 'messaging', 'calendar', etc.
  provider TEXT NOT NULL, -- 'stripe', 'twilio', 'google', etc.
  is_active BOOLEAN NOT NULL DEFAULT false,
  config JSONB,
  credentials_encrypted TEXT, -- For storing encrypted API keys
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- RLS policies for integrations
CREATE POLICY "Authenticated users can view integrations"
  ON public.integrations FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage integrations"
  ON public.integrations FOR ALL
  USING (auth.role() = 'authenticated');

-- Create report_groups table for organizing reports
CREATE TABLE public.report_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.report_groups ENABLE ROW LEVEL SECURITY;

-- RLS policies for report_groups
CREATE POLICY "Authenticated users can view report_groups"
  ON public.report_groups FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage report_groups"
  ON public.report_groups FOR ALL
  USING (auth.role() = 'authenticated');

-- Create report_definitions table for individual report configurations
CREATE TABLE public.report_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.report_groups(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'sales', 'marketing', 'financial', 'clients', etc.
  query_config JSONB, -- Stores the query/filter configuration
  visualization_type TEXT, -- 'table', 'chart', 'card', etc.
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.report_definitions ENABLE ROW LEVEL SECURITY;

-- RLS policies for report_definitions
CREATE POLICY "Authenticated users can view report_definitions"
  ON public.report_definitions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage report_definitions"
  ON public.report_definitions FOR ALL
  USING (auth.role() = 'authenticated');

-- Create triggers for updated_at
CREATE TRIGGER update_establishments_updated_at
  BEFORE UPDATE ON public.establishments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_rules_updated_at
  BEFORE UPDATE ON public.business_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_report_groups_updated_at
  BEFORE UPDATE ON public.report_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_report_definitions_updated_at
  BEFORE UPDATE ON public.report_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default report groups
INSERT INTO public.report_groups (name, description, icon, color, sort_order) VALUES
  ('Vendas', 'Relatórios de vendas e faturamento', 'TrendingUp', 'blue', 1),
  ('Marketing', 'Relatórios de campanhas e engajamento', 'Megaphone', 'purple', 2),
  ('Financeiro', 'Relatórios financeiros e DRE', 'DollarSign', 'green', 3),
  ('Clientes', 'Relatórios de base de clientes', 'Users', 'orange', 4),
  ('Operacional', 'Relatórios de agendamentos e profissionais', 'Calendar', 'cyan', 5);