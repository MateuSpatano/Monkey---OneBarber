import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Headphones, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SupportTicketModal } from '@/components/support/SupportTicketModal';
import { SupportChat } from '@/components/support/SupportChat';
import { cn } from "@/lib/utils";

const statusLabels: Record<string, string> = {
  pending: 'Em Espera',
  in_progress: 'Em Andamento',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-700',
  in_progress: 'bg-blue-500/20 text-blue-700',
  completed: 'bg-green-500/20 text-green-700',
  cancelled: 'bg-muted text-muted-foreground',
};

export default function Support() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['user-support-tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const selectedTicket = tickets?.find((t) => t.id === selectedTicketId);

  if (selectedTicketId && selectedTicket) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedTicketId(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{selectedTicket.subject}</h1>
            <div className="flex items-center gap-2">
              <Badge className={statusColors[selectedTicket.status]}>
                {statusLabels[selectedTicket.status]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {format(new Date(selectedTicket.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
          </div>
        </div>

        <Card className="flex flex-col" style={{ height: 'calc(100vh - 220px)' }}>
          <SupportChat ticketId={selectedTicketId} isAdmin={false} />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight underline decoration-primary/20 underline-offset-8 flex items-center gap-2">
            <Headphones className="h-7 w-7 text-primary/40" />
            Suporte
          </h1>
          <p className="text-muted-foreground font-medium text-sm sm:text-base">
            Abra chamados e converse com nossa equipe de especialistas
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="premium-button-solid h-11 sm:h-12 shadow-xl px-6">
          <Plus className="h-5 w-5 mr-2" />
          Novo Chamado
        </Button>
      </div>

      <Card className="premium-card border-none shadow-2xl rounded-[32px] overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-zinc-400 font-bold uppercase tracking-widest text-xs">Carregando chamados...</div>
          ) : !tickets?.length ? (
            <div className="text-center py-16 px-6">
              <div className="w-20 h-20 rounded-[28px] bg-primary/5 flex items-center justify-center mx-auto mb-6 text-primary">
                <Headphones className="h-10 w-10 opacity-40" />
              </div>
              <h3 className="text-lg font-black text-foreground mb-2">Nenhum chamado aberto</h3>
              <p className="text-sm font-medium text-zinc-500 mb-8 max-w-[280px] mx-auto">Precisa de ajuda? Clique em "Novo Chamado" para iniciar um atendimento.</p>
              <Button variant="outline" className="premium-button-ghost border-none h-11" onClick={() => setIsModalOpen(true)}><Plus className="mr-2 h-4 w-4" /> Abrir Primeiro Chamado</Button>
            </div>
          ) : (
            <ScrollArea className="max-h-[60vh]">
              <div className="divide-y">
                {tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    className="w-full text-left px-8 py-5 hover:bg-zinc-50/50 transition-all flex items-center gap-5 group border-b border-black/5 last:border-0"
                    onClick={() => setSelectedTicketId(ticket.id)}
                  >
                    <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors shrink-0">
                      <Headphones className="h-6 w-6 opacity-60" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground group-hover:text-primary transition-colors truncate">{ticket.subject}</p>
                      <p className="text-xs font-semibold text-zinc-400 truncate mt-0.5">
                        {ticket.description}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge className={cn(
                        "text-[10px] uppercase font-black tracking-widest rounded-lg border-none",
                        statusColors[ticket.status]
                      )}>
                        {statusLabels[ticket.status]}
                      </Badge>
                      <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">
                        Criado em {format(new Date(ticket.created_at), "dd/MM", { locale: ptBR })}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <SupportTicketModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
}
