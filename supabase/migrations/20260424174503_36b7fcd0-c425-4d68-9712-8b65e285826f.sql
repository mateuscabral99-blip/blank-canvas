-- Add supplier_id to repair_returns
ALTER TABLE public.repair_returns 
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.repair_suppliers(id) ON DELETE SET NULL;

-- Add missing columns to lab_items
ALTER TABLE public.lab_items 
ADD COLUMN IF NOT EXISTS status_teste TEXT,
ADD COLUMN IF NOT EXISTS dias_estoque INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_estimado NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS acao_recomendada TEXT,
ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Make classificacao nullable in cadastro_modelos
ALTER TABLE public.cadastro_modelos 
ALTER COLUMN classificacao DROP NOT NULL;
