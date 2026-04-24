-- Tighten repair_suppliers INSERT to admin/supervisor only
DROP POLICY IF EXISTS "Authenticated users can insert repair_suppliers" ON public.repair_suppliers;
CREATE POLICY "Admin/Supervisor can insert repair_suppliers" ON public.repair_suppliers 
FOR INSERT TO authenticated WITH CHECK (is_admin_or_supervisor(auth.uid()));

-- Tighten repair_suppliers UPDATE to admin/supervisor only
DROP POLICY IF EXISTS "Authenticated users can update repair_suppliers" ON public.repair_suppliers;
CREATE POLICY "Admin/Supervisor can update repair_suppliers" ON public.repair_suppliers 
FOR UPDATE TO authenticated USING (is_admin_or_supervisor(auth.uid()));