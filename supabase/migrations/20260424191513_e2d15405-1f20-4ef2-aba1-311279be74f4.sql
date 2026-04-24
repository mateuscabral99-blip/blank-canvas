-- Create a table for technicians
CREATE TABLE IF NOT EXISTS public.tecnicos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT UNIQUE,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tecnicos ENABLE ROW LEVEL SECURITY;

-- Create policies for technicians
CREATE POLICY "Technicians are viewable by everyone" 
ON public.tecnicos 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage technicians" 
ON public.tecnicos 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'ADMIN')
    )
);

-- Seed initial technicians if they don't exist
INSERT INTO public.tecnicos (nome) 
SELECT 'Mateus Mendes' WHERE NOT EXISTS (SELECT 1 FROM public.tecnicos WHERE nome = 'Mateus Mendes');
INSERT INTO public.tecnicos (nome) 
SELECT 'João Victor' WHERE NOT EXISTS (SELECT 1 FROM public.tecnicos WHERE nome = 'João Victor');

-- Create or replace function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic timestamp updates on tecnicos
DROP TRIGGER IF EXISTS update_tecnicos_updated_at ON public.tecnicos;
CREATE TRIGGER update_tecnicos_updated_at
BEFORE UPDATE ON public.tecnicos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate equipment metrics (days in stock and status) automatically
CREATE OR REPLACE FUNCTION public.calculate_equipamento_metrics()
RETURNS TRIGGER AS $$
DECLARE
    v_days_in_stock INTEGER;
BEGIN
    -- Calculate days in stock based on data_entrada
    IF NEW.data_entrada IS NOT NULL THEN
        NEW.dias_estoque := EXTRACT(DAY FROM (now() - NEW.data_entrada::timestamp));
    END IF;

    -- Business logic from calcularStatus (src/types/LabItem.ts)
    -- Items not of interest go straight to Obsoleto
    IF NEW.interesse = false THEN
        NEW.status_final := 'Obsoleto';
        NEW.acao_recomendada := 'depreciar';
    -- Critical: over 60 days in stock
    ELSIF NEW.dias_estoque > 60 THEN
        NEW.status_final := 'Crítico';
        NEW.acao_recomendada := 'prioridade_maxima';
    -- New entries that haven't been tested yet stay as "Entrada"
    ELSIF NEW.status_teste = 'pendente' OR NEW.status_teste IS NULL THEN
        NEW.status_final := 'Entrada';
        NEW.acao_recomendada := 'aguardar';
    -- After testing - failed tests go to Oferta
    ELSIF NEW.status_teste = 'reprovado' THEN
        NEW.status_final := 'Oferta';
        NEW.acao_recomendada := 'ofertar_defeito_pintura';
    -- After testing - approved items go to Teste (Em Análise)
    ELSIF NEW.status_teste = 'aprovado' AND NEW.dias_estoque <= 60 THEN
        NEW.status_final := 'Teste';
        NEW.acao_recomendada := 'em_analise';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic equipment metrics updates
DROP TRIGGER IF EXISTS tr_calculate_equipamento_metrics ON public.equipamentos;
CREATE TRIGGER tr_calculate_equipamento_metrics
BEFORE INSERT OR UPDATE ON public.equipamentos
FOR EACH ROW
EXECUTE FUNCTION public.calculate_equipamento_metrics();

-- Update existing records to trigger the new metrics calculation
UPDATE public.equipamentos SET updated_at = now() WHERE updated_at IS NULL OR updated_at < now();
