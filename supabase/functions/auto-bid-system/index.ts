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

      // Tornar o sistema mais agressivo - dar lances mais frequentes
      const criticalTime = auction.time_left <= 8;
      
      // Lógica mais agressiva para lances
      let shouldBid = false;
      
      if (auction.last_auto_bid_at) {
        const lastBidTime = new Date(auction.last_auto_bid_at).getTime();
        const now = new Date().getTime();
        const timeSinceLastBid = (now - lastBidTime) / 1000;
        
        // Intervalos mais curtos e agressivos
        let minInterval = criticalTime ? 2 : auction.auto_bid_min_interval;
        let maxInterval = criticalTime ? 4 : Math.min(auction.auto_bid_max_interval, 8);
        
        const randomInterval = Math.random() * (maxInterval - minInterval) + minInterval;
        shouldBid = timeSinceLastBid >= randomInterval;
        
        console.log(`⏱️ Time since last bid: ${timeSinceLastBid}s, Next interval: ${randomInterval}s, Critical: ${criticalTime}`);
      } else {
        // Primeira chance de dar lance - mais provável
        shouldBid = Math.random() < 0.7; // 70% chance no primeiro check
        console.log(`🎲 First bid opportunity - rolling: ${shouldBid ? 'YES' : 'NO'}`);
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

      // Log the auto bid activity
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

      console.log(`✅ Auto bid placed: ${fakeName} bid R$ ${(bidAmount / 100).toFixed(2)} on ${auction.title}`);

      processedAuctions.push({
        auction_id: auction.id,
        action: 'bid_placed',
        fake_user: fakeName,
        bid_amount: bidAmount,
        current_revenue: currentRevenue,
        time_remaining: auction.time_left
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