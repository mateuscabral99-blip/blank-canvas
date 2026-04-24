
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'supervisor', 'operador');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer functions FIRST (before any policy references them)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_supervisor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'supervisor')
  )
$$;

-- 4. RLS on user_roles
CREATE POLICY "Users can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Make laudo-attachments bucket private
UPDATE storage.buckets SET public = false WHERE id = 'laudo-attachments';

-- 6. Drop old storage policies
DROP POLICY IF EXISTS "Authenticated users can view laudo attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload laudo attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete laudo attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view laudo attachments" ON storage.objects;

-- 7. New storage policies
CREATE POLICY "Auth users can read laudo attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'laudo-attachments');

CREATE POLICY "Auth users can upload laudo attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'laudo-attachments');

CREATE POLICY "Auth users can update laudo attachments"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'laudo-attachments');

CREATE POLICY "Admin/Supervisor can delete laudo attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'laudo-attachments' AND public.is_admin_or_supervisor(auth.uid()));

-- 8. Restrict DELETE to admin/supervisor on all tables

DROP POLICY IF EXISTS "Authenticated users can delete lab items" ON public.lab_items;
CREATE POLICY "Admin/Supervisor can delete lab items"
  ON public.lab_items FOR DELETE TO authenticated
  USING (public.is_admin_or_supervisor(auth.uid()));

CREATE POLICY "Authenticated users can update lab items"
  ON public.lab_items FOR UPDATE TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete test_results" ON public.test_results;
CREATE POLICY "Admin/Supervisor can delete test_results"
  ON public.test_results FOR DELETE TO authenticated
  USING (public.is_admin_or_supervisor(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can delete laudos" ON public.laudos;
CREATE POLICY "Admin/Supervisor can delete laudos"
  ON public.laudos FOR DELETE TO authenticated
  USING (public.is_admin_or_supervisor(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can delete laudo_attachments" ON public.laudo_attachments;
CREATE POLICY "Admin/Supervisor can delete laudo_attachments"
  ON public.laudo_attachments FOR DELETE TO authenticated
  USING (public.is_admin_or_supervisor(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can delete repair_returns" ON public.repair_returns;
CREATE POLICY "Admin/Supervisor can delete repair_returns"
  ON public.repair_returns FOR DELETE TO authenticated
  USING (public.is_admin_or_supervisor(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can delete repair_suppliers" ON public.repair_suppliers;
CREATE POLICY "Admin/Supervisor can delete repair_suppliers"
  ON public.repair_suppliers FOR DELETE TO authenticated
  USING (public.is_admin_or_supervisor(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can delete cadastro_modelos" ON public.cadastro_modelos;
CREATE POLICY "Admin/Supervisor can delete cadastro_modelos"
  ON public.cadastro_modelos FOR DELETE TO authenticated
  USING (public.is_admin_or_supervisor(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can insert cadastro_modelos" ON public.cadastro_modelos;
CREATE POLICY "Admin/Supervisor can insert cadastro_modelos"
  ON public.cadastro_modelos FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_supervisor(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update cadastro_modelos" ON public.cadastro_modelos;
CREATE POLICY "Admin/Supervisor can update cadastro_modelos"
  ON public.cadastro_modelos FOR UPDATE TO authenticated
  USING (public.is_admin_or_supervisor(auth.uid()));
