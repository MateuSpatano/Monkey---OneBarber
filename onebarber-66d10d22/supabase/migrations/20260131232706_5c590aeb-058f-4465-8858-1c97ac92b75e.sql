-- Update the handle_new_user function to assign "Cliente" role instead of "Barbeiro"
-- This ensures self-registration only creates client accounts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  default_role_id UUID;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, email, full_name, status)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name', 'active');
  
  -- Get default role (Cliente as default for self-registered users)
  SELECT id INTO default_role_id FROM public.roles WHERE name = 'Cliente' LIMIT 1;
  
  -- Assign default role
  IF default_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (NEW.id, default_role_id);
  END IF;
  
  RETURN NEW;
END;
$function$;