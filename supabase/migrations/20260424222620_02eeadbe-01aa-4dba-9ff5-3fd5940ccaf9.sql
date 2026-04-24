-- 1. Create a function to automatically set audit/traceability columns
CREATE OR REPLACE FUNCTION public.set_audit_columns()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.created_by_id IS NULL) THEN
            NEW.created_by_id = auth.uid();
        END IF;
    END IF;
    
    IF (TG_OP = 'UPDATE' OR TG_OP = 'INSERT') THEN
        NEW.updated_by_id = auth.uid();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Apply audit trigger to all relevant tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'created_by_id' 
          AND table_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS tr_set_audit_columns ON public.%I', t);
        EXECUTE format('CREATE TRIGGER tr_set_audit_columns BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_audit_columns()', t);
    END LOOP;
END;
$$;

-- 3. Improve the equipment synchronization function
CREATE OR REPLACE FUNCTION public.handle_equipment_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    v_equipment_id UUID;
    v_sn TEXT;
    v_classificacao TEXT;
    v_status_teste TEXT;
    v_destino TEXT;
    v_nome TEXT;
    v_codigo TEXT;
    v_categoria TEXT;
    v_tecnico_id UUID;
    v_status_fluxo TEXT;
BEGIN
    -- Determine SN and other fields based on the table
    IF TG_TABLE_NAME = 'lab_items' THEN
        v_sn := NEW.sn;
        v_classificacao := NEW.classificacao;
        v_status_teste := NEW.status_teste;
        v_nome := NEW.nome;
        v_codigo := NEW.codigo;
        v_categoria := NEW.categoria;
        v_tecnico_id := NEW.tecnico_id;
    ELSEIF TG_TABLE_NAME = 'test_results' THEN
        v_sn := COALESCE(NEW.sn, NEW.serial_number);
        v_status_teste := NEW.resultado;
        v_destino := NEW.destino_reparo;
        v_nome := NEW.nome;
        v_codigo := NEW.codigo;
        v_tecnico_id := NEW.tecnico_id;
    ELSEIF TG_TABLE_NAME = 'repair_returns' THEN
        v_sn := NEW.sn;
        v_status_teste := NEW.status;
        v_tecnico_id := NEW.tecnico_id;
    ELSEIF TG_TABLE_NAME = 'laudos' THEN
        v_sn := NEW.sn;
        v_status_fluxo := 'Laudo';
        v_tecnico_id := NEW.tecnico_id;
    END IF;

    IF v_sn IS NULL OR v_sn = '' THEN
        RETURN NEW;
    END IF;

    -- Look for existing equipment with this serial number (case insensitive)
    SELECT id INTO v_equipment_id 
    FROM public.equipamentos 
    WHERE UPPER(sn) = UPPER(v_sn)
    LIMIT 1;

    -- If found, update it with possible new info
    IF v_equipment_id IS NOT NULL THEN
        UPDATE public.equipamentos SET
            nome = COALESCE(v_nome, nome),
            codigo = COALESCE(v_codigo, codigo),
            classificacao = COALESCE(v_classificacao, classificacao),
            categoria = COALESCE(v_categoria, categoria),
            status_teste = COALESCE(v_status_teste, status_teste),
            destino = COALESCE(v_destino, destino),
            status = COALESCE(v_status_fluxo, status),
            tecnico_responsavel_id = COALESCE(v_tecnico_id, tecnico_responsavel_id),
            updated_at = now()
        WHERE id = v_equipment_id;
    -- If not found and we are in lab_items, create a new equipment record
    ELSEIF TG_TABLE_NAME = 'lab_items' THEN
        INSERT INTO public.equipamentos (
            sn,
            nome,
            codigo,
            classificacao,
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
            acao_recomendada,
            tecnico_responsavel_id
        ) VALUES (
            v_sn,
            NEW.nome,
            NEW.codigo,
            v_classificacao,
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
            NEW.acao_recomendada,
            v_tecnico_id
        ) RETURNING id INTO v_equipment_id;
    END IF;

    -- Set the equipment_id on the new record
    IF v_equipment_id IS NOT NULL THEN
        NEW.equipment_id := v_equipment_id;
    END IF;

    RETURN NEW;
END;
$function$;

-- 4. Ensure the sync trigger is also on the laudos table
DROP TRIGGER IF EXISTS tr_laudos_sync ON public.laudos;
CREATE TRIGGER tr_laudos_sync
BEFORE INSERT OR UPDATE ON public.laudos
FOR EACH ROW EXECUTE FUNCTION public.handle_equipment_sync();

-- 5. Create a case-insensitive index on SN for performance
CREATE INDEX IF NOT EXISTS idx_equipamentos_sn_upper ON public.equipamentos (UPPER(sn));

-- 6. Fix linter warning by setting search path for has_any_role if not already set
ALTER FUNCTION public.has_any_role(uuid) SET search_path = public;
