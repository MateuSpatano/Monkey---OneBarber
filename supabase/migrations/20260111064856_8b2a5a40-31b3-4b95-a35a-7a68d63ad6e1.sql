-- Step 1: Add new modules to app_module enum
ALTER TYPE public.app_module ADD VALUE IF NOT EXISTS 'clients';
ALTER TYPE public.app_module ADD VALUE IF NOT EXISTS 'professionals';
ALTER TYPE public.app_module ADD VALUE IF NOT EXISTS 'products';