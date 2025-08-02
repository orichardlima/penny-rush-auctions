import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuctionUpdate {
  id: string;
  current_price: number;
  total_bids: number;
  time_left: number;
  ends_at: string;
  status: string;
  protected_mode?: boolean;
  protected_target?: number;
}

interface BidUpdate {
  id: string;
  auction_id: string;
  user_id: string;
  bid_amount: number;
  is_bot: boolean;
  created_at: string;
}

export const useAuctionRealtime = (auctionId?: string) => {
  const [auctionData, setAuctionData] = useState<AuctionUpdate | null>(null);
  const [recentBids, setRecentBids] = useState<BidUpdate[]>([]);
  const { toast } = useToast();
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounced update function para evitar updates excessivos
  const debouncedSetAuctionData = useCallback((newData: AuctionUpdate) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      setAuctionData(prev => {
        // Só atualizar se houve mudança significativa
        if (!prev || 
            prev.current_price !== newData.current_price ||
            prev.total_bids !== newData.total_bids ||
            prev.status !== newData.status ||
            Math.abs(prev.time_left - newData.time_left) > 1) {
          
          console.log('📡 Atualizando dados do leilão (debounced):', {
            timer_change: prev ? prev.time_left - newData.time_left : 0,
            new_time: newData.time_left,
            status: newData.status
          });
          return newData;
        }
        return prev;
      });
    }, 200); // Increased debounce to 200ms for better stability
  }, []);

  useEffect(() => {
    if (!auctionId) return;

    console.log('🔄 Configurando realtime para leilão:', auctionId);

    // Canal para updates do leilão
    const auctionChannel = supabase
      .channel(`auction-${auctionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'auctions',
          filter: `id=eq.${auctionId}`
        },
        (payload) => {
          console.log('📡 Update do leilão recebido:', payload);
          const newAuctionData = payload.new as AuctionUpdate;
          debouncedSetAuctionData(newAuctionData);
        }
      )
      .subscribe();

    // Canal para novos lances
    const bidsChannel = supabase
      .channel(`bids-${auctionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
          filter: `auction_id=eq.${auctionId}`
        },
        (payload) => {
          console.log('🎯 Novo lance recebido:', payload);
          const newBid = payload.new as BidUpdate;
          
          setRecentBids(prev => [newBid, ...prev.slice(0, 9)]); // Manter apenas 10 lances

          // Mostrar notificação para lances de bot
          if (newBid.is_bot) {
            toast({
              title: "🤖 Lance de Proteção",
              description: `Bot fez lance de R$ ${(newBid.bid_amount / 100).toFixed(2)}`,
              variant: "default"
            });
          }
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      console.log('🔌 Desconectando realtime channels');
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      supabase.removeChannel(auctionChannel);
      supabase.removeChannel(bidsChannel);
    };
  }, [auctionId, toast, debouncedSetAuctionData]);

  // Função para resetar timer (simulação - na implementação real viria do realtime)
  const resetTimer = () => {
    if (auctionData) {
      setAuctionData(prev => prev ? { ...prev, time_left: 15 } : null);
    }
  };

  return {
    auctionData,
    recentBids,
    resetTimer
  };
};