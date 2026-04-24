-- Function to set traceability columns automatically
CREATE OR REPLACE FUNCTION public.set_traceability_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by_id IS NULL THEN
      NEW.created_by_id = auth.uid();
    END IF;
  END IF;
  NEW.updated_by_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply traceability triggers to all relevant tables
DO $$ 
DECLARE
    t text;
    tables_to_trigger text[] := ARRAY['profiles', 'repair_returns', 'repair_suppliers', 'tecnicos', 'lotes', 'item_history', 'laudos', 'test_results'];
BEGIN
    FOR t IN SELECT unnest(tables_to_trigger) LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS set_traceability_on_%I ON public.%I', t, t);
        EXECUTE format('CREATE TRIGGER set_traceability_on_%I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_traceability_columns()', t, t);
    END LOOP;
END $$;

-- Function to update supplier statistics
CREATE OR REPLACE FUNCTION public.update_supplier_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_supplier_id UUID;
    v_total_reparos INTEGER;
    v_total_falhas INTEGER;
    v_total_retested INTEGER;
    v_approved_after_retest INTEGER;
BEGIN
    -- Determine which supplier ID to use
    IF TG_OP = 'DELETE' THEN
        v_supplier_id = OLD.supplier_id;
    ELSE
        v_supplier_id = NEW.supplier_id;
    END IF;

    IF v_supplier_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Calculate total repairs and failures
    SELECT COUNT(*), COUNT(*) FILTER (WHERE resultado_amostragem = 'reprovado')
    INTO v_total_reparos, v_total_falhas
    FROM public.repair_returns
    WHERE supplier_id = v_supplier_id;

    -- Calculate stats for quality index (indice_qualidade)
    -- This follows the logic in the frontend: (Approved after retest / Total retested) * 100
    SELECT 
        COUNT(*) FILTER (WHERE encaminhamento = 'fila_teste'),
        COUNT(*) FILTER (WHERE encaminhamento = 'fila_teste' AND resultado_amostragem = 'aprovado')
    INTO v_total_retested, v_approved_after_retest
    FROM public.repair_returns
    WHERE supplier_id = v_supplier_id;

    -- Update the supplier record
    UPDATE public.repair_suppliers
    SET 
        total_reparos = v_total_reparos,
        total_falhas = v_total_falhas,
        indice_qualidade = CASE 
            WHEN v_total_retested > 0 THEN ROUND((v_approved_after_retest::NUMERIC / v_total_retested::NUMERIC) * 100)
            ELSE 100 -- Default to 100 if no retests have happened
        END,
        updated_at = now()
    WHERE id = v_supplier_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for supplier stats
DROP TRIGGER IF EXISTS trigger_update_supplier_stats ON public.repair_returns;
CREATE TRIGGER trigger_update_supplier_stats
AFTER INSERT OR UPDATE OR DELETE ON public.repair_returns
FOR EACH ROW EXECUTE FUNCTION public.update_supplier_stats();

-- Ensure updated_at trigger exists for lotes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_lotes_updated_at') THEN
        CREATE TRIGGER update_lotes_updated_at
        BEFORE UPDATE ON public.lotes
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;