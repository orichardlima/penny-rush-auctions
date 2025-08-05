-- Reduzir as metas de receita para valores mais realistas
UPDATE auctions 
SET min_revenue_target = 2000  -- R$ 20,00 ao invés de R$ 10.000,00
WHERE min_revenue_target > 5000;