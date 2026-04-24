-- Add more specific checklist columns to test_results
ALTER TABLE public.test_results 
ADD COLUMN IF NOT EXISTS checklist_usb BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS checklist_pon BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS checklist_reset BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS checklist_telefone BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS motivo_reincidencia TEXT;

-- Add repair cost to repair_returns
ALTER TABLE public.repair_returns 
ADD COLUMN IF NOT EXISTS custo_reparo NUMERIC(10,2) DEFAULT 0;

-- Add index for cost analysis
CREATE INDEX IF NOT EXISTS idx_repair_returns_custo ON public.repair_returns(custo_reparo) WHERE custo_reparo > 0;