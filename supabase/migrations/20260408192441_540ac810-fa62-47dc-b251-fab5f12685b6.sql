ALTER TABLE public.cadastro_modelos DROP CONSTRAINT cadastro_modelos_categoria_check;

ALTER TABLE public.cadastro_modelos ADD CONSTRAINT cadastro_modelos_categoria_check CHECK (categoria = ANY (ARRAY['Interesse'::text, 'Não Interesse'::text]));