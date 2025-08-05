import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Shield, Target, TrendingUp, Bot, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuctionProtectionProps {
  auctionId: string;
  currentRevenue?: number;
  onSettingsUpdated?: () => void;
}

interface ProtectionSettings {
  protected_mode: boolean;
  protected_target: number;
  auto_bid_enabled: boolean;
  min_revenue_target: number;
  auto_bid_min_interval: number;
  auto_bid_max_interval: number;
}

interface BotLog {
  id: string;
  bid_amount: number;
  target_revenue: number;
  current_revenue: number;
  fake_user_name?: string;
  bid_type: string;
  time_remaining?: number;
  created_at: string;
}

export const AuctionProtectionSettings: React.FC<AuctionProtectionProps> = ({
  auctionId,
  currentRevenue = 0,
  onSettingsUpdated
}) => {
  const [settings, setSettings] = useState<ProtectionSettings>({
    protected_mode: false,
    protected_target: 0,
    auto_bid_enabled: false,
    min_revenue_target: 0,
    auto_bid_min_interval: 1,
    auto_bid_max_interval: 10
  });
  const [targetInput, setTargetInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [botLogs, setBotLogs] = useState<BotLog[]>([]);
  const { toast } = useToast();

  // Carregar configurações atuais
  useEffect(() => {
    loadCurrentSettings();
    loadBotLogs();
  }, [auctionId]);

  const loadCurrentSettings = async () => {
    try {
      setLoadingSettings(true);
      const { data, error } = await supabase
        .from('auctions')
        .select('protected_mode, protected_target, auto_bid_enabled, min_revenue_target, auto_bid_min_interval, auto_bid_max_interval')
        .eq('id', auctionId)
        .single();

      if (error) throw error;

      if (data) {
        setSettings({
          protected_mode: data.protected_mode || false,
          protected_target: data.protected_target || 0,
          auto_bid_enabled: data.auto_bid_enabled || false,
          min_revenue_target: data.min_revenue_target || 0,
          auto_bid_min_interval: data.auto_bid_min_interval || 1,
          auto_bid_max_interval: data.auto_bid_max_interval || 10
        });
        setTargetInput(data.protected_target ? (data.protected_target / 100).toFixed(2) : '');
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações de proteção",
        variant: "destructive"
      });
    } finally {
      setLoadingSettings(false);
    }
  };

  const loadBotLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('bot_logs')
        .select('*')
        .eq('auction_id', auctionId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setBotLogs(data || []);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);

      // Validar entrada
      const targetValue = parseFloat(targetInput) * 100; // Converter para centavos
      if (settings.protected_mode && (isNaN(targetValue) || targetValue <= 0)) {
        toast({
          title: "Erro de Validação",
          description: "Digite um valor válido para o faturamento alvo",
          variant: "destructive"
        });
        return;
      }

      // Validar configurações de auto-bid
      if (settings.auto_bid_enabled) {
        const minRevenueValue = Math.round(settings.min_revenue_target);
        if (minRevenueValue <= 0) {
          toast({
            title: "Erro de Validação",
            description: "Digite um valor válido para o faturamento mínimo do auto-bid",
            variant: "destructive"
          });
          return;
        }
        
        if (settings.auto_bid_min_interval >= settings.auto_bid_max_interval) {
          toast({
            title: "Erro de Validação",
            description: "O intervalo mínimo deve ser menor que o máximo",
            variant: "destructive"
          });
          return;
        }
      }

      const updateData = {
        protected_mode: settings.protected_mode,
        protected_target: Math.round(targetValue),
        auto_bid_enabled: settings.auto_bid_enabled,
        min_revenue_target: Math.round(settings.min_revenue_target),
        auto_bid_min_interval: settings.auto_bid_min_interval,
        auto_bid_max_interval: settings.auto_bid_max_interval
      };

      const { error } = await supabase
        .from('auctions')
        .update(updateData)
        .eq('id', auctionId);

      if (error) throw error;

      toast({
        title: "Configurações Salvas",
        description: `Proteção ${settings.protected_mode ? 'ativada' : 'desativada'} e auto-bid ${settings.auto_bid_enabled ? 'ativado' : 'desativado'} com sucesso`,
        variant: "default"
      });

      onSettingsUpdated?.();

    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value / 100);
  };

  const getProgressPercentage = () => {
    if (settings.protected_target <= 0) return 0;
    return Math.min((currentRevenue / settings.protected_target) * 100, 100);
  };

  const isTargetReached = currentRevenue >= settings.protected_target;

  if (loadingSettings) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2">Carregando configurações...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configurações de Proteção */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Configurações de Proteção</CardTitle>
          </div>
          <CardDescription>
            Configure a proteção automática com lances de bots para garantir faturamento mínimo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggle de Ativação */}
          <div className="flex items-center space-x-2">
            <Switch
              id="protection-mode"
              checked={settings.protected_mode}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, protected_mode: checked }))
              }
            />
            <Label htmlFor="protection-mode" className="text-sm font-medium">
              Ativar Modo Proteção
            </Label>
            {settings.protected_mode && (
              <Badge variant="default" className="ml-2">
                <Bot className="h-3 w-3 mr-1" />
                Ativo
              </Badge>
            )}
          </div>

          {/* Campo de Meta */}
          <div className="space-y-2">
            <Label htmlFor="target-revenue">Faturamento Alvo (R$)</Label>
            <Input
              id="target-revenue"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ex: 500.00"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              disabled={!settings.protected_mode}
            />
            <p className="text-xs text-muted-foreground">
              O sistema manterá o leilão ativo até atingir este valor
            </p>
          </div>

          {/* Status Atual */}
          {settings.protected_mode && settings.protected_target > 0 && (
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Progresso da Meta</span>
                <Badge variant={isTargetReached ? "default" : "secondary"}>
                  {getProgressPercentage().toFixed(1)}%
                </Badge>
              </div>
              
              <div className="w-full bg-background rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Atual:</span>
                  <p className="font-semibold text-primary">{formatCurrency(currentRevenue)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Meta:</span>
                  <p className="font-semibold">{formatCurrency(settings.protected_target)}</p>
                </div>
              </div>

              {isTargetReached && (
                <div className="flex items-center space-x-2 text-success">
                  <Target className="h-4 w-4" />
                  <span className="text-sm font-medium">Meta atingida! Proteção será desativada automaticamente.</span>
                </div>
              )}
            </div>
          )}

          {/* Configurações de Auto-Bid */}
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center space-x-2">
              <Bot className="h-4 w-4 text-primary" />
              <Label className="text-sm font-medium">Sistema de Lances Automáticos</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="auto-bid-mode"
                checked={settings.auto_bid_enabled}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, auto_bid_enabled: checked }))
                }
              />
              <Label htmlFor="auto-bid-mode" className="text-sm">
                Ativar Lances Automáticos
              </Label>
              {settings.auto_bid_enabled && (
                <Badge variant="secondary" className="ml-2">
                  <Clock className="h-3 w-3 mr-1" />
                  Ativo
                </Badge>
              )}
            </div>

            {settings.auto_bid_enabled && (
              <div className="space-y-3 ml-6 pl-4 border-l">
                <div className="space-y-2">
                  <Label htmlFor="min-revenue-target">Faturamento Mínimo (R$)</Label>
                  <Input
                    id="min-revenue-target"
                    type="number"
                    step="1"
                    min="0"
                    placeholder="Ex: 5000"
                    value={settings.min_revenue_target ? (settings.min_revenue_target / 100).toFixed(0) : ''}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) * 100 || 0;
                      setSettings(prev => ({ ...prev, min_revenue_target: value }));
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Sistema insere lances fictícios até atingir este valor
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="min-interval">Intervalo Min (s)</Label>
                    <Input
                      id="min-interval"
                      type="number"
                      min="1"
                      max="30"
                      value={settings.auto_bid_min_interval}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        setSettings(prev => ({ ...prev, auto_bid_min_interval: value }));
                      }}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="max-interval">Intervalo Max (s)</Label>
                    <Input
                      id="max-interval"
                      type="number"
                      min="1"
                      max="30"
                      value={settings.auto_bid_max_interval}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 10;
                        setSettings(prev => ({ ...prev, auto_bid_max_interval: value }));
                      }}
                    />
                  </div>
                </div>

                <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                  <p><strong>Como funciona:</strong> O sistema sorteia usuários fictícios e insere lances aleatórios entre {settings.auto_bid_min_interval}s e {settings.auto_bid_max_interval}s para manter o leilão ativo até atingir R$ {settings.min_revenue_target ? (settings.min_revenue_target / 100).toFixed(2) : '0,00'}.</p>
                </div>
              </div>
            )}
          </div>

          {/* Aviso Importante */}
          <div className="flex items-start space-x-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
            <div className="text-xs text-warning-foreground">
              <p className="font-medium">Atenção:</p>
              <p>Lances de bots são transparentes aos usuários e garantem que o leilão não termine antes da meta ser atingida.</p>
            </div>
          </div>

          {/* Botão de Salvar */}
          <Button 
            onClick={handleSaveSettings} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                Salvando...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Logs de Atividade do Bot */}
      {botLogs.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Atividade do Bot de Proteção</CardTitle>
            </div>
            <CardDescription>
              Histórico dos últimos lances automáticos realizados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {botLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${log.bid_type === 'auto_bid' ? 'bg-blue-500' : 'bg-primary'}`}></div>
                    <div>
                      <p className="text-sm font-medium">
                        {log.fake_user_name || 'Bot'} - Lance: {formatCurrency(log.bid_amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Receita: {formatCurrency(log.current_revenue)} / Meta: {formatCurrency(log.target_revenue)}
                        {log.time_remaining && ` • ${log.time_remaining}s restantes`}
                      </p>
                      <div className="flex items-center mt-1">
                        <Badge variant={log.bid_type === 'auto_bid' ? 'default' : 'secondary'} className="text-xs">
                          {log.bid_type === 'auto_bid' ? 'Lance Automático' : 'Proteção'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};