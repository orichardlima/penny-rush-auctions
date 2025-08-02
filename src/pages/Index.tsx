import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { AuctionCard } from "@/components/AuctionCard";
import { BidPackages } from "@/components/BidPackages";
import { HowItWorks } from "@/components/HowItWorks";
import { RecentWinners } from "@/components/RecentWinners";
import { useToast } from "@/hooks/use-toast";
import { useAuctionTimer } from "@/hooks/useAuctionTimer";
import { useTimerSync } from "@/hooks/useTimerSync";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toZonedTime, format } from 'date-fns-tz';

const Index = () => {
  const [userBids, setUserBids] = useState(25); // User starts with 25 bids
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const transformAuctionData = (auction: any) => {
    const brazilTimezone = 'America/Sao_Paulo';
    const now = new Date();
    const nowInBrazil = toZonedTime(now, brazilTimezone);
    
    const startsAt = auction.starts_at ? toZonedTime(new Date(auction.starts_at), brazilTimezone) : null;
    const endsAt = auction.ends_at ? toZonedTime(new Date(auction.ends_at), brazilTimezone) : null;
    
    // Determinar o status real do leilão usando o fuso do Brasil
    let auctionStatus = 'waiting';
    if (startsAt && startsAt > nowInBrazil) {
      auctionStatus = 'waiting'; // Ainda não começou
    } else if (auction.status === 'active' && (!endsAt || endsAt > nowInBrazil)) {
      auctionStatus = 'active'; // Ativo
    } else {
      auctionStatus = 'finished'; // Finalizado
    }
    
    return {
      ...auction,
      image: auction.image_url || '/placeholder.svg',
      currentPrice: (auction.current_price || 10) / 100,
      originalPrice: (auction.market_value || 0) / 100,
      totalBids: auction.total_bids || 0,
      participants: auction.participants_count || 0,
      recentBidders: auction.recentBidders || [], // Usar dados reais dos lances
      protected_mode: auction.protected_mode || false,
      protected_target: (auction.protected_target || 0) / 100,
      currentRevenue: (auction.total_bids || 0) * 1.00,
      timeLeft: endsAt ? Math.max(0, Math.floor((endsAt.getTime() - nowInBrazil.getTime()) / 1000)) : 0,
      auctionStatus,
      isActive: auctionStatus === 'active',
      ends_at: auction.ends_at,
      starts_at: auction.starts_at
    };
  };

  // Função para buscar lances recentes de um leilão
  const fetchRecentBidders = async (auctionId: string) => {
    try {
      // Buscar os últimos lances do leilão
      const { data: bids, error: bidsError } = await supabase
        .from('bids')
        .select('user_id, is_bot, created_at')
        .eq('auction_id', auctionId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (bidsError) {
        console.error('Erro ao buscar lances recentes:', bidsError);
        return [];
      }

      if (!bids || bids.length === 0) {
        return [];
      }

      // Buscar os nomes dos usuários
      const userIds = bids.filter(bid => !bid.is_bot).map(bid => bid.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      // Criar um mapa de user_id para nome
      const userNameMap = new Map();
      profiles?.forEach(profile => {
        userNameMap.set(profile.user_id, profile.full_name || 'Usuário');
      });

      // Retornar os nomes dos lances recentes
      return bids.map(bid => 
        bid.is_bot ? 'Bot' : (userNameMap.get(bid.user_id) || 'Usuário')
      );
    } catch (error) {
      console.error('Erro ao buscar lances recentes:', error);
      return [];
    }
  };

  const fetchAuctions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('auctions')
        .select('*')
        .in('status', ['active', 'waiting'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching auctions:', error);
        toast({
          title: "Erro ao carregar leilões",
          description: "Não foi possível carregar os leilões ativos.",
          variant: "destructive"
        });
        return;
      }

      // Para cada leilão, buscar os lances recentes
      const auctionsWithBidders = await Promise.all(
        (data || []).map(async (auction) => {
          const recentBidders = await fetchRecentBidders(auction.id);
          return transformAuctionData({
            ...auction,
            recentBidders
          });
        })
      );

      setAuctions(auctionsWithBidders);
    } catch (error) {
      console.error('Error fetching auctions:', error);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Hook para verificar e ativar leilões automaticamente
  useAuctionTimer(fetchAuctions);

  // Hook para sincronização global de timers
  useTimerSync(fetchAuctions);

  useEffect(() => {
    fetchAuctions();

    // Configurar realtime updates para leilões
    const channel = supabase
      .channel('auctions-updates')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'auctions' },
        async (payload) => {
          console.log('🔄 Atualização de leilão recebida:', payload);
          // Buscar lances recentes atualizados
          const recentBidders = await fetchRecentBidders(payload.new.id);
          const updatedAuction = transformAuctionData({
            ...payload.new,
            recentBidders
          });
          
          setAuctions(prev => 
            prev.map(auction => 
              auction.id === updatedAuction.id ? updatedAuction : auction
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const handleBid = async (auctionId: string) => {
    if (userBids <= 0) {
      toast({
        title: "Sem lances disponíveis!",
        description: "Compre mais lances para continuar participando dos leilões.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Verificar se o usuário está autenticado
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Faça login para dar lances",
          description: "Você precisa estar logado para participar dos leilões.",
          variant: "destructive"
        });
        return;
      }

      // Inserir o lance no banco de dados
      const { error } = await supabase
        .from('bids')
        .insert({
          auction_id: auctionId,
          user_id: user.id, // Usar o ID real do usuário autenticado
          bid_amount: 1, // 1 centavo
          cost_paid: 100 // Custo do lance em centavos (R$ 1,00)
        });

      if (error) {
        console.error('Erro ao registrar lance:', error);
        toast({
          title: "Erro ao dar lance",
          description: "Não foi possível registrar seu lance. Tente novamente.",
          variant: "destructive"
        });
        return;
      }

      setUserBids(prev => prev - 1);
      
      // Buscar o leilão atualizado e os lances recentes
      const { data: updatedAuction } = await supabase
        .from('auctions')
        .select('*')
        .eq('id', auctionId)
        .single();

      if (updatedAuction) {
        const recentBidders = await fetchRecentBidders(auctionId);
        const transformedAuction = transformAuctionData({
          ...updatedAuction,
          recentBidders
        });
        setAuctions(prev => 
          prev.map(auction => 
            auction.id === auctionId ? transformedAuction : auction
          )
        );
      }
      
      toast({
        title: "Lance realizado!",
        description: "Seu lance foi registrado com sucesso. Boa sorte!",
        variant: "default"
      });
    } catch (error) {
      console.error('Erro ao dar lance:', error);
      toast({
        title: "Erro ao dar lance",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleBuyBids = () => {
    window.location.href = "/pacotes";
  };

  const handlePurchasePackage = (packageId: string, bids: number) => {
    setUserBids(prev => prev + bids);
    toast({
      title: "Pacote adquirido!",
      description: `${bids} lances foram adicionados à sua conta.`,
      variant: "default"
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onBuyBids={handleBuyBids} />
      
      <main>
        <HeroSection />
        
        {/* Active Auctions Section */}
        <section className="py-16 bg-background" id="leiloes">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
                Leilões Ativos Agora
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Participe dos leilões mais quentes do momento! Cada segundo conta.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                <div className="col-span-full text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-4 text-muted-foreground">Carregando leilões...</p>
                </div>
              ) : auctions.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground">Nenhum leilão ativo no momento.</p>
                </div>
              ) : (
                auctions.map((auction) => (
                  <AuctionCard
                    key={auction.id}
                    id={auction.id}
                    title={auction.title}
                    image={auction.image}
                    currentPrice={auction.currentPrice}
                    originalPrice={auction.originalPrice}
                    totalBids={auction.totalBids}
                    participants={auction.participants}
                    userBids={userBids}
                    onBid={handleBid}
                    recentBidders={auction.recentBidders}
                    protected_mode={auction.protected_mode}
                    protected_target={auction.protected_target}
                    currentRevenue={auction.currentRevenue}
                    timeLeft={auction.timeLeft}
                    isActive={auction.isActive}
                    auctionStatus={auction.auctionStatus}
                    ends_at={auction.ends_at}
                    starts_at={auction.starts_at}
                  />
                ))
              )}
            </div>
          </div>
        </section>

        <HowItWorks />
        <BidPackages onPurchase={handlePurchasePackage} />
        <RecentWinners />
      </main>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">LeilãoCentavos</h3>
              <p className="text-sm opacity-90">
                A plataforma mais emocionante de leilões do Brasil. 
                Ganhe produtos incríveis por centavos!
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Leilões</h4>
              <ul className="space-y-2 text-sm opacity-90">
                <li>Eletrônicos</li>
                <li>Casa & Decoração</li>
                <li>Moda & Beleza</li>
                <li>Esportes</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-sm opacity-90">
                <li><Link to="/como-funciona" className="hover:text-accent transition-colors">Como Funciona</Link></li>
                <li>FAQ</li>
                <li>Contato</li>
                <li>Termos de Uso</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Segurança</h4>
              <ul className="space-y-2 text-sm opacity-90">
                <li>🔒 SSL Seguro</li>
                <li>🛡️ Dados Protegidos</li>
                <li>✅ Auditoria Externa</li>
                <li>💳 Pagamento Seguro</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center text-sm opacity-75">
            © 2024 LeilãoCentavos. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
