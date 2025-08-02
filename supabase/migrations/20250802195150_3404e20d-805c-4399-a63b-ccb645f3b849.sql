-- Fix function search path security issue
CREATE OR REPLACE FUNCTION update_auction_timers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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
    FROM auctions 
    WHERE status = 'active'
  LOOP
    -- If auction has time_left but no ends_at, calculate ends_at
    IF auction_record.ends_at IS NULL AND auction_record.time_left IS NOT NULL THEN
      UPDATE auctions 
      SET ends_at = brazil_now + (auction_record.time_left || ' seconds')::interval,
          updated_at = brazil_now
      WHERE id = auction_record.id;
      
      RAISE LOG 'Set ends_at for auction %: % seconds from now', auction_record.id, auction_record.time_left;
    
    -- If auction has ends_at, calculate time_left
    ELSIF auction_record.ends_at IS NOT NULL THEN
      time_remaining := GREATEST(0, EXTRACT(EPOCH FROM (auction_record.ends_at - brazil_now))::integer);
      
      UPDATE auctions 
      SET time_left = time_remaining,
          updated_at = brazil_now
      WHERE id = auction_record.id;
      
      -- If time is up, mark as finished
      IF time_remaining = 0 THEN
        UPDATE auctions 
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