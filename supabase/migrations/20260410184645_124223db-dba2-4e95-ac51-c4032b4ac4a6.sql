
-- Create laudos table
CREATE TABLE public.laudos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sn TEXT NOT NULL,
  observacoes TEXT NOT NULL DEFAULT '',
  concluido BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.laudos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view laudos" ON public.laudos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert laudos" ON public.laudos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update laudos" ON public.laudos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete laudos" ON public.laudos FOR DELETE TO authenticated USING (true);

-- Create laudo_attachments table
CREATE TABLE public.laudo_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  laudo_id UUID NOT NULL REFERENCES public.laudos(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.laudo_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view laudo_attachments" ON public.laudo_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert laudo_attachments" ON public.laudo_attachments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete laudo_attachments" ON public.laudo_attachments FOR DELETE TO authenticated USING (true);

-- Create storage bucket for laudo attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('laudo-attachments', 'laudo-attachments', true);

CREATE POLICY "Authenticated users can upload laudo attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'laudo-attachments');
CREATE POLICY "Anyone can view laudo attachments" ON storage.objects FOR SELECT USING (bucket_id = 'laudo-attachments');
CREATE POLICY "Authenticated users can delete laudo attachments" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'laudo-attachments');

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_laudos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_laudos_updated_at
BEFORE UPDATE ON public.laudos
FOR EACH ROW
EXECUTE FUNCTION public.update_laudos_updated_at();
