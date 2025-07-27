import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProtectedAuction {
  id: string;
  protected_target: number;
  current_revenue: number;
  bid_increment: number;
  current_price: number;
  title: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Inicializar cliente Supabase
    const supabaseUrl = "https://tlcdidkkxigofdhxnzzo.supabase.co";
    const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsY2RpZGtreGlnb2ZkaHhuenpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ1NjQ3MywiZXhwIjoyMDY5MDMyNDczfQ.bR3SLXwLl8aOp-2YPd85QGIFSDDhOGQgvJ0hUy6VmUQ";
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🤖 Bot Protection System - Iniciando verificação...');

    // 1. Buscar todos os leilões com proteção ativa
    const { data: protectedAuctions, error: auctionsError } = await supabase
      .from('auctions')
      .select(`
        id,
        protected_target,
        bid_increment,
        current_price,
        title,
        status
      `)
      .eq('protected_mode', true)
      .eq('status', 'active');

    if (auctionsError) {
      console.error('❌ Erro ao buscar leilões protegidos:', auctionsError);
      throw auctionsError;
    }

    console.log(`📊 Encontrados ${protectedAuctions?.length || 0} leilões com proteção ativa`);

    if (!protectedAuctions || protectedAuctions.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'Nenhum leilão com proteção ativa encontrado',
          processed: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // 2. Para cada leilão protegido, verificar se precisa de proteção
    const processedAuctions = [];
    
    for (const auction of protectedAuctions) {
      try {
        console.log(`\n🔍 Verificando leilão: ${auction.title} (ID: ${auction.id})`);

        // Calcular receita atual do leilão
        const { data: revenueData, error: revenueError } = await supabase
          .rpc('get_auction_revenue', { auction_uuid: auction.id });

        if (revenueError) {
          console.error(`❌ Erro ao calcular receita do leilão ${auction.id}:`, revenueError);
          continue;
        }

        const currentRevenue = revenueData || 0;
        console.log(`💰 Receita atual: R$ ${(currentRevenue / 100).toFixed(2)} | Meta: R$ ${(auction.protected_target / 100).toFixed(2)}`);

        // Verificar se já atingiu a meta
        if (currentRevenue >= auction.protected_target) {
          console.log(`✅ Meta atingida! Desativando proteção para leilão ${auction.id}`);
          
          // Desativar proteção automaticamente
          await supabase
            .from('auctions')
            .update({ protected_mode: false })
            .eq('id', auction.id);

          processedAuctions.push({
            id: auction.id,
            action: 'protection_disabled',
            reason: 'target_reached',
            currentRevenue,
            target: auction.protected_target
          });
          continue;
        }

        // 3. Garantir que existe um usuário bot
        const { data: botUserId, error: botError } = await supabase
          .rpc('ensure_bot_user');

        if (botError) {
          console.error('❌ Erro ao garantir usuário bot:', botError);
          continue;
        }

        console.log(`🤖 Bot User ID: ${botUserId}`);

        // 4. Verificar se o leilão precisa de um lance de proteção
        // Para isso, vamos simular que precisa (na implementação real, 
        // você checaria o timer ou outros critérios)
        const needsProtection = currentRevenue < auction.protected_target;

        if (needsProtection) {
          // Calcular próximo lance (incremento padrão)
          const bidAmount = auction.current_price + auction.bid_increment;
          const bidCost = 100; // R$ 1,00 por lance

          console.log(`🎯 Inserindo lance de proteção: R$ ${(bidAmount / 100).toFixed(2)}`);

          // 5. Inserir lance do bot
          const { data: bidData, error: bidError } = await supabase
            .from('bids')
            .insert({
              auction_id: auction.id,
              user_id: botUserId,
              bid_amount: bidAmount,
              cost_paid: bidCost,
              is_bot: true
            })
            .select()
            .single();

          if (bidError) {
            console.error(`❌ Erro ao inserir lance bot para leilão ${auction.id}:`, bidError);
            continue;
          }

          // 6. Registrar log do bot
          await supabase
            .from('bot_logs')
            .insert({
              auction_id: auction.id,
              bid_amount: bidAmount,
              target_revenue: auction.protected_target,
              current_revenue: currentRevenue + bidCost
            });

          console.log(`✅ Lance de proteção inserido com sucesso! Bid ID: ${bidData.id}`);

          processedAuctions.push({
            id: auction.id,
            action: 'bot_bid_placed',
            bidAmount,
            bidCost,
            newRevenue: currentRevenue + bidCost,
            target: auction.protected_target
          });
        } else {
          console.log(`ℹ️ Leilão não precisa de proteção no momento`);
          processedAuctions.push({
            id: auction.id,
            action: 'no_action_needed',
            currentRevenue,
            target: auction.protected_target
          });
        }

      } catch (error) {
        console.error(`❌ Erro ao processar leilão ${auction.id}:`, error);
        processedAuctions.push({
          id: auction.id,
          action: 'error',
          error: error.message
        });
      }
    }

    console.log('\n📋 Resumo do processamento:', processedAuctions);

    return new Response(
      JSON.stringify({
        message: 'Sistema de proteção executado com sucesso',
        processed: processedAuctions.length,
        results: processedAuctions,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Erro geral no sistema de proteção:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Erro interno do sistema de proteção',
        message: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});