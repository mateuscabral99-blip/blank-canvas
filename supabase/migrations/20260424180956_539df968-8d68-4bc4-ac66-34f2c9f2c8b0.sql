-- 1. Add updated_at column to tables where it is missing
ALTER TABLE public.lab_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.test_results ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.repair_returns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.cadastro_modelos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.item_history ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 2. Create or update the timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 3. Add updated_at triggers to all relevant tables
DROP TRIGGER IF EXISTS tr_update_updated_at_lab_items ON public.lab_items;
CREATE TRIGGER tr_update_updated_at_lab_items BEFORE UPDATE ON public.lab_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_updated_at_test_results ON public.test_results;
CREATE TRIGGER tr_update_updated_at_test_results BEFORE UPDATE ON public.test_results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_updated_at_repair_returns ON public.repair_returns;
CREATE TRIGGER tr_update_updated_at_repair_returns BEFORE UPDATE ON public.repair_returns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_updated_at_cadastro_modelos ON public.cadastro_modelos;
CREATE TRIGGER tr_update_updated_at_cadastro_modelos BEFORE UPDATE ON public.cadastro_modelos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_updated_at_equipamentos ON public.equipamentos;
CREATE TRIGGER tr_update_updated_at_equipamentos BEFORE UPDATE ON public.equipamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_updated_at_repair_suppliers ON public.repair_suppliers;
CREATE TRIGGER tr_update_updated_at_repair_suppliers BEFORE UPDATE ON public.repair_suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_updated_at_lotes ON public.lotes;
CREATE TRIGGER tr_update_updated_at_lotes BEFORE UPDATE ON public.lotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_updated_at_profiles ON public.profiles;
CREATE TRIGGER tr_update_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_updated_at_laudos ON public.laudos;
CREATE TRIGGER tr_update_updated_at_laudos BEFORE UPDATE ON public.laudos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_updated_at_item_history ON public.item_history;
CREATE TRIGGER tr_update_updated_at_item_history BEFORE UPDATE ON public.item_history FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Create or update the equipment synchronization function
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
            COALESCE(NEW.data_entrada::date, CURRENT_DATE),
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

-- 5. Set up triggers for equipment synchronization
DROP TRIGGER IF EXISTS tr_sync_equipment_lab_items ON public.lab_items;
CREATE TRIGGER tr_sync_equipment_lab_items
BEFORE INSERT OR UPDATE OF sn ON public.lab_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_equipment_sync();

DROP TRIGGER IF EXISTS tr_sync_equipment_test_results ON public.test_results;
CREATE TRIGGER tr_sync_equipment_test_results
BEFORE INSERT OR UPDATE OF sn, serial_number ON public.test_results
FOR EACH ROW
EXECUTE FUNCTION public.handle_equipment_sync();

DROP TRIGGER IF EXISTS tr_sync_equipment_repair_returns ON public.repair_returns;
CREATE TRIGGER tr_sync_equipment_repair_returns
BEFORE INSERT OR UPDATE OF sn ON public.repair_returns
FOR EACH ROW
EXECUTE FUNCTION public.handle_equipment_sync();
