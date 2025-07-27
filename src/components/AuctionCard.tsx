import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Timer, Gavel, TrendingUp, Users } from "lucide-react";

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
}

export const AuctionCard = ({ id, title, image, currentPrice, originalPrice, totalBids, participants, onBid, userBids, recentBidders }: AuctionCardProps) => {
  const [timeLeft, setTimeLeft] = useState(15);
  const [isActive, setIsActive] = useState(true);
  const [justBid, setJustBid] = useState(false);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isActive]);

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
        <div className="absolute top-3 right-3">
          <Badge variant={isActive ? "default" : "secondary"} className="shadow-md">
            {isActive ? "Ativo" : "Finalizado"}
          </Badge>
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