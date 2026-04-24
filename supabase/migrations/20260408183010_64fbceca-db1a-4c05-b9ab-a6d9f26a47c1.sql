
CREATE TABLE public.cadastro_modelos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL DEFAULT '',
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('Uso', 'Obsoleto')),
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cadastro_modelos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cadastro_modelos"
ON public.cadastro_modelos FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can insert cadastro_modelos"
ON public.cadastro_modelos FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update cadastro_modelos"
ON public.cadastro_modelos FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete cadastro_modelos"
ON public.cadastro_modelos FOR DELETE
TO authenticated
USING (true);
