-- Allow users to always read their own profile by ID
drop policy if exists "Users can view own profile" on profiles;

create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

-- Also allow reading by email match as fallback  
drop policy if exists "Admins can view all profiles" on profiles;

create policy "Admins can view all profiles"
  on profiles for select
  using (
    auth.uid() = id 
    or 
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
