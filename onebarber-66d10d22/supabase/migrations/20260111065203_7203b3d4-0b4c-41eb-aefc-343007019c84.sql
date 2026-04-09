-- RLS policies for clients
CREATE POLICY "Users with view permission can see clients"
ON public.clients FOR SELECT TO authenticated
USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'clients'::app_module, 'view'::permission_action));

CREATE POLICY "Users with create permission can insert clients"
ON public.clients FOR INSERT TO authenticated
WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'clients'::app_module, 'create'::permission_action));

CREATE POLICY "Users with edit permission can update clients"
ON public.clients FOR UPDATE TO authenticated
USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'clients'::app_module, 'edit'::permission_action));

CREATE POLICY "Users with delete permission can delete clients"
ON public.clients FOR DELETE TO authenticated
USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'clients'::app_module, 'delete'::permission_action));

-- RLS policies for professionals
CREATE POLICY "Users with view permission can see professionals"
ON public.professionals FOR SELECT TO authenticated
USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'professionals'::app_module, 'view'::permission_action));

CREATE POLICY "Users with create permission can insert professionals"
ON public.professionals FOR INSERT TO authenticated
WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'professionals'::app_module, 'create'::permission_action));

CREATE POLICY "Users with edit permission can update professionals"
ON public.professionals FOR UPDATE TO authenticated
USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'professionals'::app_module, 'edit'::permission_action));

CREATE POLICY "Users with delete permission can delete professionals"
ON public.professionals FOR DELETE TO authenticated
USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'professionals'::app_module, 'delete'::permission_action));

-- RLS policies for products
CREATE POLICY "Users with view permission can see products"
ON public.products FOR SELECT TO authenticated
USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'products'::app_module, 'view'::permission_action));

CREATE POLICY "Users with create permission can insert products"
ON public.products FOR INSERT TO authenticated
WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'products'::app_module, 'create'::permission_action));

CREATE POLICY "Users with edit permission can update products"
ON public.products FOR UPDATE TO authenticated
USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'products'::app_module, 'edit'::permission_action));

CREATE POLICY "Users with delete permission can delete products"
ON public.products FOR DELETE TO authenticated
USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'products'::app_module, 'delete'::permission_action));

-- Insert missing permissions
INSERT INTO public.permissions (module, action, description) 
SELECT 'professionals', 'view', 'Visualizar profissionais'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE module = 'professionals' AND action = 'view');

INSERT INTO public.permissions (module, action, description) 
SELECT 'professionals', 'create', 'Criar profissionais'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE module = 'professionals' AND action = 'create');

INSERT INTO public.permissions (module, action, description) 
SELECT 'professionals', 'edit', 'Editar profissionais'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE module = 'professionals' AND action = 'edit');

INSERT INTO public.permissions (module, action, description) 
SELECT 'professionals', 'delete', 'Excluir profissionais'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE module = 'professionals' AND action = 'delete');

INSERT INTO public.permissions (module, action, description) 
SELECT 'products', 'view', 'Visualizar produtos'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE module = 'products' AND action = 'view');

INSERT INTO public.permissions (module, action, description) 
SELECT 'products', 'create', 'Criar produtos'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE module = 'products' AND action = 'create');

INSERT INTO public.permissions (module, action, description) 
SELECT 'products', 'edit', 'Editar produtos'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE module = 'products' AND action = 'edit');

INSERT INTO public.permissions (module, action, description) 
SELECT 'products', 'delete', 'Excluir produtos'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE module = 'products' AND action = 'delete');

-- Create triggers
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_professionals_updated_at
BEFORE UPDATE ON public.professionals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();