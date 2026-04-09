import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const emailSchema = z.string().email('E-mail inválido').max(255);

interface ForgotPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ForgotPasswordModal({ open, onOpenChange }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o e-mail. Tente novamente.',
        variant: 'destructive',
      });
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  const handleClose = (value: boolean) => {
    if (!value) {
      setEmail('');
      setError('');
      setSent(false);
    }
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-white border-slate-200 shadow-2xl rounded-3xl overflow-hidden p-0 gap-0">
        <div className="p-8 sm:p-10 space-y-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-bold text-slate-900 tracking-tight">
              Recuperar Senha
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              {sent
                ? 'E-mail de recuperação enviado'
                : 'Informe seu e-mail para receber as instruções'}
            </DialogDescription>
          </DialogHeader>

          {sent ? (
            <div className="space-y-6 text-center sm:text-left">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto sm:mx-0 border border-slate-100">
                <Mail className="h-8 w-8 text-slate-600" />
              </div>
              <div className="space-y-2">
                <p className="text-slate-600 text-sm leading-relaxed">
                  Se o e-mail <strong className="text-slate-900">{email}</strong> estiver cadastrado, você receberá as instruções em instantes.
                </p>
              </div>
              <Button onClick={() => handleClose(false)} className="w-full bg-slate-900 hover:bg-slate-800 text-white h-11">
                Fechar
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="forgot-email" className="text-sm font-medium text-slate-700">E-mail</Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all shadow-sm"
                    disabled={loading}
                  />
                </div>
                {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
              </div>

              <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white h-11 font-bold shadow-md" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  'Enviar instruções'
                )}
              </Button>
            </form>
          )}

          <div className="pt-4 text-center border-t border-slate-100">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">
              OneBarber • Acesso Seguro
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
