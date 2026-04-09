
-- Create user_establishments junction table
CREATE TABLE public.user_establishments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  is_owner BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, establishment_id)
);

ALTER TABLE public.user_establishments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage user_establishments"
  ON public.user_establishments FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view their own establishments"
  ON public.user_establishments FOR SELECT
  USING (auth.uid() = user_id);

-- Add establishment_id to professionals
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id) ON DELETE SET NULL;

-- Add establishment_id to appointments  
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id) ON DELETE SET NULL;

-- Add establishment_id to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id) ON DELETE SET NULL;

-- Create storage bucket for establishment logos
INSERT INTO storage.buckets (id, name, public) VALUES ('establishment-logos', 'establishment-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view establishment logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'establishment-logos');

CREATE POLICY "Admins can upload establishment logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'establishment-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Admins can update establishment logos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'establishment-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Admins can delete establishment logos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'establishment-logos' AND auth.role() = 'authenticated');

-- Create storage bucket for user avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('user-avatars', 'user-avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view user avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-avatars');

CREATE POLICY "Authenticated users can upload user avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'user-avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update user avatars"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'user-avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete user avatars"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'user-avatars' AND auth.role() = 'authenticated');

-- Update establishments RLS to allow admin full access
DROP POLICY IF EXISTS "Authenticated users can manage establishments" ON public.establishments;
DROP POLICY IF EXISTS "Authenticated users can view establishments" ON public.establishments;

CREATE POLICY "Admins can manage establishments"
  ON public.establishments FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view establishments"
  ON public.establishments FOR SELECT
  USING (auth.role() = 'authenticated');

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_establishments_user_id ON public.user_establishments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_establishments_establishment_id ON public.user_establishments(establishment_id);
CREATE INDEX IF NOT EXISTS idx_professionals_establishment_id ON public.professionals(establishment_id);
CREATE INDEX IF NOT EXISTS idx_appointments_establishment_id ON public.appointments(establishment_id);
CREATE INDEX IF NOT EXISTS idx_clients_establishment_id ON public.clients(establishment_id);
