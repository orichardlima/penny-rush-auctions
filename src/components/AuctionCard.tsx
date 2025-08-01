import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Timer, Gavel, TrendingUp, Users, Shield, Bot } from "lucide-react";

interface AuctionCardProps {
  id: string;
  title: string;
  image: string;
  currentPrice: number;
  originalPrice: number;
  totalBids: number;
  participants: number;
  onBid: (auctionId: string) => void;
  userBids: number;
  recentBidders: string[];
  protected_mode?: boolean;
  protected_target?: number;
  currentRevenue?: number;
  timeLeft?: number;
  isActive?: boolean;
}

export const AuctionCard = ({ 
  id, 
  title, 
  image, 
  currentPrice, 
  originalPrice, 
  totalBids, 
  participants, 
  onBid, 
  userBids, 
  recentBidders,
  protected_mode = false,
  protected_target = 0,
  currentRevenue = 0,
  timeLeft: initialTimeLeft = 15,
  isActive: initialIsActive = true
}: AuctionCardProps) => {
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft);
  const [isActive, setIsActive] = useState(initialIsActive);
  const [justBid, setJustBid] = useState(false);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Se o leilão tem proteção ativa e não atingiu a meta, ativar sistema de proteção
          if (protected_mode && currentRevenue < protected_target) {
            console.log('🛡️ Proteção ativa: acionando sistema bot - Meta:', protected_target/100, 'Atual:', currentRevenue);
            // Chama o sistema de proteção
            triggerBotProtection();
            return 3; // Dar alguns segundos para o bot agir
          }
          setIsActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isActive, protected_mode, protected_target, currentRevenue]);

  // Função para acionar o sistema de proteção
  const triggerBotProtection = async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.functions.invoke('bot-protected-bid');
      console.log('🤖 Sistema de proteção acionado');
    } catch (error) {
      console.error('❌ Erro ao acionar proteção:', error);
    }
  };

  const handleBid = () => {
    if (userBids <= 0) return;
    onBid(id);
    setTimeLeft(15);
    setIsActive(true);
    setJustBid(true);
    setTimeout(() => setJustBid(false), 600);
  };

  const getTimerClasses = () => {
    if (timeLeft > 10) {
      return {
        container: "bg-background border-2 border-success text-success shadow-lg",
        dot: "bg-success animate-pulse",
        animation: ""
      };
    }
    if (timeLeft > 5) {
      return {
        container: "bg-background border-2 border-warning text-warning shadow-lg animate-timer-warning",
        dot: "bg-warning animate-pulse",
        animation: ""
      };
    }
    return {
      container: "bg-background border-2 border-destructive text-destructive shadow-lg animate-timer-urgent",
      dot: "bg-destructive animate-pulse",
      animation: "animate-countdown"
    };
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const calculateDiscount = () => {
    const discount = ((originalPrice - currentPrice) / originalPrice) * 100;
    return Math.round(discount);
  };

  return (
    <Card className="overflow-hidden shadow-card hover:shadow-elegant transition-all duration-300 group">
      <div className="relative">
        <img 
          src={image} 
          alt={title} 
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <Badge variant={isActive ? "default" : "secondary"} className="shadow-md">
            {isActive ? "Ativo" : "Finalizado"}
          </Badge>
          {protected_mode && (
            <Badge variant="outline" className="bg-background/90 border-primary text-primary shadow-md">
              <Shield className="w-3 h-3 mr-1" />
              Protegido
            </Badge>
          )}
        </div>
        <div className="absolute top-3 left-3">
          <div className={`rounded-xl px-4 py-3 transition-all duration-300 ${getTimerClasses().container}`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getTimerClasses().dot}`}></div>
              <div className="flex items-center gap-1">
                <Timer className="w-5 h-5" />
                <span className={`font-mono font-bold text-xl ${getTimerClasses().animation}`}>
                  {timeLeft}s
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <h3 className="font-semibold text-lg mb-3 text-foreground">{title}</h3>
        
        <div className="space-y-3 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Preço atual:</span>
            <span className="text-2xl font-bold text-primary">{formatPrice(currentPrice)}</span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Valor na loja:</span>
            <span className="text-lg font-semibold line-through text-muted-foreground">{formatPrice(originalPrice)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Economia:</span>
            <span className="text-lg font-bold text-success">{calculateDiscount()}% OFF</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center text-muted-foreground">
              <Gavel className="w-4 h-4 mr-1" />
              {totalBids} lances
            </div>
            <div className="flex items-center text-muted-foreground">
              <Users className="w-4 h-4 mr-1" />
              {participants} pessoas
            </div>
          </div>

          {/* Informações de Proteção */}
          {protected_mode && protected_target > 0 && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2 flex items-center">
                <Shield className="w-3 h-3 mr-1" />
                Meta de Proteção:
              </p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Progresso:</span>
                  <span className="font-medium">
                    {formatPrice(currentRevenue)} / {formatPrice(protected_target)}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div 
                    className="bg-primary h-1.5 rounded-full transition-all duration-300" 
                    style={{ 
                      width: `${Math.min((currentRevenue / protected_target) * 100, 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {recentBidders.length > 0 && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Últimos lances:</p>
              <div className="flex flex-wrap gap-1">
                {recentBidders.slice(0, 3).map((bidder, index) => (
                  <span key={index} className="text-xs bg-muted px-2 py-1 rounded-full">
                    {bidder}
                  </span>
                ))}
                {recentBidders.length > 3 && (
                  <span className="text-xs text-muted-foreground">+{recentBidders.length - 3} mais</span>
                )}
              </div>
            </div>
          )}
        </div>

        <Button 
          onClick={handleBid} 
          disabled={!isActive || userBids <= 0}
          variant={justBid ? "success" : "bid"}
          size="lg" 
          className={`w-full ${justBid ? "animate-bid-success" : ""}`}
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          {isActive ? "DAR LANCE (R$ 1,00)" : "LEILÃO FINALIZADO"}
        </Button>

        {userBids <= 0 && isActive && (
          <p className="text-center text-destructive text-sm mt-2">
            Você precisa comprar lances para participar!
          </p>
        )}
      </div>
    </Card>
  );
};