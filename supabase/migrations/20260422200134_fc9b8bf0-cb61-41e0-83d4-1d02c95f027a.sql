-- Rename the column in test_results table
ALTER TABLE public.test_results RENAME COLUMN resultado_teste TO resultado;

-- Ensure RLS policies are still correct (they usually refer to the table, not specific columns, unless they are column-level)
-- No changes needed for existing policies based on the previous check.
