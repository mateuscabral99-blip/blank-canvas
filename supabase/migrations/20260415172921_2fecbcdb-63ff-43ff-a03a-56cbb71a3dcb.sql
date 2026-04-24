
-- 1. Create helper function to check if user has any assigned role
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id
  )
$$;

-- 2. Fix lab_items INSERT/UPDATE policies
DROP POLICY IF EXISTS "Authenticated users can insert lab items" ON public.lab_items;
DROP POLICY IF EXISTS "Authenticated users can update lab items" ON public.lab_items;

CREATE POLICY "Users with role can insert lab items"
ON public.lab_items FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid()));

CREATE POLICY "Users with role can update lab items"
ON public.lab_items FOR UPDATE TO authenticated
USING (has_any_role(auth.uid()));

-- 3. Fix test_results INSERT/UPDATE policies
DROP POLICY IF EXISTS "Authenticated users can insert test_results" ON public.test_results;
DROP POLICY IF EXISTS "Authenticated users can update test_results" ON public.test_results;

CREATE POLICY "Users with role can insert test_results"
ON public.test_results FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid()));

CREATE POLICY "Users with role can update test_results"
ON public.test_results FOR UPDATE TO authenticated
USING (has_any_role(auth.uid()));

-- 4. Fix laudos INSERT/UPDATE policies
DROP POLICY IF EXISTS "Authenticated users can insert laudos" ON public.laudos;
DROP POLICY IF EXISTS "Authenticated users can update laudos" ON public.laudos;

CREATE POLICY "Users with role can insert laudos"
ON public.laudos FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid()));

CREATE POLICY "Users with role can update laudos"
ON public.laudos FOR UPDATE TO authenticated
USING (has_any_role(auth.uid()));

-- 5. Fix laudo_attachments INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert laudo_attachments" ON public.laudo_attachments;

CREATE POLICY "Users with role can insert laudo_attachments"
ON public.laudo_attachments FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid()));

-- 6. Fix repair_returns INSERT/UPDATE policies
DROP POLICY IF EXISTS "Authenticated users can insert repair_returns" ON public.repair_returns;
DROP POLICY IF EXISTS "Authenticated users can update repair_returns" ON public.repair_returns;

CREATE POLICY "Users with role can insert repair_returns"
ON public.repair_returns FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid()));

CREATE POLICY "Users with role can update repair_returns"
ON public.repair_returns FOR UPDATE TO authenticated
USING (has_any_role(auth.uid()));

-- 7. Fix profiles: remove supervisor broad access, add self-view
DROP POLICY IF EXISTS "Supervisors can view profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 8. Fix storage policies for laudo-attachments bucket
DROP POLICY IF EXISTS "Authenticated users can read laudo attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload laudo attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update laudo attachments" ON storage.objects;

CREATE POLICY "Users with role can read laudo attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'laudo-attachments' AND has_any_role(auth.uid()));

CREATE POLICY "Users with role can upload laudo attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'laudo-attachments' AND has_any_role(auth.uid()));

CREATE POLICY "Users with role can update laudo attachments"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'laudo-attachments' AND has_any_role(auth.uid()));
