import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Package, Loader2 } from 'lucide-react';

interface StockEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: { id: string; name: string; stock_quantity: number } | null;
  onSuccess: () => void;
}

export function StockEntryModal({ open, onOpenChange, product, onSuccess }: StockEntryModalProps) {
  const [quantity, setQuantity] = useState(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || quantity <= 0) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Informe uma quantidade válida.' });
      return;
    }

    setLoading(true);
    try {
      const newQty = product.stock_quantity + quantity;
      const { error } = await supabase
        .from('products')
        .update({ stock_quantity: newQty })
        .eq('id', product.id);

      if (error) throw error;

      toast({ title: 'Estoque atualizado', description: `${quantity} unidade(s) adicionada(s) a "${product.name}".` });
      setQuantity(0);
      setNotes('');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[32px] border-none shadow-2xl p-6 sm:p-8">
        <DialogHeader className="mb-6">
          <DialogTitle className="flex items-center gap-2 text-xl font-black tracking-tight">
            <Package className="h-5 w-5 text-primary" />
            Reposição de Estoque
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Produto</Label>
            <Input value={product?.name || ''} disabled />
          </div>
          <div>
            <Label>Estoque Atual</Label>
            <Input value={product?.stock_quantity ?? 0} disabled />
          </div>
          <div>
            <Label htmlFor="qty">Quantidade a Adicionar *</Label>
            <Input
              id="qty"
              type="number"
              min="1"
              value={quantity || ''}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              required
            />
          </div>
          <div>
            <Label htmlFor="stock-notes">Observação</Label>
            <Textarea
              id="stock-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo da reposição..."
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-black/5">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="premium-button-ghost h-11 px-6">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="premium-button-solid h-11 px-8 shadow-lg">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : 'Confirmar Entrada'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
