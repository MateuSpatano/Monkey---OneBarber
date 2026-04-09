-- Add new columns to professionals table
ALTER TABLE public.professionals 
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS zip_code text,
ADD COLUMN IF NOT EXISTS street text,
ADD COLUMN IF NOT EXISTS neighborhood text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text;

-- Create professional_attachments table for documents
CREATE TABLE IF NOT EXISTS public.professional_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size integer,
  document_type text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on professional_attachments
ALTER TABLE public.professional_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for professional_attachments
CREATE POLICY "Users with view permission can see attachments" ON public.professional_attachments
  FOR SELECT USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'professionals'::app_module, 'view'::permission_action));

CREATE POLICY "Users with create permission can insert attachments" ON public.professional_attachments
  FOR INSERT WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'professionals'::app_module, 'create'::permission_action));

CREATE POLICY "Users with edit permission can update attachments" ON public.professional_attachments
  FOR UPDATE USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'professionals'::app_module, 'edit'::permission_action));

CREATE POLICY "Users with delete permission can delete attachments" ON public.professional_attachments
  FOR DELETE USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'professionals'::app_module, 'delete'::permission_action));

-- Create professional_commission_settings table for commission configuration
CREATE TABLE IF NOT EXISTS public.professional_commission_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  
  -- Percentual por Serviço
  service_percentage_enabled boolean DEFAULT false,
  service_percentage_rate numeric DEFAULT 0,
  
  -- Percentual sobre Faturamento Total
  revenue_percentage_enabled boolean DEFAULT false,
  revenue_percentage_rate numeric DEFAULT 0,
  
  -- Fixa por Serviço
  fixed_per_service_enabled boolean DEFAULT false,
  fixed_per_service_amount numeric DEFAULT 0,
  
  -- Venda de Produtos
  product_sales_enabled boolean DEFAULT false,
  product_sales_percentage numeric DEFAULT 0,
  
  -- Pacotes/Combos
  combo_enabled boolean DEFAULT false,
  combo_percentage numeric DEFAULT 0,
  
  -- Aluguel de Cadeira (inverts the logic - professional pays)
  chair_rental_enabled boolean DEFAULT false,
  chair_rental_amount numeric DEFAULT 0,
  chair_rental_period text DEFAULT 'monthly', -- 'daily' or 'monthly'
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_professional_commission UNIQUE (professional_id)
);

-- Enable RLS on professional_commission_settings
ALTER TABLE public.professional_commission_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for professional_commission_settings
CREATE POLICY "Users with view permission can see commission settings" ON public.professional_commission_settings
  FOR SELECT USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'professionals'::app_module, 'view'::permission_action));

CREATE POLICY "Users with create permission can insert commission settings" ON public.professional_commission_settings
  FOR INSERT WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'professionals'::app_module, 'create'::permission_action));

CREATE POLICY "Users with edit permission can update commission settings" ON public.professional_commission_settings
  FOR UPDATE USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'professionals'::app_module, 'edit'::permission_action));

CREATE POLICY "Users with delete permission can delete commission settings" ON public.professional_commission_settings
  FOR DELETE USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'professionals'::app_module, 'delete'::permission_action));

-- Create professional_service_commissions table for differentiated service commissions
CREATE TABLE IF NOT EXISTS public.professional_service_commissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  commission_type text NOT NULL DEFAULT 'percentage', -- 'percentage' or 'fixed'
  commission_value numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_professional_service UNIQUE (professional_id, service_id)
);

-- Enable RLS on professional_service_commissions
ALTER TABLE public.professional_service_commissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for professional_service_commissions
CREATE POLICY "Users with view permission can see service commissions" ON public.professional_service_commissions
  FOR SELECT USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'professionals'::app_module, 'view'::permission_action));

CREATE POLICY "Users with create permission can insert service commissions" ON public.professional_service_commissions
  FOR INSERT WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'professionals'::app_module, 'create'::permission_action));

CREATE POLICY "Users with edit permission can update service commissions" ON public.professional_service_commissions
  FOR UPDATE USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'professionals'::app_module, 'edit'::permission_action));

CREATE POLICY "Users with delete permission can delete service commissions" ON public.professional_service_commissions
  FOR DELETE USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'professionals'::app_module, 'delete'::permission_action));

-- Create professional_commission_tiers table for progressive commission tiers
CREATE TABLE IF NOT EXISTS public.professional_commission_tiers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  tier_type text NOT NULL DEFAULT 'progressive', -- 'progressive' for revenue tiers, 'performance' for bonus
  min_value numeric NOT NULL DEFAULT 0,
  max_value numeric,
  commission_rate numeric NOT NULL DEFAULT 0,
  bonus_amount numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on professional_commission_tiers
ALTER TABLE public.professional_commission_tiers ENABLE ROW LEVEL SECURITY;

-- RLS policies for professional_commission_tiers
CREATE POLICY "Users with view permission can see commission tiers" ON public.professional_commission_tiers
  FOR SELECT USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'professionals'::app_module, 'view'::permission_action));

CREATE POLICY "Users with create permission can insert commission tiers" ON public.professional_commission_tiers
  FOR INSERT WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'professionals'::app_module, 'create'::permission_action));

CREATE POLICY "Users with edit permission can update commission tiers" ON public.professional_commission_tiers
  FOR UPDATE USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'professionals'::app_module, 'edit'::permission_action));

CREATE POLICY "Users with delete permission can delete commission tiers" ON public.professional_commission_tiers
  FOR DELETE USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'professionals'::app_module, 'delete'::permission_action));

-- Create storage buckets for professional files
INSERT INTO storage.buckets (id, name, public)
VALUES ('professional-avatars', 'professional-avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('professional-attachments', 'professional-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for professional-avatars (public bucket)
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'professional-avatars');

CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'professional-avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update avatars" ON storage.objects
  FOR UPDATE USING (bucket_id = 'professional-avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete avatars" ON storage.objects
  FOR DELETE USING (bucket_id = 'professional-avatars' AND auth.uid() IS NOT NULL);

-- Storage policies for professional-attachments (private bucket)
CREATE POLICY "Authenticated users can view attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'professional-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload attachments" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'professional-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update attachments" ON storage.objects
  FOR UPDATE USING (bucket_id = 'professional-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete attachments" ON storage.objects
  FOR DELETE USING (bucket_id = 'professional-attachments' AND auth.uid() IS NOT NULL);