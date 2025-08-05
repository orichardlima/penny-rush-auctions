-- Criar um leilão em estado crítico para testar o sistema de bots
INSERT INTO public.auctions (
  title, 
  description, 
  starting_price, 
  current_price, 
  bid_increment, 
  bid_cost, 
  time_left, 
  status, 
  revenue_target, 
  market_value,
  starts_at,
  ends_at
) VALUES (
  'Teste Bot Sistema', 
  'Leilão para testar sistema de bots', 
  100, 
  100, 
  1, 
  100, 
  5, -- 5 segundos - crítico!
  'active', 
  3000, -- Meta de R$30,00
  1000,
  NOW(),
  NOW() + INTERVAL '5 seconds'
);

-- Buscar o ID do leilão criado
SELECT id, title, time_left, revenue_target FROM auctions WHERE title = 'Teste Bot Sistema';