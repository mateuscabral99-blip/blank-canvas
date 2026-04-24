-- 1. Fix security warnings for existing functions
ALTER FUNCTION public.set_traceability_columns() SET search_path = public;
ALTER FUNCTION public.update_supplier_stats() SET search_path = public;
ALTER FUNCTION public.has_any_role(uuid) SET search_path = public;
ALTER FUNCTION public.is_admin(uuid) SET search_path = public;
ALTER FUNCTION public.is_admin_or_supervisor(uuid) SET search_path = public;

-- 2. Create function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, nome, role, ativo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    'operator',
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Apply traceability triggers to missing tables (equipamentos and lab_items)
DO $$ 
DECLARE
    t text;
    tables_to_trigger text[] := ARRAY['equipamentos', 'lab_items'];
BEGIN
    FOR t IN SELECT unnest(tables_to_trigger) LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS set_traceability_on_%I ON public.%I', t, t);
        EXECUTE format('CREATE TRIGGER set_traceability_on_%I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_traceability_columns()', t, t);
    END LOOP;
END $$;
