-- Fix search_path for security functions
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = $1 
    AND (profiles.role ILIKE 'admin')
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = $1
    AND (user_roles.role = 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin_or_supervisor(_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = _user_id 
    AND (profiles.role ILIKE 'admin' OR profiles.role ILIKE 'supervisor')
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = _user_id
    AND (user_roles.role IN ('admin', 'supervisor'))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = _user_id 
    AND role IS NOT NULL
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = _user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Set defaults for repair_suppliers to avoid NaN in calculations
ALTER TABLE public.repair_suppliers 
  ALTER COLUMN total_reparos SET DEFAULT 0,
  ALTER COLUMN total_falhas SET DEFAULT 0,
  ALTER COLUMN indice_qualidade SET DEFAULT 100;

-- Fix overly permissive policies and add missing ones
-- cadastro_modelos
DROP POLICY IF EXISTS "Acesso_Total_Modelos" ON public.cadastro_modelos;
CREATE POLICY "Public read access for models" ON public.cadastro_modelos FOR SELECT USING (true);
CREATE POLICY "Admins can manage models" ON public.cadastro_modelos FOR ALL 
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- equipamentos
DROP POLICY IF EXISTS "Acesso_Total_Equipamentos" ON public.equipamentos;
CREATE POLICY "Public read access for equipment" ON public.equipamentos FOR SELECT USING (true);
CREATE POLICY "Users with role can manage equipment" ON public.equipamentos FOR ALL 
  USING (has_any_role(auth.uid())) WITH CHECK (has_any_role(auth.uid()));

-- lab_items
DROP POLICY IF EXISTS "Enable read access for all users" ON public.lab_items;
CREATE POLICY "Public read access for lab items" ON public.lab_items FOR SELECT USING (true);
CREATE POLICY "Users with role can manage lab items" ON public.lab_items FOR ALL 
  USING (has_any_role(auth.uid())) WITH CHECK (has_any_role(auth.uid()));

-- test_results
DROP POLICY IF EXISTS "Enable read access for all users" ON public.test_results;
CREATE POLICY "Public read access for test results" ON public.test_results FOR SELECT USING (true);
CREATE POLICY "Users with role can manage test results" ON public.test_results FOR ALL 
  USING (has_any_role(auth.uid())) WITH CHECK (has_any_role(auth.uid()));

-- repair_suppliers
DROP POLICY IF EXISTS "Enable read access for all users" ON public.repair_suppliers;
CREATE POLICY "Public read access for repair suppliers" ON public.repair_suppliers FOR SELECT USING (true);
CREATE POLICY "Admins and supervisors can manage suppliers" ON public.repair_suppliers FOR ALL 
  USING (is_admin_or_supervisor(auth.uid())) WITH CHECK (is_admin_or_supervisor(auth.uid()));

-- repair_returns
DROP POLICY IF EXISTS "Enable read access for all users" ON public.repair_returns;
CREATE POLICY "Public read access for repair returns" ON public.repair_returns FOR SELECT USING (true);
CREATE POLICY "Users with role can manage repair returns" ON public.repair_returns FOR ALL 
  USING (has_any_role(auth.uid())) WITH CHECK (has_any_role(auth.uid()));

-- laudos
DROP POLICY IF EXISTS "Enable read access for all users" ON public.laudos;
CREATE POLICY "Public read access for laudos" ON public.laudos FOR SELECT USING (true);
CREATE POLICY "Users with role can manage laudos" ON public.laudos FOR ALL 
  USING (has_any_role(auth.uid())) WITH CHECK (has_any_role(auth.uid()));

-- laudo_attachments
DROP POLICY IF EXISTS "Enable read access for all users" ON public.laudo_attachments;
CREATE POLICY "Public read access for laudo attachments" ON public.laudo_attachments FOR SELECT USING (true);
CREATE POLICY "Users with role can manage laudo attachments" ON public.laudo_attachments FOR ALL 
  USING (has_any_role(auth.uid())) WITH CHECK (has_any_role(auth.uid()));
