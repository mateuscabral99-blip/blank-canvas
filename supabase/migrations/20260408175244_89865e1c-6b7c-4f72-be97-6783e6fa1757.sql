
CREATE TABLE public.lab_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  interesse BOOLEAN NOT NULL DEFAULT true,
  tipo TEXT NOT NULL CHECK (tipo IN ('qualidade', 'reversa')),
  status_teste TEXT NOT NULL CHECK (status_teste IN ('aprovado', 'reprovado')),
  dias_estoque INTEGER NOT NULL DEFAULT 0,
  valor_estimado NUMERIC(12,2) NOT NULL DEFAULT 0,
  status_final TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lab_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lab items"
  ON public.lab_items FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert lab items"
  ON public.lab_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete lab items"
  ON public.lab_items FOR DELETE
  USING (true);
