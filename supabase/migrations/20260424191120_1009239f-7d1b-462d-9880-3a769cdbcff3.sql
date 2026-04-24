DELETE FROM public.equipamentos 
WHERE id IN (
  SELECT id FROM public.equipamentos 
  ORDER BY created_at ASC 
  LIMIT 3
);