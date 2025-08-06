-- Inserir perfil para o usuário admin
INSERT INTO public.profiles (
  user_id, 
  full_name, 
  email, 
  bids_balance, 
  is_admin, 
  is_bot,
  created_at,
  updated_at
) VALUES (
  'c793d66c-06c5-4fdf-9c2c-0baedd2694f6',
  'Administrador',
  'richardylima91@gmail.com',
  1000,
  true,
  false,
  now(),
  now()
) ON CONFLICT (user_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  is_admin = EXCLUDED.is_admin,
  updated_at = now();