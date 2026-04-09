import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { User, Bell, Shield, Palette, Loader2 } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    updates: true,
    security: true,
  });

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({
      title: 'Configurações salvas',
      description: 'Suas preferências foram atualizadas com sucesso.',
    });
    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight underline decoration-primary/20 underline-offset-8">Configurações</h1>
        <p className="text-muted-foreground font-medium text-sm sm:text-base">Gerencie suas preferências e configurações de conta</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Segurança
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="premium-card border-none shadow-2xl rounded-[32px] overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-black tracking-tight uppercase text-zinc-400">Informações do Perfil</CardTitle>
              <CardDescription className="font-medium">Atualize suas informações pessoais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xl font-medium text-primary">
                    {user?.email?.[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <Button variant="outline" size="sm" className="rounded-xl font-bold h-9">
                    Alterar foto
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input id="name" placeholder="Seu nome" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={user?.email || ''} disabled />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Input id="bio" placeholder="Uma breve descrição sobre você" />
              </div>

              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="premium-button-solid h-11 px-8 shadow-xl mt-4"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar alterações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="premium-card border-none shadow-2xl rounded-[32px] overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-black tracking-tight uppercase text-zinc-400">Preferências de Notificação</CardTitle>
              <CardDescription className="font-medium">Configure como você deseja receber notificações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações por e-mail</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba atualizações importantes por e-mail
                  </p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, email: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações push</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba notificações em tempo real no navegador
                  </p>
                </div>
                <Switch
                  checked={notifications.push}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, push: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Atualizações do sistema</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba informações sobre novos recursos
                  </p>
                </div>
                <Switch
                  checked={notifications.updates}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, updates: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Alertas de segurança</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba alertas sobre atividades suspeitas
                  </p>
                </div>
                <Switch
                  checked={notifications.security}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, security: checked })
                  }
                />
              </div>

              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="premium-button-solid h-11 px-8 shadow-xl"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar preferências
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="premium-card border-none shadow-2xl rounded-[32px] overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-black tracking-tight uppercase text-zinc-400">Segurança da Conta</CardTitle>
              <CardDescription className="font-medium">Gerencie a segurança da sua conta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Senha atual</Label>
                  <Input id="current-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova senha</Label>
                  <Input id="new-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                  <Input id="confirm-password" type="password" />
                </div>
              </div>

               <Button 
                onClick={handleSave} 
                disabled={saving}
                className="premium-button-solid h-11 px-8 shadow-xl"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Alterar senha
              </Button>

              <div className="pt-6 border-t">
                <h4 className="font-medium text-destructive mb-2">Zona de Perigo</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Ações irreversíveis relacionadas à sua conta
                </p>
                <Button variant="destructive" className="rounded-xl font-bold h-11 px-6 shadow-md bg-red-600 hover:bg-red-700">
                  Excluir minha conta
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
