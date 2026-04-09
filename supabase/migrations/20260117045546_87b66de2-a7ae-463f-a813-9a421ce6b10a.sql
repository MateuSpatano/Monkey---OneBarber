-- Add address fields to clients table for progressive disclosure form
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS neighborhood TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.clients.zip_code IS 'CEP do cliente';
COMMENT ON COLUMN public.clients.street IS 'Logradouro completo';
COMMENT ON COLUMN public.clients.neighborhood IS 'Bairro';
COMMENT ON COLUMN public.clients.city IS 'Cidade';
COMMENT ON COLUMN public.clients.state IS 'Estado (UF)';