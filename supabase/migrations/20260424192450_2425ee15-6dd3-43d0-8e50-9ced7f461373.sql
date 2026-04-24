-- Add tecnico_id to test_results
ALTER TABLE public.test_results ADD COLUMN tecnico_id UUID REFERENCES public.tecnicos(id);

-- Add tecnico_id to laudos
ALTER TABLE public.laudos ADD COLUMN tecnico_id UUID REFERENCES public.tecnicos(id);

-- Migrate data for test_results
UPDATE public.test_results tr
SET tecnico_id = t.id
FROM public.tecnicos t
WHERE tr.testado_por = t.nome;

-- Migrate data for laudos (assuming created_by might contain the name or we can find it)
-- Since laudos has created_by which is text, we'll try to match it with tecnicos.nome
UPDATE public.laudos l
SET tecnico_id = t.id
FROM public.tecnicos t
WHERE l.created_by = t.nome;

-- Create indexes for better performance
CREATE INDEX idx_test_results_tecnico_id ON public.test_results(tecnico_id);
CREATE INDEX idx_laudos_tecnico_id ON public.laudos(tecnico_id);