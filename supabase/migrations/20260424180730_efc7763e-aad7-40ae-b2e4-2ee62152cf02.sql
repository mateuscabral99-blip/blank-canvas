-- 1. Create a function to handle the automatic linking/creation of equipment
CREATE OR REPLACE FUNCTION public.handle_equipment_sync()
RETURNS TRIGGER AS $$
DECLARE
    v_equipment_id UUID;
    v_sn TEXT;
BEGIN
    -- Determine which column to use as Serial Number based on the table
    IF TG_TABLE_NAME = 'lab_items' THEN
        v_sn := NEW.sn;
    ELSEIF TG_TABLE_NAME = 'test_results' THEN
        v_sn := COALESCE(NEW.sn, NEW.serial_number);
    ELSEIF TG_TABLE_NAME = 'repair_returns' THEN
        v_sn := NEW.sn;
    END IF;

    IF v_sn IS NULL OR v_sn = '' THEN
        RETURN NEW;
    END IF;

    -- Look for existing equipment with this serial number (case insensitive)
    SELECT id INTO v_equipment_id 
    FROM public.equipamentos 
    WHERE UPPER(serial_number) = UPPER(v_sn)
    LIMIT 1;

    -- If not found and we are in lab_items, create a new equipment record
    IF v_equipment_id IS NULL AND TG_TABLE_NAME = 'lab_items' THEN
        INSERT INTO public.equipamentos (
            serial_number,
            nome,
            codigo,
            categoria,
            interesse,
            origem,
            origem_fluxo,
            status_teste,
            dias_estoque,
            valor_estimado,
            data_entrada,
            conferido_por,
            created_by,
            status_final,
            acao_recomendada
        ) VALUES (
            v_sn,
            NEW.nome,
            NEW.codigo,
            NEW.categoria,
            COALESCE(NEW.interesse, true),
            NEW.origem,
            COALESCE(NEW.origem_fluxo, 'reversa'),
            COALESCE(NEW.status_teste, 'pendente'),
            COALESCE(NEW.dias_estoque, 0),
            COALESCE(NEW.valor_estimado, 0),
            COALESCE(NEW.data_entrada, CURRENT_DATE),
            NEW.conferente,
            NEW.created_by,
            NEW.status_final,
            NEW.acao_recomendada
        ) RETURNING id INTO v_equipment_id;
    END IF;

    -- Set the equipment_id on the new record
    IF v_equipment_id IS NOT NULL THEN
        NEW.equipment_id := v_equipment_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2. Apply the trigger to lab_items
DROP TRIGGER IF EXISTS tr_sync_equipment_lab_items ON public.lab_items;
CREATE TRIGGER tr_sync_equipment_lab_items
BEFORE INSERT OR UPDATE OF sn ON public.lab_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_equipment_sync();

-- 3. Apply the trigger to test_results
DROP TRIGGER IF EXISTS tr_sync_equipment_test_results ON public.test_results;
CREATE TRIGGER tr_sync_equipment_test_results
BEFORE INSERT OR UPDATE OF sn, serial_number ON public.test_results
FOR EACH ROW
EXECUTE FUNCTION public.handle_equipment_sync();

-- 4. Apply the trigger to repair_returns
DROP TRIGGER IF EXISTS tr_sync_equipment_repair_returns ON public.repair_returns;
CREATE TRIGGER tr_sync_equipment_repair_returns
BEFORE INSERT OR UPDATE OF sn ON public.repair_returns
FOR EACH ROW
EXECUTE FUNCTION public.handle_equipment_sync();

-- 5. Ensure updated_at column and trigger for major tables
DO $$ 
BEGIN
    -- Add updated_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipamentos' AND column_name = 'updated_at') THEN
        ALTER TABLE public.equipamentos ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;
END $$;

-- Update trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_equipamentos_updated_at ON public.equipamentos;
CREATE TRIGGER update_equipamentos_updated_at
BEFORE UPDATE ON public.equipamentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_repair_suppliers_updated_at ON public.repair_suppliers;
CREATE TRIGGER update_repair_suppliers_updated_at
BEFORE UPDATE ON public.repair_suppliers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_lotes_updated_at ON public.lotes;
CREATE TRIGGER update_lotes_updated_at
BEFORE UPDATE ON public.lotes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();