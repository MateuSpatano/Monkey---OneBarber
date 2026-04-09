import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarIcon, Clock, User, Scissors, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export default function ClientBooking() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedService, setSelectedService] = useState<string>(searchParams.get('service') || '');
  const [selectedProfessional, setSelectedProfessional] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState(1);

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

  const { data: services } = useQuery({
    queryKey: ['booking-services'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('type', 'service')
        .eq('status', 'active')
        .order('name');
      return data;
    },
  });

  const { data: professionals } = useQuery({
    queryKey: ['booking-professionals'],
    queryFn: async () => {
      const { data } = await supabase
        .from('professionals')
        .select('*')
        .eq('status', 'active')
        .order('name');
      return data;
    },
  });

  const { data: existingAppointments } = useQuery({
    queryKey: ['existing-appointments', selectedProfessional, selectedDate],
    queryFn: async () => {
      if (!selectedProfessional || !selectedDate) return [];
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('professional_id', selectedProfessional)
        .eq('appointment_date', dateStr)
        .neq('status', 'cancelled');
      return data?.map(a => a.appointment_time) || [];
    },
    enabled: !!selectedProfessional && !!selectedDate,
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!clientData?.id || !selectedService || !selectedProfessional || !selectedDate || !selectedTime) {
        throw new Error('Dados incompletos');
      }

      const service = services?.find(s => s.id === selectedService);

      const { error } = await supabase
        .from('appointments')
        .insert({
          client_id: clientData.id,
          professional_id: selectedProfessional,
          service: service?.name || 'Serviço',
          appointment_date: format(selectedDate, 'yyyy-MM-dd'),
          appointment_time: selectedTime,
          notes,
          total_amount: service?.price || 0,
          status: 'pending',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-appointments'] });
      toast({
        title: 'Agendamento realizado!',
        description: 'Seu horário foi agendado com sucesso.',
      });
      navigate('/client/appointments');
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível realizar o agendamento.',
        variant: 'destructive',
      });
    },
  });

  // Generate available times (9:00 - 19:00, 30 min intervals)
  const availableTimes = [];
  for (let hour = 9; hour < 19; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`;
      if (!existingAppointments?.includes(time)) {
        availableTimes.push(time);
      }
    }
  }

  const selectedServiceData = services?.find(s => s.id === selectedService);
  const selectedProfessionalData = professionals?.find(p => p.id === selectedProfessional);

  const canProceed = () => {
    switch (step) {
      case 1: return !!selectedService;
      case 2: return !!selectedProfessional;
      case 3: return !!selectedDate && !!selectedTime;
      default: return true;
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CalendarIcon className="h-8 w-8" />
          Agendar Horário
        </h1>
        <p className="text-muted-foreground">
          Preencha os dados para agendar seu atendimento
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 4 && <div className={`w-16 h-1 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Service */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5" />
              Escolha o Serviço
            </CardTitle>
            <CardDescription>Selecione o serviço que deseja agendar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-2">
              {services?.map((service) => (
                <div
                  key={service.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedService === service.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedService(service.id)}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{service.name}</span>
                    <span className="text-primary font-bold">
                      R$ {service.price.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  {service.description && (
                    <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Professional */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Escolha o Profissional
            </CardTitle>
            <CardDescription>Selecione o profissional de sua preferência</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-2">
              {professionals?.map((professional) => (
                <div
                  key={professional.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedProfessional === professional.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedProfessional(professional.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{professional.name}</p>
                      {professional.specialty && (
                        <p className="text-sm text-muted-foreground">{professional.specialty}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Select Date and Time */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Data e Horário
            </CardTitle>
            <CardDescription>Escolha quando deseja ser atendido</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="mb-2 block">Data</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date() || date.getDay() === 0}
                locale={ptBR}
                className="rounded-md border"
              />
            </div>
            
            {selectedDate && (
              <div>
                <Label className="mb-2 block">Horário</Label>
                <div className="grid grid-cols-4 gap-2">
                  {availableTimes.length === 0 ? (
                    <p className="col-span-4 text-muted-foreground text-center py-4">
                      Nenhum horário disponível nesta data
                    </p>
                  ) : (
                    availableTimes.map((time) => (
                      <Button
                        key={time}
                        variant={selectedTime === time ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedTime(time)}
                      >
                        {time.slice(0, 5)}
                      </Button>
                    ))
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5" />
              Confirmar Agendamento
            </CardTitle>
            <CardDescription>Revise os dados antes de confirmar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Serviço:</span>
                <span className="font-medium">{selectedServiceData?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Profissional:</span>
                <span className="font-medium">{selectedProfessionalData?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data:</span>
                <span className="font-medium">
                  {selectedDate && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Horário:</span>
                <span className="font-medium">{selectedTime.slice(0, 5)}</span>
              </div>
              <div className="flex justify-between border-t pt-3 mt-3">
                <span className="font-medium">Total:</span>
                <span className="font-bold text-primary text-lg">
                  R$ {selectedServiceData?.price.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Alguma observação para o profissional?"
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(s => Math.max(1, s - 1))}
          disabled={step === 1}
        >
          Voltar
        </Button>
        {step < 4 ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
            Próximo
          </Button>
        ) : (
          <Button 
            onClick={() => bookMutation.mutate()} 
            disabled={bookMutation.isPending}
          >
            {bookMutation.isPending ? 'Agendando...' : 'Confirmar Agendamento'}
          </Button>
        )}
      </div>
    </div>
  );
}
