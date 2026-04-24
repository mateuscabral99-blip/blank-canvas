-- 1. Fix the handle_equipment_sync function to use 'sn' instead of 'serial_number'
CREATE OR REPLACE FUNCTION public.handle_equipment_sync()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_equipment_id UUID;
    v_sn TEXT;
BEGIN
    -- Determine which column to use as Serial Number based on the table
    IF TG_TABLE_NAME = 'lab_items' THEN
        v_sn := NEW.sn;
    ELSEIF TG_TABLE_NAME = 'test_results' THEN
        -- Handle both possible column names during transition
        v_sn := COALESCE(NEW.sn, NEW.serial_number);
    ELSEIF TG_TABLE_NAME = 'repair_returns' THEN
        v_sn := NEW.sn;
    END IF;

    IF v_sn IS NULL OR v_sn = '' THEN
        RETURN NEW;
    END IF;

    -- Look for existing equipment with this serial number (case insensitive)
    -- Using 'sn' column which was renamed from 'serial_number'
    SELECT id INTO v_equipment_id 
    FROM public.equipamentos 
    WHERE UPPER(sn) = UPPER(v_sn)
    LIMIT 1;

    -- If not found and we are in lab_items, create a new equipment record
    IF v_equipment_id IS NULL AND TG_TABLE_NAME = 'lab_items' THEN
        INSERT INTO public.equipamentos (
            sn,
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
$function$;

-- 2. Consistency: If test_results still has serial_number, we should probably consolidate it to 'sn'
-- But first check if serial_number exists
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='test_results' AND column_name='serial_number') THEN
        -- If 'sn' also exists, let's copy data from serial_number to sn if sn is null
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='test_results' AND column_name='sn') THEN
            UPDATE public.test_results SET sn = serial_number WHERE sn IS NULL AND serial_number IS NOT NULL;
            -- Now we can drop serial_number safely or keep it as optional for now
            -- The user said "renomeamos ela para sn", so let's be thorough.
        ELSE
            -- Rename serial_number to sn if sn doesn't exist
            ALTER TABLE public.test_results RENAME COLUMN serial_number TO sn;
        END IF;
    END IF;
END $$;
