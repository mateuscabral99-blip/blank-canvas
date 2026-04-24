-- Add equipment_id to laudos
ALTER TABLE public.laudos ADD COLUMN IF NOT EXISTS equipment_id UUID REFERENCES public.equipamentos(id) ON DELETE SET NULL;

-- Create item_history table for tracking all equipment movements
CREATE TABLE IF NOT EXISTS public.item_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID REFERENCES public.equipamentos(id) ON DELETE CASCADE,
    tipo_movimentacao TEXT NOT NULL, -- 'status_change', 'test', 'repair', 'entry', 'exit'
    status_anterior TEXT,
    status_novo TEXT,
    observacoes TEXT,
    realizado_por UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for history
ALTER TABLE public.item_history ENABLE ROW LEVEL SECURITY;

-- Policies for item_history
CREATE POLICY "Authenticated users can view item history" 
ON public.item_history FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert item history" 
ON public.item_history FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Create lotes table for batch management
CREATE TABLE IF NOT EXISTS public.lotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_lote TEXT UNIQUE NOT NULL,
    descricao TEXT,
    fornecedor_id UUID REFERENCES public.repair_suppliers(id),
    status TEXT DEFAULT 'Aberto',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for lotes
ALTER TABLE public.lotes ENABLE ROW LEVEL SECURITY;

-- Policies for lotes
CREATE POLICY "Authenticated users can view lotes" 
ON public.lotes FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can manage lotes" 
ON public.lotes FOR ALL 
TO authenticated 
USING (true);

-- Add lote_id to equipamentos
ALTER TABLE public.equipamentos ADD COLUMN IF NOT EXISTS lote_id UUID REFERENCES public.lotes(id) ON DELETE SET NULL;

-- Trigger function for automatic status history logging
CREATE OR REPLACE FUNCTION public.log_equipment_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) OR (OLD.status_teste IS DISTINCT FROM NEW.status_teste) THEN
        INSERT INTO public.item_history (
            equipment_id,
            tipo_movimentacao,
            status_anterior,
            status_novo,
            observacoes,
            realizado_por
        ) VALUES (
            NEW.id,
            'status_change',
            COALESCE(OLD.status, 'N/A') || ' | ' || COALESCE(OLD.status_teste, 'N/A'),
            COALESCE(NEW.status, 'N/A') || ' | ' || COALESCE(NEW.status_teste, 'N/A'),
            'Alteração automática de status detectada.',
            auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on equipamentos
DROP TRIGGER IF EXISTS tr_log_equipment_status_change ON public.equipamentos;
CREATE TRIGGER tr_log_equipment_status_change
AFTER UPDATE ON public.equipamentos
FOR EACH ROW
EXECUTE FUNCTION public.log_equipment_status_change();

-- Backfill equipment_id in laudos using serial number matching
UPDATE public.laudos l
SET equipment_id = e.id
FROM public.equipamentos e
WHERE l.sn = e.serial_number
AND l.equipment_id IS NULL;
