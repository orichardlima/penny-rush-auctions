-- Corrigir o cron job com JSON válido
SELECT cron.unschedule('bot-system-monitor');

SELECT cron.schedule(
  'bot-system-monitor-fixed',
  '*/10 * * * * *', -- A cada 10 segundos
  $$
  SELECT
    net.http_post(
        url:='https://tlcdidkkxigofdhxnzzo.supabase.co/functions/v1/sync-timers-and-protection',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsY2RpZGtreGlnb2ZkaHhuenpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTY0NzMsImV4cCI6MjA2OTAzMjQ3M30.fzDV-B0p7U5FnbpjpvRH6KI0ldyRPzPXMcuSw3fnv5k"}'::jsonb,
        body:='{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);

-- Testar criando um leilão crítico para ver o trigger em ação
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
  'Teste Trigger Bot', 
  'Teste do trigger automático', 
  100, 
  100, 
  1, 
  100, 
  10, 
  'active', 
  5000, -- Meta alta para trigger bot
  1000,
  NOW(),
  NOW() + INTERVAL '10 seconds'
) RETURNING id, title, time_left;