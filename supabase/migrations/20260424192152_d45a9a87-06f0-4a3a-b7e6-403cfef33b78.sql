-- Add columns to equipamentos
ALTER TABLE public.equipamentos ADD COLUMN tecnico_responsavel_id UUID REFERENCES public.tecnicos(id);
ALTER TABLE public.equipamentos ADD COLUMN tecnico_entrada_id UUID REFERENCES public.tecnicos(id);

-- Add columns to lab_items
ALTER TABLE public.lab_items ADD COLUMN tecnico_id UUID REFERENCES public.tecnicos(id);
ALTER TABLE public.lab_items ADD COLUMN tecnico_responsavel_id UUID REFERENCES public.tecnicos(id);

-- Add columns to repair_returns
ALTER TABLE public.repair_returns ADD COLUMN tecnico_id UUID REFERENCES public.tecnicos(id);

-- Migrate data for equipamentos
UPDATE public.equipamentos e
SET tecnico_responsavel_id = t.id
FROM public.tecnicos t
WHERE e.tecnico_responsavel = t.nome;

UPDATE public.equipamentos e
SET tecnico_entrada_id = t.id
FROM public.tecnicos t
WHERE e.tecnico_entrada = t.nome;

-- Migrate data for lab_items
UPDATE public.lab_items l
SET tecnico_id = t.id
FROM public.tecnicos t
WHERE l.tecnico = t.nome;

UPDATE public.lab_items l
SET tecnico_responsavel_id = t.id
FROM public.tecnicos t
WHERE l.tecnico_responsavel = t.nome;

-- Migrate data for repair_returns
UPDATE public.repair_returns r
SET tecnico_id = t.id
FROM public.tecnicos t
WHERE r.tecnico = t.nome;
