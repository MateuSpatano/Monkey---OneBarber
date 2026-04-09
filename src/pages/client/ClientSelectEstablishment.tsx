import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Phone, Search, Store } from 'lucide-react';

interface ClientSelectEstablishmentProps {
  onSelect: (establishmentId: string) => void;
}

export default function ClientSelectEstablishment({ onSelect }: ClientSelectEstablishmentProps) {
  const [search, setSearch] = useState('');

  const { data: establishments, isLoading } = useQuery({
    queryKey: ['client-establishments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('establishments')
        .select('*')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = (establishments || []).filter(e =>
    (e.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (e.city?.toLowerCase() || '').includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <Store className="h-12 w-12 mx-auto text-primary mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Escolha a Barbearia</h1>
          <p className="text-muted-foreground mt-1">Selecione o estabelecimento onde deseja agendar</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar barbearia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Nenhuma barbearia encontrada</div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((est) => (
              <Card
                key={est.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => onSelect(est.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-3">
                    {est.logo_url ? (
                      <img src={est.logo_url} alt={est.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Store className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <span className="text-lg">{est.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {(est.city || est.state) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {[est.city, est.state].filter(Boolean).join(' - ')}
                      </span>
                    )}
                    {est.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {est.phone}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
