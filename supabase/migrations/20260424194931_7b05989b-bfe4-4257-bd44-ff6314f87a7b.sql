-- Standardize roles in profiles table
UPDATE public.profiles 
SET role = 'operator' 
WHERE role = 'operador';

-- Add traceability columns to repair_returns
ALTER TABLE public.repair_returns 
ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by_id UUID REFERENCES auth.users(id);

-- Add traceability columns to repair_suppliers
ALTER TABLE public.repair_suppliers 
ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by_id UUID REFERENCES auth.users(id);

-- Add traceability columns to tecnicos
ALTER TABLE public.tecnicos 
ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by_id UUID REFERENCES auth.users(id);

-- Add traceability columns to lotes
ALTER TABLE public.lotes 
ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by_id UUID REFERENCES auth.users(id);

-- Add traceability columns to item_history
ALTER TABLE public.item_history 
ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by_id UUID REFERENCES auth.users(id);

-- Add missing updated_by_id to laudos
ALTER TABLE public.laudos 
ADD COLUMN IF NOT EXISTS updated_by_id UUID REFERENCES auth.users(id);

-- Add missing updated_by_id to test_results
ALTER TABLE public.test_results 
ADD COLUMN IF NOT EXISTS updated_by_id UUID REFERENCES auth.users(id);
