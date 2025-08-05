-- Simular atualização do timer para triggar o bot
UPDATE public.auctions 
SET time_left = 5  -- Timer crítico para triggar bot
WHERE id = '5a6a3cc6-ce10-4c8f-b234-301b071bac7a';

-- Verificar se o bot deu lance
SELECT 
  b.auction_id,
  b.user_id,
  b.bid_amount,
  b.cost_paid,
  b.created_at,
  p.full_name,
  p.is_bot
FROM bids b
JOIN profiles p ON p.user_id = b.user_id
WHERE b.auction_id = '5a6a3cc6-ce10-4c8f-b234-301b071bac7a'
ORDER BY b.created_at DESC;