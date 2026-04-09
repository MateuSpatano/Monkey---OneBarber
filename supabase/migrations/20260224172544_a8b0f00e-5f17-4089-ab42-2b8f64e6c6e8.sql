
-- Professional availability (recurring schedule per day of week)
CREATE TABLE public.professional_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  slot_interval INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(professional_id, day_of_week, start_time)
);

ALTER TABLE public.professional_availability ENABLE ROW LEVEL SECURITY;

-- Professional availability exceptions (block/open specific dates)
CREATE TABLE public.professional_availability_exceptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT false,
  start_time TIME,
  end_time TIME,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create unique index that handles nullable start_time
CREATE UNIQUE INDEX idx_unique_exception ON public.professional_availability_exceptions 
  (professional_id, exception_date, COALESCE(start_time, '00:00:00'::TIME));

ALTER TABLE public.professional_availability_exceptions ENABLE ROW LEVEL SECURITY;

-- Triggers
CREATE TRIGGER update_professional_availability_updated_at
  BEFORE UPDATE ON public.professional_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_professional_availability_exceptions_updated_at
  BEFORE UPDATE ON public.professional_availability_exceptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for availability
CREATE POLICY "Authenticated users can view availability"
  ON public.professional_availability FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can insert availability"
  ON public.professional_availability FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'appointments'::app_module, 'edit'::permission_action));

CREATE POLICY "Staff can update availability"
  ON public.professional_availability FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'appointments'::app_module, 'edit'::permission_action));

CREATE POLICY "Staff can delete availability"
  ON public.professional_availability FOR DELETE TO authenticated
  USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'appointments'::app_module, 'edit'::permission_action));

-- RLS for exceptions
CREATE POLICY "Authenticated users can view exceptions"
  ON public.professional_availability_exceptions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can insert exceptions"
  ON public.professional_availability_exceptions FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'appointments'::app_module, 'edit'::permission_action));

CREATE POLICY "Staff can update exceptions"
  ON public.professional_availability_exceptions FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'appointments'::app_module, 'edit'::permission_action));

CREATE POLICY "Staff can delete exceptions"
  ON public.professional_availability_exceptions FOR DELETE TO authenticated
  USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'appointments'::app_module, 'edit'::permission_action));
