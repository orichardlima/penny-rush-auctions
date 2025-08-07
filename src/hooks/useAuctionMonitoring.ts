import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAuctionMonitoring = (onAuctionUpdate: () => void) => {
  // Sistema de monitoramento contínuo
  const startMonitoring = useCallback(async () => {
    try {
      // Buscar leilões ativos que precisam de monitoramento
      const { data: activeAuctions, error } = await supabase
        .from('auctions')
        .select('id, time_left, ends_at')
        .eq('status', 'active');

      if (error || !activeAuctions?.length) {
        console.log('ℹ️ Nenhum leilão ativo para monitorar');
        return;
      }

      console.log(`🔍 Monitorando ${activeAuctions.length} leilões ativos`);
      
      // Para cada leilão ativo, verificar se precisa de atualização
      for (const auction of activeAuctions) {
        if (auction.ends_at) {
          const now = Date.now();
          const endTime = new Date(auction.ends_at).getTime();
          const timeLeft = Math.max(0, Math.floor((endTime - now) / 1000));
          
          // Se o timer calculado é diferente do timer no banco, atualizar
          // Mas NÃO interferir se a diferença é pequena (evita conflitos com lances recentes)
          if (Math.abs(timeLeft - auction.time_left) > 3 && timeLeft < auction.time_left) {
            console.log(`⏰ Sincronizando timer do leilão ${auction.id}: ${auction.time_left}s -> ${timeLeft}s`);
            
            const { error: syncError } = await supabase.rpc('sync_auction_timer', {
              auction_uuid: auction.id
            });
            
            if (!syncError) {
              onAuctionUpdate();
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Erro no monitoramento:', error);
    }
  }, [onAuctionUpdate]);

  useEffect(() => {
    // Executar imediatamente
    startMonitoring();

    // Executar a cada 5 segundos para monitoramento mais suave
    const interval = setInterval(startMonitoring, 5000);

    return () => clearInterval(interval);
  }, [startMonitoring]);

  return {
    startMonitoring
  };
};