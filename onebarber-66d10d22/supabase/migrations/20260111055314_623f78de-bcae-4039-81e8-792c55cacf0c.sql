
-- Drop existing policies and tables to recreate with new structure
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;

-- Create roles table (Funções)
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create modules enum for permissions
CREATE TYPE public.app_module AS ENUM (
  'dashboard',
  'clients',
  'appointments',
  'services',
  'financial',
  'reports',
  'settings',
  'users',
  'roles'
);

-- Create action enum for permissions
CREATE TYPE public.permission_action AS ENUM (
  'view',
  'create',
  'edit',
  'delete'
);

-- Create permissions table
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module app_module NOT NULL,
  action permission_action NOT NULL,
  description TEXT,
  UNIQUE(module, action)
);

-- Create role_permissions junction table
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE NOT NULL,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- Create user_roles table (linking users to roles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role_id)
);

-- Update profiles table to include new fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

-- Enable RLS on all new tables
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _module app_module, _action permission_action)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = _user_id
      AND p.module = _module
      AND p.action = _action
  )
$$;

-- Create function to check if user is admin (has all permissions on users module)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id
      AND r.name = 'Administrador'
  )
$$;

-- RLS Policies for roles table
CREATE POLICY "Users with view permission can see roles" ON public.roles
FOR SELECT USING (public.has_permission(auth.uid(), 'roles', 'view') OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage roles" ON public.roles
FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for permissions table (everyone authenticated can view)
CREATE POLICY "Authenticated users can view permissions" ON public.permissions
FOR SELECT TO authenticated USING (true);

-- RLS Policies for role_permissions
CREATE POLICY "Users with view permission can see role_permissions" ON public.role_permissions
FOR SELECT USING (public.has_permission(auth.uid(), 'roles', 'view') OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage role_permissions" ON public.role_permissions
FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all user_roles" ON public.user_roles
FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage user_roles" ON public.user_roles
FOR ALL USING (public.is_admin(auth.uid()));

-- Update RLS policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users with permission can view all profiles" ON public.profiles
FOR SELECT USING (public.has_permission(auth.uid(), 'users', 'view') OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage profiles" ON public.profiles
FOR ALL USING (public.is_admin(auth.uid()));

-- Insert default permissions for all modules
INSERT INTO public.permissions (module, action, description) VALUES
  ('dashboard', 'view', 'Visualizar Dashboard'),
  ('clients', 'view', 'Visualizar Clientes'),
  ('clients', 'create', 'Criar Clientes'),
  ('clients', 'edit', 'Editar Clientes'),
  ('clients', 'delete', 'Excluir Clientes'),
  ('appointments', 'view', 'Visualizar Agendamentos'),
  ('appointments', 'create', 'Criar Agendamentos'),
  ('appointments', 'edit', 'Editar Agendamentos'),
  ('appointments', 'delete', 'Excluir Agendamentos'),
  ('services', 'view', 'Visualizar Serviços'),
  ('services', 'create', 'Criar Serviços'),
  ('services', 'edit', 'Editar Serviços'),
  ('services', 'delete', 'Excluir Serviços'),
  ('financial', 'view', 'Visualizar Financeiro'),
  ('financial', 'create', 'Criar Lançamentos'),
  ('financial', 'edit', 'Editar Lançamentos'),
  ('financial', 'delete', 'Excluir Lançamentos'),
  ('reports', 'view', 'Visualizar Relatórios'),
  ('settings', 'view', 'Visualizar Configurações'),
  ('settings', 'edit', 'Editar Configurações'),
  ('users', 'view', 'Visualizar Usuários'),
  ('users', 'create', 'Criar Usuários'),
  ('users', 'edit', 'Editar Usuários'),
  ('users', 'delete', 'Excluir Usuários'),
  ('roles', 'view', 'Visualizar Funções'),
  ('roles', 'create', 'Criar Funções'),
  ('roles', 'edit', 'Editar Funções'),
  ('roles', 'delete', 'Excluir Funções');

-- Insert default roles
INSERT INTO public.roles (name, description, is_system) VALUES
  ('Administrador', 'Acesso total ao sistema', true),
  ('Barbeiro', 'Acesso a agendamentos e clientes', true),
  ('Recepcionista', 'Acesso a agendamentos e cadastros', true);

-- Give admin role all permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Administrador';

-- Give Barbeiro limited permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.module IN ('dashboard', 'appointments', 'clients', 'services') AND p.action = 'view'
WHERE r.name = 'Barbeiro';

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.module = 'appointments' AND p.action IN ('create', 'edit')
WHERE r.name = 'Barbeiro';

-- Give Recepcionista permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.module IN ('dashboard', 'appointments', 'clients') AND p.action IN ('view', 'create', 'edit')
WHERE r.name = 'Recepcionista';

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role_id UUID;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, email, full_name, status)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name', 'active');
  
  -- Get default role (Barbeiro as default for new users)
  SELECT id INTO default_role_id FROM public.roles WHERE name = 'Barbeiro' LIMIT 1;
  
  -- Assign default role
  IF default_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (NEW.id, default_role_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for updated_at on roles
CREATE TRIGGER update_roles_updated_at
BEFORE UPDATE ON public.roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
