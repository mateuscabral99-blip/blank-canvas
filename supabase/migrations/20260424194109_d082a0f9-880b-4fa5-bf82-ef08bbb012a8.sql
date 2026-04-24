-- Step 1: Update the app_role enum
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'operador') THEN
        ALTER TYPE public.app_role RENAME VALUE 'operador' TO 'operator';
    END IF;
END $$;

-- Step 2: Standardize roles in profiles table
UPDATE public.profiles 
SET role = 'operator' 
WHERE role = 'operador';

UPDATE public.profiles 
SET role = 'admin' 
WHERE role ILIKE 'admin%';

UPDATE public.profiles 
SET role = 'supervisor' 
WHERE role ILIKE 'supervisor%';

-- Step 3: Add traceability columns to equipamentos
ALTER TABLE public.equipamentos 
ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by_id UUID REFERENCES auth.users(id);

-- Step 4: Add traceability columns to cadastro_modelos
ALTER TABLE public.cadastro_modelos 
ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by_id UUID REFERENCES auth.users(id);

-- Step 5: Add traceability columns to lab_items (assuming this is the 'itens' table)
ALTER TABLE public.lab_items 
ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by_id UUID REFERENCES auth.users(id);

-- Optional: Create a trigger to automatically set updated_by_id if needed, 
-- but usually this is handled by the application logic or a specific trigger.
-- For now, just adding the columns as requested.
