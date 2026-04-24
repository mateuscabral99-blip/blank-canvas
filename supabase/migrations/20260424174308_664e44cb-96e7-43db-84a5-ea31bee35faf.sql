-- Ensure unique index on email for profiles
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (email);

-- Update RLS policies for profiles to allow admins to manage all rows
-- First, let's update the existing select policy to also include admins
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Profiles are viewable by owner or admins" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'ADMIN'
  )
);

CREATE POLICY "Admins can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'ADMIN'
  )
);

CREATE POLICY "Admins can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'ADMIN'
  )
);

CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'ADMIN'
  )
);

-- Trigger function to link profiles on sign up
CREATE OR REPLACE FUNCTION public.handle_new_user_profile_link()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if a profile with the same email already exists and doesn't have a user_id
  UPDATE public.profiles
  SET user_id = NEW.id,
      updated_at = NOW()
  WHERE email = NEW.email AND user_id IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_link_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_link_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile_link();
