import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar as CalendarIcon, Clock, User, Scissors, Check, ShoppingBag, Plus, Minus, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface CartProduct {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function ClientBooking() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { establishmentId } = useOutletContext<{ establishmentId: string }>();

  const [selectedServices, setSelectedServices] = useState<string[]>(() => {
    const initial = searchParams.get('service');
    return initial ? [initial] : [];
  });
  const [selectedProfessional, setSelectedProfessional] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState(1);
  const [cartProducts, setCartProducts] = useState<CartProduct[]>([]);
  const [showProductList, setShowProductList] = useState(false);

  const { data: clientData } = useQuery({
    queryKey: ['client-profile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const { data } = await supabase.from('clients').select('*').eq('email', user.email).maybeSingle();
      return data;
    },
    enabled: !!user?.email,
  });

  const { data: services } = useQuery({
    queryKey: ['booking-services'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*').eq('type', 'service').eq('status', 'active').order('name');
      return data;
    },
  });

  const { data: professionals } = useQuery({
    queryKey: ['booking-professionals', establishmentId],
    queryFn: async () => {
      let query = supabase.from('professionals').select('*').eq('status', 'active').order('name');
      if (establishmentId) {
        query = query.or(`establishment_id.eq.${establishmentId},establishment_id.is.null`);
      }
      const { data } = await query;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ['booking-products'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*').eq('type', 'product').eq('status', 'active').gt('stock_quantity', 0).order('name');
      return data;
    },
  });

  // Fetch professional availability for selected date
  const selectedDayOfWeek = selectedDate ? selectedDate.getDay() : null;

  const { data: availabilitySlots = [] } = useQuery({
    queryKey: ['booking-availability', selectedProfessional, selectedDayOfWeek],
    queryFn: async () => {
      if (!selectedProfessional || selectedDayOfWeek === null) return [];
      const { data, error } = await supabase
        .from('professional_availability')
        .select('start_time, end_time, slot_interval')
        .eq('professional_id', selectedProfessional)
        .eq('day_of_week', selectedDayOfWeek)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProfessional && selectedDayOfWeek !== null,
  });

  const { data: existingAppointments } = useQuery({
    queryKey: ['existing-appointments', selectedProfessional, selectedDate],
    queryFn: async () => {
      if (!selectedProfessional || !selectedDate) return [];
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data } = await supabase.from('appointments').select('appointment_time')
        .eq('professional_id', selectedProfessional).eq('appointment_date', dateStr)
        .not('status', 'in', '("cancelled","no_show")');
      return data?.map(a => a.appointment_time) || [];
    },
    enabled: !!selectedProfessional && !!selectedDate,
  });

  // Fetch exceptions for the professional
  const { data: exceptions = [] } = useQuery({
    queryKey: ['booking-exceptions', selectedProfessional, selectedDate],
    queryFn: async () => {
      if (!selectedProfessional || !selectedDate) return [];
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data } = await supabase
        .from('professional_availability_exceptions')
        .select('*')
        .eq('professional_id', selectedProfessional)
        .eq('exception_date', dateStr);
      return data || [];
    },
    enabled: !!selectedProfessional && !!selectedDate,
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      let clientId = clientData?.id;
      if (!clientId && user?.email) {
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({ name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Cliente', email: user.email, status: 'active', establishment_id: establishmentId || null })
          .select('id').single();
        if (clientError) throw new Error('Não foi possível criar o cadastro do cliente: ' + clientError.message);
        clientId = newClient.id;
      }

      const selectedServicesList = services?.filter(s => selectedServices.includes(s.id)) || [];
      if (!clientId || selectedServices.length === 0 || !selectedProfessional || !selectedDate || !selectedTime) {
        throw new Error('Dados incompletos');
      }

      const serviceNames = selectedServicesList.map(s => s.name).join(', ');
      const servicesTotal = selectedServicesList.reduce((sum, s) => sum + (s.price || 0), 0);
      const productsTotal = cartProducts.reduce((sum, p) => sum + p.price * p.quantity, 0);

      // Format date using UTC-safe method to avoid timezone shift
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const appointmentDateStr = `${year}-${month}-${day}`;

      const { data: appointment, error } = await supabase.from('appointments').insert({
        client_id: clientId,
        professional_id: selectedProfessional,
        service: serviceNames,
        appointment_date: appointmentDateStr,
        appointment_time: selectedTime,
        notes,
        total_amount: servicesTotal + productsTotal,
        status: 'open',
        establishment_id: establishmentId || null,
      }).select('id').single();

      if (error) throw error;

      // Insert order items for each service
      if (appointment) {
        const serviceItems = selectedServicesList.map(s => ({
          appointment_id: appointment.id,
          product_id: s.id,
          item_type: 'service',
          name: s.name,
          quantity: 1,
          unit_price: s.price,
          total_price: s.price,
          professional_id: selectedProfessional,
        }));

        const productItems = cartProducts.map(p => ({
          appointment_id: appointment.id,
          product_id: p.id,
          item_type: 'product',
          name: p.name,
          quantity: p.quantity,
          unit_price: p.price,
          total_price: p.price * p.quantity,
          professional_id: selectedProfessional,
        }));

        const allItems = [...serviceItems, ...productItems];
        if (allItems.length > 0) {
          await supabase.from('order_items').insert(allItems);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-appointments'] });
      toast({ title: 'Agendamento realizado!', description: 'Seu horário foi agendado com sucesso.' });
      navigate('/client/appointments');
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível realizar o agendamento.', variant: 'destructive' });
    },
  });

  // Generate available times from availability config or fallback
  const availableTimes: string[] = (() => {
    // Check if entire day is blocked by exception
    const isDayBlocked = exceptions.some(e => !e.is_available && !e.start_time);
    if (isDayBlocked) return [];

    if (availabilitySlots.length > 0) {
      const slots: string[] = [];
      for (const avail of availabilitySlots) {
        const [startH, startM] = avail.start_time.split(':').map(Number);
        const [endH, endM] = avail.end_time.split(':').map(Number);
        const startMin = startH * 60 + startM;
        const endMin = endH * 60 + endM;
        const interval = avail.slot_interval || 30;
        for (let m = startMin; m < endMin; m += interval) {
          const h = Math.floor(m / 60);
          const min = m % 60;
          const time = `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`;
          
          // Check if this specific time is blocked by a partial exception
          const isTimeBlocked = exceptions.some(e => {
            if (!e.start_time || !e.end_time || e.is_available) return false;
            const [eStartH, eStartM] = e.start_time.split(':').map(Number);
            const [eEndH, eEndM] = e.end_time.split(':').map(Number);
            const eStart = eStartH * 60 + eStartM;
            const eEnd = eEndH * 60 + eEndM;
            return m >= eStart && m < eEnd;
          });

          if (!isTimeBlocked && !existingAppointments?.includes(time)) slots.push(time);
        }
      }
      return slots;
    }

    // Fallback: 09-19 with 30min intervals
    const fallback: string[] = [];
    for (let hour = 9; hour < 19; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`;
        if (!existingAppointments?.includes(time)) fallback.push(time);
      }
    }
    return fallback;
  })();

  const selectedServicesList = services?.filter(s => selectedServices.includes(s.id)) || [];
  const selectedProfessionalData = professionals?.find(p => p.id === selectedProfessional);
  const servicesTotal = selectedServicesList.reduce((sum, s) => sum + (s.price || 0), 0);
  const productsTotal = cartProducts.reduce((sum, p) => sum + p.price * p.quantity, 0);
  const grandTotal = servicesTotal + productsTotal;

  const canProceed = () => {
    switch (step) {
      case 1: return selectedServices.length > 0;
      case 2: return !!selectedProfessional;
      case 3: return !!selectedDate && !!selectedTime;
      default: return true;
    }
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
    );
  };

  const addProduct = (product: any) => {
    setCartProducts(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
    setShowProductList(false);
  };

  const updateProductQty = (id: string, delta: number) => {
    setCartProducts(prev => prev.map(p => p.id === id ? { ...p, quantity: Math.max(0, p.quantity + delta) } : p).filter(p => p.quantity > 0));
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-24">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-4xl font-black text-zinc-900 tracking-tight flex items-center gap-3">
          <CalendarIcon className="h-8 w-8 text-primary" /> Agendar Horário
        </h1>
        <p className="text-muted-foreground font-medium text-lg">Selecione os serviços e profissionais para o seu próximo atendimento</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between bg-zinc-50 p-6 rounded-[32px] border border-black/5 shadow-sm">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black transition-all ${step >= s ? 'bg-primary text-white shadow-lg scale-110' : 'bg-white text-zinc-400 border border-zinc-100'}`}>
              {step > s ? <Check className="h-5 w-5" /> : s}
            </div>
            {s < 4 && <div className={`w-10 sm:w-16 h-1 rounded-full mx-2 ${step > s ? 'bg-primary' : 'bg-zinc-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Services (Multi-select) */}
      {step === 1 && (
        <Card className="premium-card border-none shadow-2xl rounded-[32px] overflow-hidden">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl font-black tracking-tight uppercase flex items-center gap-3 text-zinc-900">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Scissors className="h-5 w-5" />
              </div>
              Escolha os Serviços
            </CardTitle>
            <CardDescription className="text-zinc-500 font-medium">Selecione os serviços que deseja agendar hoje</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2">
              {services?.map((service) => (
                <div
                  key={service.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedServices.includes(service.id) ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                  onClick={() => toggleService(service.id)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Checkbox checked={selectedServices.includes(service.id)} onCheckedChange={() => toggleService(service.id)} />
                      <span className="font-medium">{service.name}</span>
                    </div>
                    <span className="text-primary font-bold">R$ {typeof service.price === 'number' ? service.price.toFixed(2).replace('.', ',') : '0,00'}</span>
                  </div>
                  {service.description && <p className="text-sm text-muted-foreground mt-1 ml-9">{service.description}</p>}
                </div>
              ))}
            </div>
            {selectedServices.length > 1 && (
              <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
                <span className="text-muted-foreground">{selectedServices.length} serviços selecionados — </span>
                <span className="font-bold text-primary">R$ {typeof servicesTotal === 'number' ? servicesTotal.toFixed(2).replace('.', ',') : '0,00'}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Professional */}
      {step === 2 && (
        <Card className="premium-card border-none shadow-2xl rounded-[32px] overflow-hidden">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl font-black tracking-tight uppercase flex items-center gap-3 text-zinc-900">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </div>
              Escolha o Profissional
            </CardTitle>
            <CardDescription className="text-zinc-500 font-medium">Selecione o profissional de sua preferência para o atendimento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2">
              {professionals?.map((professional) => (
                <div key={professional.id} className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedProfessional === professional.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`} onClick={() => setSelectedProfessional(professional.id)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"><User className="h-5 w-5" /></div>
                    <div>
                      <p className="font-medium">{professional.name}</p>
                      {professional.specialty && <p className="text-sm text-muted-foreground">{professional.specialty}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Date and Time */}
      {step === 3 && (
        <Card className="premium-card border-none shadow-2xl rounded-[32px] overflow-hidden">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl font-black tracking-tight uppercase flex items-center gap-3 text-zinc-900">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Clock className="h-5 w-5" />
              </div>
              Data e Horário
            </CardTitle>
            <CardDescription className="text-zinc-500 font-medium">Escolha o melhor momento para sua visita</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="mb-2 block">Data</Label>
              <Calendar mode="single" selected={selectedDate} onSelect={(d) => { setSelectedDate(d); setSelectedTime(''); }}
                disabled={(date) => date < new Date() || date.getDay() === 0} locale={ptBR} className="rounded-md border" />
            </div>
            {selectedDate && (
              <div>
                <Label className="mb-2 block">Horário</Label>
                <div className="grid grid-cols-4 gap-2">
                  {availableTimes.length === 0 ? (
                    <p className="col-span-4 text-muted-foreground text-center py-4">Nenhum horário disponível nesta data</p>
                  ) : (
                    availableTimes.map((time) => (
                      <Button key={time} variant={selectedTime === time ? 'default' : 'outline'} size="sm" onClick={() => setSelectedTime(time)}>
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

      {/* Step 4: Confirmation + Upsell */}
      {step === 4 && (
        <Card className="premium-card border-none shadow-2xl rounded-[32px] overflow-hidden">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl font-black tracking-tight uppercase flex items-center gap-3 text-zinc-900">
              <div className="p-2 rounded-xl bg-green-500/10 text-green-600">
                <Check className="h-5 w-5" />
              </div>
              Confirmar Agendamento
            </CardTitle>
            <CardDescription className="text-zinc-500 font-medium">Revise seus dados antes de finalizar o agendamento</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Serviço(s):</span>
                <span className="font-medium text-right">{selectedServicesList.map(s => s.name).join(', ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Profissional:</span>
                <span className="font-medium">{selectedProfessionalData?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data:</span>
                <span className="font-medium">{selectedDate && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Horário:</span>
                <span className="font-medium">{selectedTime.slice(0, 5)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Serviços:</span>
                <span className="font-medium">R$ {typeof servicesTotal === 'number' ? servicesTotal.toFixed(2).replace('.', ',') : '0,00'}</span>
              </div>
            </div>

            {/* Upsell - Add Products */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2"><ShoppingBag className="h-4 w-4" /> Produtos Adicionais</Label>
                <Button variant="outline" size="sm" onClick={() => setShowProductList(!showProductList)}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar Item
                </Button>
              </div>

              {showProductList && (
                <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                  {products?.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">Nenhum produto disponível</p>}
                  {products?.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer" onClick={() => addProduct(product)}>
                      <div>
                        <p className="text-sm font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.stock_quantity} em estoque</p>
                      </div>
                      <span className="text-sm font-bold text-primary">R$ {typeof product.price === 'number' ? product.price.toFixed(2).replace('.', ',') : '0,00'}</span>
                    </div>
                  ))}
                </div>
              )}

              {cartProducts.length > 0 && (
                <div className="space-y-2">
                  {cartProducts.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 border rounded-lg">
                      <span className="text-sm font-medium">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateProductQty(item.id, -1)}><Minus className="h-3 w-3" /></Button>
                        <span className="text-sm w-6 text-center">{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateProductQty(item.id, 1)}><Plus className="h-3 w-3" /></Button>
                        <span className="text-sm font-medium w-20 text-right">R$ {typeof item.price === 'number' ? (item.price * item.quantity).toFixed(2).replace('.', ',') : '0,00'}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => updateProductQty(item.id, -item.quantity)}><X className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total */}
            <div className="flex justify-between border-t pt-3 mt-3">
              <span className="font-medium">Total:</span>
              <span className="font-bold text-primary text-lg">R$ {typeof grandTotal === 'number' ? grandTotal.toFixed(2).replace('.', ',') : '0,00'}</span>
            </div>

            <div>
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Alguma observação para o profissional?" className="mt-1" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between gap-4 mt-8">
        <Button variant="outline" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1} className="premium-button-ghost bg-white border-none h-12 px-8 shadow-md font-bold">
          Voltar
        </Button>
        {step < 4 ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className="premium-button-solid h-12 px-10 shadow-xl font-black">
            Próximo
          </Button>
        ) : (
          <Button onClick={() => bookMutation.mutate()} disabled={bookMutation.isPending} className="premium-button-solid h-12 px-10 shadow-xl font-black">
            {bookMutation.isPending ? 'Agendando...' : 'Confirmar Agendamento'}
          </Button>
        )}
      </div>
    </div>
  );
}
