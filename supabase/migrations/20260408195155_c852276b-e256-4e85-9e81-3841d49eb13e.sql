
DROP POLICY "Anyone can view lab items" ON public.lab_items;
CREATE POLICY "Authenticated users can view lab items" ON public.lab_items FOR SELECT TO authenticated USING (true);

DROP POLICY "Anyone can view test_results" ON public.test_results;
CREATE POLICY "Authenticated users can view test_results" ON public.test_results FOR SELECT TO authenticated USING (true);
