
-- Add loyalty configuration to business_rules if not exists
-- We'll use business_rules table for loyalty_enabled and loyalty_points_goal

-- Add realtime for support_ticket_messages (needed later for Block 4, but useful to have)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_messages;

-- Create loyalty_rewards table for tracking redeemable rewards
CREATE TABLE public.loyalty_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  establishment_id UUID REFERENCES public.establishments(id),
  reward_type TEXT NOT NULL DEFAULT 'free_cut',
  status TEXT NOT NULL DEFAULT 'available', -- available, redeemed, expired
  points_used INTEGER NOT NULL DEFAULT 0,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  appointment_id UUID REFERENCES public.appointments(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;

-- RLS policies for loyalty_rewards
CREATE POLICY "Staff can view loyalty rewards"
ON public.loyalty_rewards FOR SELECT
USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'marketing'::app_module, 'view'::permission_action));

CREATE POLICY "Staff can create loyalty rewards"
ON public.loyalty_rewards FOR INSERT
WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'marketing'::app_module, 'create'::permission_action));

CREATE POLICY "Staff can update loyalty rewards"
ON public.loyalty_rewards FOR UPDATE
USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'marketing'::app_module, 'edit'::permission_action));

CREATE POLICY "Clients can view their own rewards"
ON public.loyalty_rewards FOR SELECT
USING (is_client(auth.uid()) AND client_id IN (
  SELECT id FROM clients WHERE email = get_auth_email()
));

-- Add establishment_id to loyalty_points if not exists
ALTER TABLE public.loyalty_points ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id);

-- Trigger for updated_at
CREATE TRIGGER update_loyalty_rewards_updated_at
BEFORE UPDATE ON public.loyalty_rewards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
