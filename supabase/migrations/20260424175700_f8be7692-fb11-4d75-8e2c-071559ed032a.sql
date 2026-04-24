-- Create storage bucket for laudo attachments if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('laudo-attachments', 'laudo-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for laudo attachments
CREATE POLICY "Laudo attachments are accessible by authenticated users"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'laudo-attachments');

CREATE POLICY "Authenticated users can upload laudo attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'laudo-attachments');

CREATE POLICY "Admins can delete laudo attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'laudo-attachments' AND is_admin(auth.uid()));

-- Add missing foreign key constraints
DO $$ 
BEGIN
    -- lab_items -> equipamentos
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'lab_items_equipment_id_fkey') THEN
        ALTER TABLE public.lab_items 
        ADD CONSTRAINT lab_items_equipment_id_fkey 
        FOREIGN KEY (equipment_id) REFERENCES public.equipamentos(id) ON DELETE SET NULL;
    END IF;

    -- test_results -> lab_items (via SN or equipment_id if available)
    -- Since SN is more commonly used in the code, we'll keep equipment_id as optional reference
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'test_results_equipment_id_fkey') THEN
        ALTER TABLE public.test_results 
        ADD CONSTRAINT test_results_equipment_id_fkey 
        FOREIGN KEY (equipment_id) REFERENCES public.equipamentos(id) ON DELETE SET NULL;
    END IF;

    -- repair_returns -> repair_suppliers
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'repair_returns_supplier_id_fkey') THEN
        ALTER TABLE public.repair_returns 
        ADD CONSTRAINT repair_returns_supplier_id_fkey 
        FOREIGN KEY (supplier_id) REFERENCES public.repair_suppliers(id) ON DELETE CASCADE;
    END IF;

    -- laudo_attachments -> laudos
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'laudo_attachments_laudo_id_fkey') THEN
        ALTER TABLE public.laudo_attachments 
        ADD CONSTRAINT laudo_attachments_laudo_id_fkey 
        FOREIGN KEY (laudo_id) REFERENCES public.laudos(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Ensure default values for numeric columns in repair_suppliers
ALTER TABLE public.repair_suppliers 
  ALTER COLUMN total_reparos SET DEFAULT 0,
  ALTER COLUMN total_falhas SET DEFAULT 0,
  ALTER COLUMN indice_qualidade SET DEFAULT 100;

-- Backfill existing NULLs
UPDATE public.repair_suppliers SET total_reparos = 0 WHERE total_reparos IS NULL;
UPDATE public.repair_suppliers SET total_falhas = 0 WHERE total_falhas IS NULL;
UPDATE public.repair_suppliers SET indice_qualidade = 100 WHERE indice_qualidade IS NULL;