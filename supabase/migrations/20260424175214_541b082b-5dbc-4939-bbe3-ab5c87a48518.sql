-- Fix search_path for existing functions to resolve linter warnings
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.handle_new_user_profile_link() SET search_path = public;

-- Add performance indexes for foreign keys and common search fields
CREATE INDEX IF NOT EXISTS idx_lab_items_equipment_id ON public.lab_items(equipment_id);
CREATE INDEX IF NOT EXISTS idx_lab_items_supplier_id ON public.lab_items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_lab_items_sn ON public.lab_items(sn);

CREATE INDEX IF NOT EXISTS idx_test_results_equipment_id ON public.test_results(equipment_id);
CREATE INDEX IF NOT EXISTS idx_test_results_sn ON public.test_results(sn);

CREATE INDEX IF NOT EXISTS idx_repair_returns_supplier_id ON public.repair_returns(supplier_id);
CREATE INDEX IF NOT EXISTS idx_repair_returns_sn ON public.repair_returns(sn);

-- Add index for user_roles to speed up permission checks
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
