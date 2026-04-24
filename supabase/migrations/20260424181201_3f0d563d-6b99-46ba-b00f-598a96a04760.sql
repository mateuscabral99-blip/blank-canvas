-- Add missing indices for foreign keys and frequently queried columns

-- Equipamentos indices
CREATE INDEX IF NOT EXISTS idx_equipamentos_modelo_id ON public.equipamentos(modelo_id);
CREATE INDEX IF NOT EXISTS idx_equipamentos_lote_id ON public.equipamentos(lote_id);
CREATE INDEX IF NOT EXISTS idx_equipamentos_status ON public.equipamentos(status);

-- Item History indices
CREATE INDEX IF NOT EXISTS idx_item_history_equipment_id ON public.item_history(equipment_id);
CREATE INDEX IF NOT EXISTS idx_item_history_created_at ON public.item_history(created_at);

-- Laudos indices
CREATE INDEX IF NOT EXISTS idx_laudos_equipment_id ON public.laudos(equipment_id);
CREATE INDEX IF NOT EXISTS idx_laudos_sn ON public.laudos(sn);

-- Test Results indices
CREATE INDEX IF NOT EXISTS idx_test_results_equipment_id ON public.test_results(equipment_id);
CREATE INDEX IF NOT EXISTS idx_test_results_sn ON public.test_results(sn);
CREATE INDEX IF NOT EXISTS idx_test_results_serial_number ON public.test_results(serial_number);

-- Lotes indices
CREATE INDEX IF NOT EXISTS idx_lotes_fornecedor_id ON public.lotes(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_lotes_status ON public.lotes(status);

-- Repair Suppliers indices
CREATE INDEX IF NOT EXISTS idx_repair_suppliers_nome ON public.repair_suppliers(nome);

-- Cadastro Modelos indices
CREATE INDEX IF NOT EXISTS idx_cadastro_modelos_codigo ON public.cadastro_modelos(codigo);
CREATE INDEX IF NOT EXISTS idx_cadastro_modelos_nome ON public.cadastro_modelos(nome);
