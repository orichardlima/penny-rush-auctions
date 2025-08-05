-- Remover o cron job atual do auto-bid para recriá-lo
SELECT cron.unschedule('auto-bid-system') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-bid-system'
);

-- Criar novo cron job para auto-bid mais frequente (a cada 2 segundos)
SELECT cron.schedule(
  'auto-bid-system',
  '*/2 * * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tlcdidkkxigofdhxnzzo.supabase.co/functions/v1/auto-bid-system',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsY2RpZGtreGlnb2ZkaHhuenpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTY0NzMsImV4cCI6MjA2OTAzMjQ3M30.fzDV-B0p7U5FnbpjpvRH6KI0ldyRPzPXMcuSw3fnv5k"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  ) as request_id;
  $$
);

-- Resetar o timestamp do último auto-bid para forçar nova atividade
UPDATE auctions 
SET last_auto_bid_at = NULL,
    min_revenue_target = 500  -- Reduzir meta para R$ 5,00 para testar
WHERE status = 'active';