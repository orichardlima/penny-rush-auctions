import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { AuctionCard } from "@/components/AuctionCard";
import { BidPackages } from "@/components/BidPackages";
import { HowItWorks } from "@/components/HowItWorks";
import { RecentWinners } from "@/components/RecentWinners";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [userBids, setUserBids] = useState(25); // User starts with 25 bids
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        const { data, error } = await supabase
          .from('auctions')
          .select('*')
          .eq('status', 'active')
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

        const auctionsWithImages = data?.map(auction => ({
          ...auction,
          image: auction.image_url || '/placeholder.svg',
          currentPrice: (auction.current_price || 10) / 100, // Converte centavos para reais
          originalPrice: (auction.market_value || 0) / 100, // Converte centavos para reais
          totalBids: auction.total_bids || 0,
          participants: auction.participants_count || 0,
          recentBidders: ["Usuário A", "Usuário B", "Usuário C"],
          protected_mode: auction.protected_mode || false,
          protected_target: auction.revenue_target || 0,
          currentRevenue: (auction.total_bids || 0) * 1.00 // Cada lance vale R$ 1,00
        })) || [];

        setAuctions(auctionsWithImages);
      } catch (error) {
        console.error('Error fetching auctions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAuctions();
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
      // Inserir o lance no banco de dados
      const { error } = await supabase
        .from('bids')
        .insert({
          auction_id: auctionId,
          user_id: 'temp-user-id', // Temporário até ter autenticação
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
      toast({
        title: "Lance realizado!",
        description: "Seu lance foi registrado com sucesso. Boa sorte!",
        variant: "default"
      });

      // Recarregar os leilões para mostrar o preço atualizado
      window.location.reload();
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
