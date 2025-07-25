import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, ShoppingCart, User, Menu, Gavel } from "lucide-react";

interface HeaderProps {
  userBids: number;
  onBuyBids: () => void;
}

export const Header = ({ userBids, onBuyBids }: HeaderProps) => {
  return (
    <header className="bg-background border-b border-border shadow-sm sticky top-0 z-50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-primary rounded-lg shadow-elegant">
              <Gavel className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                LeilãoCentavos
              </h1>
              <p className="text-xs text-muted-foreground">Leilões que valem ouro!</p>
            </div>
          </div>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#leiloes" className="text-foreground hover:text-primary transition-colors">
              Leilões Ativos
            </a>
            <a href="#como-funciona" className="text-foreground hover:text-primary transition-colors">
              Como Funciona
            </a>
            <a href="#vencedores" className="text-foreground hover:text-primary transition-colors">
              Vencedores
            </a>
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-3">
            {/* User Bids Display */}
            <div className="flex items-center bg-secondary rounded-lg px-3 py-2">
              <Coins className="w-4 h-4 text-accent mr-2" />
              <span className="font-semibold text-foreground">{userBids}</span>
              <span className="text-xs text-muted-foreground ml-1">lances</span>
            </div>

            {/* Buy Bids Button */}
            <Button onClick={onBuyBids} variant="accent" size="sm">
              <ShoppingCart className="w-4 h-4 mr-1" />
              Comprar
            </Button>

            {/* User Profile */}
            <Button variant="ghost" size="icon">
              <User className="w-4 h-4" />
            </Button>

            {/* Mobile Menu */}
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};