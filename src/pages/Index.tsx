import { useState } from "react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { AuctionCard } from "@/components/AuctionCard";
import { BidPackages } from "@/components/BidPackages";
import { HowItWorks } from "@/components/HowItWorks";
import { RecentWinners } from "@/components/RecentWinners";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

// Import product images
import iphoneImage from "@/assets/iphone-15-pro.jpg";
import macbookImage from "@/assets/macbook-air-m2.jpg";
import samsungImage from "@/assets/samsung-s24.jpg";
import playstationImage from "@/assets/playstation-5.jpg";
import tvImage from "@/assets/smart-tv-55.jpg";
import watchImage from "@/assets/apple-watch-ultra.jpg";

const Index = () => {
  const [userBids, setUserBids] = useState(25); // User starts with 25 bids
  const { toast } = useToast();

  // Mock auction data
  const auctions = [
    {
      id: "1",
      title: "iPhone 15 Pro Max 256GB",
      image: iphoneImage,
      currentPrice: 23.45,
      originalPrice: 8999.00,
      totalBids: 2345,
      participants: 187,
      recentBidders: ["João S.", "Maria L.", "Pedro R.", "Ana C."]
    },
    {
      id: "2", 
      title: "MacBook Air M2 13'' 512GB",
      image: macbookImage,
      currentPrice: 156.78,
      originalPrice: 12999.00,
      totalBids: 15678,
      participants: 892,
      recentBidders: ["Carlos M.", "Julia K.", "Rafael T."]
    },
    {
      id: "3",
      title: "Samsung Galaxy S24 Ultra",
      image: samsungImage,
      currentPrice: 89.23,
      originalPrice: 7499.00,
      totalBids: 8923,
      participants: 456,
      recentBidders: ["Lucas P.", "Fernanda B.", "Diego A.", "Camila S.", "Bruno N."]
    },
    {
      id: "4",
      title: "PlayStation 5 + 2 Controles",
      image: playstationImage,
      currentPrice: 67.89,
      originalPrice: 4799.00,
      totalBids: 6789,
      participants: 324,
      recentBidders: ["Thiago L.", "Isabela F."]
    },
    {
      id: "5",
      title: "Smart TV 55'' 4K OLED",
      image: tvImage,
      currentPrice: 45.67,
      originalPrice: 3299.00,
      totalBids: 4567,
      participants: 234,
      recentBidders: ["Roberto C.", "Leticia M.", "Gustavo H."]
    },
    {
      id: "6", 
      title: "Apple Watch Ultra 2",
      image: watchImage,
      currentPrice: 123.45,
      originalPrice: 6999.00,
      totalBids: 12345,
      participants: 567,
      recentBidders: ["Patricia V.", "Eduardo S.", "Mariana O.", "Felipe G."]
    }
  ];

  const handleBid = (auctionId: string) => {
    if (userBids <= 0) {
      toast({
        title: "Sem lances disponíveis!",
        description: "Compre mais lances para continuar participando dos leilões.",
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
              {auctions.map((auction) => (
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
                />
              ))}
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
