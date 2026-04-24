-- 1. Add equipment_id to repair_returns if it doesn't exist
ALTER TABLE public.repair_returns ADD COLUMN IF NOT EXISTS equipment_id UUID REFERENCES public.equipamentos(id) ON DELETE SET NULL;

-- 2. Create indexes for performance on serial_number/sn columns
CREATE INDEX IF NOT EXISTS idx_equipamentos_serial_number ON public.equipamentos(serial_number);
CREATE INDEX IF NOT EXISTS idx_lab_items_sn ON public.lab_items(sn);
CREATE INDEX IF NOT EXISTS idx_test_results_sn ON public.test_results(sn);
CREATE INDEX IF NOT EXISTS idx_repair_returns_sn ON public.repair_returns(sn);

-- 3. Backfill equipment_id in test_results
UPDATE public.test_results tr
SET equipment_id = e.id
FROM public.equipamentos e
WHERE (tr.sn = e.serial_number OR tr.serial_number = e.serial_number)
AND tr.equipment_id IS NULL;

-- 4. Backfill equipment_id in repair_returns
UPDATE public.repair_returns rr
SET equipment_id = e.id
FROM public.equipamentos e
WHERE rr.sn = e.serial_number
AND rr.equipment_id IS NULL;

-- 5. Backfill equipment_id in lab_items (just in case some are still null)
UPDATE public.lab_items li
SET equipment_id = e.id
FROM public.equipamentos e
WHERE li.sn = e.serial_number
AND li.equipment_id IS NULL;

-- 6. Update lotes RLS policy to be more restrictive
-- Only admins and supervisors should be able to insert/update/delete lotes
DROP POLICY IF EXISTS "Authenticated users can manage lotes" ON public.lotes;

CREATE POLICY "Admins and supervisors can manage lotes" 
ON public.lotes 
FOR ALL 
TO authenticated 
USING (public.is_admin_or_supervisor(auth.uid()))
WITH CHECK (public.is_admin_or_supervisor(auth.uid()));

-- 7. Ensure item_history RLS for INSERT is tied to having a role
DROP POLICY IF EXISTS "Authenticated users can insert item history" ON public.item_history;
CREATE POLICY "Users with role can insert item history" 
ON public.item_history 
FOR INSERT 
TO authenticated 
WITH CHECK (public.has_any_role(auth.uid()));
