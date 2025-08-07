-- Corrigir as funções restantes que precisam de search_path

CREATE OR REPLACE FUNCTION public.get_random_bot()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.get_auction_revenue(auction_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  total_revenue integer := 0;
BEGIN
  SELECT COALESCE(SUM(cost_paid), 0)
  INTO total_revenue
  FROM public.bids
  WHERE auction_id = auction_uuid;
  
  RETURN total_revenue;
END;
$$;