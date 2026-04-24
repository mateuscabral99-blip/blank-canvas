-- 1. Renomear 'modelo' para 'classificacao' em 'lab_items' se existir
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lab_items' AND column_name='modelo') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lab_items' AND column_name='classificacao') THEN
            ALTER TABLE public.lab_items RENAME COLUMN modelo TO classificacao;
        ELSE
            -- Se ambos existem, copia os dados e remove o modelo
            UPDATE public.lab_items SET classificacao = modelo WHERE classificacao IS NULL;
            ALTER TABLE public.lab_items DROP COLUMN modelo;
        END IF;
    END IF;
END $$;

-- 2. Atualizar a função de sincronização para incluir 'classificacao'
CREATE OR REPLACE FUNCTION public.handle_equipment_sync()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_equipment_id UUID;
    v_sn TEXT;
    v_classificacao TEXT;
BEGIN
    -- Determine which column to use as Serial Number and Classification based on the table
    IF TG_TABLE_NAME = 'lab_items' THEN
        v_sn := NEW.sn;
        v_classificacao := NEW.classificacao;
    ELSEIF TG_TABLE_NAME = 'test_results' THEN
        v_sn := COALESCE(NEW.sn, NEW.serial_number);
    ELSEIF TG_TABLE_NAME = 'repair_returns' THEN
        v_sn := NEW.sn;
    END IF;

    IF v_sn IS NULL OR v_sn = '' THEN
        RETURN NEW;
    END IF;

    -- Se a classificação estiver vazia, tenta buscar no cadastro_modelos pelo código
    IF (v_classificacao IS NULL OR v_classificacao = '') AND NEW.codigo IS NOT NULL THEN
        SELECT classificacao INTO v_classificacao 
        FROM public.cadastro_modelos 
        WHERE codigo = NEW.codigo 
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
            nome = COALESCE(NEW.nome, nome),
            codigo = COALESCE(NEW.codigo, codigo),
            classificacao = COALESCE(v_classificacao, classificacao),
            categoria = COALESCE(NEW.categoria, categoria),
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

-- 3. Backfill: Atualizar 'classificacao' em 'equipamentos' a partir de 'cadastro_modelos'
UPDATE public.equipamentos e
SET classificacao = m.classificacao
FROM public.cadastro_modelos m
WHERE e.codigo = m.codigo
AND (e.classificacao IS NULL OR e.classificacao = '');

-- 4. Backfill: Atualizar 'classificacao' em 'lab_items' a partir de 'cadastro_modelos'
UPDATE public.lab_items l
SET classificacao = m.classificacao
FROM public.cadastro_modelos m
WHERE l.codigo = m.codigo
AND (l.classificacao IS NULL OR l.classificacao = '');