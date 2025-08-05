import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutoBidAuction {
  id: string;
  title: string;
  current_price: number;
  time_left: number;
  bid_increment: number;
  bid_cost: number;
  auto_bid_enabled: boolean;
  min_revenue_target: number;
  auto_bid_min_interval: number;
  auto_bid_max_interval: number;
  last_auto_bid_at: string | null;
  ends_at: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🤖 Starting auto-bid system check...');

    // Get active auctions with auto-bid enabled
    const { data: auctions, error: auctionsError } = await supabase
      .from('auctions')
      .select('*')
      .eq('status', 'active')
      .eq('auto_bid_enabled', true)
      .gt('time_left', 0); // Only consider auctions with time remaining

    if (auctionsError) {
      console.error('Error fetching auctions:', auctionsError);
      throw auctionsError;
    }

    if (!auctions || auctions.length === 0) {
      console.log('No auctions with auto-bid enabled found');
      return new Response(JSON.stringify({ message: 'No auto-bid auctions found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const processedAuctions = [];

    for (const auction of auctions as AutoBidAuction[]) {
      console.log(`🎯 Processing auction: ${auction.title} (ID: ${auction.id})`);
      
      // Calculate current revenue
      const { data: revenueData, error: revenueError } = await supabase
        .rpc('get_auction_revenue', { auction_uuid: auction.id });

      if (revenueError) {
        console.error(`Error calculating revenue for auction ${auction.id}:`, revenueError);
        continue;
      }

      const currentRevenue = revenueData || 0;
      const revenueProgress = auction.min_revenue_target > 0 ? currentRevenue / auction.min_revenue_target : 0;
      
      console.log(`💰 Current revenue: R$ ${(currentRevenue / 100).toFixed(2)} / Target: R$ ${(auction.min_revenue_target / 100).toFixed(2)} (${(revenueProgress * 100).toFixed(1)}%)`);

      // If revenue target is already met, disable auto-bid and continue
      if (currentRevenue >= auction.min_revenue_target) {
        console.log(`✅ Revenue target reached for auction ${auction.title}. Disabling auto-bid.`);
        
        await supabase
          .from('auctions')
          .update({ auto_bid_enabled: false })
          .eq('id', auction.id);

        processedAuctions.push({
          auction_id: auction.id,
          action: 'disabled_auto_bid',
          reason: 'revenue_target_reached',
          current_revenue: currentRevenue,
          target: auction.min_revenue_target
        });
        continue;
      }

      // SISTEMA DE PROTEÇÃO EMERGENCIAL DENTRO DOS 15 SEGUNDOS
      // Determinar fases críticas do leilão
      const isEmergency = auction.time_left <= 3; // Últimos 3 segundos - EMERGÊNCIA
      const isCritical = auction.time_left <= 5;  // Últimos 5 segundos - CRÍTICO
      const isCompetitive = auction.time_left <= 10; // Últimos 10 segundos - COMPETITIVO
      const isActive = auction.time_left <= 15; // Dentro do timer padrão - ATIVO
      
      console.log(`⏰ Auction timer: ${auction.time_left}s remaining, Emergency: ${isEmergency}, Critical: ${isCritical}, Competitive: ${isCompetitive}, Active: ${isActive}`);
      
      let shouldBid = false;
      let bidReason = '';
      
      if (auction.last_auto_bid_at) {
        const lastBidTime = new Date(auction.last_auto_bid_at).getTime();
        const now = new Date().getTime();
        const timeSinceLastBid = (now - lastBidTime) / 1000;
        
        // 🚨 MODO EMERGENCIAL: FORÇAR lance se receita < meta e ≤3 segundos
        if (isEmergency && currentRevenue < auction.min_revenue_target) {
          shouldBid = true; // SEMPRE dar lance
          bidReason = 'emergency_protection_forced';
          console.log(`🚨 EMERGÊNCIA: Forçando lance para proteger faturamento! Receita: ${(revenueProgress * 100).toFixed(1)}%`);
        }
        // 🔥 MODO CRÍTICO: Muito agressivo quando ≤5 segundos e receita não atingiu meta
        else if (isCritical && currentRevenue < auction.min_revenue_target) {
          if (timeSinceLastBid >= 0.5) { // Lance a cada 0.5 segundos
            shouldBid = true; // 100% de chance
            bidReason = 'critical_protection';
          }
        }
        // 🛡️ MODO PROTEÇÃO: Agressivo quando receita ≥80% da meta e tempo ≤10s
        else if (revenueProgress >= 0.8 && isCompetitive) {
          if (timeSinceLastBid >= 1) { // Lance a cada 1 segundo
            shouldBid = Math.random() < 0.95; // 95% de chance
            bidReason = 'protection_mode_aggressive';
          }
        }
        // ⚡ MODO COMPETITIVO: Agressivo quando ≤10 segundos
        else if (isCompetitive) {
          if (timeSinceLastBid >= 1.5) { // Lance a cada 1.5 segundos
            shouldBid = Math.random() < 0.85; // 85% de chance
            bidReason = 'competitive_mode_aggressive';
          }
        }
        // 🎯 MODO ATIVO: Comportamento padrão dentro dos 15 segundos
        else if (isActive) {
          if (timeSinceLastBid >= 2) { // Lance a cada 2 segundos
            shouldBid = Math.random() < 0.70; // 70% de chance
            bidReason = 'active_mode_standard';
          }
        }
        // ⏳ MODO AGUARDO: Leilão não está na fase ativa (>15s)
        else {
          // Comportamento mais passivo para leilões com muito tempo
          const minInterval = Math.max(3, auction.auto_bid_min_interval);
          const maxInterval = Math.min(auction.auto_bid_max_interval, 8);
          const randomInterval = Math.random() * (maxInterval - minInterval) + minInterval;
          if (timeSinceLastBid >= randomInterval) {
            shouldBid = Math.random() < 0.40; // 40% de chance
            bidReason = 'waiting_mode_passive';
          }
        }
        
        console.log(`⏱️ Time since last bid: ${timeSinceLastBid.toFixed(1)}s, Should bid: ${shouldBid}, Reason: ${bidReason}`);
      } else {
        // Primeiro lance - muito agressivo quando há urgência
        if (isEmergency && currentRevenue < auction.min_revenue_target) {
          shouldBid = true; // 100% chance em emergência
          bidReason = 'first_bid_emergency';
        } else if (isCritical) {
          shouldBid = Math.random() < 0.95; // 95% chance em crítico
          bidReason = 'first_bid_critical';
        } else if (isActive) {
          shouldBid = Math.random() < 0.80; // 80% chance em ativo
          bidReason = 'first_bid_active';
        } else {
          shouldBid = Math.random() < 0.50; // 50% chance em aguardo
          bidReason = 'first_bid_waiting';
        }
        console.log(`🎲 First bid opportunity - Timer: ${auction.time_left}s, Revenue: ${(revenueProgress * 100).toFixed(1)}%, Rolling: ${shouldBid ? 'YES' : 'NO'}, Reason: ${bidReason}`);
      }
      
      // Remover pausa estratégica em modos críticos de proteção
      if (shouldBid && !isEmergency && !isCritical && Math.random() < 0.01) {
        shouldBid = false;
        bidReason = 'strategic_pause';
        console.log(`🤔 Strategic pause - simulating human hesitation`);
      }

      if (!shouldBid) {
        console.log(`⏳ Not time to bid yet for auction ${auction.title}`);
        continue;
      }

      console.log(`🎲 Time to place auto bid for auction ${auction.title}`);

      // Get random fake user
      const { data: fakeUserData, error: fakeUserError } = await supabase
        .rpc('get_random_fake_user');

      if (fakeUserError || !fakeUserData || fakeUserData.length === 0) {
        console.error('Error getting fake user:', fakeUserError);
        continue;
      }

      const { user_id: botUserId, user_name: fakeName } = fakeUserData[0];

      // Place the bid
      const bidAmount = auction.current_price + auction.bid_increment;
      
      const { error: bidError } = await supabase
        .from('bids')
        .insert({
          auction_id: auction.id,
          user_id: botUserId,
          bid_amount: bidAmount,
          cost_paid: auction.bid_cost,
          is_bot: true
        });

      if (bidError) {
        console.error(`Error placing bid for auction ${auction.id}:`, bidError);
        continue;
      }

      // Update auction's last auto bid time
      await supabase
        .from('auctions')
        .update({ last_auto_bid_at: new Date().toISOString() })
        .eq('id', auction.id);

      // Log the auto bid activity with enhanced details
      await supabase
        .from('bot_logs')
        .insert({
          auction_id: auction.id,
          current_revenue: currentRevenue,
          target_revenue: auction.min_revenue_target,
          bid_amount: bidAmount,
          fake_user_name: fakeName,
          bid_type: 'auto_bid',
          time_remaining: auction.time_left
        });

      console.log(`✅ Auto bid placed: ${fakeName} bid R$ ${(bidAmount / 100).toFixed(2)} on ${auction.title} (Time left: ${auction.time_left}s, Reason: ${bidReason})`);

      processedAuctions.push({
        auction_id: auction.id,
        action: 'bid_placed',
        fake_user: fakeName,
        bid_amount: bidAmount,
        current_revenue: currentRevenue,
        time_remaining: auction.time_left,
        bid_reason: bidReason
      });
    }

    return new Response(JSON.stringify({ 
      message: 'Auto-bid system completed',
      processed_auctions: processedAuctions.length,
      details: processedAuctions
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in auto-bid system:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});