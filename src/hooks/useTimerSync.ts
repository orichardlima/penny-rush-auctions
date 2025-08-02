import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useTimerSync = (onSync?: () => void) => {
  // Função para sincronizar timers via edge function
  const syncTimers = useCallback(async () => {
    try {
      const { error } = await supabase.functions.invoke('sync-timers');
      
      if (error) {
        console.error('❌ Erro ao sincronizar timers:', error);
      } else {
        console.log('✅ Timers sincronizados');
        onSync?.();
      }
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
    }
  }, [onSync]);

  // Sincronizar a cada 2 milissegundos para máxima fluidez
  useEffect(() => {
    // Sincronizar imediatamente
    syncTimers();

    // Configurar intervalo de sincronização ultra frequente
    const interval = setInterval(syncTimers, 2);

    return () => clearInterval(interval);
  }, [syncTimers]);

  return { syncTimers };
};