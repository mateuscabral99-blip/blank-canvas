-- Fix security: Set search path for any existing functions (if any)
-- (We'll define our new function with a safe search path)

-- 1. Create the function to update the updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2. Apply the trigger to all tables with an updated_at column
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
          AND table_schema = 'public' 
          AND table_name NOT IN (SELECT event_object_table FROM information_schema.triggers WHERE trigger_name = 'set_updated_at')
    LOOP
        EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t);
    END LOOP;
END;
$$;

-- 3. Add created_by_id to laudos and test_results for better traceability
ALTER TABLE public.laudos ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES auth.users(id);
ALTER TABLE public.test_results ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES auth.users(id);

-- 4. Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_laudos_created_by_id ON public.laudos(created_by_id);
CREATE INDEX IF NOT EXISTS idx_test_results_created_by_id ON public.test_results(created_by_id);

-- 5. Automate profile creation for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, nome, role, ativo)
    VALUES (NEW.id, NEW.email, split_part(NEW.email, '@', 1), 'operador', true);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create the trigger on auth.users (requires careful handling in Supabase)
-- Note: In some environments, triggers on auth.users must be created in the auth schema or via specific extensions.
-- This is the standard way for Supabase:
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Ensure RLS policies are up to date for new columns (optional but good practice)
-- Policies for laudos already exist, but we might want to allow users to see what they created
-- Current policies are likely broad enough, but let's check if we need to add anything specific.
