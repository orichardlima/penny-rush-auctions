-- Marcar um usuário existente como bot temporário para testes
UPDATE public.profiles 
SET is_bot = true, bids_balance = 999999999
WHERE user_id = 'c793d66c-06c5-4fdf-9c2c-0baedd2694f6';

-- Criar função simplificada que usa o usuário admin como bot temporário
CREATE OR REPLACE FUNCTION public.get_random_bot()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  bot_user_id uuid;
BEGIN
  -- Usar o admin como bot temporário
  SELECT user_id INTO bot_user_id
  FROM public.profiles 
  WHERE is_bot = true 
  ORDER BY random() 
  LIMIT 1;
  
  -- Se não há bots, usar um ID padrão (admin)
  IF bot_user_id IS NULL THEN
    bot_user_id := 'c793d66c-06c5-4fdf-9c2c-0baedd2694f6'::uuid;
  END IF;
  
  RETURN bot_user_id;
END;
$function$;

-- Testar a função
SELECT get_random_bot() as bot_id;