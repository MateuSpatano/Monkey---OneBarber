import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, User, X, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ClientAppointments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['client-appointments', clientData?.id, establishmentId],
    queryFn: async () => {
      if (!clientData?.id) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select(`*, professionals:professional_id (name)`)
        .eq('client_id', clientData.id)
        .eq('establishment_id', establishmentId)
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!clientData?.id,
  });

  const cancelMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-appointments'] });
      toast({
        title: 'Agendamento cancelado',
        description: 'Seu agendamento foi cancelado com sucesso.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível cancelar o agendamento.',
        variant: 'destructive',
      });
    },
  });

  const today = new Date().toISOString().split('T')[0];
  
  const terminalStatuses = ['cancelled', 'completed', 'closed', 'no_show'];
  
  const futureAppointments = appointments?.filter(
    apt => apt.appointment_date >= today && !terminalStatuses.includes(apt.status)
  ) || [];
  
  const pastAppointments = appointments?.filter(
    apt => apt.appointment_date < today || terminalStatuses.includes(apt.status)
  ) || [];

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      open: { label: 'Em aberto', variant: 'secondary' },
      pending: { label: 'Pendente', variant: 'secondary' },
      confirmed: { label: 'Confirmado', variant: 'default' },
      completed: { label: 'Concluído', variant: 'outline' },
      closed: { label: 'Fechado', variant: 'outline' },
      cancelled: { label: 'Cancelado', variant: 'destructive' },
      no_show: { label: 'Não compareceu', variant: 'destructive' },
      checked_in: { label: 'Em atendimento', variant: 'default' },
    };
    const config = statusConfig[status] || { label: status, variant: 'secondary' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const AppointmentCard = ({ appointment, showCancel = false }: { appointment: any; showCancel?: boolean }) => (
    <Card className="premium-card border-none shadow-xl rounded-[32px] overflow-hidden transition-all hover:shadow-2xl">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{appointment.service}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <User className="h-3 w-3" />
              {appointment.professionals?.name || 'Profissional'}
            </CardDescription>
          </div>
          {getStatusBadge(appointment.status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {appointment.appointment_date 
              ? format(new Date(appointment.appointment_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
              : 'Data não disponível'}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {appointment.appointment_time ? appointment.appointment_time.slice(0, 5) : '--:--'}
          </span>
        </div>
        {appointment.total_amount > 0 && (
          <p className="text-lg font-semibold">
            R$ {typeof appointment.total_amount === 'number' ? appointment.total_amount.toFixed(2).replace('.', ',') : '0,00'}
          </p>
        )}
        {showCancel && appointment.status !== 'cancelled' && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="mt-4 premium-button-ghost bg-red-50 text-red-600 hover:bg-red-100 border-none transition-all font-bold">
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancelar agendamento?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Não, manter</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => cancelMutation.mutate(appointment.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Sim, cancelar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight underline decoration-primary/20 underline-offset-8 flex items-center gap-2">
          <Calendar className="h-7 w-7 text-primary/40" />
          Meus Agendamentos
        </h1>
        <p className="text-muted-foreground font-medium">
          Acompanhe seus agendamentos futuros e histórico de visitas
        </p>
      </div>

      <Tabs defaultValue="future" className="w-full">
        <TabsList>
          <TabsTrigger value="future">
            Próximos ({futureAppointments.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Histórico ({pastAppointments.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="future" className="mt-4">
          {futureAppointments.length === 0 ? (
            <Card className="py-12">
              <CardContent className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Você não tem agendamentos futuros</p>
                <Button className="mt-6 premium-button-solid h-11 px-8 shadow-xl font-bold" asChild>
                  <a href="/client/book">Agendar Agora</a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {futureAppointments.map((appointment) => (
                <AppointmentCard 
                  key={appointment.id} 
                  appointment={appointment} 
                  showCancel 
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="past" className="mt-4">
          {pastAppointments.length === 0 ? (
            <Card className="py-12">
              <CardContent className="text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Você ainda não tem histórico de agendamentos</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pastAppointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
