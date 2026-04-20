-- Mission 2: Add banner_url column to establishments
ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS banner_url text;
