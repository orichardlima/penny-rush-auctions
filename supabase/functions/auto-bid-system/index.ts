import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Auction {
  id: string;
  time_left: number;
  revenue_target: number;
  current_price: number;
  bid_increment: number;
  bid_cost: number;
  status: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🤖 Auto-bid system iniciado');

    // Buscar leilões ativos que precisam de intervenção
    const { data: auctions, error: auctionsError } = await supabaseClient
      .from('auctions')
      .select('id, time_left, revenue_target, current_price, bid_increment, bid_cost, status, ends_at')
      .eq('status', 'active')
      .gt('revenue_target', 0)
      .lt('time_left', 8)
      .gt('time_left', 0);

    if (auctionsError) {
      console.error('❌ Erro ao buscar leilões:', auctionsError);
      throw auctionsError;
    }

    if (!auctions || auctions.length === 0) {
      console.log('ℹ️ Nenhum leilão precisa de intervenção no momento');
      return new Response(JSON.stringify({ message: 'Nenhum leilão precisa de intervenção' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let interventions = 0;

    for (const auction of auctions) {
      console.log(`🔍 Analisando leilão ${auction.id}: timer=${auction.time_left}s, meta=R$${auction.revenue_target}`);

      // Verificar receita real atual
      const { data: revenueData, error: revenueError } = await supabaseClient
        .rpc('get_auction_revenue', { auction_uuid: auction.id });

      if (revenueError) {
        console.error(`❌ Erro ao calcular receita do leilão ${auction.id}:`, revenueError);
        continue;
      }

      const currentRevenue = revenueData || 0;
      console.log(`💰 Receita atual do leilão ${auction.id}: R$${currentRevenue} / R$${auction.revenue_target}`);

      // Calcular % da meta atingida
      const revenuePercentage = (currentRevenue / auction.revenue_target) * 100;
      
      // Se já atingiu 80% da meta, não intervir
      if (revenuePercentage >= 80) {
        console.log(`✅ Leilão ${auction.id} atingiu ${revenuePercentage.toFixed(1)}% da meta, não precisa de bot`);
        continue;
      }

      // Tempo crítico e receita insuficiente - ativar bot
      if (auction.time_left <= 7 && auction.time_left > 1) {
        console.log(`🚨 Ativando bot para leilão ${auction.id}`);

        // Obter bot aleatório
        const { data: botId, error: botError } = await supabaseClient
          .rpc('get_random_bot');

        if (botError || !botId) {
          console.error(`❌ Erro ao obter bot:`, botError);
          continue;
        }

        // Inserir lance do bot
        const { error: bidError } = await supabaseClient
          .from('bids')
          .insert({
            auction_id: auction.id,
            user_id: botId,
            bid_amount: auction.current_price + auction.bid_increment,
            cost_paid: auction.bid_cost
          });

        if (bidError) {
          console.error(`❌ Erro ao inserir lance do bot:`, bidError);
          continue;
        }

        console.log(`🤖 Bot ${botId} deu lance no leilão ${auction.id}`);
        interventions++;
      }
    }

    console.log(`✅ Sistema de bots processou ${auctions.length} leilões, ${interventions} intervenções realizadas`);

    return new Response(JSON.stringify({ 
      processed: auctions.length,
      interventions,
      message: 'Sistema de bots executado com sucesso'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Erro no sistema de bots:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});