-- Add type and fiscal fields to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'product' CHECK (type IN ('product', 'service')),
ADD COLUMN IF NOT EXISTS ncm TEXT,
ADD COLUMN IF NOT EXISTS cest TEXT,
ADD COLUMN IF NOT EXISTS cfop TEXT,
ADD COLUMN IF NOT EXISTS csosn TEXT,
ADD COLUMN IF NOT EXISTS origin TEXT,
ADD COLUMN IF NOT EXISTS icms_rate DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS service_code TEXT,
ADD COLUMN IF NOT EXISTS iss_rate DECIMAL(5,2);

-- Create table for raw materials (matéria prima) consumption
CREATE TABLE IF NOT EXISTS public.product_raw_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_service_product UNIQUE (service_id, product_id),
  CONSTRAINT different_service_product CHECK (service_id != product_id)
);

-- Enable RLS
ALTER TABLE public.product_raw_materials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for product_raw_materials
CREATE POLICY "Anyone can view raw materials" 
ON public.product_raw_materials 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create raw materials" 
ON public.product_raw_materials 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update raw materials" 
ON public.product_raw_materials 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete raw materials" 
ON public.product_raw_materials 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_product_raw_materials_updated_at
BEFORE UPDATE ON public.product_raw_materials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();