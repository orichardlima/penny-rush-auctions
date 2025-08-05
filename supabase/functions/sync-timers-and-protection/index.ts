import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { 
        auth: { 
          autoRefreshToken: false, 
          persistSession: false 
        } 
      }
    );

    console.log('🔄 Iniciando sincronização de timers e verificação de proteção...');

    // 1. First sync timers
    const { error: syncError } = await supabaseClient.rpc('update_auction_timers');
    if (syncError) {
      console.error('❌ Erro ao sincronizar timers:', syncError);
      throw syncError;
    }

    // 2. Get auctions that just expired (time_left = 0) with protection enabled
    const { data: expiredProtectedAuctions, error: fetchError } = await supabaseClient
      .from('auctions')
      .select('id, title, current_price, bid_increment, bid_cost, protected_target, protected_mode, status, time_left')
      .eq('status', 'active')
      .lte('time_left', 1)  // Buscar leilões próximos ao fim (0 ou 1 segundo)
      .eq('protected_mode', true);

    if (fetchError) {
      console.error('❌ Erro ao buscar leilões expirados com proteção:', fetchError);
      throw fetchError;
    }

    console.log(`🛡️ Encontrados ${expiredProtectedAuctions?.length || 0} leilões expirados com proteção`);

    // 3. For each expired protected auction, check if protection target was met
    for (const auction of expiredProtectedAuctions || []) {
      console.log(`🔍 Verificando proteção para leilão: ${auction.title}`);

      // Get current revenue
      const { data: revenue, error: revenueError } = await supabaseClient
        .rpc('get_auction_revenue', { auction_uuid: auction.id });

      if (revenueError) {
        console.error(`❌ Erro ao obter receita do leilão ${auction.id}:`, revenueError);
        continue;
      }

      const currentRevenue = revenue || 0;
      console.log(`💰 Receita atual: R$ ${(currentRevenue / 100).toFixed(2)} / Meta: R$ ${(auction.protected_target / 100).toFixed(2)}`);

      // If target not met, trigger protection bid
      if (currentRevenue < auction.protected_target) {
        console.log(`🚨 Meta não atingida! Acionando proteção para leilão: ${auction.title}`);

        // Get bot user (usando a função corrigida)
        const { data: botUser, error: botError } = await supabaseClient
          .rpc('ensure_bot_user');

        if (botError) {
          console.error('❌ Erro ao obter usuário bot:', botError);
          continue;
        }

        // Get fake user name (usar nomes aleatórios simples)
        const fakeNames = ['Carlos Silva', 'Maria Santos', 'João Costa', 'Ana Lima', 'Pedro Rocha'];
        const fakeName = fakeNames[Math.floor(Math.random() * fakeNames.length)];
        const bidAmount = auction.current_price + auction.bid_increment;

        // Place protection bid
        const { error: bidError } = await supabaseClient
          .from('bids')
          .insert({
            auction_id: auction.id,
            user_id: botUser,
            bid_amount: bidAmount,
            cost_paid: auction.bid_cost,
            is_bot: true
          });

        if (bidError) {
          console.error('❌ Erro ao inserir lance de proteção:', bidError);
          continue;
        }

        // Log the bot activity
        await supabaseClient
          .from('bot_logs')
          .insert({
            auction_id: auction.id,
            bid_type: 'protection',
            bid_amount: bidAmount,
            current_revenue: currentRevenue,
            target_revenue: auction.protected_target,
            time_remaining: 0,
            fake_user_name: fakeName
          });

        console.log(`✅ Lance de proteção inserido: R$ ${(bidAmount / 100).toFixed(2)} por ${fakeName}`);
      } else {
        console.log(`✅ Meta de proteção já atingida para leilão: ${auction.title}`);
        
        // Disable protection since target was met
        await supabaseClient
          .from('auctions')
          .update({ protected_mode: false })
          .eq('id', auction.id);
      }
    }

    console.log('✅ Sincronização e proteção concluídas');

    return new Response(
      JSON.stringify({ 
        message: 'Sincronização e proteção executadas com sucesso',
        processed_auctions: expiredProtectedAuctions?.length || 0,
        timestamp: new Date().toISOString()
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Erro na função sync-timers-and-protection:', error);
    
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});