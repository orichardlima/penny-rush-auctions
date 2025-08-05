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

    console.log('📊 Monitor de bots iniciado - verificando leilões ativos');

    // Chamar a função auto-bid-system
    const { data, error } = await supabaseClient.functions.invoke('auto-bid-system');

    if (error) {
      console.error('❌ Erro ao executar auto-bid-system:', error);
      throw error;
    }

    console.log('✅ Monitor de bots executado:', data);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Monitor de bots executado com sucesso',
      data 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Erro no monitor de bots:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});