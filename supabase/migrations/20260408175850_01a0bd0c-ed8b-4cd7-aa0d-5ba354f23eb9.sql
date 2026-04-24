
DROP POLICY "Anyone can insert lab items" ON public.lab_items;
DROP POLICY "Anyone can delete lab items" ON public.lab_items;

CREATE POLICY "Authenticated users can insert lab items"
  ON public.lab_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete lab items"
  ON public.lab_items FOR DELETE
  TO authenticated
  USING (true);
