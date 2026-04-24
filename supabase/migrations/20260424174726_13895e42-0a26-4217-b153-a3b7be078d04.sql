-- Fix infinite recursion in profiles RLS policies
DO $$ 
BEGIN
    -- Drop existing policies if they exist to avoid conflicts
    DROP POLICY IF EXISTS "Profiles are viewable by owner or admins" ON public.profiles;
    DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
END $$;

-- Ensure we have a security definer function to check for admin status
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = $1 
    AND profiles.role IN ('ADMIN', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create new non-recursive policies
CREATE POLICY "Profiles are viewable by owner or admins" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Admins can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id OR is_admin(auth.uid()))
WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (is_admin(auth.uid()));
