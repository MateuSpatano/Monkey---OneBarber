import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Scissors, ArrowRight, Store } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ClientHome() {
  const { user } = useAuth();
  const { establishmentId } = useOutletContext<{ establishmentId: string }>();

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
    queryKey: ['client-next-appointment', clientData?.id, establishmentId],
    queryFn: async () => {
      if (!clientData?.id) return null;
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('appointments')
        .select(`*, professionals:professional_id (name)`)
        .eq('client_id', clientData.id)
        .eq('establishment_id', establishmentId)
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
    queryKey: ['featured-services', establishmentId],
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

  const handleChangeEstablishment = () => {
    localStorage.removeItem('client-selected-establishment');
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
            Olá, {clientData?.name?.split(' ')[0] || 'Cliente'}! 👋
          </h1>
          <p className="text-muted-foreground font-medium">Bem-vindo ao seu portal de agendamentos</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleChangeEstablishment} className="premium-button-ghost bg-white border-none h-11 px-5 shadow-xl">
          <Store className="h-5 w-5 mr-2" />
          <span className="font-bold">Trocar Barbearia</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="premium-card bg-primary text-primary-foreground border-none shadow-2xl rounded-[32px] overflow-hidden transition-all hover:scale-105">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-black tracking-tight uppercase">
              <div className="p-2 rounded-2xl bg-white/20">
                <Calendar className="h-5 w-5" />
              </div>
              Agendar Horário
            </CardTitle>
            <CardDescription className="text-primary-foreground/90 font-medium ml-12">
              Escolha um serviço e agende seu próximo atendimento agora
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <Button variant="secondary" asChild className="w-full premium-button-ghost bg-white text-primary border-none h-12 shadow-lg">
              <Link to="/client/book" className="font-black">Agendar Agora <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="premium-card border-none shadow-xl rounded-[32px] overflow-hidden transition-all hover:shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-black tracking-tight uppercase text-zinc-900">
              <div className="p-2 rounded-2xl bg-zinc-100 text-zinc-900">
                <Clock className="h-5 w-5" />
              </div>
              Próximo Horário
            </CardTitle>
            <CardDescription className="ml-12 font-medium">
              {nextAppointment ? 'Seu agendamento confirmado' : 'Nenhum horário marcado'}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            {nextAppointment ? (
              <div className="space-y-3 bg-zinc-50 p-5 rounded-2xl border border-black/5">
                <p className="font-black text-zinc-900">{nextAppointment.service}</p>
                <div className="grid grid-cols-1 gap-1 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  <p>
                    {nextAppointment.appointment_date 
                      ? format(new Date(nextAppointment.appointment_date), "dd 'de' MMMM", { locale: ptBR }) 
                      : 'Data não disponível'} 
                    {nextAppointment.appointment_time ? ` — ${nextAppointment.appointment_time.slice(0, 5)}` : ''}
                  </p>
                  <p>Profissional: {(nextAppointment.professionals as any)?.name || 'Profissional'}</p>
                </div>
              </div>
            ) : (
              <Button variant="outline" asChild className="w-full premium-button-ghost bg-zinc-50 border-none h-12 shadow-sm">
                <Link to="/client/book" className="font-bold">Ver Serviços</Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="premium-card border-none shadow-xl rounded-[32px] overflow-hidden transition-all hover:shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-black tracking-tight uppercase text-zinc-900">
              <div className="p-2 rounded-2xl bg-zinc-100 text-zinc-900">
                <Scissors className="h-5 w-5" />
              </div>
              Minha Conta
            </CardTitle>
            <CardDescription className="ml-12 font-medium">Veja seu histórico e agendamentos</CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <Button variant="outline" asChild className="w-full premium-button-ghost bg-zinc-50 border-none h-12 shadow-sm">
              <Link to="/client/appointments" className="font-bold">Ver Todos</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

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
                  R$ {typeof service.price === 'number' ? service.price.toFixed(2).replace('.', ',') : '0,00'}
                </p>
                {service.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{service.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
