-- Create enums for cash register
CREATE TYPE public.cash_register_status AS ENUM ('open', 'closed');
CREATE TYPE public.cash_movement_type AS ENUM ('income', 'expense', 'adjustment', 'reversal');
CREATE TYPE public.cash_movement_origin AS ENUM ('sale', 'appointment', 'manual', 'adjustment');
CREATE TYPE public.payment_method AS ENUM ('cash', 'pix', 'card_credit', 'card_debit', 'other');
CREATE TYPE public.expense_category AS ENUM ('purchase', 'maintenance', 'marketing', 'professional_advance', 'other');

-- Add 'financial' to app_module enum if not exists
ALTER TYPE public.app_module ADD VALUE IF NOT EXISTS 'financial';

-- Create cash_registers table
CREATE TABLE public.cash_registers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status cash_register_status NOT NULL DEFAULT 'open',
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  opened_by_user_id UUID NOT NULL,
  opening_cash_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes_opening TEXT,
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by_user_id UUID,
  closing_cash_counted NUMERIC(12,2),
  expected_cash_amount NUMERIC(12,2),
  cash_difference NUMERIC(12,2),
  closing_payment_summary JSONB,
  notes_closing TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cash_register_movements table
CREATE TABLE public.cash_register_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cash_register_id UUID NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  type cash_movement_type NOT NULL,
  origin cash_movement_origin NOT NULL,
  payment_method payment_method,
  category expense_category,
  amount NUMERIC(12,2) NOT NULL,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by_user_id UUID,
  reference_id UUID,
  description TEXT,
  is_immutable BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create financial_audit_logs table
CREATE TABLE public.financial_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  user_id UUID NOT NULL,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  before_data JSONB,
  after_data JSONB,
  reason TEXT
);

-- Enable RLS
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_register_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cash_registers
CREATE POLICY "Users with view permission can see cash_registers"
ON public.cash_registers FOR SELECT
USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'financial'::app_module, 'view'::permission_action));

CREATE POLICY "Users with create permission can insert cash_registers"
ON public.cash_registers FOR INSERT
WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'financial'::app_module, 'create'::permission_action));

CREATE POLICY "Users with edit permission can update cash_registers"
ON public.cash_registers FOR UPDATE
USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'financial'::app_module, 'edit'::permission_action));

CREATE POLICY "Users with delete permission can delete cash_registers"
ON public.cash_registers FOR DELETE
USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'financial'::app_module, 'delete'::permission_action));

-- RLS Policies for cash_register_movements
CREATE POLICY "Users with view permission can see movements"
ON public.cash_register_movements FOR SELECT
USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'financial'::app_module, 'view'::permission_action));

CREATE POLICY "Users with create permission can insert movements"
ON public.cash_register_movements FOR INSERT
WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'financial'::app_module, 'create'::permission_action));

CREATE POLICY "Users with edit permission can update movements"
ON public.cash_register_movements FOR UPDATE
USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'financial'::app_module, 'edit'::permission_action));

CREATE POLICY "Users with delete permission can delete movements"
ON public.cash_register_movements FOR DELETE
USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'financial'::app_module, 'delete'::permission_action));

-- RLS Policies for financial_audit_logs (read-only for authorized users)
CREATE POLICY "Users with view permission can see audit logs"
ON public.financial_audit_logs FOR SELECT
USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'financial'::app_module, 'view'::permission_action));

CREATE POLICY "System can insert audit logs"
ON public.financial_audit_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create triggers for updated_at
CREATE TRIGGER update_cash_registers_updated_at
BEFORE UPDATE ON public.cash_registers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cash_register_movements_updated_at
BEFORE UPDATE ON public.cash_register_movements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check if there's an open cash register
CREATE OR REPLACE FUNCTION public.get_open_cash_register()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.cash_registers WHERE status = 'open' LIMIT 1
$$;

-- Function to calculate cash register totals
CREATE OR REPLACE FUNCTION public.calculate_cash_register_totals(register_id UUID)
RETURNS TABLE (
  total_income_cash NUMERIC,
  total_income_pix NUMERIC,
  total_income_card_credit NUMERIC,
  total_income_card_debit NUMERIC,
  total_income_other NUMERIC,
  total_expenses NUMERIC,
  total_expenses_cash NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'income' AND payment_method = 'cash' THEN amount ELSE 0 END), 0) as total_income_cash,
    COALESCE(SUM(CASE WHEN type = 'income' AND payment_method = 'pix' THEN amount ELSE 0 END), 0) as total_income_pix,
    COALESCE(SUM(CASE WHEN type = 'income' AND payment_method = 'card_credit' THEN amount ELSE 0 END), 0) as total_income_card_credit,
    COALESCE(SUM(CASE WHEN type = 'income' AND payment_method = 'card_debit' THEN amount ELSE 0 END), 0) as total_income_card_debit,
    COALESCE(SUM(CASE WHEN type = 'income' AND payment_method = 'other' THEN amount ELSE 0 END), 0) as total_income_other,
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
    COALESCE(SUM(CASE WHEN type = 'expense' AND (payment_method = 'cash' OR payment_method IS NULL) THEN amount ELSE 0 END), 0) as total_expenses_cash
  FROM public.cash_register_movements
  WHERE cash_register_id = register_id
$$;

-- Insert financial permissions
INSERT INTO public.permissions (module, action, description) VALUES
  ('financial', 'view', 'Visualizar módulo financeiro'),
  ('financial', 'create', 'Criar registros financeiros'),
  ('financial', 'edit', 'Editar registros financeiros'),
  ('financial', 'delete', 'Excluir registros financeiros')
ON CONFLICT DO NOTHING;