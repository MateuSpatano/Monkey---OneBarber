import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Scissors, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ClientHome() {
  const { user } = useAuth();

  const { data: clientData } = useQuery({
    queryKey: ['client-profile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.email,
  });

  const { data: nextAppointment } = useQuery({
    queryKey: ['client-next-appointment', clientData?.id],
    queryFn: async () => {
      if (!clientData?.id) return null;
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('appointments')
        .select(`
          *,
          professionals:professional_id (name)
        `)
        .eq('client_id', clientData.id)
        .gte('appointment_date', today)
        .in('status', ['pending', 'confirmed'])
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!clientData?.id,
  });

  const { data: services } = useQuery({
    queryKey: ['featured-services'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('type', 'service')
        .eq('status', 'active')
        .limit(4);
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Olá, {clientData?.name?.split(' ')[0] || 'Cliente'}! 👋
        </h1>
        <p className="text-muted-foreground">
          Bem-vindo ao seu portal de agendamentos
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-primary text-primary-foreground">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Agendar Horário
            </CardTitle>
            <CardDescription className="text-primary-foreground/80">
              Escolha um serviço e agende seu próximo atendimento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" asChild className="w-full">
              <Link to="/client/book">
                Agendar Agora <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Próximo Agendamento
            </CardTitle>
            <CardDescription>
              {nextAppointment ? 'Seu próximo horário marcado' : 'Nenhum agendamento futuro'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {nextAppointment ? (
              <div className="space-y-2">
                <p className="font-medium">{nextAppointment.service}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(nextAppointment.appointment_date), "dd 'de' MMMM", { locale: ptBR })} às {nextAppointment.appointment_time.slice(0, 5)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Com: {(nextAppointment.professionals as any)?.name || 'Profissional'}
                </p>
              </div>
            ) : (
              <Button variant="outline" asChild className="w-full">
                <Link to="/client/book">Ver Serviços</Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5" />
              Meus Agendamentos
            </CardTitle>
            <CardDescription>
              Veja seu histórico e agendamentos futuros
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full">
              <Link to="/client/appointments">Ver Todos</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Featured Services */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Serviços Disponíveis</h2>
          <Button variant="link" asChild>
            <Link to="/client/services">Ver todos</Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {services?.map((service) => (
            <Card key={service.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{service.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">
                  R$ {service.price.toFixed(2).replace('.', ',')}
                </p>
                {service.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {service.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
