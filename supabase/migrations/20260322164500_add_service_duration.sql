-- Add duration_minutes to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 30;

-- Add duration_minutes to appointments table
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 30;

-- Update existing services to have a default duration of 30 minutes
UPDATE public.products SET duration_minutes = 30 WHERE type = 'service' AND (duration_minutes IS NULL OR duration_minutes = 0);

-- Update existing appointments to have a default duration of 30 minutes
UPDATE public.appointments SET duration_minutes = 30 WHERE duration_minutes IS NULL OR duration_minutes = 0;
