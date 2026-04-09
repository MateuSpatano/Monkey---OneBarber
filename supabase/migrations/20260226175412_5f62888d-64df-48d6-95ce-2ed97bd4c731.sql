
-- Add image and body fields to campaigns
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS body_whatsapp TEXT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS body_email TEXT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'whatsapp';

-- Add campaign_id to automations for linking
ALTER TABLE public.automations ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id);

-- Create communication_templates table
CREATE TABLE public.communication_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp', -- whatsapp, email
  action_type TEXT NOT NULL DEFAULT 'custom', -- new_client, appointment_completed, birthday, inactivity, points_reached, custom
  subject TEXT, -- for email
  body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.communication_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view templates"
ON public.communication_templates FOR SELECT
USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'marketing'::app_module, 'view'::permission_action));

CREATE POLICY "Staff can create templates"
ON public.communication_templates FOR INSERT
WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'marketing'::app_module, 'create'::permission_action));

CREATE POLICY "Staff can update templates"
ON public.communication_templates FOR UPDATE
USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'marketing'::app_module, 'edit'::permission_action));

CREATE POLICY "Staff can delete templates"
ON public.communication_templates FOR DELETE
USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'marketing'::app_module, 'delete'::permission_action));

-- Add template_id to automations
ALTER TABLE public.automations ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.communication_templates(id);

-- Trigger for updated_at
CREATE TRIGGER update_communication_templates_updated_at
BEFORE UPDATE ON public.communication_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for campaign images
INSERT INTO storage.buckets (id, name, public) VALUES ('campaign-images', 'campaign-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for campaign images
CREATE POLICY "Anyone can view campaign images"
ON storage.objects FOR SELECT
USING (bucket_id = 'campaign-images');

CREATE POLICY "Authenticated users can upload campaign images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'campaign-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update campaign images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'campaign-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete campaign images"
ON storage.objects FOR DELETE
USING (bucket_id = 'campaign-images' AND auth.uid() IS NOT NULL);
