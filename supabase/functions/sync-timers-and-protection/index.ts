import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('⏰ Iniciando sincronização de timers e proteção de bots');
    
    // 1. Atualizar todos os timers ativos
    const { error: timerError } = await supabaseClient.rpc('update_auction_timers');
    
    if (timerError) {
      console.error('❌ Erro ao atualizar timers:', timerError);
    } else {
      console.log('✅ Timers atualizados com sucesso');
    }

    // 2. Executar sistema de proteção de bots
    const { data: botData, error: botError } = await supabaseClient.functions.invoke('auto-bid-system', {
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      }
    });
    
    if (botError) {
      console.error('❌ Erro no sistema de bots:', botError);
    } else {
      console.log('🤖 Sistema de bots executado:', botData);
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Sincronização e proteção executadas',
      timer_update: !timerError,
      bot_system: botData || {}
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});