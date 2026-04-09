-- Create transaction status enum
CREATE TYPE public.transaction_status AS ENUM ('pending', 'confirmed', 'reversed', 'cancelled');

-- Create financial_transactions table
CREATE TABLE public.financial_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type public.cash_movement_type NOT NULL,
  status public.transaction_status NOT NULL DEFAULT 'pending',
  origin public.cash_movement_origin NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  professional_id UUID REFERENCES public.professionals(id),
  category public.expense_category,
  payment_method public.payment_method,
  amount_gross NUMERIC NOT NULL,
  fee_amount NUMERIC NOT NULL DEFAULT 0,
  amount_net NUMERIC GENERATED ALWAYS AS (amount_gross - fee_amount) STORED,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cash_register_id UUID REFERENCES public.cash_registers(id),
  cash_movement_id UUID REFERENCES public.cash_register_movements(id),
  is_immutable BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_financial_transactions_occurred_at ON public.financial_transactions(occurred_at);
CREATE INDEX idx_financial_transactions_status_type ON public.financial_transactions(status, type);
CREATE INDEX idx_financial_transactions_reference ON public.financial_transactions(reference_id);
CREATE INDEX idx_financial_transactions_cash_register ON public.financial_transactions(cash_register_id);

-- Enable RLS
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for financial_transactions
CREATE POLICY "Users with view permission can see transactions"
  ON public.financial_transactions FOR SELECT
  USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'financial', 'view'));

CREATE POLICY "Users with create permission can insert transactions"
  ON public.financial_transactions FOR INSERT
  WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'financial', 'create'));

CREATE POLICY "Users with edit permission can update transactions"
  ON public.financial_transactions FOR UPDATE
  USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'financial', 'edit'));

CREATE POLICY "Users with delete permission can delete transactions"
  ON public.financial_transactions FOR DELETE
  USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'financial', 'delete'));

-- Trigger for updated_at
CREATE TRIGGER update_financial_transactions_updated_at
  BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to confirm payment and create transaction + cash movement atomically
CREATE OR REPLACE FUNCTION public.confirm_payment(
  p_type public.cash_movement_type,
  p_origin public.cash_movement_origin,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_professional_id UUID DEFAULT NULL,
  p_category public.expense_category DEFAULT NULL,
  p_payment_method public.payment_method DEFAULT NULL,
  p_amount_gross NUMERIC DEFAULT 0,
  p_fee_amount NUMERIC DEFAULT 0,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cash_register_id UUID;
  v_cash_movement_id UUID;
  v_transaction_id UUID;
  v_movement_type public.cash_movement_type;
BEGIN
  -- Get open cash register
  SELECT id INTO v_cash_register_id FROM public.cash_registers WHERE status = 'open' LIMIT 1;
  
  IF v_cash_register_id IS NULL THEN
    RAISE EXCEPTION 'Não há caixa aberto. Abra um caixa antes de confirmar o pagamento.';
  END IF;
  
  -- Determine movement type based on transaction type
  v_movement_type := p_type;
  
  -- Create cash register movement
  INSERT INTO public.cash_register_movements (
    cash_register_id,
    type,
    origin,
    category,
    payment_method,
    amount,
    description,
    created_by_user_id,
    reference_id,
    is_immutable
  ) VALUES (
    v_cash_register_id,
    v_movement_type,
    p_origin,
    p_category,
    p_payment_method,
    p_amount_gross,
    p_description,
    auth.uid(),
    p_reference_id,
    CASE WHEN p_origin IN ('sale', 'appointment') THEN true ELSE false END
  ) RETURNING id INTO v_cash_movement_id;
  
  -- Create financial transaction
  INSERT INTO public.financial_transactions (
    type,
    status,
    origin,
    reference_type,
    reference_id,
    professional_id,
    category,
    payment_method,
    amount_gross,
    fee_amount,
    description,
    cash_register_id,
    cash_movement_id,
    is_immutable
  ) VALUES (
    p_type,
    'confirmed',
    p_origin,
    p_reference_type,
    p_reference_id,
    p_professional_id,
    p_category,
    p_payment_method,
    p_amount_gross,
    p_fee_amount,
    p_description,
    v_cash_register_id,
    v_cash_movement_id,
    CASE WHEN p_origin IN ('sale', 'appointment') THEN true ELSE false END
  ) RETURNING id INTO v_transaction_id;
  
  -- Create audit log
  INSERT INTO public.financial_audit_logs (
    entity_type,
    entity_id,
    action,
    user_id,
    after_data
  ) VALUES (
    'financial_transaction',
    v_transaction_id,
    'create',
    auth.uid(),
    jsonb_build_object(
      'type', p_type,
      'origin', p_origin,
      'amount', p_amount_gross,
      'payment_method', p_payment_method
    )
  );
  
  RETURN v_transaction_id;
END;
$$;

-- Function to reverse a transaction (admin only)
CREATE OR REPLACE FUNCTION public.reverse_transaction(
  p_transaction_id UUID,
  p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_original RECORD;
  v_cash_register_id UUID;
  v_reversal_movement_id UUID;
  v_reversal_transaction_id UUID;
  v_reversal_type public.cash_movement_type;
BEGIN
  -- Check if user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem estornar lançamentos.';
  END IF;
  
  -- Get original transaction
  SELECT * INTO v_original FROM public.financial_transactions WHERE id = p_transaction_id;
  
  IF v_original IS NULL THEN
    RAISE EXCEPTION 'Lançamento não encontrado.';
  END IF;
  
  IF v_original.status = 'reversed' THEN
    RAISE EXCEPTION 'Este lançamento já foi estornado.';
  END IF;
  
  IF v_original.status != 'confirmed' THEN
    RAISE EXCEPTION 'Apenas lançamentos confirmados podem ser estornados.';
  END IF;
  
  -- Get open cash register
  SELECT id INTO v_cash_register_id FROM public.cash_registers WHERE status = 'open' LIMIT 1;
  
  IF v_cash_register_id IS NULL THEN
    RAISE EXCEPTION 'Não há caixa aberto. Abra um caixa antes de estornar.';
  END IF;
  
  -- Determine reversal movement type (inverse of original)
  v_reversal_type := CASE 
    WHEN v_original.type = 'income' THEN 'expense'::public.cash_movement_type
    WHEN v_original.type = 'expense' THEN 'income'::public.cash_movement_type
    ELSE 'reversal'::public.cash_movement_type
  END;
  
  -- Create reversal cash movement
  INSERT INTO public.cash_register_movements (
    cash_register_id,
    type,
    origin,
    category,
    payment_method,
    amount,
    description,
    created_by_user_id,
    reference_id,
    is_immutable
  ) VALUES (
    v_cash_register_id,
    'reversal',
    'adjustment',
    v_original.category,
    v_original.payment_method,
    v_original.amount_gross,
    'Estorno: ' || COALESCE(p_reason, 'Sem motivo informado'),
    auth.uid(),
    p_transaction_id,
    true
  ) RETURNING id INTO v_reversal_movement_id;
  
  -- Create reversal transaction
  INSERT INTO public.financial_transactions (
    type,
    status,
    origin,
    reference_type,
    reference_id,
    professional_id,
    category,
    payment_method,
    amount_gross,
    fee_amount,
    description,
    cash_register_id,
    cash_movement_id,
    is_immutable
  ) VALUES (
    'reversal',
    'confirmed',
    'adjustment',
    'transaction',
    p_transaction_id,
    v_original.professional_id,
    v_original.category,
    v_original.payment_method,
    v_original.amount_gross,
    v_original.fee_amount,
    'Estorno: ' || COALESCE(p_reason, 'Sem motivo informado'),
    v_cash_register_id,
    v_reversal_movement_id,
    true
  ) RETURNING id INTO v_reversal_transaction_id;
  
  -- Update original transaction status
  UPDATE public.financial_transactions 
  SET status = 'reversed', updated_at = now()
  WHERE id = p_transaction_id;
  
  -- Create audit logs
  INSERT INTO public.financial_audit_logs (
    entity_type,
    entity_id,
    action,
    user_id,
    before_data,
    after_data,
    reason
  ) VALUES (
    'financial_transaction',
    p_transaction_id,
    'reversal',
    auth.uid(),
    jsonb_build_object('status', v_original.status),
    jsonb_build_object('status', 'reversed'),
    p_reason
  );
  
  RETURN v_reversal_transaction_id;
END;
$$;