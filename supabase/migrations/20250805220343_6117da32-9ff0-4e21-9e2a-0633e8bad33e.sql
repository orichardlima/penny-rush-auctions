-- Criar novo leilão crítico
UPDATE public.auctions 
SET 
  time_left = 5,
  status = 'active',
  ends_at = NOW() + INTERVAL '5 seconds'
WHERE id = 'b8e034e9-6ec6-4d41-a6dd-af44d9ae046b';

-- Simular lance do bot (o que o sistema deveria fazer automaticamente)
INSERT INTO public.bids (
  auction_id, 
  user_id, 
  bid_amount, 
  cost_paid
) VALUES (
  'b8e034e9-6ec6-4d41-a6dd-af44d9ae046b',
  (SELECT get_random_bot()),
  101, -- current_price + bid_increment  
  100  -- bid_cost
);

-- Verificar se o lance foi registrado
SELECT * FROM bids WHERE auction_id = 'b8e034e9-6ec6-4d41-a6dd-af44d9ae046b' ORDER BY created_at DESC LIMIT 1;