-- Adicionar coluna is_bot na tabela profiles
ALTER TABLE public.profiles ADD COLUMN is_bot boolean DEFAULT false;

-- Função para obter bot aleatório (criará bots se não existirem)
CREATE OR REPLACE FUNCTION public.get_random_bot()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  bot_user_id uuid;
  bot_count integer;
BEGIN
  -- Verificar se existem bots
  SELECT COUNT(*) INTO bot_count FROM public.profiles WHERE is_bot = true;
  
  -- Se não há bots, criar alguns IDs fictícios para usar
  IF bot_count = 0 THEN
    -- Inserir alguns bots com IDs únicos mas fictícios
    INSERT INTO public.profiles (user_id, full_name, email, is_bot, bids_balance) VALUES
      (gen_random_uuid(), 'Ana Silva', 'ana.bot@sistema.com', true, 999999999),
      (gen_random_uuid(), 'Carlos Santos', 'carlos.bot@sistema.com', true, 999999999),
      (gen_random_uuid(), 'Maria Oliveira', 'maria.bot@sistema.com', true, 999999999),
      (gen_random_uuid(), 'João Pereira', 'joao.bot@sistema.com', true, 999999999),
      (gen_random_uuid(), 'Fernanda Costa', 'fernanda.bot@sistema.com', true, 999999999);
  END IF;
  
  -- Retornar um bot aleatório
  SELECT user_id INTO bot_user_id
  FROM public.profiles 
  WHERE is_bot = true 
  ORDER BY random() 
  LIMIT 1;
  
  RETURN bot_user_id;
END;
$$;

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