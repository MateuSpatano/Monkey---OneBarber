
-- Create appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
  service TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('confirmed', 'pending', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Create policies (drop if exists first to avoid conflicts)
DROP POLICY IF EXISTS "Users with view permission can see appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users with create permission can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users with edit permission can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users with delete permission can delete appointments" ON public.appointments;

CREATE POLICY "Users with view permission can see appointments" 
ON public.appointments 
FOR SELECT 
USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'appointments'::app_module, 'view'::permission_action));

CREATE POLICY "Users with create permission can insert appointments" 
ON public.appointments 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'appointments'::app_module, 'create'::permission_action));

CREATE POLICY "Users with edit permission can update appointments" 
ON public.appointments 
FOR UPDATE 
USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'appointments'::app_module, 'edit'::permission_action));

CREATE POLICY "Users with delete permission can delete appointments" 
ON public.appointments 
FOR DELETE 
USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'appointments'::app_module, 'delete'::permission_action));

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
