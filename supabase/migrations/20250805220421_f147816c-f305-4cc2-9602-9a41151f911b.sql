-- Corrigir o problema principal: O cron job estava chamando uma função inexistente
-- Vamos criar um trigger que chama o sistema de bots automaticamente quando o timer é baixo

CREATE OR REPLACE FUNCTION public.check_bot_intervention()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_revenue integer;
  revenue_percentage decimal;
  bot_id uuid;
BEGIN
  -- Só processar se for um leilão ativo com timer baixo e meta de receita
  IF NEW.status = 'active' AND NEW.time_left <= 7 AND NEW.time_left > 1 AND NEW.revenue_target > 0 THEN
    
    -- Calcular receita atual
    SELECT get_auction_revenue(NEW.id) INTO current_revenue;
    
    -- Calcular porcentagem da meta
    revenue_percentage := (current_revenue::decimal / NEW.revenue_target::decimal) * 100;
    
    -- Se receita < 80% da meta, ativar bot
    IF revenue_percentage < 80 THEN
      RAISE LOG 'Bot intervention triggered for auction %: revenue %/% (%.1f%%)', 
        NEW.id, current_revenue, NEW.revenue_target, revenue_percentage;
      
      -- Obter bot
      SELECT get_random_bot() INTO bot_id;
      
      -- Inserir lance do bot
      INSERT INTO public.bids (auction_id, user_id, bid_amount, cost_paid)
      VALUES (NEW.id, bot_id, NEW.current_price + NEW.bid_increment, NEW.bid_cost);
      
      RAISE LOG 'Bot % placed bid on auction %', bot_id, NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger que executa após updates do timer
CREATE OR REPLACE TRIGGER bot_intervention_trigger
  AFTER UPDATE OF time_left ON public.auctions
  FOR EACH ROW
  EXECUTE FUNCTION public.check_bot_intervention();