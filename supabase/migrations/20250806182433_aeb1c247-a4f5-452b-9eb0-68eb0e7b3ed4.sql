-- Adicionar campo company_revenue na tabela auctions
ALTER TABLE public.auctions 
ADD COLUMN company_revenue DECIMAL(10,2) DEFAULT 0.00 NOT NULL;

-- Comentário explicando o campo
COMMENT ON COLUMN public.auctions.company_revenue IS 'Receita total gerada pela empresa com lances de usuários reais (não bots) neste leilão';

-- Atualizar função update_auction_stats para incrementar company_revenue apenas para usuários reais
CREATE OR REPLACE FUNCTION public.update_auction_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  utc_now timestamptz;
  new_ends_at timestamptz;
  is_bot_user boolean := false;
BEGIN
  -- Use UTC consistently
  utc_now := now();
  
  -- Calculate new end time with 16-second buffer to ensure 15 seconds minimum
  new_ends_at := utc_now + INTERVAL '16 seconds';
  
  -- Verificar se o usuário é um bot
  SELECT COALESCE(p.is_bot, false) INTO is_bot_user
  FROM public.profiles p
  WHERE p.user_id = NEW.user_id;
  
  -- Update auction stats
  IF is_bot_user THEN
    -- Bot lance: incrementa current_price e total_bids, mas NÃO incrementa company_revenue
    UPDATE public.auctions
    SET 
      total_bids = total_bids + 1,
      current_price = current_price + bid_increment,
      ends_at = new_ends_at,
      time_left = 15,
      updated_at = utc_now
    WHERE id = NEW.auction_id;
    
    RAISE LOG 'Bot bid placed on auction %: timer reset to 15 seconds, NO revenue added', NEW.auction_id;
  ELSE
    -- Usuário real: incrementa current_price, total_bids E company_revenue
    UPDATE public.auctions
    SET 
      total_bids = total_bids + 1,
      current_price = current_price + bid_increment,
      company_revenue = company_revenue + (bid_cost / 100.0), -- bid_cost está em centavos, converter para reais
      ends_at = new_ends_at,
      time_left = 15,
      updated_at = utc_now
    WHERE id = NEW.auction_id;
    
    RAISE LOG 'User bid placed on auction %: timer reset to 15 seconds, revenue increased by R$%.2f', 
      NEW.auction_id, (NEW.cost_paid / 100.0);
  END IF;
  
  RETURN NEW;
END;
$function$;