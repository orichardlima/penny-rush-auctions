import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Gavel, 
  DollarSign, 
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  LogOut,
  BarChart3,
  Package
} from 'lucide-react';

interface Auction {
  id: string;
  title: string;
  description: string;
  image_url: string;
  starting_price: number;
  current_price: number;
  status: string;
  total_bids: number;
  participants_count: number;
  created_at: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  bids_balance: number;
  is_admin: boolean;
  created_at: string;
}

interface BidPackage {
  id: string;
  name: string;
  bids_count: number;
  price: number;
  original_price?: number;
  is_popular: boolean;
  features: string[];
  created_at: string;
}

const AdminDashboard = () => {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [bidPackages, setBidPackages] = useState<BidPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAuction, setNewAuction] = useState({
    title: '',
    description: '',
    image_url: '',
    starting_price: 100,
  });

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      // Fetch auctions
      const { data: auctionsData } = await supabase
        .from('auctions')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch users
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch bid packages
      const { data: packagesData } = await supabase
        .from('bid_packages')
        .select('*')
        .order('created_at', { ascending: false });

      setAuctions(auctionsData || []);
      setUsers(usersData || []);
      setBidPackages(packagesData || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createAuction = async () => {
    try {
      const { error } = await supabase
        .from('auctions')
        .insert([{
          title: newAuction.title,
          description: newAuction.description,
          image_url: newAuction.image_url,
          starting_price: newAuction.starting_price,
          current_price: newAuction.starting_price,
          status: 'active'
        }]);

      if (error) throw error;

      toast({
        title: 'Leilão criado!',
        description: 'O leilão foi criado com sucesso.',
      });

      setNewAuction({
        title: '',
        description: '',
        image_url: '',
        starting_price: 100,
      });

      fetchAdminData();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao criar leilão.',
        variant: 'destructive',
      });
    }
  };

  const toggleUserAdmin = async (userId: string, isAdmin: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: !isAdmin })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Usuário atualizado!',
        description: `Usuário ${!isAdmin ? 'promovido a' : 'removido de'} administrador.`,
      });

      fetchAdminData();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar usuário.',
        variant: 'destructive',
      });
    }
  };

  const formatPrice = (priceInCents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(priceInCents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalRevenue = bidPackages.reduce((sum, pkg) => sum + (pkg.price * 10), 0); // Simulated
  const activeAuctions = auctions.filter(a => a.status === 'active').length;
  const totalUsers = users.length;
  const totalBids = auctions.reduce((sum, auction) => sum + auction.total_bids, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Painel Administrativo</h1>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Totais</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">usuários registrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leilões Ativos</CardTitle>
              <Gavel className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeAuctions}</div>
              <p className="text-xs text-muted-foreground">leilões em andamento</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Lances</CardTitle>
              <TrendingUp className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBids}</div>
              <p className="text-xs text-muted-foreground">lances realizados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Estimada</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">vendas de pacotes</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs do Dashboard Admin */}
        <Tabs defaultValue="auctions" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="auctions">Leilões</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="packages">Pacotes</TabsTrigger>
            <TabsTrigger value="analytics">Estatísticas</TabsTrigger>
          </TabsList>

          <TabsContent value="auctions" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Gerenciar Leilões</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Leilão
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Novo Leilão</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Título</Label>
                      <Input
                        id="title"
                        value={newAuction.title}
                        onChange={(e) => setNewAuction({...newAuction, title: e.target.value})}
                        placeholder="Ex: iPhone 15 Pro Max"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Descrição</Label>
                      <Input
                        id="description"
                        value={newAuction.description}
                        onChange={(e) => setNewAuction({...newAuction, description: e.target.value})}
                        placeholder="Descrição do produto"
                      />
                    </div>
                    <div>
                      <Label htmlFor="image_url">URL da Imagem</Label>
                      <Input
                        id="image_url"
                        value={newAuction.image_url}
                        onChange={(e) => setNewAuction({...newAuction, image_url: e.target.value})}
                        placeholder="/src/assets/produto.jpg"
                      />
                    </div>
                    <div>
                      <Label htmlFor="starting_price">Preço Inicial (centavos)</Label>
                      <Input
                        id="starting_price"
                        type="number"
                        value={newAuction.starting_price}
                        onChange={(e) => setNewAuction({...newAuction, starting_price: parseInt(e.target.value)})}
                        placeholder="100"
                      />
                    </div>
                    <Button onClick={createAuction} className="w-full">
                      Criar Leilão
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Preço Atual</TableHead>
                      <TableHead>Lances</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auctions.map((auction) => (
                      <TableRow key={auction.id}>
                        <TableCell className="font-medium">{auction.title}</TableCell>
                        <TableCell>{formatPrice(auction.current_price)}</TableCell>
                        <TableCell>{auction.total_bids}</TableCell>
                        <TableCell>
                          <Badge variant={auction.status === 'active' ? 'default' : 'secondary'}>
                            {auction.status === 'active' ? 'Ativo' : 'Finalizado'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(auction.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <h2 className="text-xl font-semibold">Gerenciar Usuários</h2>
            <Card>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Saldo de Lances</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Cadastro</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.bids_balance}</TableCell>
                        <TableCell>
                          <Badge variant={user.is_admin ? 'default' : 'secondary'}>
                            {user.is_admin ? 'Admin' : 'Usuário'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleUserAdmin(user.id, user.is_admin)}
                          >
                            {user.is_admin ? 'Remover Admin' : 'Tornar Admin'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="packages" className="space-y-4">
            <h2 className="text-xl font-semibold">Pacotes de Lances</h2>
            <Card>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Lances</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Popular</TableHead>
                      <TableHead>Criado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bidPackages.map((pkg) => (
                      <TableRow key={pkg.id}>
                        <TableCell className="font-medium">{pkg.name}</TableCell>
                        <TableCell>{pkg.bids_count}</TableCell>
                        <TableCell>{formatPrice(pkg.price)}</TableCell>
                        <TableCell>
                          <Badge variant={pkg.is_popular ? 'default' : 'secondary'}>
                            {pkg.is_popular ? 'Popular' : 'Normal'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(pkg.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <h2 className="text-xl font-semibold">Estatísticas Detalhadas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Resumo Geral</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total de Usuários:</span>
                    <span className="font-bold">{totalUsers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Leilões Ativos:</span>
                    <span className="font-bold">{activeAuctions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total de Lances:</span>
                    <span className="font-bold">{totalBids}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Receita Estimada:</span>
                    <span className="font-bold">{formatPrice(totalRevenue)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Atividade Recente</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Funcionalidade de analytics em desenvolvimento...
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;