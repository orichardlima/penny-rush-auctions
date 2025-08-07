-- Remove o cron job que está causando erro
SELECT cron.unschedule('sync_protection_every_5s');

-- Verificar se há outros cron jobs problemáticos e ajustar se necessário
-- O job com ID 5 está tentando executar uma função que não existe