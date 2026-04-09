-- Adicionar novos módulos ao enum app_module
ALTER TYPE public.app_module ADD VALUE IF NOT EXISTS 'marketing';
ALTER TYPE public.app_module ADD VALUE IF NOT EXISTS 'reports';