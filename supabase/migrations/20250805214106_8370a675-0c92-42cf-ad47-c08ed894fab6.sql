-- Adicionar coluna is_bot na tabela profiles
ALTER TABLE public.profiles ADD COLUMN is_bot boolean DEFAULT false;

-- Criar usuários bot para o sistema
INSERT INTO public.profiles (user_id, full_name, email, is_bot, bids_balance) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Ana Silva', 'ana.bot@sistema.com', true, 999999999),
  ('00000000-0000-0000-0000-000000000002', 'Carlos Santos', 'carlos.bot@sistema.com', true, 999999999),
  ('00000000-0000-0000-0000-000000000003', 'Maria Oliveira', 'maria.bot@sistema.com', true, 999999999),
  ('00000000-0000-0000-0000-000000000004', 'João Pereira', 'joao.bot@sistema.com', true, 999999999),
  ('00000000-0000-0000-0000-000000000005', 'Fernanda Costa', 'fernanda.bot@sistema.com', true, 999999999),
  ('00000000-0000-0000-0000-000000000006', 'Roberto Lima', 'roberto.bot@sistema.com', true, 999999999),
  ('00000000-0000-0000-0000-000000000007', 'Juliana Rocha', 'juliana.bot@sistema.com', true, 999999999),
  ('00000000-0000-0000-0000-000000000008', 'Pedro Alves', 'pedro.bot@sistema.com', true, 999999999);

-- Atualizar políticas RLS para permitir bots
CREATE POLICY "Bots can insert bids" 
ON public.bids 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = bids.user_id 
    AND profiles.is_bot = true
  )
);

-- Função para obter bot aleatório
CREATE OR REPLACE FUNCTION public.get_random_bot()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT user_id 
  FROM public.profiles 
  WHERE is_bot = true 
  ORDER BY random() 
  LIMIT 1;
$$;