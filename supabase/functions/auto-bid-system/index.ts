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
      console.log(`💰 Current revenue: R$ ${(currentRevenue / 100).toFixed(2)} / Target: R$ ${(auction.min_revenue_target / 100).toFixed(2)}`);

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

      // Sistema de lances mais agressivo para leilões ativos
      // Como o timer sempre reseta para 15s quando há lances, precisamos ser mais agressivos
      const activeAuction = auction.time_left <= 15; // Considera qualquer leilão ativo
      const competitiveMode = auction.time_left <= 15; // Modo competitivo quando há atividade constante
      
      console.log(`⏰ Auction timer: ${auction.time_left}s remaining, Active: ${activeAuction}, Competitive: ${competitiveMode}`);
      
      let shouldBid = false;
      let bidReason = '';
      
      if (auction.last_auto_bid_at) {
        const lastBidTime = new Date(auction.last_auto_bid_at).getTime();
        const now = new Date().getTime();
        const timeSinceLastBid = (now - lastBidTime) / 1000;
        
        // Sistema mais agressivo - intervalos menores e maior probabilidade
        if (competitiveMode) {
          // Em modo competitivo (leilão com atividade constante)
          if (timeSinceLastBid >= 2) { // Reduzido de 3s para 2s
            shouldBid = Math.random() < 0.85; // Aumentado de 50% para 85%
            bidReason = 'competitive_mode_aggressive';
          } else if (timeSinceLastBid >= 1) {
            shouldBid = Math.random() < 0.6; // 60% chance após 1 segundo
            bidReason = 'competitive_mode_moderate';
          }
        } else {
          // Leilão menos ativo - usar intervalos normais mas ainda mais agressivos
          const minInterval = Math.max(1, auction.auto_bid_min_interval - 1); // Reduzir intervalo mínimo
          const maxInterval = Math.min(auction.auto_bid_max_interval, 4); // Reduzir intervalo máximo
          const randomInterval = Math.random() * (maxInterval - minInterval) + minInterval;
          shouldBid = timeSinceLastBid >= randomInterval && Math.random() < 0.7;
          bidReason = 'interval_based_aggressive';
        }
        
        console.log(`⏱️ Time since last bid: ${timeSinceLastBid.toFixed(1)}s, Should bid: ${shouldBid}, Reason: ${bidReason}`);
      } else {
        // Primeiro lance - muito mais agressivo
        if (activeAuction) {
          shouldBid = Math.random() < 0.9; // 90% chance em leilões ativos
          bidReason = 'first_bid_active';
        } else {
          shouldBid = Math.random() < 0.7; // 70% chance em geral
          bidReason = 'first_bid_normal';
        }
        console.log(`🎲 First bid opportunity - Timer: ${auction.time_left}s, Rolling: ${shouldBid ? 'YES' : 'NO'}, Reason: ${bidReason}`);
      }
      
      // Reduzir pausa estratégica de 10% para 2% e só em leilões não competitivos
      if (shouldBid && !competitiveMode && Math.random() < 0.02) {
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