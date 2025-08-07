-- Pausar temporariamente o cron job que está causando problemas
SELECT cron.unschedule('sync-timers-and-protection');

-- Comentário: Job pausado para permitir correção da ambiguidade de ends_at