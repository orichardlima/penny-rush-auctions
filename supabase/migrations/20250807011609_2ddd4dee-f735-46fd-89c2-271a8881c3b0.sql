-- Recrear a função auto-bid-system com correção do ends_at ambíguo
CREATE OR REPLACE FUNCTION public.auto_bid_system()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  auction_record record;
  current_revenue integer;
  revenue_percentage decimal;
  bot_id uuid;
BEGIN
  -- Buscar leilões ativos com timer baixo e meta de receita
  FOR auction_record IN 
    SELECT 
      a.id,
      a.time_left,
      a.revenue_target,
      a.current_price,
      a.bid_increment,
      a.bid_cost,
      a.ends_at
    FROM public.auctions a
    WHERE a.status = 'active' 
      AND a.time_left <= 7 
      AND a.time_left > 1 
      AND a.revenue_target > 0
  LOOP
    
    -- Calcular receita atual
    SELECT get_auction_revenue(auction_record.id) INTO current_revenue;
    
    -- Calcular porcentagem da meta
    revenue_percentage := (current_revenue::decimal / auction_record.revenue_target::decimal) * 100;
    
    -- Se receita < 80% da meta, ativar bot
    IF revenue_percentage < 80 THEN
      RAISE LOG 'Bot intervention triggered for auction %: revenue %/% (%.1f%%)', 
        auction_record.id, current_revenue, auction_record.revenue_target, revenue_percentage;
      
      -- Obter bot
      SELECT get_random_bot() INTO bot_id;
      
      -- Inserir lance do bot
      INSERT INTO public.bids (auction_id, user_id, bid_amount, cost_paid)
      VALUES (auction_record.id, bot_id, auction_record.current_price + auction_record.bid_increment, auction_record.bid_cost);
      
      RAISE LOG 'Bot % placed bid on auction %', bot_id, auction_record.id;
    END IF;
  END LOOP;
  
  RAISE LOG 'Auto-bid system check completed';
END;
$$;

-- Recriar a função sync_auction_timer sem ambiguidade
CREATE OR REPLACE FUNCTION public.sync_auction_timer(auction_uuid uuid)
RETURNS TABLE(id uuid, time_left integer, ends_at timestamp with time zone, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Atualizar o time_left baseado no ends_at
  UPDATE public.auctions
  SET 
    time_left = GREATEST(0, EXTRACT(EPOCH FROM (auctions.ends_at - NOW()))::integer),
    updated_at = NOW()
  WHERE auctions.id = auction_uuid;
  
  -- Retornar os dados atualizados
  RETURN QUERY
  SELECT 
    auctions.id,
    auctions.time_left,
    auctions.ends_at,
    auctions.status::text
  FROM public.auctions
  WHERE auctions.id = auction_uuid;
END;
$$;

-- Criar o cron job do sistema de auto-bid se não existir
SELECT cron.schedule(
  'auto-bid-system-every-30s',
  '*/30 * * * * *',
  $$SELECT public.auto_bid_system();$$
);