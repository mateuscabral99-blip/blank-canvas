-- Repair suppliers table
CREATE TABLE public.repair_suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  indice_qualidade NUMERIC NOT NULL DEFAULT 100,
  total_reparos INTEGER NOT NULL DEFAULT 0,
  total_falhas INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.repair_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view repair_suppliers"
  ON public.repair_suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert repair_suppliers"
  ON public.repair_suppliers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update repair_suppliers"
  ON public.repair_suppliers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete repair_suppliers"
  ON public.repair_suppliers FOR DELETE TO authenticated USING (true);

-- Seed default suppliers matching existing destino_reparo options
INSERT INTO public.repair_suppliers (nome) VALUES
  ('Fornecedor A'),
  ('Assistência Técnica B'),
  ('Garantia'),
  ('Reparo Interno');

-- Repair returns tracking table
CREATE TABLE public.repair_returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sn TEXT NOT NULL,
  supplier_id UUID NOT NULL REFERENCES public.repair_suppliers(id) ON DELETE CASCADE,
  resultado_amostragem TEXT NOT NULL DEFAULT 'pendente',
  encaminhamento TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.repair_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view repair_returns"
  ON public.repair_returns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert repair_returns"
  ON public.repair_returns FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update repair_returns"
  ON public.repair_returns FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete repair_returns"
  ON public.repair_returns FOR DELETE TO authenticated USING (true);