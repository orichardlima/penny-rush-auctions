-- Corrigir a função update_auction_timers para sempre usar 15 segundos
CREATE OR REPLACE FUNCTION public.update_auction_timers()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  auction_record record;
  brazil_now timestamptz;
  time_remaining integer;
BEGIN
  -- Get current time in Brazil timezone
  brazil_now := timezone('America/Sao_Paulo', now());
  
  -- Update all active auctions to ensure ends_at is properly set
  FOR auction_record IN 
    SELECT id, time_left, ends_at, updated_at 
    FROM public.auctions 
    WHERE status = 'active'
  LOOP
    -- If auction has time_left but no ends_at, calculate ends_at
    IF auction_record.ends_at IS NULL AND auction_record.time_left IS NOT NULL THEN
      UPDATE public.auctions 
      SET ends_at = brazil_now + (auction_record.time_left || ' seconds')::interval,
          updated_at = brazil_now
      WHERE id = auction_record.id;
      
      RAISE LOG 'Set ends_at for auction %: % seconds from now', auction_record.id, auction_record.time_left;
    
    -- If auction has ends_at, calculate time_left
    ELSIF auction_record.ends_at IS NOT NULL THEN
      time_remaining := GREATEST(0, EXTRACT(EPOCH FROM (auction_record.ends_at - brazil_now))::integer);
      
      UPDATE public.auctions 
      SET time_left = time_remaining,
          updated_at = brazil_now
      WHERE id = auction_record.id;
      
      -- If time is up, mark as finished
      IF time_remaining = 0 THEN
        UPDATE public.auctions 
        SET status = 'finished',
            updated_at = brazil_now
        WHERE id = auction_record.id;
        
        RAISE LOG 'Auction % finished - time expired', auction_record.id;
      -- Ativar proteção automática quando próximo da meta (80% da receita)
      ELSIF time_remaining <= 15 AND auction_record.id IN (
        SELECT a.id FROM public.auctions a 
        WHERE a.id = auction_record.id 
        AND a.min_revenue_target > 0
        AND (
          SELECT COALESCE(SUM(cost_paid), 0) FROM public.bids WHERE auction_id = a.id
        ) >= (a.min_revenue_target * 0.8)
        AND a.protected_mode = false
      ) THEN
        UPDATE public.auctions 
        SET protected_mode = true,
            protected_target = min_revenue_target,
            updated_at = brazil_now
        WHERE id = auction_record.id;
        
        RAISE LOG 'Protection activated for auction % - revenue close to target', auction_record.id;
      END IF;
    END IF;
  END LOOP;
  
  RAISE LOG 'Timer sync completed at %', brazil_now;
END;
$function$;

-- Atualizar a função update_auction_stats para sempre resetar para 15 segundos
CREATE OR REPLACE FUNCTION public.update_auction_stats()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  brazil_now timestamptz;
BEGIN
  -- Get current time in Brazil timezone
  brazil_now := timezone('America/Sao_Paulo', now());
  
  -- Update total of bids, price and set new ends_at (SEMPRE 15 segundos)
  UPDATE public.auctions
  SET 
    total_bids = total_bids + 1,
    current_price = current_price + bid_increment,
    ends_at = brazil_now + INTERVAL '15 seconds', -- SEMPRE 15 segundos
    time_left = 15, -- SEMPRE 15 segundos
    updated_at = brazil_now
  WHERE id = NEW.auction_id;
  
  -- If auction reached protection target, disable protection
  UPDATE public.auctions
  SET protected_mode = false
  WHERE id = NEW.auction_id 
    AND protected_mode = true
    AND protected_target > 0
    AND (
      SELECT COALESCE(SUM(cost_paid), 0)
      FROM public.bids
      WHERE auction_id = NEW.auction_id
    ) >= protected_target;
  
  RETURN NEW;
END;
$function$;