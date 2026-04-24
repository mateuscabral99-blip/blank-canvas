
-- Add created_by column to key tables
ALTER TABLE public.lab_items ADD COLUMN IF NOT EXISTS created_by text NOT NULL DEFAULT '';
ALTER TABLE public.test_results ADD COLUMN IF NOT EXISTS created_by text NOT NULL DEFAULT '';
ALTER TABLE public.laudos ADD COLUMN IF NOT EXISTS created_by text NOT NULL DEFAULT '';

-- Tighten delete policies: only admins can delete (remove supervisor from delete)
-- Drop existing delete policies and recreate as admin-only
DROP POLICY IF EXISTS "Admin/Supervisor can delete lab items" ON public.lab_items;
CREATE POLICY "Only admins can delete lab items" ON public.lab_items FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin/Supervisor can delete cadastro_modelos" ON public.cadastro_modelos;
CREATE POLICY "Only admins can delete cadastro_modelos" ON public.cadastro_modelos FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin/Supervisor can delete test_results" ON public.test_results;
CREATE POLICY "Only admins can delete test_results" ON public.test_results FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin/Supervisor can delete laudos" ON public.laudos;
CREATE POLICY "Only admins can delete laudos" ON public.laudos FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin/Supervisor can delete laudo_attachments" ON public.laudo_attachments;
CREATE POLICY "Only admins can delete laudo_attachments" ON public.laudo_attachments FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin/Supervisor can delete repair_returns" ON public.repair_returns;
CREATE POLICY "Only admins can delete repair_returns" ON public.repair_returns FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin/Supervisor can delete repair_suppliers" ON public.repair_suppliers;
CREATE POLICY "Only admins can delete repair_suppliers" ON public.repair_suppliers FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Allow admins to see all user_roles (needed for user management)
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Allow supervisors to view profiles
CREATE POLICY "Supervisors can view profiles" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'supervisor'));
