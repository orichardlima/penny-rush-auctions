-- Remover a foreign key constraint incorreta que referencia auth.users
-- Esta constraint está impedindo a inserção de bids com user_ids dos bots
ALTER TABLE public.bids DROP CONSTRAINT IF EXISTS bids_user_id_fkey;

-- Os bots existem apenas na tabela profiles, não em auth.users
-- A verificação de validade dos user_ids será feita via RLS policies que já existem