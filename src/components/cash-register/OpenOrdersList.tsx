import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Receipt, Clock, User, Scissors } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ComandaDetailModal } from "./ComandaDetailModal";

interface OpenOrder {
  id: string;
  client_id: string | null;
  professional_id: string | null;
  service: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  total_amount: number | null;
  checked_in_at: string | null;
  clients: { name: string } | null;
  professionals: { name: string } | null;
}

export function OpenOrdersList() {
  const [selectedOrder, setSelectedOrder] = useState<OpenOrder | null>(null);
  const [comandaOpen, setComandaOpen] = useState(false);

  const { data: openOrders = [], isLoading } = useQuery({
    queryKey: ["open-orders"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("appointments")
        .select(`*, clients(name), professionals(name)`)
        .in("status", ["confirmed", "present", "in_progress"])
        .order("checked_in_at", { ascending: true });
      if (error) throw error;
      return (data || []) as OpenOrder[];
    },
    refetchInterval: 15000,
  });

  const handleOpenComanda = (order: OpenOrder) => {
    setSelectedOrder(order);
    setComandaOpen(true);
  };

  if (isLoading) return null;

  return (
    <>
      {openOrders.length === 0 ? (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              Comandas em Aberto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma comanda aberta no momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                Comandas em Aberto
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {openOrders.length} aberta{openOrders.length !== 1 ? "s" : ""}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {openOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => handleOpenComanda(order)}
                    className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border/50 cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {order.clients?.name || "Sem cliente"}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Scissors className="h-3 w-3" />{order.service}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />{order.professionals?.name || "—"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="default" className="text-[10px]">
                        Comanda Aberta
                      </Badge>
                      {order.checked_in_at && (
                        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 justify-end">
                          <Clock className="h-2.5 w-2.5" />
                          {format(new Date(order.checked_in_at), "HH:mm")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <ComandaDetailModal
        open={comandaOpen}
        onOpenChange={setComandaOpen}
        appointment={selectedOrder}
      />
    </>
  );
}
