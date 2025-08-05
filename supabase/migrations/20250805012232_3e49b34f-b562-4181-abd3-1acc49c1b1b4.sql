-- Garantir que as funções tenham acesso correto às tabelas
-- Recriar a função update_auction_timers com schema público explícito
CREATE OR REPLACE FUNCTION public.update_auction_timers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
      END IF;
    END IF;
  END LOOP;
  
  RAISE LOG 'Timer sync completed at %', brazil_now;
END;
$$;

-- Ativar o modo protegido no leilão atual para testar
UPDATE public.auctions 
SET 
  protected_mode = true,
  protected_target = 1000  -- R$ 10,00 em centavos
WHERE status = 'active' 
  AND id = '3cda54c0-318d-49d3-9504-a27e998640be';

-- Dar permissões explícitas para as funções acessarem as tabelas
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;