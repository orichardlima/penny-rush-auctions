-- Criar um leilão ativo para testar o carregamento na página principal
INSERT INTO public.auctions (
  id,
  title,
  description,
  image_url,
  starting_price,
  current_price,
  bid_increment,
  bid_cost,
  market_value,
  revenue_target,
  status,
  starts_at,
  ends_at,
  time_left
) VALUES (
  gen_random_uuid(),
  'iPhone 15 Pro Max',
  'iPhone 15 Pro Max 256GB - Novo lacrado com garantia Apple',
  '/src/assets/iphone-15-pro.jpg',
  100, -- R$ 1,00
  100, -- R$ 1,00 
  69,  -- Incremento de R$ 0,69
  100, -- Custo do lance R$ 1,00
  520000, -- Valor de mercado R$ 5.200,00
  40000,  -- Meta de receita R$ 400,00
  'active',
  NOW() - INTERVAL '1 minute', -- Começou há 1 minuto
  NOW() + INTERVAL '2 hours',   -- Termina em 2 horas
  15 -- 15 segundos
);

-- Criar outro leilão ativo
INSERT INTO public.auctions (
  id,
  title,
  description,
  image_url,
  starting_price,
  current_price,
  bid_increment,
  bid_cost,
  market_value,
  revenue_target,
  status,
  starts_at,
  ends_at,
  time_left
) VALUES (
  gen_random_uuid(),
  'MacBook Air M2',
  'MacBook Air M2 13" 256GB - Lacrado com garantia Apple',
  '/src/assets/macbook-air-m2.jpg',
  100, -- R$ 1,00
  350, -- R$ 3,50
  69,  -- Incremento de R$ 0,69
  100, -- Custo do lance R$ 1,00
  800000, -- Valor de mercado R$ 8.000,00
  60000,  -- Meta de receita R$ 600,00
  'active',
  NOW() - INTERVAL '30 minutes', -- Começou há 30 minutos
  NOW() + INTERVAL '1 hour',      -- Termina em 1 hora
  8 -- 8 segundos (para testar o sistema de bot)
);