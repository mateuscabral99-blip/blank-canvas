-- Rename serial_number to sn
ALTER TABLE public.equipamentos RENAME COLUMN serial_number TO sn;

-- Remove obsolete columns
ALTER TABLE public.equipamentos DROP COLUMN IF EXISTS origem_fluxo;
ALTER TABLE public.equipamentos DROP COLUMN IF EXISTS codigo_imanager;
