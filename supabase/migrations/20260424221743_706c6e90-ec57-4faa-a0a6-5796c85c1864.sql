-- 1. Update the synchronization function to be more robust and include more fields
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
BEGIN
    -- Determine SN and other fields based on the table
    IF TG_TABLE_NAME = 'lab_items' THEN
        v_sn := NEW.sn;
        v_classificacao := NEW.classificacao;
        v_status_teste := NEW.status_teste;
        v_nome := NEW.nome;
        v_codigo := NEW.codigo;
        v_categoria := NEW.categoria;
    ELSEIF TG_TABLE_NAME = 'test_results' THEN
        v_sn := COALESCE(NEW.sn, NEW.serial_number);
        v_status_teste := NEW.resultado;
        v_destino := NEW.destino_reparo;
        v_nome := NEW.nome;
        v_codigo := NEW.codigo;
    ELSEIF TG_TABLE_NAME = 'repair_returns' THEN
        v_sn := NEW.sn;
        v_status_teste := NEW.status;
    END IF;

    IF v_sn IS NULL OR v_sn = '' THEN
        RETURN NEW;
    END IF;

    -- Se a classificação estiver vazia, tenta buscar no cadastro_modelos pelo código
    IF (v_classificacao IS NULL OR v_classificacao = '') AND (v_codigo IS NOT NULL OR (TG_TABLE_NAME = 'lab_items' AND NEW.codigo IS NOT NULL)) THEN
        SELECT classificacao INTO v_classificacao 
        FROM public.cadastro_modelos 
        WHERE codigo = COALESCE(v_codigo, (CASE WHEN TG_TABLE_NAME = 'lab_items' THEN NEW.codigo ELSE NULL END))
        LIMIT 1;
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
            acao_recomendada
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
            NEW.acao_recomendada
        ) RETURNING id INTO v_equipment_id;
    END IF;

    -- Set the equipment_id on the new record
    IF v_equipment_id IS NOT NULL THEN
        NEW.equipment_id := v_equipment_id;
    END IF;

    -- If we found/filled classification, set it back to the record being inserted
    IF TG_TABLE_NAME = 'lab_items' THEN
        NEW.classificacao := v_classificacao;
    END IF;

    RETURN NEW;
END;
$function$;

-- 2. Create triggers to attach the function to the tables
DROP TRIGGER IF EXISTS tr_lab_items_sync ON public.lab_items;
CREATE TRIGGER tr_lab_items_sync
BEFORE INSERT OR UPDATE ON public.lab_items
FOR EACH ROW EXECUTE FUNCTION public.handle_equipment_sync();

DROP TRIGGER IF EXISTS tr_test_results_sync ON public.test_results;
CREATE TRIGGER tr_test_results_sync
BEFORE INSERT OR UPDATE ON public.test_results
FOR EACH ROW EXECUTE FUNCTION public.handle_equipment_sync();

DROP TRIGGER IF EXISTS tr_repair_returns_sync ON public.repair_returns;
CREATE TRIGGER tr_repair_returns_sync
BEFORE INSERT OR UPDATE ON public.repair_returns
FOR EACH ROW EXECUTE FUNCTION public.handle_equipment_sync();