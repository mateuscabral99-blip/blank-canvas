
CREATE TABLE public.test_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sn TEXT NOT NULL,
  codigo TEXT NOT NULL DEFAULT '',
  nome TEXT NOT NULL DEFAULT '',
  resultado_teste TEXT NOT NULL,
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view test_results" ON public.test_results FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert test_results" ON public.test_results FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update test_results" ON public.test_results FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete test_results" ON public.test_results FOR DELETE TO authenticated USING (true);
