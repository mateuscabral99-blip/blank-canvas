-- Add missing indexes for foreign keys and audit columns
CREATE INDEX IF NOT EXISTS idx_equipamentos_tecnico_responsavel_id ON public.equipamentos(tecnico_responsavel_id);
CREATE INDEX IF NOT EXISTS idx_equipamentos_tecnico_entrada_id ON public.equipamentos(tecnico_entrada_id);
CREATE INDEX IF NOT EXISTS idx_equipamentos_created_by_id ON public.equipamentos(created_by_id);
CREATE INDEX IF NOT EXISTS idx_equipamentos_updated_by_id ON public.equipamentos(updated_by_id);

CREATE INDEX IF NOT EXISTS idx_lab_items_tecnico_id ON public.lab_items(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_lab_items_conferente_id ON public.lab_items(conferente_id);
CREATE INDEX IF NOT EXISTS idx_lab_items_tecnico_responsavel_id ON public.lab_items(tecnico_responsavel_id);
CREATE INDEX IF NOT EXISTS idx_lab_items_created_by_id ON public.lab_items(created_by_id);
CREATE INDEX IF NOT EXISTS idx_lab_items_updated_by_id ON public.lab_items(updated_by_id);

CREATE INDEX IF NOT EXISTS idx_repair_returns_equipment_id ON public.repair_returns(equipment_id);
CREATE INDEX IF NOT EXISTS idx_repair_returns_tecnico_id ON public.repair_returns(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_repair_returns_created_by_id ON public.repair_returns(created_by_id);
CREATE INDEX IF NOT EXISTS idx_repair_returns_updated_by_id ON public.repair_returns(updated_by_id);

CREATE INDEX IF NOT EXISTS idx_test_results_equipment_id ON public.test_results(equipment_id);
CREATE INDEX IF NOT EXISTS idx_test_results_tecnico_id ON public.test_results(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_test_results_created_by_id ON public.test_results(created_by_id);
CREATE INDEX IF NOT EXISTS idx_test_results_updated_by_id ON public.test_results(updated_by_id);

CREATE INDEX IF NOT EXISTS idx_laudo_attachments_laudo_id ON public.laudo_attachments(laudo_id);

CREATE INDEX IF NOT EXISTS idx_laudos_updated_by_id ON public.laudos(updated_by_id);

CREATE INDEX IF NOT EXISTS idx_lotes_created_by_id ON public.lotes(created_by_id);
CREATE INDEX IF NOT EXISTS idx_lotes_updated_by_id ON public.lotes(updated_by_id);

CREATE INDEX IF NOT EXISTS idx_repair_suppliers_created_by_id ON public.repair_suppliers(created_by_id);
CREATE INDEX IF NOT EXISTS idx_repair_suppliers_updated_by_id ON public.repair_suppliers(updated_by_id);

CREATE INDEX IF NOT EXISTS idx_tecnicos_created_by_id ON public.tecnicos(created_by_id);
CREATE INDEX IF NOT EXISTS idx_tecnicos_updated_by_id ON public.tecnicos(updated_by_id);

CREATE INDEX IF NOT EXISTS idx_item_history_updated_by_id ON public.item_history(updated_by_id);
CREATE INDEX IF NOT EXISTS idx_item_history_created_by_id ON public.item_history(created_by_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Fix security warnings by setting search_path for functions
ALTER FUNCTION public.log_equipment_status_change() SET search_path = public;
ALTER FUNCTION public.calculate_equipamento_metrics() SET search_path = public;
ALTER FUNCTION public.update_supplier_stats() SET search_path = public;
ALTER FUNCTION public.set_traceability_columns() SET search_path = public;
ALTER FUNCTION public.set_audit_columns() SET search_path = public;
ALTER FUNCTION public.handle_equipment_sync() SET search_path = public;
