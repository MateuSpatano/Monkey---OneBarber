import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  MapPin,
  Phone,
  Star,
  Clock,
  CalendarDays,
  MessageCircle,
  Navigation,
  Scissors,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

type Tab = 'services' | 'professionals' | 'about';

export default function ClientHome() {
  const { establishmentId } = useOutletContext<{ establishmentId: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('services');

  const { data: establishment } = useQuery({
    queryKey: ['establishment-profile', establishmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('establishments')
        .select('*')
        .eq('id', establishmentId)
        .maybeSingle();
      return data;
    },
  });

  const { data: services } = useQuery({
    queryKey: ['client-home-services', establishmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('type', 'service')
        .eq('status', 'active');
      return data ?? [];
    },
  });

  const { data: professionals } = useQuery({
    queryKey: ['client-home-professionals', establishmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('professionals')
        .select('*')
        .eq('establishment_id', establishmentId)
        .eq('status', 'active');
      return data ?? [];
    },
  });

  const displayName = establishment?.trade_name || establishment?.name || 'Barbearia';
  const addressParts = [establishment?.address, establishment?.city, establishment?.state].filter(Boolean);
  const address = addressParts.join(', ');
  const whatsappNumber = establishment?.phone?.replace(/\D/g, '');
  const mapsUrl = address ? `https://maps.google.com/?q=${encodeURIComponent(address)}` : null;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'services', label: 'Nossos Serviços' },
    { key: 'professionals', label: 'Profissionais' },
    { key: 'about', label: 'Sobre nós' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 -m-4 sm:-m-6 md:-m-6">
      <div className="max-w-2xl mx-auto bg-white shadow-2xl border-x border-zinc-200 min-h-screen flex flex-col">

        {/* ── Banner ─────────────────────────────────────────── */}
        <div className="relative h-44 flex-shrink-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black overflow-hidden">
          {/* decorative texture */}
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.07) 10px, rgba(255,255,255,.07) 11px)' }}
          />

          {/* Floating logo */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
            <div className="h-20 w-20 rounded-full border-4 border-white bg-white shadow-2xl overflow-hidden">
              {establishment?.logo_url ? (
                <img
                  src={establishment.logo_url}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                  <Scissors className="h-8 w-8 text-white" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Identity ────────────────────────────────────────── */}
        <div className="pt-14 px-5 text-center pb-4">
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">{displayName}</h1>

          <div className="flex items-center justify-center gap-1.5 mt-1.5">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="text-sm font-bold text-zinc-800">4.9</span>
            <span className="text-sm text-zinc-400">(128 avaliações)</span>
          </div>

          {address && (
            <div className="flex items-center justify-center gap-1 mt-1.5">
              <MapPin className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
              <span className="text-xs text-zinc-500 line-clamp-1">{address}</span>
            </div>
          )}
        </div>

        {/* ── Action Buttons ──────────────────────────────────── */}
        <div className="flex gap-2 px-5 pb-5">
          <Button asChild className="flex-1 font-bold h-11 rounded-xl shadow-lg text-sm">
            <Link to="/client/book">
              <CalendarDays className="h-4 w-4 mr-2" />
              Agendar
            </Link>
          </Button>

          {whatsappNumber && (
            <Button
              variant="outline"
              asChild
              className="flex-1 font-semibold h-11 rounded-xl border-zinc-200 text-zinc-700 text-sm hover:bg-zinc-50"
            >
              <a
                href={`https://wa.me/55${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4 mr-2 text-emerald-500" />
                Mensagem
              </a>
            </Button>
          )}

          {mapsUrl && (
            <Button
              variant="outline"
              asChild
              className="flex-1 font-semibold h-11 rounded-xl border-zinc-200 text-zinc-700 text-sm hover:bg-zinc-50"
            >
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                <Navigation className="h-4 w-4 mr-2 text-blue-500" />
                Rota
              </a>
            </Button>
          )}
        </div>

        {/* ── Tabs ────────────────────────────────────────────── */}
        <div className="flex border-b border-zinc-200 sticky top-0 bg-white z-10">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex-1 py-3 text-xs font-semibold transition-colors border-b-2 -mb-px',
                activeTab === key
                  ? 'border-zinc-900 text-zinc-900'
                  : 'border-transparent text-zinc-400 hover:text-zinc-600'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ─────────────────────────────────────── */}
        <div className="px-4 py-4 flex-1">

          {/* Serviços */}
          {activeTab === 'services' && (
            <div className="space-y-3">
              {services && services.length > 0 ? (
                services.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center gap-3 p-4 rounded-2xl border border-zinc-100 bg-zinc-50 hover:bg-zinc-100 transition-colors"
                  >
                    {/* Icon */}
                    <div className="h-10 w-10 rounded-xl bg-zinc-900 flex items-center justify-center flex-shrink-0">
                      <Scissors className="h-5 w-5 text-white" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-zinc-900 text-sm leading-tight truncate">
                        {service.name}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {service.duration_minutes && (
                          <span className="flex items-center gap-1 text-xs text-zinc-500">
                            <Clock className="h-3 w-3" />
                            {service.duration_minutes} min
                          </span>
                        )}
                        <span className="text-sm font-black text-zinc-900">
                          R${' '}
                          {typeof service.price === 'number'
                            ? service.price.toFixed(2).replace('.', ',')
                            : '0,00'}
                        </span>
                      </div>
                    </div>

                    {/* CTA */}
                    <Button
                      asChild
                      size="sm"
                      className="flex-shrink-0 h-8 px-4 rounded-xl font-bold text-xs"
                    >
                      <Link to="/client/book">Reservar</Link>
                    </Button>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                  <Scissors className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">Nenhum serviço disponível</p>
                </div>
              )}
            </div>
          )}

          {/* Profissionais */}
          {activeTab === 'professionals' && (
            <div className="space-y-3">
              {professionals && professionals.length > 0 ? (
                professionals.map((pro) => (
                  <div
                    key={pro.id}
                    className="flex items-center gap-3 p-4 rounded-2xl border border-zinc-100 bg-zinc-50"
                  >
                    <div className="h-12 w-12 rounded-full overflow-hidden flex-shrink-0 bg-zinc-200">
                      {pro.avatar_url ? (
                        <img
                          src={pro.avatar_url}
                          alt={pro.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-zinc-900 text-sm">{pro.name}</p>
                      {pro.specialty && (
                        <p className="text-xs text-zinc-500 mt-0.5">{pro.specialty}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                  <Users className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">Nenhum profissional cadastrado</p>
                </div>
              )}
            </div>
          )}

          {/* Sobre nós */}
          {activeTab === 'about' && (
            <div className="space-y-4 py-1">
              <p className="text-sm text-zinc-600 leading-relaxed">
                Bem-vindo à {displayName}! Somos especialistas em cortes masculinos modernos e
                tratamentos capilares de alta performance. Nossa equipe de profissionais
                qualificados está pronta para oferecer a melhor experiência de cuidado pessoal,
                com atendimento personalizado e um ambiente acolhedor.
              </p>

              {address && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                  <MapPin className="h-4 w-4 text-zinc-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-0.5">
                      Endereço
                    </p>
                    <p className="text-sm text-zinc-700">{address}</p>
                  </div>
                </div>
              )}

              {establishment?.phone && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                  <Phone className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-0.5">
                      Telefone
                    </p>
                    <p className="text-sm text-zinc-700">{establishment.phone}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
