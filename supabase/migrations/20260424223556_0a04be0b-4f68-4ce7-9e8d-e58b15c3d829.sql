-- Add missing checklist columns to test_results
ALTER TABLE public.test_results 
ADD COLUMN IF NOT EXISTS checklist_leds BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS checklist_portas_lan BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS checklist_acesso_web BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS checklist_carcaca BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reincidencia_identificada BOOLEAN DEFAULT FALSE;

-- Add visual rating and warranty flag to repair_returns
ALTER TABLE public.repair_returns 
ADD COLUMN IF NOT EXISTS visual_rating INTEGER CHECK (visual_rating >= 1 AND visual_rating <= 5),
ADD COLUMN IF NOT EXISTS is_warranty_claim BOOLEAN DEFAULT FALSE;

-- Add priority and technical notes to equipamentos
ALTER TABLE public.equipamentos 
ADD COLUMN IF NOT EXISTS prioridade TEXT DEFAULT 'Normal',
ADD COLUMN IF NOT EXISTS observacoes_tecnicas TEXT;

-- Create an index for faster lookups on reincidence
CREATE INDEX IF NOT EXISTS idx_test_results_reincidencia ON public.test_results(reincidencia_identificada) WHERE reincidencia_identificada = TRUE;
CREATE INDEX IF NOT EXISTS idx_equipamentos_prioridade ON public.equipamentos(prioridade);