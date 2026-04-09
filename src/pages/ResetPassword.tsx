import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import logoOneBarber from '@/assets/logo.png';

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Mínimo de 8 caracteres')
      .max(72, 'Máximo de 72 caracteres')
      .regex(/[A-Z]/, 'Deve conter pelo menos uma letra maiúscula')
      .regex(/[a-z]/, 'Deve conter pelo menos uma letra minúscula')
      .regex(/[0-9]/, 'Deve conter pelo menos um número'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    // Also check hash for type=recovery (fallback)
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = passwordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      const fieldErrors: { password?: string; confirmPassword?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'password') fieldErrors.password = err.message;
        if (err.path[0] === 'confirmPassword') fieldErrors.confirmPassword = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a senha. Tente novamente.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Senha atualizada!',
        description: 'Sua senha foi redefinida com sucesso.',
      });
      navigate('/login');
    }
    setLoading(false);
  };

  // Password strength indicators
  const checks = [
    { label: 'Mínimo 8 caracteres', met: password.length >= 8 },
    { label: 'Letra maiúscula', met: /[A-Z]/.test(password) },
    { label: 'Letra minúscula', met: /[a-z]/.test(password) },
    { label: 'Número', met: /[0-9]/.test(password) },
  ];

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-slate-950 relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="w-full max-w-md text-center space-y-8 z-10 animate-fade-in">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[40px] shadow-2xl space-y-8">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                <Lock className="h-10 w-10 text-red-400 opacity-50" />
              </div>
              <img src={logoOneBarber} alt="OneBarber" className="h-12 w-auto mb-4" />
              <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Link Expirado</h1>
              <p className="text-zinc-400 font-medium mt-2 leading-relaxed">
                Este token de segurança não é mais válido ou já foi utilizado. Por favor, solicite uma nova chave de acesso.
              </p>
            </div>
            <Button 
              onClick={() => navigate('/login')} 
              className="w-full premium-button-ghost h-14 text-base font-bold uppercase tracking-widest"
            >
              Voltar ao Início
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#f8fafc] relative overflow-hidden">
      <div className="w-full max-w-md z-10">
        <div className="bg-white border border-slate-200 p-10 rounded-[40px] shadow-2xl space-y-8">
          {!isRecovery ? (
            <div className="space-y-8">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                  <Lock className="h-8 w-8 text-slate-400" />
                </div>
                <img src={logoOneBarber} alt="OneBarber" className="h-10 w-auto mb-4" />
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Link Expirado</h1>
                <p className="text-slate-500 text-sm text-center mt-2 leading-relaxed">
                  Este link de segurança não é mais válido ou já foi utilizado. Por favor, solicite uma nova redefinição.
                </p>
              </div>
              <Button 
                onClick={() => navigate('/login')} 
                className="w-full bg-slate-900 hover:bg-slate-800 text-white h-12 font-bold"
              >
                Voltar ao Login
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center flex flex-col items-center">
                <img 
                  src={logoOneBarber} 
                  alt="OneBarber" 
                  className="w-full max-w-[280px] h-auto mb-4" 
                />
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Nova Senha</h1>
                <p className="text-slate-500 text-sm mt-1">Defina sua nova senha de acesso</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">
                    Nova Senha
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 8 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-12 pr-12 h-12 bg-zinc-50 border-zinc-200 focus:bg-white transition-all shadow-sm rounded-2xl font-medium"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-500 font-medium ml-1">{errors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">
                    Confirmar Senha
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                    <Input
                      id="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Repita a senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-12 h-12 bg-zinc-50 border-zinc-200 focus:bg-white transition-all shadow-sm rounded-2xl font-medium"
                      disabled={loading}
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-500 font-medium ml-1">{errors.confirmPassword}</p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="premium-button-solid w-full h-12 text-base shadow-xl" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Atualizando...
                    </>
                  ) : (
                    'Confirmar Nova Senha'
                  )}
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="mt-8 text-center text-[10px] text-slate-400 uppercase tracking-widest font-medium">
          © {new Date().getFullYear()} OneBarber • Acesso Seguro
        </p>
      </div>
    </div>
  );
}
