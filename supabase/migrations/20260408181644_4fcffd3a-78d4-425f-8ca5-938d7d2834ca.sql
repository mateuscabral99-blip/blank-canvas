-- Add new columns
ALTER TABLE public.lab_items 
ADD COLUMN IF NOT EXISTS acao_recomendada text NOT NULL DEFAULT '';

ALTER TABLE public.lab_items 
ADD COLUMN IF NOT EXISTS data_entrada date NOT NULL DEFAULT CURRENT_DATE;

-- Rename tipo to origem_fluxo
ALTER TABLE public.lab_items 
RENAME COLUMN tipo TO origem_fluxo;