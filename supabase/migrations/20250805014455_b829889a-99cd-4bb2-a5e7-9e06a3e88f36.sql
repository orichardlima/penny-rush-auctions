-- Atualizar o cron job para ser mais frequente (a cada 1 segundo)
SELECT cron.unschedule('auto-bid-system') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-bid-system'
);

-- Criar novo cron job para auto-bid a cada 1 segundo
SELECT cron.schedule(
  'auto-bid-system',
  '* * * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tlcdidkkxigofdhxnzzo.supabase.co/functions/v1/auto-bid-system',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsY2RpZGtreGlnb2ZkaHhuenpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTY0NzMsImV4cCI6MjA2OTAzMjQ3M30.fzDV-B0p7U5FnbpjpvRH6KI0ldyRPzPXMcuSw3fnv5k"}'::jsonb,
    body := '{"source": "cron", "frequency": "1s"}'::jsonb
  ) as request_id;
  $$
);

-- Resetar auctions para testar o novo sistema
UPDATE auctions 
SET last_auto_bid_at = NULL,
    auto_bid_enabled = true,
    min_revenue_target = 1000  -- R$ 10,00 para dar mais margem de teste
WHERE status = 'active';