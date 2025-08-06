import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toZonedTime } from 'date-fns-tz';
import { useAuctionMonitoring } from './useAuctionMonitoring';

export const useAuctionTimer = (onAuctionUpdate: () => void) => {
  // Hook de monitoramento contínuo
  useAuctionMonitoring(onAuctionUpdate);
  useEffect(() => {
    const checkAndActivateWaitingAuctions = async () => {
      try {
        const brazilTimezone = 'America/Sao_Paulo';
        const nowInBrazil = toZonedTime(new Date(), brazilTimezone);

        const { data: waitingAuctions, error } = await supabase
          .from('auctions')
          .select('*')
          .eq('status', 'waiting');

        if (error) {
          console.error('Erro ao buscar leilões aguardando:', error);
          return;
        }

        const auctionsToActivate = waitingAuctions?.filter(auction =>
          auction.starts_at &&
          toZonedTime(new Date(auction.starts_at), brazilTimezone) <= nowInBrazil
        ) || [];

        for (const auction of auctionsToActivate) {
          const { error: updateError } = await supabase
            .from('auctions')
            .update({ status: 'active' })
            .eq('id', auction.id);

          if (!updateError) {
            console.log(`✅ Leilão ativado: ${auction.title}`);
            console.log(auction.id)

            try {
              const webhookResponse = await fetch('https://automacao.rodolphoalmeida.dev.br/webhook/robot_leilao', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  auction_id: auction.id,
                  title: auction.title,
                  status: 'active'
                })
              });

              if (webhookResponse.ok) {
                const webhookData = await webhookResponse.json();
                console.log(`🔗 Webhook executado com sucesso para leilão ${auction.id}:`, webhookData);
              } else {
                console.error(`❌ Erro no webhook para leilão ${auction.id}:`, webhookResponse.status, webhookResponse.statusText);
              }
            } catch (webhookError) {
              console.error(`🚨 Falha na chamada do webhook para leilão ${auction.id}:`, webhookError);
            }
          }
        }

        if (auctionsToActivate.length > 0) {
          onAuctionUpdate();
        }
      } catch (error) {
        console.error('Erro ao verificar status dos leilões:', error);
      }
    };

    // Verificar imediatamente ao carregar
    checkAndActivateWaitingAuctions();

    // Timer para verificar periodicamente
    const statusCheckInterval = setInterval(checkAndActivateWaitingAuctions, 30000);

    return () => {
      clearInterval(statusCheckInterval);
    };
  }, [onAuctionUpdate]);
};